import './style.css';
import { RULES } from './game/config';
import { Simulation } from './game/simulation';
import type { HitEvent, Vec2 } from './game/types';
import { Controls, DEFAULT_BINDINGS, gamepadButtonLabel, gamepadAxesLabel, type ControlFrame } from './input/controls';
import { GameView } from './presentation/scene';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="masthead">
    <div class="brand"><span class="brand-mark" aria-hidden="true">KB<span></span></span><div><span class="eyebrow">KREWETEKBULDOGUL</span><h1>Training Club<span class="title-dot">.</span></h1></div></div>
    <div class="session-label"><span class="live-dot"></span> THE FIRST ROUND <span class="build-tag">PROTOTYPE 01</span></div>
    <button id="pause-button" class="small-button" aria-label="Pause training">Pause <span>Ⅱ</span></button>
  </header>
  <main class="game-shell">
    <canvas id="game" tabindex="0" aria-label="Isometric boxing gym. Controls are listed below."></canvas>
    <div class="room-label"><span class="eyebrow">01 / SALA TRENINGOWA</span><strong>A little footwork. A lot of character.</strong></div>
    <aside class="target-panel" aria-label="Training dummy status"><div class="panel-heading"><span class="eyebrow">TRAINING PARTNER</span><span class="status-dot"></span></div><div class="target-title">The patient one <span id="target-health">1,000 / 1,000</span></div><div class="health-track"><div id="health-fill"></div></div><p id="target-hint">Find your range. Make every punch count.</p></aside>
    <div class="bottom-hud"><div class="weapon-card"><span class="weapon-number">02</span><div><span class="eyebrow">BOXING GLOVES</span><strong id="combat-status">Guard up</strong></div></div><div class="dash-card"><span class="eyebrow" id="dash-label">DASH READY</span><div class="dash-track"><div id="dash-fill"></div></div></div><div class="score-card"><span class="eyebrow">DAMAGE / HITS</span><strong id="damage-score">0 <span>/ 0</span></strong></div></div>
    <div id="overlay" class="overlay"><section class="menu-card" role="dialog" aria-modal="true" aria-labelledby="menu-title"><span class="eyebrow coral">WELCOME TO THE CLUB</span><h2 id="menu-title">Big scarf.<br>Bigger ambitions.</h2><p id="menu-copy">Step onto the mat, find your feet, and give our training dummy a proper introduction.</p><div class="menu-details"><span>ONE ROOM</span><span>BOXING GLOVES</span><span>NO PRESSURE</span></div><div class="menu-buttons"><button id="start-button" class="primary-button">Begin training <span>↗</span></button><button id="restart-button" class="secondary-button" hidden>Restart session</button></div><p class="menu-footnote" id="menu-help">Enter to begin · WASD to move · Mouse to aim</p></section></div>
    <div id="fatal" class="overlay" hidden><section class="menu-card" role="alert"><span class="eyebrow coral">THE GYM COULDN’T OPEN</span><h2>Let’s try that again.</h2><p id="fatal-message"></p><button class="primary-button" id="reload-button">Reload</button></section></div>
  </main>
  <footer class="footer"><div id="controls-help" class="controls-help"></div><div class="connection"><span id="device-label">KEYBOARD + MOUSE</span><span id="controller-status"></span></div></footer>
  <div id="diagnostics" hidden></div>`;

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = el<HTMLCanvasElement>('game');
const overlay = el('overlay');
const startButton = el<HTMLButtonElement>('start-button');
const restartButton = el<HTMLButtonElement>('restart-button');
let sim = new Simulation();
let mode: 'start' | 'playing' | 'paused' | 'error' = 'start';
let input: Controls;
let view: GameView;
let menuIndex = 0;
let accumulator = 0;
let attackEdge = false;
let dashEdge = false;
let lastFrame = performance.now();
let lastHud = 0;
let previousFamily = '';
const frameSamples: number[] = [];
let frameHandle = 0;

function clearInput(): void {
  input?.clear(); sim.clearBufferedActions();
  attackEdge = false; dashEdge = false; accumulator = 0;
}
function start(): void {
  if (mode === 'error' || !document.hasFocus()) return;
  mode = 'playing'; clearInput(); overlay.hidden = true;
  el<HTMLButtonElement>('pause-button').disabled = false;
  canvas.focus({ preventScroll: true });
  lastFrame = performance.now();
}
function pause(reason = 'Take a breath. The room will wait for you.'): void {
  clearInput();
  if (mode !== 'playing') return;
  mode = 'paused'; overlay.hidden = false;
  el('menu-title').textContent = 'Between rounds.';
  el('menu-copy').textContent = reason;
  startButton.innerHTML = 'Resume training <span>↗</span>';
  restartButton.hidden = false;
  menuIndex = 0; startButton.focus({ preventScroll: true });
}
function restart(): void { sim = new Simulation(); frameSamples.length = 0; clearInput(); start(); }
function fail(error: unknown): void {
  mode = 'error'; clearInput(); cancelAnimationFrame(frameHandle);
  overlay.hidden = true; el('fatal').hidden = false;
  el('fatal-message').textContent = `The 3D renderer could not continue. Try an up-to-date Chrome or Edge with hardware acceleration enabled. ${error instanceof Error ? error.message : String(error)}`;
  console.error(error);
}
function keyLabel(code: string): string { return code.replace('Key', '').replace('Arrow', '').replace('Escape', 'Esc'); }
function updatePrompts(frame: ControlFrame): void {
  el('controller-status').textContent = frame.controllerStatus;
  if (frame.family === previousFamily) return;
  previousFamily = frame.family;
  const b = DEFAULT_BINDINGS;
  const keyboard = frame.family === 'keyboard';
  const ps = frame.family === 'playstation';
  const confirm = keyboard ? keyLabel(b.keyboard.confirm[0]) : gamepadButtonLabel(b.gamepad.confirm, frame.family);
  const values = keyboard
    ? [[`${keyLabel(b.keyboard.move.up[0])}${keyLabel(b.keyboard.move.left[0])}${keyLabel(b.keyboard.move.down[0])}${keyLabel(b.keyboard.move.right[0])}`, 'Move'], ['Mouse / arrows', 'Aim'], [`Mouse ${b.mouse.attack + 1}`, 'Punch'], [keyLabel(b.keyboard.dash[0]), 'Dash'], [keyLabel(b.keyboard.pause[0]), 'Pause'], [keyLabel(b.keyboard.restart[0]), 'Restart']]
    : [[gamepadAxesLabel(b.gamepad.moveAxes, frame.family), 'Move'], [gamepadAxesLabel(b.gamepad.aimAxes, frame.family), 'Aim'], [gamepadButtonLabel(b.gamepad.attack, frame.family), 'Punch'], [gamepadButtonLabel(b.gamepad.dash, frame.family), 'Dash'], [gamepadButtonLabel(b.gamepad.pause, frame.family), 'Pause']];
  el('controls-help').innerHTML = values.map(([key, label]) => `<span><kbd>${key}</kbd>${label}</span>`).join('');
  el('device-label').textContent = keyboard ? 'KEYBOARD + MOUSE' : ps ? 'PLAYSTATION LAYOUT' : frame.family === 'xbox' ? 'XBOX LAYOUT' : 'STANDARD CONTROLLER';
  el('menu-help').textContent = `${confirm} to begin / resume · ${keyboard ? '↑ ↓ or Tab' : 'D-pad / left stick'} to select${keyboard ? '' : ' · Restart is in the pause menu'}`;
}
function updateHud(): void {
  const s = sim.state;
  el('target-health').textContent = `${s.dummy.health.toLocaleString()} / ${s.dummy.maxHealth.toLocaleString()}`;
  el('health-fill').style.width = `${s.dummy.health / s.dummy.maxHealth * 100}%`;
  el('target-hint').textContent = s.dummy.health === 0 ? 'Good round! Restart the session to go again.' : s.lastDamage ? `${s.lastDamage} damage · ${s.hits} clean ${s.hits === 1 ? 'hit' : 'hits'}` : 'Find your range. Make every punch count.';
  el('damage-score').innerHTML = `${s.damageTotal} <span>/ ${s.hits}</span>`;
  el('combat-status').textContent = s.player.dashRemaining > 0 ? 'Quick on your feet' : s.player.attackPhase === 'ready' ? 'Guard up' : `Strike ${s.player.combo + 1} · ${s.player.attackPhase}`;
  el('dash-label').textContent = s.player.dashCooldown > 0 ? `DASH · ${s.player.dashCooldown.toFixed(1)}s` : 'DASH READY';
  el('dash-fill').style.width = `${(1 - s.player.dashCooldown / RULES.dashCooldown) * 100}%`;
}

el('reload-button').addEventListener('click', () => location.reload());

try {
  view = new GameView(canvas);
  input = new Controls(canvas, {
    screenDirection: (x, y) => view.screenDirection(x, y),
    pointerAim: (x, y) => view.pointerAim(x, y, sim.state.player.position),
    onSafetyPause: reason => pause(reason),
  });
  startButton.addEventListener('click', start);
  restartButton.addEventListener('click', restart);
  el('pause-button').addEventListener('click', () => pause());
  el<HTMLButtonElement>('pause-button').disabled = true;
  for (const [index, button] of [startButton, restartButton].entries()) button.addEventListener('focus', () => { menuIndex = index; });
  window.addEventListener('keydown', event => {
    if (event.code !== 'Tab' || (mode !== 'start' && mode !== 'paused')) return;
    event.preventDefault();
    const buttons = restartButton.hidden ? [startButton] : [startButton, restartButton];
    menuIndex = (menuIndex + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
    buttons[menuIndex].focus({ preventScroll: true });
  });
  window.addEventListener('resize', () => view.resize());
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); fail(new Error('Graphics context lost. Reload to reopen the gym.')); });
  window.addEventListener('pagehide', () => { input.dispose(); view.dispose(); cancelAnimationFrame(frameHandle); });
  startButton.focus({ preventScroll: true });

  // Opt-in, read-only diagnostics: browser checks still drive real controls.
  if (new URLSearchParams(location.search).has('debug')) {
    Object.defineProperty(window, '__prototype', { configurable: true, value: {
      snapshot: () => structuredClone({ mode, ...sim.state }),
      project: (position: Vec2) => view.project(position),
      metrics: () => ({ ...view.getMetrics(), devicePixelRatio, viewport: [innerWidth, innerHeight], samples: frameSamples.length, averageFrameMs: frameSamples.length ? frameSamples.reduce((a, b) => a + b, 0) / frameSamples.length : 0, p95FrameMs: [...frameSamples].sort((a, b) => a - b)[Math.floor(frameSamples.length * 0.95)] ?? 0 }),
    } });
  }

  function frame(now: number): void {
    if (mode === 'error') return;
    try {
      const elapsed = Math.max(0, (now - lastFrame) / 1000); lastFrame = now;
      const controls = input.poll(); updatePrompts(controls);
      const events: HitEvent[] = [];
      let transitioned = false;
      if (mode === 'playing') {
        if (controls.pausePressed) { pause(); transitioned = true; }
        else if (controls.restartPressed) { restart(); transitioned = true; }
      } else {
        const buttons = restartButton.hidden ? [startButton] : [startButton, restartButton];
        if (controls.menuDirection) { menuIndex = (menuIndex + controls.menuDirection + buttons.length) % buttons.length; buttons[menuIndex].focus({ preventScroll: true }); }
        if (controls.confirmPressed) { buttons[menuIndex].click(); transitioned = true; }
        else if (mode === 'paused' && (controls.backPressed || controls.pausePressed)) { start(); transitioned = true; }
      }
      if (mode === 'playing' && !transitioned) {
        if (elapsed > 0 && elapsed < 0.2) { frameSamples.push(elapsed * 1000); if (frameSamples.length > 600) frameSamples.shift(); }
        accumulator += Math.min(elapsed, 0.10);
        attackEdge ||= controls.actions.attackPressed; dashEdge ||= controls.actions.dashPressed;
        while (accumulator >= RULES.fixedStep) {
          events.push(...sim.step({ ...controls.actions, attackPressed: attackEdge, dashPressed: dashEdge }));
          attackEdge = false; dashEdge = false; accumulator -= RULES.fixedStep;
        }
      }
      view.render(sim.state, events, mode === 'playing' ? Math.min(elapsed, 0.1) : 0);
      if (now - lastHud > 50) { updateHud(); lastHud = now; }
      frameHandle = requestAnimationFrame(frame);
    } catch (error) { fail(error); }
  }
  frameHandle = requestAnimationFrame(frame);
} catch (error) { fail(error); }
