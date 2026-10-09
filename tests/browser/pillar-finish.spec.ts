import { test, expect, type Page } from '@playwright/test';
import type { GameState } from '../../src/game/types';
import type { RunCheckpoint } from '../../src/run/director';
import type { PillarPose } from '../../src/presentation/pillar-animation';

type Snapshot = GameState & { mode: string; run: RunCheckpoint; settingsOpen: boolean; storageReady: boolean };
type RenderedPose = PillarPose & {
  enabled: boolean;
  terminal: boolean;
  gripErrors: number[];
  grips: { x: number; y: number; z: number }[];
  hands: { x: number; y: number; z: number }[];
};
interface AuditFrame {
  phase: string;
  progress: number;
  terminal: boolean;
  overlayHidden: boolean;
  settingsOpen: boolean;
  mode: string;
  runPhase: string;
  time: number;
  runTime: number;
  damage: number;
  hits: number;
  outcome: string;
  owned: string[];
  gripErrors: number[];
}
const snapshot = (page: Page): Promise<Snapshot> => page.evaluate(() => (window as any).__prototype.snapshot());
const pose = (page: Page): Promise<RenderedPose> => page.evaluate(() => (window as any).__prototype.pillarPose());
async function sampledFrames(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

/** Exercise actual pointer aim and attack, leaving enemy/player state untouched. */
async function clearFirstStage(page: Page): Promise<void> {
  await page.mouse.down();
  for (let attempt = 0; attempt < 300; attempt++) {
    const state = await snapshot(page);
    if (state.outcome !== 'playing') break;
    const target = state.enemies.filter(enemy => enemy.health > 0).sort((a, b) =>
      Math.hypot(a.position.x - state.player.position.x, a.position.z - state.player.position.z)
      - Math.hypot(b.position.x - state.player.position.x, b.position.z - state.player.position.z))[0];
    if (target) {
      const point = await page.evaluate(position => (window as any).__prototype.project(position), target.position);
      await page.mouse.move(point.x, point.y);
    }
    await page.waitForTimeout(35);
  }
  await page.mouse.up();
  await page.waitForFunction(() => (window as any).__prototype.snapshot().mode === 'reward', undefined, { polling: 'raf' });
}

test('terminal pillar swing stays visible after stage settlement and freezes in settings and discard confirmation', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?debug=1');
  await page.waitForFunction(() => (window as any).__prototype?.snapshot().storageReady);
  await expect(page.locator('#fatal')).toBeHidden();
  await page.locator('#choose-pillar').click();
  await page.locator('#choose-run').click();
  await page.locator('#start-button').click();
  await page.waitForFunction(() => (window as any).__prototype.snapshot().mode === 'playing');
  await page.evaluate(() => {
    (window as any).__finisherAudit = [];
    const observe = () => {
      const state = (window as any).__prototype.snapshot();
      const rendered = (window as any).__prototype.pillarPose();
      if (state.outcome === 'complete' && (window as any).__finisherAudit.length < 500) {
        (window as any).__finisherAudit.push({
          phase: rendered.phase, progress: rendered.progress, terminal: rendered.terminal,
          overlayHidden: (document.getElementById('overlay') as HTMLElement).hidden,
          settingsOpen: state.settingsOpen, mode: state.mode, runPhase: state.run.phase,
          time: state.time, runTime: state.run.activeSeconds, damage: state.damageTotal,
          hits: state.hits, outcome: state.outcome, owned: [...state.upgrades.owned], gripErrors: [...rendered.gripErrors],
        });
      }
      requestAnimationFrame(observe);
    };
    requestAnimationFrame(observe);
  });

  await clearFirstStage(page);
  const settled = await snapshot(page);
  expect(settled.run.phase).toBe('reward');
  expect(settled.run.clearedStages).toHaveLength(1);
  expect(settled.run.offer).toHaveLength(3);
  expect((await pose(page)).terminal).toBe(true);
  await expect(page.locator('#overlay')).toBeHidden();

  // A confirmation while no choice is visible must not silently pick an upgrade.
  await page.keyboard.press('Enter', { delay: 25 });
  await sampledFrames(page);
  expect((await snapshot(page)).run.phase).toBe('reward');
  expect((await snapshot(page)).upgrades.owned).toEqual([]);
  await page.keyboard.press('F2', { delay: 25 });
  await expect(page.locator('#controls-settings')).toBeVisible();
  const settingsPose = await pose(page);
  expect(settingsPose.terminal).toBe(true);
  const settingsState = await snapshot(page);
  await page.waitForTimeout(180);
  expect(await pose(page)).toEqual(settingsPose);
  expect((await snapshot(page)).time).toBe(settingsState.time);
  expect((await snapshot(page)).run.activeSeconds).toBe(settingsState.run.activeSeconds);

  await page.keyboard.press('Escape', { delay: 25 });
  await expect(page.locator('#controls-settings')).toBeHidden();
  await sampledFrames(page);
  await page.keyboard.press('Escape', { delay: 25 });
  await expect(page.locator('#cancel-reset')).toBeVisible();
  expect((await snapshot(page)).mode).toBe('confirm');
  const confirmationPose = await pose(page);
  expect(confirmationPose.terminal).toBe(true);
  await page.waitForTimeout(180);
  expect(await pose(page)).toEqual(confirmationPose);
  expect((await snapshot(page)).time).toBe(settingsState.time);
  await page.locator('#cancel-reset').click();
  await page.waitForFunction(() => !(window as any).__prototype.pillarPose().terminal, undefined, { polling: 'raf', timeout: 5000 });
  await expect(page.locator('#overlay')).toBeVisible();
  await expect(page.locator('#reward-options')).toBeVisible();
  expect((await snapshot(page)).run.offer).toEqual(settled.run.offer);
  expect((await snapshot(page)).upgrades.owned).toEqual([]);

  const frames = await page.evaluate(() => (window as any).__finisherAudit) as AuditFrame[];
  const visible = frames.filter(frame => frame.terminal && frame.mode === 'reward' && !frame.settingsOpen && frame.overlayHidden);
  expect(visible.length).toBeGreaterThan(1);
  expect(visible.some(frame => frame.phase === 'active')).toBe(true);
  expect(visible.some(frame => frame.phase === 'recovery')).toBe(true);
  expect(frames.some(frame => frame.terminal && frame.settingsOpen)).toBe(true);
  expect(frames.some(frame => frame.terminal && frame.mode === 'confirm' && !frame.overlayHidden)).toBe(true);
  for (const frame of frames.filter(frame => frame.terminal)) {
    expect(frame.runPhase).toBe('reward');
    expect(frame.outcome).toBe('complete');
    expect(frame.time).toBe(settled.time);
    expect(frame.runTime).toBe(settled.run.activeSeconds);
    expect(frame.damage).toBe(settled.damageTotal);
    expect(frame.hits).toBe(settled.hits);
    expect(frame.owned).toEqual([]);
    expect(Math.max(...frame.gripErrors)).toBeLessThan(1e-5);
  }
  await info.attach('terminal-pillar-frame-audit', { body: JSON.stringify(frames, null, 2), contentType: 'application/json' });
  expect(errors).toEqual([]);
});

test('pillar rig preserves both grips through a moving miss, paused windup, dash cancellations and repeated real hits', async ({ page }, info) => {
  const errors: string[] = [];
  const evidence: { label: string; pose: RenderedPose; hits: number; damage: number }[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?debug=1');
  await page.waitForFunction(() => Boolean((window as any).__prototype));
  await page.locator('#choose-pillar').click();
  await page.locator('#choose-dummy').click();
  await page.locator('#start-button').click();
  await page.waitForFunction(() => (window as any).__prototype.snapshot().mode === 'playing');
  await sampledFrames(page);

  const recordGrip = async (label: string, phase?: string): Promise<void> => {
    const rendered = await pose(page);
    const state = await snapshot(page);
    expect(rendered.enabled).toBe(true);
    if (phase) expect(rendered.phase).toBe(phase);
    expect(rendered.hands).toHaveLength(2);
    expect(rendered.grips).toHaveLength(2);
    expect(Math.max(...rendered.gripErrors)).toBeLessThan(1e-5);
    const [left, right] = rendered.grips;
    expect(Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z)).toBeGreaterThan(0.3);
    evidence.push({ label, pose: rendered, hits: state.hits, damage: state.damageTotal });
  };
  const aim = async (position: { x: number; z: number }): Promise<void> => {
    const point = await page.evaluate(target => (window as any).__prototype.project(target), position);
    await page.mouse.move(point.x, point.y);
    await sampledFrames(page);
  };
  const attack = async (): Promise<void> => {
    await page.mouse.down(); await sampledFrames(page); await page.mouse.up();
    await page.waitForFunction(() => (window as any).__prototype.snapshot().player.attackPhase === 'startup', undefined, { polling: 'raf' });
  };
  const ready = async (): Promise<void> => {
    await page.waitForFunction(() => {
      const state = (window as any).__prototype.snapshot();
      return state.player.attackPhase === 'ready' && state.player.dashRemaining === 0;
    }, undefined, { polling: 'raf', timeout: 4000 });
  };
  const retreatDash = async (): Promise<void> => {
    await page.keyboard.down('s'); await page.keyboard.down('a');
    await page.keyboard.press('Space', { delay: 25 });
    await page.keyboard.up('s'); await page.keyboard.up('a');
    await page.waitForFunction(() => (window as any).__prototype.snapshot().player.dashRemaining > 0, undefined, { polling: 'raf' });
  };
  const approach = async (): Promise<void> => {
    await page.waitForFunction(() => (window as any).__prototype.snapshot().player.dashCooldown === 0, undefined, { polling: 'raf', timeout: 4000 });
    await page.keyboard.down('w'); await page.keyboard.down('d');
    await page.waitForFunction(() => (window as any).__prototype.snapshot().player.position.z >= -1.8, undefined, { polling: 'raf', timeout: 2000 });
    await page.keyboard.up('w'); await page.keyboard.up('d');
    await aim((await snapshot(page)).dummy.position);
  };

  await recordGrip('ready before miss', 'ready');
  // Aim away from the dummy: the animation still runs even though no target is eligible.
  await aim({ x: 0, z: -5.4 });
  await attack();
  const start = await snapshot(page);
  await page.keyboard.down('w'); await page.keyboard.down('d');
  await page.waitForTimeout(120);
  await page.keyboard.up('w'); await page.keyboard.up('d');
  expect((await snapshot(page)).player.position.z).toBeGreaterThan(start.player.position.z + 0.12);
  await recordGrip('moving startup', 'startup');
  await page.keyboard.press('Escape', { delay: 25 });
  await page.waitForFunction(() => (window as any).__prototype.snapshot().mode === 'paused');
  await sampledFrames(page);
  const pausedPose = await pose(page), pausedState = await snapshot(page);
  expect(pausedPose.phase).toBe('startup');
  await page.waitForTimeout(150);
  expect(await pose(page)).toEqual(pausedPose);
  expect((await snapshot(page)).time).toBe(pausedState.time);
  await page.keyboard.press('Escape', { delay: 25 });
  await page.waitForFunction(() => (window as any).__prototype.snapshot().mode === 'playing');
  await page.waitForFunction(() => (window as any).__prototype.snapshot().player.attackPhase === 'active', undefined, { polling: 'raf' });
  await recordGrip('miss active', 'active');
  await ready();
  expect((await snapshot(page)).hits).toBe(0);
  expect((await snapshot(page)).damageTotal).toBe(0);
  await recordGrip('ready after miss', 'ready');

  await aim((await snapshot(page)).dummy.position);
  const canceledAttackTime = (await snapshot(page)).time;
  await attack();
  await retreatDash();
  await ready();
  expect((await snapshot(page)).hits).toBe(0);
  await recordGrip('ready after startup cancel', 'ready');

  await approach();
  // A startup cancel keeps the original 1.5-second next-attack barrier.
  await page.waitForFunction(earliest => (window as any).__prototype.snapshot().time >= earliest, canceledAttackTime + 1.6, { polling: 'raf' });
  await attack();
  await page.waitForFunction(() => (window as any).__prototype.snapshot().player.attackPhase === 'recovery', undefined, { polling: 'raf' });
  expect((await snapshot(page)).hits).toBe(1);
  expect((await snapshot(page)).damageTotal).toBe(180);
  await recordGrip('recovery before cancel', 'recovery');
  await retreatDash();
  await ready();
  await recordGrip('ready after recovery cancel', 'ready');
  expect((await snapshot(page)).hits).toBe(1);

  await approach();
  for (let hit = 2; hit <= 3; hit++) {
    await attack();
    await page.waitForFunction(expected => (window as any).__prototype.snapshot().hits === expected, hit, { polling: 'raf' });
    await ready();
    expect((await snapshot(page)).hits).toBe(hit);
    expect((await snapshot(page)).damageTotal).toBe(hit * 180);
    await recordGrip('ready after repeated hit ' + hit, 'ready');
  }
  await info.attach('pillar-miss-move-pause-cancel-hit-grip-evidence', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  expect(errors).toEqual([]);
});
