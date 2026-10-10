import { test, expect, type Page } from '@playwright/test';
import type { GameState } from '../../src/game/types';
import type { M4RunCheckpoint } from '../../src/run/m4-director';
import type { RunCheckpoint } from '../../src/run/director';
import type { RunJournal } from '../../src/run/storage';
import { RUN_DATABASE_NAME } from '../../src/run/storage';
import { M4_DATABASE_NAME, M4_TAB_OWNER_KEY } from '../../src/run/m4-storage';
import { PRESENTATION_KEY, type PresentationPreferences } from '../../src/audio/audio';
import { STORAGE_KEY } from '../../src/input/settings';

type Snapshot = GameState & {
  mode: string; selectedSession: string; run: M4RunCheckpoint | RunCheckpoint | null;
  storageReady: boolean; temporaryRun: boolean; saveStatus: string; savedM3: boolean; savedM4: boolean;
  audio: { status: string; gameplayPaused: boolean; activeVoices: number; played: number; preferences: PresentationPreferences };
};
const snapshot = (page: Page): Promise<Snapshot> => page.evaluate(() => (window as any).__prototype.snapshot());
const m4 = (value: Snapshot): M4RunCheckpoint => value.run as M4RunCheckpoint;
async function open(page: Page): Promise<void> {
  await page.goto('/?debug=1');
  await page.waitForFunction(() => (window as any).__prototype?.snapshot().storageReady);
  await expect(page.locator('#fatal')).toBeHidden();
}
async function begin(page: Page, kind: 'm4' | 'run' = 'm4', weapon = 'rifle'): Promise<void> {
  await open(page); await page.locator('#choose-' + kind).click(); await page.locator('#choose-' + weapon).click();
  await page.locator('#start-button').click();
  await expect.poll(async () => (await snapshot(page)).mode).toBe('playing');
}
async function reload(page: Page): Promise<void> {
  await page.reload(); await page.waitForFunction(() => (window as any).__prototype?.snapshot().storageReady);
  await expect(page.locator('#fatal')).toBeHidden();
}
async function journal<T extends M4RunCheckpoint | RunCheckpoint>(page: Page, databaseName: string): Promise<RunJournal<T>> {
  return page.evaluate(name => new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const read = database.transaction('journal', 'readonly').objectStore('journal').get('state');
      read.onsuccess = () => { resolve(read.result); database.close(); };
      read.onerror = () => { reject(read.error); database.close(); };
    };
  }), databaseName) as Promise<RunJournal<T>>;
}
async function abandon(page: Page): Promise<void> {
  if (['playing', 'cleared'].includes((await snapshot(page)).mode)) await page.keyboard.press('Escape');
  await expect.poll(async () => (await snapshot(page)).mode).toBe('paused');
  await page.locator('#preparation-button').click(); await expect(page.locator('#confirm-reset')).toBeVisible();
  await page.locator('#confirm-reset').click(); await expect.poll(async () => (await snapshot(page)).mode).toBe('preparation');
}
/** Real pointer attack; only readonly projection/snapshots, no gameplay state writes. */
async function clearOpeningRoom(page: Page): Promise<void> {
  const until = Date.now() + 20_000;
  await page.mouse.down();
  while (Date.now() < until) {
    const state = await snapshot(page);
    if (state.mode !== 'playing') break;
    const enemy = state.enemies.filter(value => value.health > 0).sort((a, b) => Math.hypot(a.position.x - state.player.position.x, a.position.z - state.player.position.z) - Math.hypot(b.position.x - state.player.position.x, b.position.z - state.player.position.z))[0];
    if (enemy) {
      const point = await page.evaluate(position => (window as any).__prototype.project(position), enemy.position);
      await page.mouse.move(point.x, point.y);
    }
    await page.waitForTimeout(80);
  }
  await page.mouse.up(); await expect.poll(async () => (await snapshot(page)).mode).toBe('cleared');
}
async function moveToExit(page: Page): Promise<void> {
  const keys = new Set<string>();
  try {
    for (let attempt = 0; attempt < 110; attempt++) {
      const state = await snapshot(page); const exit = state.room.exit!;
      if (Math.hypot(exit.x - state.player.position.x, exit.z - state.player.position.z) < 1) return;
      const projected = await page.evaluate(({ position, exit }) => {
        const debug = (window as any).__prototype; return { player: debug.project(position), exit: debug.project(exit) };
      }, { position: state.player.position, exit });
      const dx = projected.exit.x - projected.player.x, dy = projected.exit.y - projected.player.y;
      const next = new Set<string>();
      if (Math.abs(dx) > 12) next.add(dx > 0 ? 'd' : 'a');
      if (Math.abs(dy) > 8) next.add(dy > 0 ? 's' : 'w');
      for (const key of keys) if (!next.has(key)) { await page.keyboard.up(key); keys.delete(key); }
      for (const key of next) if (!keys.has(key)) { await page.keyboard.down(key); keys.add(key); }
      await page.waitForTimeout(60);
    }
    throw new Error('Real keyboard movement did not reach the marked exit.');
  } finally { for (const key of keys) await page.keyboard.up(key); }
}

test('delayed checkpoint initialization cannot replace an already playing dummy practice session', async ({ page }) => {
  await page.addInitScript(() => {
    let released = false;
    (window as any).__releaseDelayedRunOpen = () => { released = true; };
    const originalOpen = indexedDB.open.bind(indexedDB);
    const successSetter = Object.getOwnPropertyDescriptor(IDBRequest.prototype, 'onsuccess')!.set!;
    Object.defineProperty(indexedDB, 'open', { configurable: true, value(name: string, version?: number) {
      const request = version === undefined ? originalOpen(name) : originalOpen(name, version);
      let handler: IDBRequest['onsuccess'] = null;
      Object.defineProperty(request, 'onsuccess', {
        configurable: true, get: () => handler,
        set(value: IDBRequest['onsuccess']) {
          handler = value;
          successSetter.call(request, value ? function (event: Event) {
            const deliver = () => {
              if (!released) { setTimeout(deliver, 25); return; }
              setTimeout(() => value.call(request, event), 1000);
            };
            deliver();
          } : null);
        },
      });
      return request;
    } });
  });
  await page.goto('/?debug=1');
  await page.waitForFunction(() => !!(window as any).__prototype);
  expect((await snapshot(page)).storageReady).toBe(false);
  await page.locator('#choose-rifle').click(); await page.locator('#choose-dummy').click();
  await page.locator('#start-button').click();
  await expect.poll(async () => (await snapshot(page)).mode).toBe('playing');
  const target = await page.evaluate(() => (window as any).__prototype.project((window as any).__prototype.snapshot().dummy.position));
  await page.mouse.click(target.x, target.y);
  await expect.poll(async () => (await snapshot(page)).hits).toBeGreaterThan(0);
  const before = await snapshot(page);
  expect(before.storageReady).toBe(false); expect(before.selectedSession).toBe('dummy'); expect(before.run).toBeNull();
  expect(before.dummy.health).toBeLessThan(before.dummy.maxHealth); expect(before.player.ammo).toBeLessThan(before.player.maxAmmo);
  await page.evaluate(() => (window as any).__releaseDelayedRunOpen());
  await page.waitForFunction(() => (window as any).__prototype.snapshot().storageReady);
  const after = await snapshot(page);
  expect(after.mode).toBe('playing'); expect(after.selectedSession).toBe('dummy'); expect(after.run).toBeNull();
  expect(after.time).toBeGreaterThan(before.time + 0.3);
  expect(after.dummy.health).toBe(before.dummy.health); expect(after.player.health).toBe(before.player.health);
  expect(after.player.ammo).toBe(before.player.ammo); expect(after.damageTotal).toBe(before.damageTotal); expect(after.hits).toBe(before.hits);
  await expect(page.locator('#fatal')).toBeHidden();
});

test('M3 and M4 checkpoints coexist; legacy resume and M4 abandonment preserve the other route and controls', async ({ page }) => {
  await begin(page, 'run'); await page.keyboard.press('Escape');
  const legacy = (await journal<RunCheckpoint>(page, RUN_DATABASE_NAME)).current!.checkpoint;
  const controls = await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY);
  await reload(page); await expect(page.locator('#resume-run')).toBeVisible();
  await page.locator('#choose-m4').click(); await page.locator('#start-button').click();
  await expect.poll(async () => (await snapshot(page)).mode).toBe('playing'); await page.keyboard.press('Escape');
  const current = (await journal<M4RunCheckpoint>(page, M4_DATABASE_NAME)).current!.checkpoint;
  expect(current.levelId).toBe('B01L01'); expect(current.roomId).toBe('B01L01_R01'); expect(legacy.stageIndex).toBe(0);
  await reload(page); await expect(page.locator('#resume-run')).toBeVisible(); await expect(page.locator('#resume-m4')).toBeVisible();
  await page.locator('#resume-run').click();
  await expect.poll(async () => (await snapshot(page)).mode).toBe('playing');
  expect((await snapshot(page)).selectedSession).toBe('run'); expect((await snapshot(page)).run!.runId).toBe(legacy.runId);
  expect((await snapshot(page)).enemies.map(enemy => enemy.archetype)).toEqual(['B01_E01', 'B01_E01', 'B01_E01']);
  await reload(page); await page.locator('#resume-m4').click();
  await expect.poll(async () => (await snapshot(page)).mode).toBe('playing'); expect(m4(await snapshot(page)).roomId).toBe(current.roomId);
  await abandon(page);
  const ended = await journal<M4RunCheckpoint>(page, M4_DATABASE_NAME);
  expect(ended.current).toBeNull(); expect(ended.previous).toBeNull(); expect(ended.settledRunIds).toEqual([current.runId]);
  expect((await journal<RunCheckpoint>(page, RUN_DATABASE_NAME)).current!.checkpoint).toEqual(legacy);
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe(controls);
  await reload(page); await expect(page.locator('#resume-m4')).toBeHidden(); await expect(page.locator('#resume-run')).toBeVisible();
});

test('M4 cleared room reload stays settled; the remapped exit carries health/ammo into the next safe entry', async ({ page }, info) => {
  test.setTimeout(50_000);
  await begin(page);
  await expect(page.locator('#interaction-hint')).toContainText('Exit locked');
  await page.keyboard.press('e'); expect(m4(await snapshot(page)).roomIndex).toBe(0);
  await clearOpeningRoom(page); await page.keyboard.press('Escape');
  const cleared = (await journal<M4RunCheckpoint>(page, M4_DATABASE_NAME)).current!.checkpoint;
  expect(cleared.phase).toBe('cleared'); expect(cleared.clearedRooms).toEqual(['B01L01_R01']); expect(cleared.rewards).toEqual([]);
  await reload(page); await page.locator('#resume-m4').click();
  await expect.poll(async () => (await snapshot(page)).mode).toBe('cleared');
  const restored = await snapshot(page); expect(restored.enemies.every(enemy => enemy.health === 0)).toBeTruthy();
  expect(restored.player.health).toBe(cleared.carry.health); expect(restored.player.ammo).toBe(cleared.carry.ammo);
  await expect(page.locator('#interaction-hint')).toContainText('Exit open');
  const damage = restored.damageTotal, ammo = restored.player.ammo;
  await page.mouse.click(600, 400); await page.waitForTimeout(150);
  expect((await snapshot(page)).damageTotal).toBe(damage); expect((await snapshot(page)).player.ammo).toBe(ammo);
  await page.keyboard.press('Escape'); await page.locator('#settings-button').click();
  await page.locator('#bind-interact').click(); await expect(page.locator('#capture-status')).toContainText('Press a key');
  await page.keyboard.press('f'); await expect(page.locator('#capture-status')).toContainText('New binding');
  await page.locator('#binding-apply').click(); await page.locator('#settings-done').click(); await page.locator('#start-button').click();
  await expect.poll(async () => (await snapshot(page)).mode).toBe('cleared');
  await moveToExit(page); await page.keyboard.press('e'); await page.waitForTimeout(100);
  expect(m4(await snapshot(page)).roomId).toBe('B01L01_R01');
  const atExit = await snapshot(page); await page.keyboard.press('f');
  await expect.poll(async () => m4(await snapshot(page)).roomId).toBe('B01L01_R02');
  const next = (await journal<M4RunCheckpoint>(page, M4_DATABASE_NAME)).current!.checkpoint;
  expect(next.phase).toBe('encounter'); expect(next.carry.health).toBe(atExit.player.health); expect(next.carry.ammo).toBe(atExit.player.ammo);
  expect(next.clearedRooms).toEqual(['B01L01_R01']); expect(next.rewards).toEqual([]);
  await info.attach('cleared-room-and-next-entry', { body: JSON.stringify({ cleared, next }), contentType: 'application/json' });
});

test('M4 duplicated tab identity conflicts; explicit takeover displaces stale owner and temporary play preserves the winning save', async ({ page, context }) => {
  test.setTimeout(30_000);
  await begin(page); const original = m4(await snapshot(page));
  const entries = await page.evaluate(() => Object.entries(sessionStorage));
  const owner = entries.find(([key]) => key === M4_TAB_OWNER_KEY)?.[1]; expect(owner).toBeTruthy();
  const second = await context.newPage();
  await second.addInitScript(items => items.forEach(([key, value]) => sessionStorage.setItem(key, value)), entries);
  await open(second); await expect(second.locator('#takeover-run')).toBeVisible();
  expect(await second.evaluate(key => sessionStorage.getItem(key), M4_TAB_OWNER_KEY)).not.toBe(owner);
  await second.locator('#takeover-run').click(); await expect(second.locator('#resume-m4')).toBeVisible(); await second.locator('#resume-m4').click();
  await expect.poll(async () => (await snapshot(second)).mode).toBe('playing'); expect(m4(await snapshot(second)).runId).toBe(original.runId);
  const winning = (await journal<M4RunCheckpoint>(second, M4_DATABASE_NAME)).current!.checkpoint;
  await page.bringToFront(); await expect.poll(async () => (await snapshot(page)).mode, { timeout: 12_000 }).toBe('conflict');
  await page.locator('#temporary-run').click(); await expect.poll(async () => (await snapshot(page)).temporaryRun).toBe(true);
  await expect.poll(async () => (await snapshot(page)).mode).toMatch(/playing|paused/);
  if ((await snapshot(page)).mode === 'playing') await page.keyboard.press('Escape');
  await expect(page.locator('#save-status')).toContainText('not saved');
  expect((await journal<M4RunCheckpoint>(page, M4_DATABASE_NAME)).current!.checkpoint).toEqual(winning);
  await second.close();
});

test('denied M4 IndexedDB gives playable temporary mode and keeps settings usable', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'indexedDB', { get() { throw new DOMException('Denied test fixture', 'SecurityError'); } }));
  await begin(page); expect((await snapshot(page)).temporaryRun).toBe(true);
  await page.keyboard.press('Escape'); await expect(page.locator('#save-status')).toContainText(/not saved|unavailable/i);
  await page.locator('#settings-button').click(); await expect(page.locator('#controls-settings')).toBeVisible();
  await page.locator('#presentation-muted').check(); await page.locator('#settings-done').click();
  await page.locator('#start-button').click(); await expect.poll(async () => (await snapshot(page)).mode).toBe('playing');
  expect((await snapshot(page)).audio.preferences.muted).toBe(true); await expect(page.locator('#fatal')).toBeHidden();
});

test('unsupported M4 content remains intact through retry and temporary play', async ({ page }) => {
  await begin(page); await page.keyboard.press('Escape');
  const future = await page.evaluate(name => new Promise((resolve, reject) => {
    const request = indexedDB.open(name); request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, transaction = db.transaction('journal', 'readwrite'), store = transaction.objectStore('journal'), read = store.get('state');
      let saved: unknown;
      read.onsuccess = () => { const value = read.result; value.current.contentVersion += '-future'; store.put(value, 'state'); saved = value; };
      transaction.oncomplete = () => { resolve(saved); db.close(); }; transaction.onabort = () => { reject(transaction.error); db.close(); };
    };
  }), M4_DATABASE_NAME);
  await reload(page); await expect(page.locator('#takeover-run')).toBeVisible(); await expect(page.locator('#save-status')).toContainText('unsupported');
  await page.locator('#takeover-run').click(); await expect(page.locator('#temporary-run')).toBeVisible();
  expect(await journal(page, M4_DATABASE_NAME)).toEqual(future);
  await page.locator('#temporary-run').click(); await page.locator('#start-button').click();
  await expect.poll(async () => (await snapshot(page)).mode).toBe('playing'); expect((await snapshot(page)).temporaryRun).toBe(true);
  expect(await journal(page, M4_DATABASE_NAME)).toEqual(future); await expect(page.locator('#fatal')).toBeHidden();
});

test('audio preferences persist separately, mute suppresses SFX, and pause/settings/synthetic blur stop gameplay audio', async ({ page }) => {
  await begin(page); await expect.poll(async () => (await snapshot(page)).audio.status).toBe('running');
  await page.keyboard.press('Escape'); await page.locator('#settings-button').click();
  for (const key of ['master', 'effects', 'ui', 'ambience']) {
    const field = page.locator('#presentation-' + key); const before = Number(await field.inputValue());
    await field.focus(); await field.press('ArrowLeft');
    await expect.poll(async () => Number(await field.inputValue())).toBeLessThan(before);
  }
  await page.locator('#presentation-muted').check(); await page.locator('#presentation-reducedIntensity').check(); await page.locator('#presentation-reducedEffects').check();
  const preferences = (await snapshot(page)).audio.preferences;
  await page.locator('#settings-done').click(); const saved = await page.evaluate(key => localStorage.getItem(key), PRESENTATION_KEY);
  expect(JSON.parse(saved!)).toEqual(preferences);
  await page.locator('#start-button').click(); const muted = await snapshot(page);
  await page.mouse.down(); await page.waitForTimeout(250); await page.mouse.up();
  expect((await snapshot(page)).audio.played).toBe(muted.audio.played); expect((await snapshot(page)).audio.activeVoices).toBe(0);
  await page.keyboard.press('Escape'); await reload(page); await page.locator('#resume-m4').click();
  await expect.poll(async () => (await snapshot(page)).mode).toBe('playing'); expect((await snapshot(page)).audio.preferences).toEqual(preferences);
  await page.keyboard.press('Escape'); await page.locator('#settings-button').click();
  await page.locator('#presentation-muted').uncheck(); await page.locator('#settings-done').click(); await page.locator('#start-button').click();
  await expect.poll(async () => (await snapshot(page)).audio.gameplayPaused).toBe(false);
  const playing = (await snapshot(page)).audio.played;
  await page.mouse.down(); await page.waitForTimeout(250); await page.mouse.up();
  expect((await snapshot(page)).audio.played).toBeGreaterThan(playing);
  await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  const paused = await snapshot(page); expect(paused.audio.gameplayPaused).toBe(true); expect(paused.audio.activeVoices).toBe(0);
  await page.waitForTimeout(200); expect((await snapshot(page)).time).toBe(paused.time); expect((await snapshot(page)).audio.played).toBe(paused.audio.played);
  await page.locator('#settings-button').click(); const stopped = await snapshot(page); await page.waitForTimeout(150);
  expect((await snapshot(page)).time).toBe(stopped.time); expect((await snapshot(page)).audio.gameplayPaused).toBe(true);
  await page.locator('#settings-done').click(); await page.locator('#start-button').click();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect.poll(async () => (await snapshot(page)).mode).toBe('paused'); expect((await snapshot(page)).audio.gameplayPaused).toBe(true);
  await abandon(page); expect(await page.evaluate(key => localStorage.getItem(key), PRESENTATION_KEY)).not.toBeNull();
});

test('AudioContext refusal is recoverable without blocking M4 or sound settings', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'AudioContext', { configurable: true, value: class { constructor() { throw new DOMException('Denied test fixture', 'NotAllowedError'); } } }));
  await begin(page); await expect.poll(async () => (await snapshot(page)).audio.status).toBe('blocked');
  await page.keyboard.press('Escape'); await page.locator('#settings-button').click(); await page.locator('#enable-audio').click();
  await expect(page.locator('#presentation-status')).toContainText('blocked'); await page.locator('#settings-done').click(); await page.locator('#start-button').click();
  await expect.poll(async () => (await snapshot(page)).mode).toBe('playing'); await expect(page.locator('#fatal')).toBeHidden();
});

test('real M4 defeat settles once, removes its checkpoint, and restart preserves presentation settings', async ({ page }) => {
  test.setTimeout(45_000);
  await begin(page, 'm4', 'gloves'); const runId = m4(await snapshot(page)).runId;
  const preferences = await page.evaluate(key => localStorage.getItem(key), PRESENTATION_KEY);
  // Deliberately stand still and never attack: actual Jabbers resolve the defeat.
  await expect.poll(async () => (await snapshot(page)).mode, { timeout: 30_000 }).toBe('results');
  const ended = await snapshot(page); expect(ended.player.health).toBe(0); expect(ended.run!.outcome).toBe('defeat');
  const settled = await journal<M4RunCheckpoint>(page, M4_DATABASE_NAME);
  expect(settled.current).toBeNull(); expect(settled.previous).toBeNull(); expect(settled.settledRunIds).toEqual([runId]);
  expect(await page.evaluate(key => localStorage.getItem(key), PRESENTATION_KEY)).toBe(preferences);
  await page.locator('#start-button').click(); await expect.poll(async () => (await snapshot(page)).mode).toBe('playing');
  expect((await snapshot(page)).player.health).toBe(100); expect((await snapshot(page)).upgrades.owned).toEqual([]); expect(m4(await snapshot(page)).runId).not.toBe(runId);
  expect((await journal<M4RunCheckpoint>(page, M4_DATABASE_NAME)).settledRunIds).toEqual([runId]);
});
