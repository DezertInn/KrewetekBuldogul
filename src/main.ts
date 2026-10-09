import './style.css';
import { RULES } from './game/config';
import { Simulation } from './game/simulation';
import type { HitEvent, Vec2, WeaponId, SessionMode } from './game/types';
import { Controls, type ControlFrame } from './input/controls';
import { SettingsUI, handleMenuFrame } from './input/settings-ui';
import { GameView } from './presentation/scene';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = [
  '<header class="masthead"><div class="brand"><span class="brand-mark" aria-hidden="true">KB<span></span></span><div><span class="eyebrow">KREWETEKBULDOGUL</span><h1>Training Club<span class="title-dot">.</span></h1></div></div>',
  '<div class="session-label"><span class="live-dot"></span> FIND YOUR FIGHT <span class="build-tag">PROTOTYPE 02</span></div><button id="pause-button" class="small-button" aria-label="Pause training">Pause Ⅱ</button></header>',
  '<main class="game-shell"><canvas id="game" tabindex="0" aria-label="Isometric training gym. Current controls are listed below."></canvas>',
  '<div class="room-label"><span class="eyebrow">01 / SALA TRENINGOWA</span><strong id="session-description">Choose your weapon. Find your rhythm.</strong><span id="interaction-hint"></span></div>',
  '<aside class="target-panel" aria-label="Session status"><div class="panel-heading"><span class="eyebrow" id="target-label">TRAINING PARTNER</span><span class="status-dot"></span></div><div class="target-title"><span id="target-name">The patient one</span><span id="target-health">1,000 / 1,000</span></div><div class="health-track"><div id="health-fill"></div></div><p id="target-hint"></p><div class="player-health-row"><span>YOUR HEALTH</span><strong id="player-health">100 / 100</strong></div><div class="health-track player-health-track"><div id="player-health-fill"></div></div></aside>',
  '<div class="bottom-hud"><div class="weapon-card"><span class="weapon-number" id="weapon-number">02</span><div><span class="eyebrow" id="weapon-name">BOXING GLOVES</span><strong id="combat-status">Guard up</strong><span id="ammo-status"></span></div></div><div class="dash-card"><span class="eyebrow" id="dash-label">DASH READY</span><div class="dash-track"><div id="dash-fill"></div></div></div><div class="score-card"><span class="eyebrow">DAMAGE / HITS</span><strong id="damage-score">0 <span>/ 0</span></strong></div></div>',
  '<div id="overlay" class="overlay"><section id="session-menu" class="menu-card preparation-card" role="dialog" aria-modal="true" aria-labelledby="menu-title"><span class="eyebrow coral" id="menu-eyebrow">WELCOME TO THE CLUB</span><h2 id="menu-title">Find your fight.</h2><p id="menu-copy">Three weapons. One room. Make the next round yours.</p>',
  '<div id="preparation-options"><fieldset><legend>01 / Your weapon</legend><div class="weapon-options">',
  '<button id="choose-gloves" class="choice-button" data-weapon="weapon_02" aria-pressed="true"><span>02</span><strong>Boxing gloves</strong><small>Quick combos · close pressure</small></button>',
  '<button id="choose-rifle" class="choice-button" data-weapon="weapon_01" aria-pressed="false"><span>01</span><strong>Grot rifle</strong><small>Precision · 20-round magazine</small></button>',
  '<button id="choose-pillar" class="choice-button" data-weapon="weapon_03" aria-pressed="false"><span>03</span><strong>Monument pillar</strong><small>Slow sweep · group control</small></button></div></fieldset>',
  '<fieldset><legend>02 / Your round</legend><div class="round-options"><button id="choose-dummy" class="choice-button" data-session="dummy" aria-pressed="true"><strong>Dummy practice</strong><small>Find your reach and timing</small></button><button id="choose-encounter" class="choice-button" data-session="encounter" aria-pressed="false"><strong>Boxer encounter</strong><small>Three jabbers · dodge and counter</small></button></div></fieldset></div>',
  '<div class="menu-buttons"><button id="start-button" class="primary-button">Begin training ↗</button><button id="restart-button" class="secondary-button" hidden>Restart this round</button><button id="preparation-button" class="secondary-button" hidden>Change weapon / round</button><button id="settings-button" class="secondary-button">Controls and settings</button><button id="confirm-reset" class="primary-button" hidden>Discard round</button><button id="cancel-reset" class="secondary-button" hidden>Keep this round</button></div><p class="menu-footnote" id="menu-help"></p></section></div>',
  '<div id="fatal" class="overlay" hidden><section class="menu-card" role="alert"><span class="eyebrow coral">THE GYM COULDN’T OPEN</span><h2>Let’s try that again.</h2><p id="fatal-message"></p><button class="primary-button" id="reload-page">Reload</button></section></div></main>',
  '<footer class="footer"><div id="controls-help" class="controls-help"></div><div class="connection"><span id="device-label">KEYBOARD + MOUSE</span><span id="controller-status"></span></div></footer>',
].join('');

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = el<HTMLCanvasElement>('game');
const overlay = el('overlay');
const sessionMenu = el('session-menu');
const startButton = el<HTMLButtonElement>('start-button');
const names: Record<WeaponId, string> = { weapon_01: 'Grot rifle', weapon_02: 'Boxing gloves', weapon_03: 'Monument pillar' };
let selectedWeapon: WeaponId = 'weapon_02';
let selectedSession: SessionMode = 'dummy';
let sim = new Simulation(undefined, { weapon: selectedWeapon, mode: selectedSession });
let mode: 'preparation' | 'playing' | 'paused' | 'results' | 'confirm' | 'error' = 'preparation';
let input: Controls;
let view: GameView;
let settings: SettingsUI;
let pendingReset: 'restart' | 'preparation' = 'restart';
let returnMode: 'paused' | 'results' = 'paused';
let accumulator = 0;
let attackEdge = false;
let dashEdge = false;
let reloadEdge = false;
let lastFrame = performance.now();
let lastHud = 0;
let promptKey = '';
const frameSamples: number[] = [];
let frameHandle = 0;

function clearInput(): void {
  input?.clear(); sim.clearBufferedActions();
  attackEdge = false; dashEdge = false; reloadEdge = false; accumulator = 0;
}
function showMenu(focus = true): void {
  overlay.hidden = false;
  input?.setContext('menu');
  const prep = mode === 'preparation', paused = mode === 'paused', result = mode === 'results', confirm = mode === 'confirm';
  el('preparation-options').hidden = !prep;
  el('restart-button').hidden = !paused;
  el('preparation-button').hidden = !(paused || result);
  el('settings-button').hidden = confirm;
  el('confirm-reset').hidden = !confirm;
  el('cancel-reset').hidden = !confirm;
  startButton.hidden = confirm;
  sessionMenu.classList.toggle('preparation-card', prep);
  el<HTMLButtonElement>('pause-button').disabled = true;
  el('menu-eyebrow').textContent = prep ? 'PREPARATION / PROTOTYPE 02' : result ? 'ROUND FINISHED' : confirm ? 'A FRESH START' : 'BETWEEN ROUNDS';
  el('menu-title').textContent = prep ? 'Find your fight.' : result ? sim.state.outcome === 'defeat' ? 'Down, not out.' : 'A clean round.' : confirm ? 'Discard this round?' : 'Take a breath.';
  el('menu-copy').textContent = prep ? 'Choose one weapon and a round. Controls and settings are saved on this browser.'
    : result ? sim.state.outcome === 'defeat' ? 'The jabbers got this one. Read the windup, dash, then counter.' : 'All three jabbers are down. Try another weapon or go again.'
    : confirm ? 'Current health, ammunition and damage totals will reset. Your control profiles stay saved.'
    : 'The room is paused. Resume, retry, or choose another weapon.';
  startButton.textContent = prep ? 'Begin training ↗' : result ? 'Retry this round ↗' : 'Resume training ↗';
  if (focus) (confirm ? el('cancel-reset') : startButton).focus({ preventScroll: true });
}
function resume(): void {
  if (mode === 'error' || !document.hasFocus()) return;
  mode = 'playing'; clearInput(); input.setContext('gameplay');
  overlay.hidden = true;
  el<HTMLButtonElement>('pause-button').disabled = false;
  canvas.focus({ preventScroll: true }); lastFrame = performance.now();
}
function begin(): void {
  sim = new Simulation(undefined, { weapon: selectedWeapon, mode: selectedSession });
  frameSamples.length = 0; resume(); updateHud();
}
function pause(reason?: string): void {
  clearInput();
  if (mode !== 'playing') return;
  mode = 'paused'; showMenu();
  if (reason) el('menu-copy').textContent = reason;
}
function preparation(): void {
  mode = 'preparation'; clearInput();
  sim = new Simulation(undefined, { weapon: selectedWeapon, mode: selectedSession });
  showMenu(); updateHud();
}
function requestReset(action: 'restart' | 'preparation'): void {
  if (mode === 'results') { if (action === 'restart') begin(); else preparation(); return; }
  if (mode !== 'paused') return;
  pendingReset = action; returnMode = mode; mode = 'confirm'; clearInput(); showMenu();
}
function finishRound(): void {
  mode = 'results'; clearInput(); showMenu();
}
function openSettings(): void {
  if (mode === 'playing') pause();
  if (mode === 'error' || mode === 'confirm') return;
  clearInput(); overlay.hidden = true; settings.open();
}
function fail(error: unknown): void {
  mode = 'error'; clearInput(); cancelAnimationFrame(frameHandle);
  overlay.hidden = true; el('fatal').hidden = false;
  el('fatal-message').textContent = 'The renderer could not continue. Try Chrome or Edge with hardware acceleration. ' + (error instanceof Error ? error.message : String(error));
  console.error(error);
}
function updatePrompts(frame: ControlFrame): void {
  el('controller-status').textContent = frame.controllerStatus;
  const key = frame.family + ':' + input.revision + ':' + sim.state.weapon;
  if (key === promptKey) return;
  promptKey = key;
  const help = el('controls-help'); help.replaceChildren();
  for (const [action, title] of [['moveUp', 'Move ↑'], ['moveLeft', '←'], ['moveDown', '↓'], ['moveRight', '→'], ['attack', 'Attack'], ['dash', 'Dash'], ['reload', 'Reload'], ['interact', 'Station'], ['pause', 'Pause']] as const) {
    if (action === 'reload' && sim.state.weapon !== 'weapon_01') continue;
    const span = document.createElement('span'), kbd = document.createElement('kbd');
    kbd.textContent = input.label(action, frame.family);
    span.append(kbd, document.createTextNode(title)); help.append(span);
  }
  const aimHint = document.createElement('span'), aimBinding = document.createElement('kbd');
  const pointerEnabled = frame.family === 'keyboard' && input.settings.profile('keyboard').calibration.pointerAim;
  aimBinding.textContent = pointerEnabled ? 'Pointer' : input.label('aimUp', frame.family) + ' / ' + input.label('aimRight', frame.family);
  aimHint.append(aimBinding, document.createTextNode('Aim')); help.append(aimHint);
  el('device-label').textContent = frame.family === 'keyboard' ? 'KEYBOARD + MOUSE' : frame.family === 'playstation' ? 'PLAYSTATION LAYOUT' : frame.family === 'xbox' ? 'XBOX LAYOUT' : 'CONTROLLER';
  el('menu-help').textContent = input.label('confirm', frame.family) + ' confirm · ' + input.label('back', frame.family) + ' back · ' + input.label('menuUp', frame.family) + ' / ' + input.label('menuDown', frame.family) + ' navigate';
}
const display = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 1 });
function updateHud(): void {
  const s = sim.state, p = s.player, encounter = s.sessionMode === 'encounter';
  const alive = s.enemies.filter(enemy => enemy.health > 0);
  el('session-description').textContent = encounter ? 'Read the windup. Make room for the counter.' : 'A little footwork. A lot of character.';
  el('target-label').textContent = encounter ? 'BOXER ENCOUNTER' : 'TRAINING PARTNER';
  el('target-name').textContent = encounter ? 'Jabbers standing' : 'The patient one';
  el('target-health').textContent = encounter ? alive.length + ' / ' + s.enemies.length : display(s.dummy.health) + ' / ' + display(s.dummy.maxHealth);
  el('health-fill').style.width = (encounter ? alive.length / Math.max(1, s.enemies.length) : s.dummy.health / s.dummy.maxHealth) * 100 + '%';
  el('target-hint').textContent = encounter ? 'Outlined windup → red strike → open recovery.'
    : s.dummy.health === 0 ? 'Dummy down. Restart from the pause menu.' : s.lastDamage ? display(s.lastDamage) + ' damage · ' + s.hits + ' clean hits' : 'Find your range. Make every hit count.';
  el('player-health').textContent = display(p.health) + ' / ' + display(p.maxHealth);
  el('player-health-fill').style.width = p.health / p.maxHealth * 100 + '%';
  el('weapon-number').textContent = s.weapon.slice(-2);
  el('weapon-name').textContent = names[s.weapon].toUpperCase();
  el('damage-score').replaceChildren(document.createTextNode(display(s.damageTotal) + ' '));
  const hits = document.createElement('span'); hits.textContent = '/ ' + s.hits; el('damage-score').append(hits);
  el('combat-status').textContent = p.reloadRemaining > 0 ? 'Reloading · ' + p.reloadRemaining.toFixed(1) + 's' : p.dashRemaining > 0 ? 'Quick on your feet' : p.attackPhase === 'ready' ? 'Ready' : (s.weapon === 'weapon_02' ? 'Strike ' + (p.combo + 1) + ' · ' : '') + p.attackPhase;
  el('ammo-status').textContent = s.weapon === 'weapon_01' ? p.ammo + ' / ' + p.maxAmmo + ' rounds' : '';
  el('dash-label').textContent = p.dashCooldown > 0 ? 'DASH · ' + p.dashCooldown.toFixed(1) + 's' : 'DASH READY';
  el('dash-fill').style.width = (1 - p.dashCooldown / RULES.dashCooldown) * 100 + '%';
  const nearStation = Math.hypot(p.position.x, p.position.z + 2.5) <= 1.15;
  el('interaction-hint').textContent = mode === 'playing' && nearStation ? input.label('interact') + ' · Preparation station' : '';
}

el('reload-page').addEventListener('click', () => location.reload());
try {
  view = new GameView(canvas);
  input = new Controls(canvas, { screenDirection: (x, y) => view.screenDirection(x, y), pointerAim: (x, y) => view.pointerAim(x, y, sim.state.player.position), onSafetyPause: reason => pause(reason) });
  settings = new SettingsUI(input, { onClose: () => { clearInput(); showMenu(); promptKey = ''; } });
  startButton.addEventListener('click', () => { if (mode === 'preparation' || mode === 'results') begin(); else if (mode === 'paused') resume(); });
  el('restart-button').addEventListener('click', () => requestReset('restart'));
  el('preparation-button').addEventListener('click', () => requestReset('preparation'));
  el('confirm-reset').addEventListener('click', () => { if (pendingReset === 'restart') begin(); else preparation(); });
  el('cancel-reset').addEventListener('click', () => { mode = returnMode; clearInput(); showMenu(); });
  el('pause-button').addEventListener('click', () => pause());
  el('settings-button').addEventListener('click', openSettings);
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-weapon]')) button.addEventListener('click', () => {
    if (mode !== 'preparation') return;
    selectedWeapon = button.dataset.weapon as WeaponId;
    document.querySelectorAll<HTMLButtonElement>('[data-weapon]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    sim = new Simulation(undefined, { weapon: selectedWeapon, mode: selectedSession }); updateHud();
  });
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-session]')) button.addEventListener('click', () => {
    if (mode !== 'preparation') return;
    selectedSession = button.dataset.session as SessionMode;
    document.querySelectorAll<HTMLButtonElement>('[data-session]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    sim = new Simulation(undefined, { weapon: selectedWeapon, mode: selectedSession }); updateHud();
  });
  window.addEventListener('resize', () => view.resize());
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); fail(new Error('Graphics context lost. Reload to reopen the gym.')); });
  window.addEventListener('pagehide', () => { input.dispose(); view.dispose(); cancelAnimationFrame(frameHandle); });
  showMenu(); updateHud();
  if (new URLSearchParams(location.search).has('debug')) {
    Object.defineProperty(window, '__prototype', { configurable: true, value: {
      snapshot: () => structuredClone({ ...sim.state, mode, settingsOpen: settings.isOpen }),
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
      if (settings.isOpen) { settings.handleFrame(controls); transitioned = true; }
      else if (mode === 'playing') {
        if (controls.pausePressed) { pause(); transitioned = true; }
        else if (controls.interactPressed && Math.hypot(sim.state.player.position.x, sim.state.player.position.z + 2.5) <= 1.15) { pause('Preparation station. Resume, retry, or change your equipment.'); transitioned = true; }
      } else {
        if (controls.settingsPressed && mode !== 'confirm') { openSettings(); transitioned = true; }
        else if (controls.restartPressed && (mode === 'paused' || mode === 'results')) { requestReset('restart'); transitioned = true; }
        else if (controls.backPressed) {
          if (mode === 'paused') resume();
          else if (mode === 'confirm') { mode = returnMode; clearInput(); showMenu(); }
          else if (mode === 'results') preparation();
          transitioned = true;
        } else transitioned = handleMenuFrame(sessionMenu, controls);
      }
      if (mode === 'playing' && !transitioned && !settings.isOpen) {
        if (elapsed > 0 && elapsed < 0.2) { frameSamples.push(elapsed * 1000); if (frameSamples.length > 600) frameSamples.shift(); }
        const bounds = canvas.getBoundingClientRect();
        sim.setVisibleEnemyIds(sim.state.enemies.filter(enemy => { const point = view.project(enemy.position); return point.x >= bounds.left && point.x <= bounds.right && point.y >= bounds.top && point.y <= bounds.bottom; }).map(enemy => enemy.id));
        accumulator += Math.min(elapsed, 0.10);
        attackEdge ||= controls.actions.attackPressed; dashEdge ||= controls.actions.dashPressed; reloadEdge ||= Boolean(controls.actions.reloadPressed);
        while (accumulator >= RULES.fixedStep) {
          events.push(...sim.step({ ...controls.actions, attackPressed: attackEdge, dashPressed: dashEdge, reloadPressed: reloadEdge }));
          attackEdge = false; dashEdge = false; reloadEdge = false; accumulator -= RULES.fixedStep;
          if (sim.state.outcome !== 'playing') { finishRound(); break; }
        }
      }
      view.render(sim.state, events, mode === 'playing' ? Math.min(elapsed, 0.1) : 0);
      if (now - lastHud > 50) { updateHud(); lastHud = now; }
      frameHandle = requestAnimationFrame(frame);
    } catch (error) { fail(error); }
  }
  frameHandle = requestAnimationFrame(frame);
} catch (error) { fail(error); }
