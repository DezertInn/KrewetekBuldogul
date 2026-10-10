import { test, expect, type Page } from '@playwright/test';
import { STORAGE_KEY } from '../../src/input/settings';
async function open(page: Page): Promise<void> {
  await page.goto('/?debug=1');
  await page.waitForFunction(() => Boolean((window as any).__prototype));
  await expect(page.locator('#fatal')).toBeHidden();
  await page.locator('#choose-dummy').click();
}
async function settings(page: Page): Promise<void> {
  await page.locator('#settings-button').click();
  await expect(page.locator('#controls-settings')).toBeVisible();
}
async function captureKey(page: Page, action: string, key: string): Promise<void> {
  await page.locator('#bind-' + action).click();
  await expect(page.locator('#capture-status')).toContainText('Press a key');
  await page.keyboard.press(key);
  await expect(page.locator('#capture-status')).toContainText('New binding');
}
const state = (page: Page): Promise<any> => page.evaluate(() => (window as any).__prototype.snapshot());
test('keyboard binding capture, persistence, dynamic prompts and context isolation', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await open(page); await settings(page);
  await captureKey(page, 'attack', 'f');
  await expect(page.locator('#binding-apply')).toBeVisible();
  await page.locator('#binding-apply').click();
  await expect(page.locator('#bind-attack')).toHaveText('F');
  await page.screenshot({ path: info.outputPath('bindings.png') });
  await page.locator('#settings-done').click();
  await expect(page.locator('#controls-help')).toContainText('F');
  await page.reload(); await page.waitForFunction(() => Boolean((window as any).__prototype));
  await page.locator('#choose-dummy').click();
  await expect(page.locator('#controls-help')).toContainText('F');
  await page.locator('#start-button').click();
  await page.keyboard.down('w'); await page.keyboard.down('d'); await page.waitForTimeout(250); await page.keyboard.up('w'); await page.keyboard.up('d');
  const target = await page.evaluate(() => (window as any).__prototype.project((window as any).__prototype.snapshot().dummy.position));
  await page.mouse.move(target.x, target.y);
  await page.keyboard.press('f');
  await expect.poll(async () => (await state(page)).damageTotal).toBe(20);
  await page.waitForTimeout(200); await page.mouse.click(target.x, target.y); await page.waitForTimeout(250);
  expect((await state(page)).damageTotal).toBe(20);
  await page.keyboard.press('Escape'); const paused = await state(page);
  await settings(page);
  await captureKey(page, 'attack', 'g'); await page.locator('#binding-apply').click();
  await expect(page.locator('#bind-attack')).toHaveText('G');
  await page.locator('#recover-controls').click();
  await expect(page.locator('#bind-attack')).toHaveText('F');
  expect((await state(page)).time).toBe(paused.time);
  expect((await state(page)).damageTotal).toBe(paused.damageTotal);
  await page.locator('#restore-profile').click();
  await expect(page.locator('#bind-attack')).toHaveText('Mouse 1');
  await page.locator('#settings-done').click();
  expect((await state(page)).mode).toBe('paused');
  expect(errors).toEqual([]);
});

test('conflict swap, protected menu controls and remapped confirmation/back', async ({ page }) => {
  await open(page); await settings(page);
  await captureKey(page, 'moveUp', 's');
  await expect(page.locator('#capture-conflict')).toContainText('Move down');
  await page.locator('#binding-swap').click();
  await expect(page.locator('#bind-moveUp')).toHaveText('S');
  await expect(page.locator('#bind-moveDown')).toHaveText('W');
  await page.locator('[data-clear="back"]').click();
  await expect(page.locator('#settings-status')).toContainText('needs a binding');
  await expect(page.locator('#bind-back')).toContainText('Esc');
  await captureKey(page, 'confirm', 'Escape');
  await expect(page.locator('#capture-conflict')).toContainText('Back');
  await page.locator('#binding-swap').click();
  await expect(page.locator('#bind-confirm')).toHaveText('Esc');
  await expect(page.locator('#bind-back')).toContainText('Enter');
  await page.keyboard.press('Enter');
  await expect(page.locator('#controls-settings')).toBeHidden();
  expect((await state(page)).mode).toBe('preparation');
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await state(page)).mode).toBe('playing');
});

test('wheel capture, calibration preview/apply and profile isolation', async ({ page }, info) => {
  await open(page); await settings(page);
  await page.locator('#profile-clone').click();
  await expect(page.locator('#settings-profile option')).toHaveCount(2);
  await page.locator('#profile-name').fill('Wheel practice');
  await page.locator('#profile-rename').click();
  await page.locator('#bind-attack').click();
  await expect(page.locator('#capture-status')).toContainText('Press a key');
  await page.mouse.wheel(0, 120);
  await expect(page.locator('#capture-status')).toContainText('Wheel down');
  await page.locator('#binding-apply').click();
  await expect(page.locator('#bind-attack')).toHaveText('Wheel down');
  await page.locator('#calibration-tab').click();
  await page.locator('[data-choice="attackMode"]').selectOption('toggle');
  await page.locator('#calibration-cancel').click();
  await expect(page.locator('[data-choice="attackMode"]')).toHaveValue('hold');
  await page.locator('[data-choice="attackMode"]').selectOption('toggle');
  await page.locator('#calibration-save').click();
  await expect(page.locator('[data-choice="attackMode"]')).toHaveValue('toggle');
  await page.screenshot({ path: info.outputPath('calibration.png') });
  await page.locator('#bindings-tab').click();
  await page.locator('#settings-profile').selectOption('keyboard');
  await expect(page.locator('#bind-attack')).toHaveText('Mouse 1');
  await page.locator('#settings-profile').selectOption({ label: 'Wheel practice' });
  await expect(page.locator('#bind-attack')).toHaveText('Wheel down');
  await page.locator('#settings-done').click();
  await page.locator('#start-button').click();
  await page.keyboard.down('w'); await page.keyboard.down('d'); await page.waitForTimeout(250); await page.keyboard.up('w'); await page.keyboard.up('d');
  const target = await page.evaluate(() => (window as any).__prototype.project((window as any).__prototype.snapshot().dummy.position));
  await page.mouse.move(target.x, target.y); await page.mouse.wheel(0, 120);
  await expect.poll(async () => (await state(page)).hits).toBeGreaterThanOrEqual(3);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await state(page)).mode).toBe('paused');
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await state(page)).mode).toBe('playing');
  await page.waitForTimeout(350);
  expect((await state(page)).player.attackPhase).toBe('ready');
});

test('corrupt settings and unavailable storage recover without blocking play', async ({ page, context }) => {
  await page.addInitScript(key => { localStorage.setItem(key, '{"version":999,"profiles":null}'); }, STORAGE_KEY);
  await open(page); await settings(page);
  await expect(page.locator('#settings-status')).toContainText('Recovered');
  await page.locator('#settings-done').click(); await page.locator('#start-button').click();
  expect((await state(page)).mode).toBe('playing');
  const unavailable = await context.newPage();
  await unavailable.addInitScript(() => { Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Blocked for test', 'SecurityError'); } }); });
  await open(unavailable); await settings(unavailable);
  await expect(unavailable.locator('#settings-status')).toContainText('Storage unavailable');
  await captureKey(unavailable, 'attack', 'f'); await unavailable.locator('#binding-apply').click();
  await expect(unavailable.locator('#bind-attack')).toHaveText('F');
  await unavailable.locator('#settings-done').click(); await unavailable.locator('#start-button').click();
  expect((await state(unavailable)).mode).toBe('playing');
});

test('simulated controller remapping and explicit nonstandard profile acceptance', async ({ page }) => {
  await page.addInitScript(() => {
    const pad = { id: 'Generic custom pad', index: 3, connected: true, mapping: '', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), timestamp: 0 };
    (window as any).__settingsPad = pad;
    Object.defineProperty(navigator, 'getGamepads', { value: () => [null, null, null, pad] });
  });
  const button = async (index: number, down: boolean) => {
    await page.evaluate(({ index, down }) => { (window as any).__settingsPad.buttons[index] = { pressed: down, value: down ? 1 : 0 }; }, { index, down });
    await page.waitForTimeout(100);
  };
  await open(page); await button(0, true); await button(0, false);
  expect((await state(page)).mode).toBe('preparation');
  await settings(page);
  await page.locator('#settings-kind').selectOption('controller');
  await page.locator('#confirm-mapping').click();
  await page.locator('#bind-attack').click();
  await expect(page.locator('#capture-status')).toContainText('Press a key');
  await button(4, true); await button(4, false);
  await expect(page.locator('#capture-status')).toContainText('Button 5');
  await page.locator('#binding-apply').click();
  await expect(page.locator('#bind-attack')).toHaveText('Button 5');
  await page.locator('#settings-done').click();
  await button(0, true); await button(0, false);
  await expect.poll(async () => (await state(page)).mode).toBe('playing');
  await page.evaluate(() => { (window as any).__settingsPad.axes = [0, -1, 0, 0]; }); await page.waitForTimeout(200);
  await page.evaluate(() => { (window as any).__settingsPad.axes = [0, 0, 0, 0]; });
  const moved = await state(page); expect(Math.hypot(moved.player.position.x, moved.player.position.z + 2.5)).toBeGreaterThan(.8);
  await button(4, true);
  await expect.poll(async () => (await state(page)).player.attackPhase).not.toBe('ready');
  await button(4, false);
});
