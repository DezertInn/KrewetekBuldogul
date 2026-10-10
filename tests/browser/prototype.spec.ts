import { test, expect, type Page } from '@playwright/test';
import type { GameState } from '../../src/game/types';
type Snapshot = GameState & { mode: string; settingsOpen: boolean };
const snapshot = (page: Page): Promise<Snapshot> => page.evaluate(() => (window as any).__prototype.snapshot());
const delay = (page: Page, ms: number) => page.waitForTimeout(ms);
async function keyHold(page: Page, keys: string[], ms: number): Promise<void> {
  for (const key of keys) await page.keyboard.down(key);
  await delay(page, ms);
  for (const key of keys) await page.keyboard.up(key);
}
async function openGym(page: Page): Promise<void> {
  await page.goto('/?debug=1');
  await expect(page.locator('#fatal')).toBeHidden();
  await expect(page.locator('#start-button')).toBeVisible();
  await page.waitForFunction(() => Boolean((window as any).__prototype));
}
async function begin(page: Page, weapon = 'gloves', round = 'dummy'): Promise<void> {
  await openGym(page);
  await page.locator('#choose-' + weapon).click();
  await page.locator('#choose-' + round).click();
  await page.locator('#start-button').click();
  await expect.poll(async () => (await snapshot(page)).mode).toBe('playing');
}
async function reset(page: Page): Promise<void> {
  if ((await snapshot(page)).mode === 'playing') await page.keyboard.press('Escape');
  await expect.poll(async () => (await snapshot(page)).mode).toBe('paused');
  await page.locator('#restart-button').click();
  await expect(page.locator('#confirm-reset')).toBeVisible();
  await page.locator('#confirm-reset').click();
  await expect.poll(async () => (await snapshot(page)).mode).toBe('playing');
}
async function aimDummy(page: Page): Promise<void> {
  const target = await page.evaluate(() => (window as any).__prototype.project((window as any).__prototype.snapshot().dummy.position));
  await page.mouse.move(target.x, target.y);
}
test('accepted glove feel, movement, dash, collision, safety, restart and responsive production view', async ({ page, browser }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
  await begin(page);
  await page.keyboard.down('w'); await page.keyboard.down('d');
  await delay(page, 50);
  const initial = await snapshot(page);
  await delay(page, 250);
  const moved = await snapshot(page);
  await page.keyboard.up('w'); await page.keyboard.up('d');
  expect(moved.player.position.z).toBeGreaterThan(initial.player.position.z + 1.2);
  expect(Math.abs(moved.player.position.x - initial.player.position.x)).toBeLessThan(0.08);
  await aimDummy(page); await delay(page, 70);
  expect((await snapshot(page)).player.facing.z).toBeGreaterThan(0.95);
  await page.mouse.down(); await delay(page, 1100); await page.mouse.up();
  expect((await snapshot(page)).damageTotal).toBeGreaterThanOrEqual(100);
  await page.screenshot({ path: info.outputPath('gloves.png') });
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await snapshot(page)).mode).toBe('paused');
  const paused = await snapshot(page); await delay(page, 180);
  expect((await snapshot(page)).time).toBe(paused.time);
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#restart-button')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#cancel-reset')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await snapshot(page)).mode).toBe('paused');
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await snapshot(page)).mode).toBe('playing');
  await reset(page);
  expect((await snapshot(page)).damageTotal).toBe(0);
  await page.keyboard.press('Space'); await delay(page, 360);
  const dashed = await snapshot(page);
  expect(dashed.player.position.z).toBeCloseTo(0.5, 1);
  expect(dashed.player.dashCooldown).toBeGreaterThan(0);
  await keyHold(page, ['s', 'a'], 1600);
  expect((await snapshot(page)).player.position.z).toBeGreaterThanOrEqual(-5.661);
  expect((await snapshot(page)).player.position.z).toBeLessThan(-5.3);
  await reset(page);
  await keyHold(page, ['w', 'd'], 120);
  await keyHold(page, ['s', 'd'], 1100);
  const againstBench = await snapshot(page);
  expect(againstBench.player.position.x).toBeGreaterThan(2.5);
  expect(againstBench.player.position.x).toBeLessThan(3.2);
  await page.keyboard.down('w');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect.poll(async () => (await snapshot(page)).mode).toBe('paused');
  await page.keyboard.up('w');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot(page)).mode).toBe('playing');
  const resumed = await snapshot(page); await delay(page, 140);
  expect((await snapshot(page)).player.position).toEqual(resumed.player.position);
  for (const size of [{ width: 960, height: 720 }, { width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(size); await delay(page, 100);
    const canvas = await page.locator('#game').boundingBox();
    expect(canvas!.width).toBe(size.width); expect(canvas!.height).toBeGreaterThan(350);
    await page.screenshot({ path: info.outputPath('viewport-' + size.width + '.png') });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await reset(page); await delay(page, 5000);
  const metrics = { ...await page.evaluate(() => ({ ...(window as any).__prototype.metrics(), userAgent: navigator.userAgent })), browserVersion: browser.version() };
  await info.attach('performance-observation', { body: JSON.stringify(metrics, null, 2), contentType: 'application/json' });
  console.log(info.project.name + ' performance: ' + JSON.stringify(metrics));
  expect(errors).toEqual([]);
});

test('glove reach hits beyond the old range and misses beyond the new boundary', async ({ page }, info) => {
  await begin(page);
  await page.keyboard.down('w'); await page.keyboard.down('d');
  await page.waitForFunction(() => (window as any).__prototype.snapshot().player.position.z >= -1.28);
  await page.keyboard.up('w'); await page.keyboard.up('d');
  const inReach = await snapshot(page);
  const distance = Math.hypot(inReach.player.position.x - inReach.dummy.position.x, inReach.player.position.z - inReach.dummy.position.z);
  expect(distance).toBeGreaterThan(1.5 + inReach.dummy.radius);
  expect(distance).toBeLessThan(1.95 + inReach.dummy.radius);
  await aimDummy(page); await page.mouse.down(); await delay(page, 30); await page.mouse.up();
  await expect.poll(async () => (await snapshot(page)).damageTotal).toBe(20);
  await page.screenshot({ path: info.outputPath('refined-reach.png') });
  await page.keyboard.down('s'); await page.keyboard.down('a');
  await page.waitForFunction(() => (window as any).__prototype.snapshot().player.position.z <= -1.65);
  await page.keyboard.up('s'); await page.keyboard.up('a');
  await aimDummy(page); await page.mouse.down(); await delay(page, 30); await page.mouse.up(); await delay(page, 350);
  expect((await snapshot(page)).damageTotal).toBe(20);
});

test('rifle selection, precise damage, R reload without restart and automatic magazine cycle', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await begin(page, 'rifle');
  expect((await snapshot(page)).weapon).toBe('weapon_01');
  await aimDummy(page); await page.mouse.down(); await delay(page, 30); await page.mouse.up();
  await expect.poll(async () => (await snapshot(page)).player.ammo).toBe(19);
  expect((await snapshot(page)).damageTotal).toBeCloseTo(21.6, 6);
  await page.keyboard.press('r');
  await expect.poll(async () => (await snapshot(page)).player.reloadRemaining).toBeGreaterThan(0);
  const reloading = await snapshot(page);
  expect(reloading.damageTotal).toBeCloseTo(21.6, 6);
  expect(reloading.mode).toBe('playing');
  await expect(page.locator('#combat-status')).toContainText('Reloading');
  await page.screenshot({ path: info.outputPath('rifle-reload.png') });
  await expect.poll(async () => (await snapshot(page)).player.ammo).toBe(20);
  await aimDummy(page); await page.mouse.down();
  await expect.poll(async () => (await snapshot(page)).player.reloadRemaining, { timeout: 6000 }).toBeGreaterThan(0);
  await page.mouse.up();
  expect((await snapshot(page)).player.ammo).toBe(0);
  await expect.poll(async () => (await snapshot(page)).player.ammo).toBe(20);
  expect((await snapshot(page)).damageTotal).toBeCloseTo(453.6, 5);
  expect(errors).toEqual([]);
});

test('pillar attack has readable windup and damages once, equipment changes start clean', async ({ page }, info) => {
  await begin(page, 'pillar');
  await keyHold(page, ['w', 'd'], 160);
  await aimDummy(page); await page.mouse.down(); await delay(page, 30); await page.mouse.up();
  await expect.poll(async () => (await snapshot(page)).player.attackPhase).toBe('startup');
  expect((await snapshot(page)).damageTotal).toBe(0);
  await page.screenshot({ path: info.outputPath('pillar-windup.png') });
  await expect.poll(async () => (await snapshot(page)).damageTotal).toBe(180);
  await delay(page, 1100);
  expect((await snapshot(page)).hits).toBe(1);
  await page.keyboard.press('Escape');
  await page.locator('#preparation-button').click();
  await page.locator('#confirm-reset').click();
  await expect.poll(async () => (await snapshot(page)).mode).toBe('preparation');
  await page.locator('#choose-rifle').click();
  await page.locator('#start-button').click();
  const fresh = await snapshot(page);
  expect(fresh.weapon).toBe('weapon_01'); expect(fresh.hits).toBe(0);
  expect(fresh.player.ammo).toBe(20); expect(fresh.player.health).toBe(100);
});

test('boxer encounter telegraphs, player damage, pause, defeat and retry', async ({ page }, info) => {
  test.setTimeout(65000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await begin(page, 'gloves', 'encounter');
  expect((await snapshot(page)).enemies).toHaveLength(3);
  await page.waitForFunction(() => (window as any).__prototype.snapshot().enemies.some((enemy: any) => enemy.phase === 'preparation'));
  await page.screenshot({ path: info.outputPath('boxer-telegraph.png') });
  await expect.poll(async () => (await snapshot(page)).player.health).toBeLessThan(100);
  await page.keyboard.press('Escape');
  const paused = await snapshot(page);
  await delay(page, 500);
  expect((await snapshot(page)).time).toBe(paused.time);
  expect((await snapshot(page)).player.health).toBe(paused.player.health);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await snapshot(page)).outcome, { timeout: 35000 }).toBe('defeat');
  await expect.poll(async () => (await snapshot(page)).mode).toBe('results');
  const defeated = await snapshot(page); await delay(page, 300);
  expect((await snapshot(page)).time).toBe(defeated.time);
  await page.screenshot({ path: info.outputPath('defeat.png') });
  await page.locator('#start-button').click();
  expect((await snapshot(page)).player.health).toBe(100);
  expect((await snapshot(page)).damageTotal).toBe(0);
  expect(errors).toEqual([]);
});

test('pillar encounter cleave, completion and return to preparation', async ({ page }, info) => {
  await begin(page, 'pillar', 'encounter');
  await page.mouse.down();
  for (let attempt = 0; attempt < 90; attempt++) {
    const state = await snapshot(page);
    if (state.outcome !== 'playing') break;
    const target = state.enemies.filter(enemy => enemy.health > 0).sort((a, b) => Math.hypot(a.position.x - state.player.position.x, a.position.z - state.player.position.z) - Math.hypot(b.position.x - state.player.position.x, b.position.z - state.player.position.z))[0];
    const point = await page.evaluate(position => (window as any).__prototype.project(position), target.position);
    await page.mouse.move(point.x, point.y);
    await delay(page, 100);
  }
  await page.mouse.up();
  await expect.poll(async () => (await snapshot(page)).outcome).toBe('complete');
  const state = await snapshot(page);
  expect(state.hits).toBe(3); expect(state.damageTotal).toBe(300);
  expect(state.enemies.every(enemy => enemy.phase === 'defeated')).toBe(true);
  await page.screenshot({ path: info.outputPath('complete.png') });
  await page.locator('#preparation-button').click();
  await expect.poll(async () => (await snapshot(page)).mode).toBe('preparation');
});

test('simulated standard controller menus, analog input and disconnect gates', async ({ page }) => {
  await page.addInitScript(() => {
    const pad = { id: 'Xbox test fixture (standard)', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), timestamp: 0 };
    (window as any).__testPad = pad;
    Object.defineProperty(navigator, 'getGamepads', { value: () => pad.connected ? [pad] : [] });
  });
  const button = async (index: number, down: boolean) => {
    await page.evaluate(async ({ index, down }) => {
      // A synthetic Gamepad has no event queue: hold each state across actual input
      // polls, even if a busy browser does not render during an 80 ms wall-clock wait.
      const sampledFrames = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      await sampledFrames();
      (window as any).__testPad.buttons[index] = { pressed: down, touched: down, value: down ? 1 : 0 };
      await sampledFrames();
    }, { index, down });
  };
  await openGym(page); await page.locator('#choose-dummy').click(); await page.locator('#start-button').focus(); await delay(page, 100);
  await button(0, true); await button(0, false);
  expect((await snapshot(page)).mode).toBe('playing');
  await page.evaluate(() => { (window as any).__testPad.axes = [0.5, 0, 0, 0]; }); await delay(page, 250);
  await page.evaluate(() => { (window as any).__testPad.axes = [0, 0, 0, 0]; });
  expect((await snapshot(page)).player.position.x).toBeGreaterThan(0.2);
  await button(9, true); await button(9, false);
  expect((await snapshot(page)).mode).toBe('paused');
  await button(7, true);
  await button(0, true); await button(0, false); await delay(page, 400);
  expect((await snapshot(page)).player.attackPhase).toBe('ready');
  await button(7, false);
  await page.evaluate(() => { (window as any).__testPad.connected = false; });
  await expect.poll(async () => (await snapshot(page)).mode).toBe('paused');
  await page.evaluate(() => { (window as any).__testPad.connected = true; }); await delay(page, 120);
  expect((await snapshot(page)).mode).toBe('paused');
  await button(0, true); await button(0, false);
  expect((await snapshot(page)).mode).toBe('playing');
  await button(6, true); await button(6, false);
  expect((await snapshot(page)).player.dashCooldown).toBeGreaterThan(0);
});
