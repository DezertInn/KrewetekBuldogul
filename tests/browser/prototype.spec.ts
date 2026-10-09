import { test, expect, type Page } from '@playwright/test';
import type { GameState } from '../../src/game/types';
type Snapshot = GameState & { mode: string };
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
test('playable production build: movement, aiming, attacks, dash, safety, reset and resize', async ({ page, browser }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await openGym(page);
  await page.screenshot({ path: info.outputPath('welcome.png') });
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot(page)).mode).toBe('playing');
  const initial = await snapshot(page);
  await keyHold(page, ['w', 'd'], 340);
  const moved = await snapshot(page);
  expect(moved.player.position.z).toBeGreaterThan(initial.player.position.z + 1.2);
  expect(Math.abs(moved.player.position.x)).toBeLessThan(0.2);
  const target = await page.evaluate(() => (window as any).__prototype.project((window as any).__prototype.snapshot().dummy.position));
  await page.mouse.move(target.x, target.y);
  await delay(page, 60);
  const aimed = await snapshot(page);
  expect(aimed.player.facing.z).toBeGreaterThan(0.95);
  await page.mouse.down(); await delay(page, 1100); await page.mouse.up();
  await expect.poll(async () => (await snapshot(page)).damageTotal).toBeGreaterThanOrEqual(100);
  expect((await snapshot(page)).dummy.health).toBeLessThan(1000);
  await page.screenshot({ path: info.outputPath('training.png') });
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await snapshot(page)).mode).toBe('paused');
  const paused = await snapshot(page); await delay(page, 180);
  expect((await snapshot(page)).time).toBe(paused.time);
  await page.keyboard.press('Tab'); await expect(page.locator('#restart-button')).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.locator('#start-button')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot(page)).mode).toBe('playing');
  await page.keyboard.press('r'); await delay(page, 80);
  expect((await snapshot(page)).damageTotal).toBe(0);
  await page.keyboard.press('Space'); await delay(page, 360);
  const dashed = await snapshot(page);
  expect(dashed.player.position.z).toBeCloseTo(0.5, 1);
  expect(dashed.player.dashCooldown).toBeGreaterThan(0);
  await keyHold(page, ['s', 'a'], 250);
  expect((await snapshot(page)).player.position.z).toBeLessThan(dashed.player.position.z - 0.5);
  // Drive into an authored room boundary through the real input layer.
  await keyHold(page, ['s', 'a'], 1500);
  expect((await snapshot(page)).player.position.z).toBeGreaterThanOrEqual(-5.661);
  expect((await snapshot(page)).player.position.z).toBeLessThan(-5.3);
  await page.keyboard.press('r');
  await expect.poll(async () => (await snapshot(page)).player.position.z).toBe(-2.5);
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
  await page.setViewportSize({ width: 960, height: 720 }); await delay(page, 150);
  const canvas = await page.locator('#game').boundingBox();
  expect(canvas!.width).toBe(960); expect(canvas!.height).toBeGreaterThan(400);
  await page.screenshot({ path: info.outputPath('resized.png') });
  for (const size of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(size); await delay(page, 100);
    await page.screenshot({ path: info.outputPath(`viewport-${size.width}.png`) });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.keyboard.press('r'); await delay(page, 5000);
  const metrics = { ...await page.evaluate(() => ({ ...(window as any).__prototype.metrics(), userAgent: navigator.userAgent })), browserVersion: browser.version() };
  await info.attach('performance-observation', { body: JSON.stringify(metrics, null, 2), contentType: 'application/json' });
  console.log(`${info.project.name} performance: ${JSON.stringify(metrics)}`);
  expect(errors).toEqual([]);
});

test('refined glove reach connects beyond the old limit and misses beyond the new limit', async ({ page }, info) => {
  await openGym(page);
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot(page)).mode).toBe('playing');
  await page.keyboard.down('w'); await page.keyboard.down('d');
  await page.waitForFunction(() => (window as any).__prototype.snapshot().player.position.z >= -1.28);
  await page.keyboard.up('w'); await page.keyboard.up('d');
  const inReach = await snapshot(page);
  const distance = Math.hypot(inReach.player.position.x - inReach.dummy.position.x, inReach.player.position.z - inReach.dummy.position.z);
  expect(distance).toBeGreaterThan(1.5 + inReach.dummy.radius);
  expect(distance).toBeLessThan(1.95 + inReach.dummy.radius);
  const target = await page.evaluate(() => (window as any).__prototype.project((window as any).__prototype.snapshot().dummy.position));
  await page.mouse.click(target.x, target.y);
  await expect.poll(async () => (await snapshot(page)).damageTotal).toBe(20);
  await page.screenshot({ path: info.outputPath('refined-reach.png') });
  await page.keyboard.down('s'); await page.keyboard.down('a');
  await page.waitForFunction(() => (window as any).__prototype.snapshot().player.position.z <= -1.65);
  await page.keyboard.up('s'); await page.keyboard.up('a');
  const outOfReach = await snapshot(page);
  expect(outOfReach.dummy.position.z - outOfReach.player.position.z).toBeGreaterThan(1.95 + outOfReach.dummy.radius);
  await page.mouse.click(target.x, target.y); await delay(page, 350);
  expect((await snapshot(page)).damageTotal).toBe(20);
});

test('simulated standard controller: menus, analog input, disconnect and held-attack gate', async ({ page }) => {
  await page.addInitScript(() => {
    const pad = { id: 'Xbox test fixture (standard)', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), timestamp: 0 };
    (window as any).__testPad = pad;
    Object.defineProperty(navigator, 'getGamepads', { value: () => pad.connected ? [pad] : [] });
  });
  const button = async (index: number, down: boolean) => {
    await page.evaluate(({ index, down }) => { (window as any).__testPad.buttons[index] = { pressed: down, touched: down, value: down ? 1 : 0 }; }, { index, down });
    await delay(page, 80);
  };
  await openGym(page); await delay(page, 100);
  await expect(page.locator('#controller-status')).toContainText('Xbox detected');
  await button(0, true); await button(0, false);
  expect((await snapshot(page)).mode).toBe('playing');
  await page.evaluate(() => { (window as any).__testPad.axes = [0.5, 0, 0, 0]; }); await delay(page, 250);
  await page.evaluate(() => { (window as any).__testPad.axes = [0, 0, 0, 0]; });
  expect((await snapshot(page)).player.position.x).toBeGreaterThan(0.2);
  await button(9, true); await button(9, false);
  expect((await snapshot(page)).mode).toBe('paused');
  await button(13, true); await button(13, false);
  await expect(page.locator('#restart-button')).toBeFocused();
  await button(0, true); await button(0, false);
  expect((await snapshot(page)).player.position).toEqual({ x: 0, z: -2.5 });
  await button(7, true); // Hold attack across pause and deliberate resume.
  await button(9, true); await button(9, false);
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
