import { test, expect, type Page } from '@playwright/test';
import type { GameState } from '../../src/game/types';
import type { RunCheckpoint } from '../../src/run/director';
import { RUN_TAB_OWNER_KEY } from '../../src/run/storage';
import { STORAGE_KEY } from '../../src/input/settings';

type Snapshot = GameState & { mode: string; run: RunCheckpoint | null; storageReady: boolean; temporaryRun: boolean; saveStatus: string };
const snapshot = (page: Page): Promise<Snapshot> => page.evaluate(() => (window as any).__prototype.snapshot());
async function open(page: Page): Promise<void> {
  await page.goto('/?debug=1');
  await page.waitForFunction(() => (window as any).__prototype?.snapshot().storageReady);
  await expect(page.locator('#fatal')).toBeHidden();
}
async function begin(page: Page, weapon: string): Promise<void> {
  await open(page);
  await page.locator('#choose-' + weapon).click();
  await page.locator('#choose-run').click();
  await page.locator('#start-button').click();
  await expect.poll(async () => (await snapshot(page)).mode).toBe('playing');
}
/** Real pointer aim/attack; no mutation of the simulation or enemies. */
async function clearStage(page: Page): Promise<void> {
  await page.mouse.down();
  for (let attempt = 0; attempt < 200; attempt++) {
    const s = await snapshot(page);
    if (s.mode !== 'playing') break;
    const target = s.enemies.filter(enemy => enemy.health > 0).sort((a, b) => Math.hypot(a.position.x - s.player.position.x, a.position.z - s.player.position.z) - Math.hypot(b.position.x - s.player.position.x, b.position.z - s.player.position.z))[0];
    if (target) {
      const point = await page.evaluate(position => (window as any).__prototype.project(position), target.position);
      await page.mouse.move(point.x, point.y);
    }
    await page.waitForTimeout(100);
  }
  await page.mouse.up();
  await expect.poll(async () => (await snapshot(page)).mode).toMatch(/reward|results|conflict/);
}

for (const weapon of ['gloves', 'rifle', 'pillar']) test(`M3 ${weapon}: three stages, two rewards, saved offer and fresh restart`, async ({ page }, info) => {
  test.setTimeout(100000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await begin(page, weapon);
  expect((await snapshot(page)).run?.carry.upgrades.owned).toEqual([]);
  await clearStage(page);
  expect((await snapshot(page)).mode).toBe('reward');
  const pending = (await snapshot(page)).run!;
  expect(pending.offer).toHaveLength(3);
  expect(new Set(pending.offer).size).toBe(3);
  await page.screenshot({ path: info.outputPath('m3-reward.png') });
  await page.reload();
  await page.waitForFunction(() => (window as any).__prototype?.snapshot().storageReady);
  await expect(page.locator('#resume-run')).toBeVisible();
  await page.locator('#resume-run').click();
  await expect.poll(async () => (await snapshot(page)).mode).toBe('reward');
  expect((await snapshot(page)).run).toEqual(pending);
  // The restored menu focuses an offered upgrade; confirm uses the existing action layer.
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot(page)).mode).toBe('playing');
  expect((await snapshot(page)).run?.stageIndex).toBe(1);
  expect((await snapshot(page)).upgrades.owned).toEqual([pending.offer[0]]);
  expect((await snapshot(page)).player.health).toBe(pending.carry.health);
  await clearStage(page);
  expect((await snapshot(page)).mode).toBe('reward');
  const second = (await snapshot(page)).run!;
  expect(second.offer).not.toContain(pending.offer[0]);
  await page.locator('[data-upgrade="' + second.offer[0] + '"]').click();
  await expect.poll(async () => (await snapshot(page)).mode).toBe('playing');
  expect((await snapshot(page)).upgrades.owned).toHaveLength(2);
  await clearStage(page);
  await expect(page.locator('#run-summary')).toContainText('victory');
  expect((await snapshot(page)).run?.rewards).toHaveLength(2);
  await page.screenshot({ path: info.outputPath('m3-result.png') });
  await page.locator('#start-button').click();
  await expect.poll(async () => (await snapshot(page)).mode).toBe('playing');
  expect((await snapshot(page)).upgrades.owned).toEqual([]);
  expect((await snapshot(page)).player.health).toBe(100);
  await page.reload();
  await page.waitForFunction(() => (window as any).__prototype?.snapshot().storageReady);
  await expect(page.locator('#resume-run')).toBeVisible();
  await page.locator('#resume-run').click();
  await expect.poll(async () => (await snapshot(page)).mode).toBe('playing');
  expect((await snapshot(page)).run?.stageIndex).toBe(0);
  expect(errors).toEqual([]);
});

test('M3 two tabs require deliberate takeover; stale tab cannot overwrite the saved run', async ({ page, context }) => {
  await begin(page, 'pillar');
  const original = (await snapshot(page)).run!;
  const second = await context.newPage(); await open(second);
  await expect(second.locator('#takeover-run')).toBeVisible();
  await second.locator('#takeover-run').click();
  await expect(second.locator('#resume-run')).toBeVisible();
  await second.locator('#resume-run').click();
  await expect.poll(async () => (await snapshot(second)).mode).toBe('playing');
  expect((await snapshot(second)).run?.runId).toBe(original.runId);
  await page.bringToFront();
  if ((await snapshot(page)).mode === 'paused') await page.locator('#start-button').click();
  await clearStage(page);
  await expect(page.locator('#takeover-run')).toBeVisible();
  await page.locator('#temporary-run').click();
  await expect.poll(async () => (await snapshot(page)).temporaryRun).toBe(true);
  await expect(page.locator('#save-status')).toContainText('not saved');
  await second.close();
});

test('M3 denied IndexedDB remains playable and reports an unsaved session', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'indexedDB', { get() { throw new DOMException('Denied', 'SecurityError'); } }));
  await begin(page, 'pillar');
  await page.keyboard.press('Escape');
  await expect(page.locator('#save-status')).toContainText(/not saved|unavailable/i);
  await expect(page.locator('#start-button')).toBeVisible();
  await expect(page.locator('#fatal')).toBeHidden();
});

test('M3 duplicated sessionStorage cannot reuse the original tab ownership', async ({ page, context }) => {
  await begin(page, 'pillar');
  const entries = await page.evaluate(() => Object.entries(sessionStorage));
  const owner = entries.find(([key]) => key === RUN_TAB_OWNER_KEY)?.[1];
  expect(owner).toBeTruthy();
  const duplicate = await context.newPage();
  // Browser Duplicate copies sessionStorage. Reproduce that copy before the new document starts.
  await duplicate.addInitScript(items => items.forEach(([key, value]) => sessionStorage.setItem(key, value)), entries);
  await open(duplicate);
  await expect(duplicate.locator('#takeover-run')).toBeVisible();
  expect(await duplicate.evaluate(key => sessionStorage.getItem(key), RUN_TAB_OWNER_KEY)).not.toBe(owner);
  expect(await page.evaluate(key => sessionStorage.getItem(key), RUN_TAB_OWNER_KEY)).toBe(owner);
  await duplicate.close();
  await page.bringToFront();
  await page.reload();
  await page.waitForFunction(() => (window as any).__prototype?.snapshot().storageReady);
  await expect(page.locator('#resume-run')).toBeVisible();
  expect(await page.evaluate(key => sessionStorage.getItem(key), RUN_TAB_OWNER_KEY)).toBe(owner);
});

test('M3 remapped keyboard/controller rewards freeze play; abandoning resets the run and retains controls', async ({ page }) => {
  test.setTimeout(60000);
  await page.addInitScript(() => {
    const pad = { id: 'M3 simulated standard controller', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), timestamp: 0 };
    (window as any).__m3Pad = pad;
    Object.defineProperty(navigator, 'getGamepads', { value: () => [pad] });
  });
  const button = async (index: number, down: boolean) => page.evaluate(async ({ index, down }) => {
    const sampled = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await sampled(); (window as any).__m3Pad.buttons[index] = { pressed: down, value: down ? 1 : 0 }; await sampled();
  }, { index, down });
  await begin(page, 'pillar'); await clearStage(page);
  const first = (await snapshot(page)).run!;
  await expect(page.locator('#reward-options')).toBeVisible();
  await page.locator('#settings-button').click();
  for (const [action, key] of [['confirm', 'f'], ['back', 'g']]) {
    await page.locator('#bind-' + action).click();
    await expect(page.locator('#capture-status')).toContainText('Press a key');
    await page.keyboard.press(key); await expect(page.locator('#capture-status')).toContainText('New binding');
    await page.locator('#binding-apply').click();
  }
  await page.locator('#settings-kind').selectOption('controller');
  await page.locator('#bind-confirm').click();
  await expect(page.locator('#capture-status')).toContainText('Press a key');
  await button(10, true); await button(10, false);
  await expect(page.locator('#capture-status')).toContainText('Button 11');
  await page.locator('#binding-apply').click();
  await page.locator('#settings-done').click();
  const stopped = await snapshot(page); await page.waitForTimeout(200);
  expect((await snapshot(page)).time).toBe(stopped.time);
  expect((await snapshot(page)).run).toEqual(first);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-upgrade="' + first.offer[1] + '"]')).toBeFocused();
  await page.keyboard.press('f');
  await expect.poll(async () => (await snapshot(page)).mode).toBe('playing');
  expect((await snapshot(page)).upgrades.owned).toEqual([first.offer[1]]);
  await clearStage(page); await expect(page.locator('#reward-options')).toBeVisible();
  const second = (await snapshot(page)).run!;
  await button(15, true); await button(15, false);
  await expect(page.locator('[data-upgrade="' + second.offer[1] + '"]')).toBeFocused();
  await button(10, true); await button(10, false);
  await expect.poll(async () => (await snapshot(page)).mode).toBe('playing');
  expect((await snapshot(page)).upgrades.owned).toHaveLength(2);
  await page.keyboard.press('Escape');
  await page.locator('#preparation-button').click();
  await expect(page.locator('#confirm-reset')).toBeVisible();
  await page.keyboard.press('g');
  await expect.poll(async () => (await snapshot(page)).mode).toBe('paused');
  await page.locator('#preparation-button').click(); await page.locator('#confirm-reset').click();
  await expect.poll(async () => (await snapshot(page)).mode).toBe('preparation');
  await expect(page.locator('#resume-run')).toBeHidden();
  const controls = await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY);
  await page.reload(); await page.waitForFunction(() => (window as any).__prototype?.snapshot().storageReady);
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe(controls);
  await expect(page.locator('#resume-run')).toBeHidden();
  await page.locator('#choose-run').click(); await page.locator('#start-button').click();
  await expect.poll(async () => (await snapshot(page)).mode).toBe('playing');
  expect((await snapshot(page)).upgrades.owned).toEqual([]);
  expect((await snapshot(page)).player.health).toBe(100);
});
