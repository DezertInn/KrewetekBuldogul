import { test, expect, type Page } from '@playwright/test';
import { exitRoute } from './route-navigation';

const snapshot = (page: Page): Promise<any> => page.evaluate(() => (window as any).__prototype.snapshot());
const safeCheckpoint = (page: Page): Promise<any> => page.evaluate(() => new Promise((resolve, reject) => {
  const request = indexedDB.open('krewetek-buldogul-m4-runs'); request.onerror = () => reject(request.error);
  request.onsuccess = () => { const db = request.result, read = db.transaction('journal', 'readonly').objectStore('journal').get('state'); read.onsuccess = () => { resolve(read.result.current.checkpoint); db.close(); }; read.onerror = () => { reject(read.error); db.close(); }; };
}));

for (const weapon of ['gloves', 'pillar', 'rifle']) test(`M4 ${weapon}: six real rooms, stable offers, safe entries and Coach victory`, async ({ page }, info) => {
  test.setTimeout(150_000);
  // Reproducible reward seed; native UUID run/lease identity and all UI/combat stay intact.
  await page.addInitScript(() => {
    const random = crypto.getRandomValues.bind(crypto);
    Object.defineProperty(crypto, 'getRandomValues', { value: (array: any) => {
      if (array instanceof Uint32Array && array.length === 1) { array[0] = 42; return array; }
      return random(array);
    } });
  });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?debug=1');
  await page.waitForFunction(() => (window as any).__prototype?.snapshot().storageReady);
  await page.locator('#choose-m4').click(); await page.locator('#choose-' + weapon).click(); await page.locator('#start-button').click();
  const keys = new Set<string>(); let held = false, priorMode = '', lastDash = 0, offers = 0;
  const rooms: string[] = [], safeEntries: any[] = [], metrics: any[] = [];
  let route: { x: number; z: number }[] = [];
  async function release(next: string[] = []): Promise<void> {
    for (const key of keys) if (!next.includes(key)) { await page.keyboard.up(key); keys.delete(key); }
    for (const key of next) if (!keys.has(key)) { await page.keyboard.down(key); keys.add(key); }
  }
  async function allUp(): Promise<void> { await release(); if (held) { await page.mouse.up(); held = false; } }
  const until = Date.now() + 130_000;
  while (Date.now() < until) {
    let s = await snapshot(page);
    expect(s.mode).not.toBe('error');
    if (s.mode !== priorMode) { await allUp(); await page.waitForTimeout(50); priorMode = s.mode; route = s.mode === 'cleared' ? exitRoute(s.room, s.player.position) : []; }
    if (s.mode === 'results') break;
    if (s.mode === 'saving') { await page.waitForTimeout(60); continue; }
    if (s.mode === 'paused') { await page.locator('#start-button').click(); continue; }
    if (s.mode === 'reward') {
      const offer = s.run.offer; expect(offer).toHaveLength(3); expect(new Set(offer).size).toBe(3);
      expect(offer.every((id: string) => !s.upgrades.owned.includes(id))).toBeTruthy();
      await page.reload(); await page.waitForFunction(() => (window as any).__prototype?.snapshot().storageReady);
      await page.locator('#resume-m4').click();
      expect((await snapshot(page)).run.offer).toEqual(offer);
      const choice = ['SRC_SKLODOWSKA_02', 'SRC_GOD_03', 'SRC_CHOPIN_02', 'SRC_EAGLE_02'].find(id => offer.includes(id)) ?? offer[0];
      await page.locator(`[data-upgrade="${choice}"]`).click(); offers++; priorMode = ''; continue;
    }
    if (s.mode === 'playing' && !rooms.includes(s.run.roomId)) {
      await allUp(); rooms.push(s.run.roomId);
      const entry = (await safeCheckpoint(page)).carry;
      await page.reload(); await page.waitForFunction(() => (window as any).__prototype?.snapshot().storageReady);
      await page.locator('#resume-m4').click(); s = await snapshot(page);
      expect(s.run.roomId).toBe(rooms.at(-1)); expect((await safeCheckpoint(page)).carry).toEqual(entry);
      expect(s.player.attackPhase).toBe('ready'); expect(s.player.reloadRemaining).toBe(0);
      expect(s.player.health).toBe(entry.health); expect(s.player.ammo).toBe(entry.ammo);
      safeEntries.push({ room: s.run.roomId, carry: entry });
      await page.screenshot({ path: info.outputPath(`${weapon}-${s.run.roomId}.png`) });
      metrics.push(await page.evaluate(() => (window as any).__prototype.metrics()));
      priorMode = ''; continue;
    }
    let target: { x: number; z: number } | undefined, aim: { x: number; z: number } | undefined, dodge = false;
    const alive = s.enemies.filter((e: any) => e.health > 0).sort((a: any, b: any) => Math.hypot(a.position.x - s.player.position.x, a.position.z - s.player.position.z) - Math.hypot(b.position.x - s.player.position.x, b.position.z - s.player.position.z));
    const enemy = alive[0];
    if (s.mode === 'cleared') {
      expect(s.run.clearedRooms.length % 2).toBe(1); expect(s.run.offer).toEqual([]);
      if (Math.hypot(s.room.exit.x - s.player.position.x, s.room.exit.z - s.player.position.z) < 1) { await allUp(); await page.keyboard.press('e'); await page.waitForTimeout(100); continue; }
      while (route.length > 1 && Math.hypot(route[0].x - s.player.position.x, route[0].z - s.player.position.z) < 0.6) route.shift();
      target = route[0] ?? s.room.exit;
    } else if (enemy) {
      aim = enemy.position;
      const distance = Math.hypot(aim!.x - s.player.position.x, aim!.z - s.player.position.z);
      const wanted = weapon === 'rifle' ? 4 : weapon === 'pillar' ? 2.1 : 1.5;
      if (distance > wanted + 0.12) target = aim;
      else if (weapon === 'rifle' && distance < 3) target = { x: s.player.position.x + (s.player.position.x - aim!.x) * 3, z: s.player.position.z + (s.player.position.z - aim!.z) * 3 };
      if (weapon === 'pillar' && distance < 2.8) {
        const dx = s.player.position.x - aim!.x, dz = s.player.position.z - aim!.z;
        target = { x: s.player.position.x + dx * 2 - dz * 0.5, z: s.player.position.z + dz * 2 + dx * 0.5 };
        if (Math.abs(s.player.position.x) > s.room.halfWidth - 1.8 || Math.abs(s.player.position.z) > s.room.halfDepth - 1.8) target = { x: 0, z: 0 };
      }
      if (['preparation', 'guard', 'active'].includes(enemy.phase) && (weapon !== 'pillar' || enemy.archetype === 'B01_M01')) {
        const dx = s.player.position.x - aim!.x, dz = s.player.position.z - aim!.z;
        target = { x: aim!.x - dz, z: aim!.z + dx };
        dodge = enemy.phase === 'preparation' && enemy.attackProgress >= 0.35 && s.player.dashCooldown === 0 && Date.now() - lastDash > 500;
      }
    }
    const points = await page.evaluate(({ aim, target }) => {
      const debug = (window as any).__prototype;
      return { aim: aim && debug.project(aim), target: target && debug.project(target), player: debug.project(debug.snapshot().player.position) };
    }, { aim, target });
    if (points.aim) await page.mouse.move(points.aim.x, points.aim.y);
    if (enemy && s.mode === 'playing' && !held) { await page.mouse.down(); held = true; }
    else if (!enemy && held) { await page.mouse.up(); held = false; }
    const next: string[] = [];
    if (points.target) { const dx = points.target.x - points.player.x, dy = points.target.y - points.player.y; if (Math.abs(dx) > 12) next.push(dx > 0 ? 'd' : 'a'); if (Math.abs(dy) > 8) next.push(dy > 0 ? 's' : 'w'); }
    await release(next);
    if (dodge) { await page.keyboard.press('Space'); lastDash = Date.now(); }
    await page.waitForTimeout(75);
  }
  await allUp(); const final = await snapshot(page);
  expect(final.mode).toBe('results'); expect(final.run.outcome).toBe('victory');
  expect(rooms).toEqual(['B01L01_R01', 'B01L01_R02', 'B01L02_R01', 'B01L02_R02', 'B01L03_R01', 'B01L03_R02']);
  expect(offers).toBe(2); expect(final.run.rewards).toHaveLength(2); expect(final.upgrades.owned).toHaveLength(2);
  expect(final.run.clearedRooms).toHaveLength(6); expect(final.savedM4).toBe(false); expect(errors).toEqual([]);
  await info.attach('M4-route-evidence', { body: JSON.stringify({ weapon, safeEntries, metrics, final: final.run, errors }, null, 2), contentType: 'application/json' });
  await page.locator('#start-button').click(); await expect.poll(async () => (await snapshot(page)).mode).toBe('playing');
  expect((await snapshot(page)).player.health).toBe(100); expect((await snapshot(page)).upgrades.owned).toEqual([]);
});
