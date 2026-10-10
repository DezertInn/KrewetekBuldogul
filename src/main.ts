import './style.css';
import { RULES } from './game/config';
import { Simulation } from './game/simulation';
import type { HitEvent, Vec2, WeaponId, SessionMode } from './game/types';
import { Controls, type ControlFrame } from './input/controls';
import { SettingsUI, handleMenuFrame } from './input/settings-ui';
import { GameView } from './presentation/scene';
import { UPGRADES, type UpgradeId } from './game/upgrades';
import { RunDirector, type RunCheckpoint } from './run/director';
import { RUN_STAGES } from './run/content';
import { RunStorage, type StorageResult } from './run/storage';
import { M4RunDirector, type M4RunCheckpoint } from './run/m4-director';
import { M4_ROOMS } from './run/m4-content';
import { M4Storage } from './run/m4-storage';
import { GameAudio } from './audio/audio';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = [
  '<header class="masthead"><div class="brand"><span class="brand-mark" aria-hidden="true">KB<span></span></span><div><span class="eyebrow">KREWETEKBULDOGUL</span><h1>Training Club<span class="title-dot">.</span></h1></div></div>',
  '<div class="session-label"><span class="live-dot"></span> FIND YOUR FIGHT <span class="build-tag">GYM SLICE 04</span></div><button id="pause-button" class="small-button" aria-label="Pause training">Pause Ⅱ</button></header>',
  '<main class="game-shell"><canvas id="game" tabindex="0" aria-label="Isometric training gym. Current controls are listed below."></canvas>',
  '<div class="room-label"><span class="eyebrow">01 / SALA TRENINGOWA</span><strong id="session-description">Choose your weapon. Find your rhythm.</strong><span id="interaction-hint"></span></div>',
  '<aside class="target-panel" aria-label="Session status"><div class="panel-heading"><span class="eyebrow" id="target-label">TRAINING PARTNER</span><span class="status-dot"></span></div><div class="target-title"><span id="target-name">The patient one</span><span id="target-health">1,000 / 1,000</span></div><div class="health-track"><div id="health-fill"></div></div><p id="target-hint"></p><div class="player-health-row"><span>YOUR HEALTH</span><strong id="player-health">100 / 100</strong></div><div class="health-track player-health-track"><div id="player-health-fill"></div></div></aside>',
  '<div class="bottom-hud"><div class="weapon-card"><span class="weapon-number" id="weapon-number">02</span><div><span class="eyebrow" id="weapon-name">BOXING GLOVES</span><strong id="combat-status">Guard up</strong><span id="ammo-status"></span></div></div><div class="dash-card"><span class="eyebrow" id="dash-label">DASH READY</span><div class="dash-track"><div id="dash-fill"></div></div></div><div class="score-card"><span class="eyebrow">DAMAGE / HITS</span><strong id="damage-score">0 <span>/ 0</span></strong></div></div>',
  '<div id="overlay" class="overlay"><section id="session-menu" class="menu-card preparation-card" role="dialog" aria-modal="true" aria-labelledby="menu-title"><span class="eyebrow coral" id="menu-eyebrow">WELCOME TO THE CLUB</span><h2 id="menu-title">Find your fight.</h2><p id="menu-copy">Three weapons. One room. Make the next round yours.</p>',
  '<div id="preparation-options"><fieldset><legend>01 / Your weapon</legend><div class="weapon-options">',
  '<button id="choose-gloves" class="choice-button" data-weapon="weapon_02" aria-pressed="true"><span>02</span><strong>Boxing gloves</strong><small>Quick combos · close pressure</small></button>',
  '<button id="choose-rifle" class="choice-button" data-weapon="weapon_01" aria-pressed="false"><span>01</span><strong>Grot rifle</strong><small>Precision · 20-round magazine</small></button>',
  '<button id="choose-pillar" class="choice-button" data-weapon="weapon_03" aria-pressed="false"><span>03</span><strong>Monument pillar</strong><small>Slow sweep · group control</small></button></div></fieldset>',
  '<fieldset><legend>02 / Your round</legend><div class="round-options"><button id="choose-m4" class="choice-button" data-session="m4" aria-pressed="true"><strong>Boxing gym · M4</strong><small>Three levels · six rooms · the Coach</small></button><button id="choose-dummy" class="choice-button" data-session="dummy" aria-pressed="false"><strong>Dummy practice</strong><small>Find your reach and timing</small></button><button id="choose-encounter" class="choice-button" data-session="encounter" aria-pressed="false"><strong>Boxer encounter</strong><small>Three jabbers · dodge and counter</small></button><button id="choose-run" class="choice-button" data-session="run" aria-pressed="false"><strong>Gym run · M3</strong><small>Legacy test route · separate save</small></button></div></fieldset></div>',
  '<div id="reward-options" class="reward-options" hidden></div><div id="run-summary" class="run-summary" hidden></div><div id="menu-upgrades" class="menu-upgrades" hidden></div>',
  '<p id="save-status" class="save-status" role="status" aria-live="polite">Checking saved run…</p>',
  '<div class="menu-buttons"><button id="start-button" class="primary-button">Begin boxing gym ↗</button><button id="resume-run" class="secondary-button" hidden>Resume saved run</button><button id="resume-m4" class="secondary-button" hidden>Resume saved M4 gym</button><button id="takeover-run" class="secondary-button" hidden>Take control in this tab</button><button id="temporary-run" class="secondary-button" hidden>Play without saving in this tab</button><button id="restart-button" class="secondary-button" hidden>Restart this round</button><button id="preparation-button" class="secondary-button" hidden>Change weapon / round</button><button id="settings-button" class="secondary-button">Controls and settings</button><button id="confirm-reset" class="primary-button" hidden>Discard round</button><button id="cancel-reset" class="secondary-button" hidden>Keep this round</button></div><p class="menu-footnote" id="menu-help"></p></section></div>',
  '<aside id="run-hud" class="run-hud" hidden aria-label="Run progress"><strong id="run-progress"></strong><span id="run-effects"></span><span id="barrier-status"></span></aside>',
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
type RunKind = 'run' | 'm4';
type AppSession = SessionMode | RunKind;
type Checkpoint = RunCheckpoint | M4RunCheckpoint;
let selectedSession: AppSession = 'm4';
let sessionChosen = false;
function preparationSimulation(): Simulation {
  return selectedSession === 'm4'
    ? new Simulation(undefined, { weapon: selectedWeapon, mode: 'encounter', room: M4_ROOMS[0].room, enemyDefinitions: M4_ROOMS[0].enemyDefinitions })
    : new Simulation(undefined, { weapon: selectedWeapon, mode: selectedSession === 'run' ? 'encounter' : selectedSession });
}
let sim = preparationSimulation();
type AppMode = 'preparation' | 'playing' | 'cleared' | 'paused' | 'results' | 'confirm' | 'reward' | 'saving' | 'conflict' | 'error';
let mode: AppMode = 'preparation';
let run: RunDirector | M4RunDirector | null = null;
const legacyStorage = new RunStorage();
const m4Storage = new M4Storage();
const stored: { run: RunCheckpoint | null; m4: M4RunCheckpoint | null } = { run: null, m4: null };
const storageResults: { run: StorageResult<Checkpoint> | null; m4: StorageResult<Checkpoint> | null } = { run: null, m4: null };
function runKind(): RunKind { return run instanceof M4RunDirector ? 'm4' : run instanceof RunDirector ? 'run' : selectedSession === 'run' ? 'run' : 'm4'; }
function currentStorage() { return runKind() === 'm4' ? m4Storage : legacyStorage; }
function setStored(kind: RunKind, cp: Checkpoint | null): void {
  if (kind === 'm4') stored.m4 = cp as M4RunCheckpoint | null; else stored.run = cp as RunCheckpoint | null;
}
let taskStorage: Storage | undefined;
try { taskStorage = localStorage; } catch { /* Session-only presentation preferences. */ }
const audio = new GameAudio(taskStorage);
let storageReady = false;
let storageResult: StorageResult<Checkpoint> | null = null;
let temporaryRun = false;
let busy = false;
let finishingPresentation = false;
let runSaveMessage = 'Checking saved run…';
let input: Controls;
let view: GameView;
let settings: SettingsUI;
let pendingReset: 'restart' | 'preparation' = 'restart';
let returnMode: AppMode = 'paused';
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
function visibleFinisher(): boolean {
  return finishingPresentation && ['reward', 'results', 'saving', 'cleared'].includes(mode) && document.hasFocus() && !document.hidden && !settings?.isOpen;
}
function showMenu(focus = true): void {
  if (mode === 'cleared') { overlay.hidden = true; input?.setContext('gameplay'); el<HTMLButtonElement>('pause-button').disabled = false; return; }
  overlay.hidden = visibleFinisher();
  input?.setContext('menu');
  const prep = mode === 'preparation', paused = mode === 'paused', result = mode === 'results', confirm = mode === 'confirm', reward = mode === 'reward';
  el('preparation-options').hidden = !prep;
  el('restart-button').hidden = !(paused || reward);
  el('preparation-button').hidden = !(paused || result || reward);
  el('settings-button').hidden = confirm || busy || mode === 'conflict';
  el('confirm-reset').hidden = !confirm;
  el('cancel-reset').hidden = !confirm;
  startButton.hidden = confirm || reward || mode === 'saving' || mode === 'conflict';
  startButton.disabled = busy || (!storageReady && (selectedSession === 'run' || selectedSession === 'm4'));
  el('resume-run').hidden = !prep || !stored.run || busy;
  el('resume-run').textContent = 'Resume saved M3 run';
  el('resume-m4').hidden = !prep || !stored.m4 || busy;
  el('takeover-run').hidden = mode !== 'conflict';
  el('temporary-run').hidden = mode !== 'conflict';
  el('reward-options').hidden = !reward;
  el('run-summary').hidden = !(result && run);
  el('menu-upgrades').hidden = !(run && (paused || reward));
  el('save-status').textContent = runSaveMessage;
  sessionMenu.classList.toggle('preparation-card', prep || reward);
  el<HTMLButtonElement>('pause-button').disabled = true;
  el('menu-eyebrow').textContent = prep ? 'PREPARATION / GYM SLICE 04' : reward ? 'LEVEL CLEARED / CHOOSE ONE' : result ? 'ROUND FINISHED' : confirm ? 'A FRESH START' : mode === 'saving' ? 'SAFE CHECKPOINT' : mode === 'conflict' ? 'RUN STORAGE' : 'BETWEEN ROUNDS';
  el('menu-title').textContent = prep ? 'Find your fight.' : reward ? 'Build your next move.' : result ? sim.state.outcome === 'defeat' ? 'Down, not out.' : 'A clean round.' : confirm ? 'Discard this round?' : mode === 'saving' ? 'Saving your progress…' : mode === 'conflict' ? 'Choose how to continue.' : 'Take a breath.';
  el('menu-copy').textContent = prep ? 'Choose one weapon and a round. Controls and settings are saved on this browser.'
    : reward ? 'Choose one upgrade for this run. Health, ammunition and cooldowns carry into the next stage.'
    : result ? run ? run instanceof M4RunDirector && sim.state.outcome === 'complete' ? 'B01 complete. The Coach is down. Start again with fresh health and no upgrades.' : 'This run is finished. Start again with fresh health and no upgrades.' : sim.state.outcome === 'defeat' ? 'The jabbers got this one. Read the windup, dash, then counter.' : 'All three jabbers are down. Try another weapon or go again.'
    : confirm ? 'Current run progress, health, ammunition and upgrades will be discarded. Your control profiles stay saved.'
    : mode === 'saving' ? 'Preparing a safe checkpoint before continuing.' : mode === 'conflict' ? runSaveMessage
    : 'The room is paused. Resume, retry, or choose another weapon.';
  startButton.textContent = prep ? selectedSession === 'm4' ? 'Begin boxing gym ↗' : selectedSession === 'run' ? 'Begin gym run ↗' : 'Begin training ↗' : result ? run ? 'New gym run ↗' : 'Retry this round ↗' : 'Resume training ↗';
  if (run && (reward || paused)) renderOwned(el('menu-upgrades'), run.checkpoint.carry.upgrades.owned);
  if (reward && run) renderOffer();
  if (result && run) {
    const summary = run.summary!;
    el('run-summary').textContent = run instanceof M4RunDirector ? `${summary.outcome} · B01 · ${summary.cleared}/6 rooms cleared · ${names[summary.weapon]} · ${summary.activeSeconds.toFixed(1)}s active play` : `${summary.outcome} · Stage ${summary.stageReached}/${RUN_STAGES.length} · ${summary.cleared} stages cleared · ${names[summary.weapon]} · ${summary.activeSeconds.toFixed(1)}s active play`;
    renderOwned(el('run-summary'), summary.upgrades, true);
  }
  if (focus && !overlay.hidden) {
    const target = confirm ? el('cancel-reset') : reward ? el('reward-options').querySelector<HTMLElement>('button') : mode === 'conflict' ? el('takeover-run') : !startButton.hidden ? startButton : null;
    target?.focus({ preventScroll: true });
  }
}
function renderOwned(container: HTMLElement, ids: readonly UpgradeId[], append = false): void {
  if (!append) container.replaceChildren();
  const list = document.createElement('ul');
  if (!ids.length) { const item = document.createElement('li'); item.textContent = 'No upgrades yet.'; list.append(item); }
  for (const id of ids) { const item = document.createElement('li'); item.textContent = UPGRADES[id].name + ' — ' + UPGRADES[id].description; list.append(item); }
  container.append(list);
}
function renderOffer(): void {
  const container = el('reward-options'); container.replaceChildren();
  for (const id of run!.checkpoint.offer!) {
    const upgrade = UPGRADES[id];
    const button = document.createElement('button'); button.className = 'choice-button reward-choice'; button.dataset.upgrade = id;
    const source = document.createElement('span'), title = document.createElement('strong'), copy = document.createElement('small');
    source.textContent = upgrade.source; title.textContent = upgrade.name; copy.textContent = upgrade.description;
    button.append(source, title, copy); button.addEventListener('click', () => { void chooseReward(id); }); container.append(button);
  }
}
function useStorageResult(result: StorageResult<Checkpoint>, kind: RunKind = runKind()): void {
  if (['conflict', 'unsupported', 'corrupt', 'unavailable'].includes(result.status) && storageResults[kind]?.status !== result.status) audio.ui('error');
  storageResults[kind] = result;
  storageResult = result;
  runSaveMessage = temporaryRun ? 'Temporary run: progress is not saved in this tab.' : result.status === 'ok' ? 'Safe checkpoint saved on this browser and domain.' : result.status === 'empty' || result.status === 'settled' ? 'No active saved run. Controls stay saved separately.' : result.message ?? 'Run storage unavailable. This session cannot be saved.';
}
async function persistRun(settled = false): Promise<boolean> {
  if (!run || temporaryRun) { if (settled) setStored(runKind(), null); return true; }
  const result = settled ? await currentStorage().settle(run.checkpoint.runId)
    : run instanceof M4RunDirector ? await m4Storage.save(run.checkpoint) : await legacyStorage.save(run.checkpoint);
  useStorageResult(result);
  if (result.status === 'conflict' || result.status === 'unsupported' || result.status === 'corrupt' || (!settled && result.status === 'settled')) { mode = 'conflict'; showMenu(); return false; }
  if (result.status === 'unavailable') { temporaryRun = true; runSaveMessage = result.message + ' Progress is not saved; an earlier checkpoint may still exist after reload.'; }
  setStored(runKind(), settled ? null : run.checkpoint);
  return true;
}
function loadStage(): void {
  finishingPresentation = false;
  const cp = run!.checkpoint;
  sim = run instanceof M4RunDirector
    ? new Simulation(undefined, { weapon: cp.weapon, mode: 'encounter', room: run.stage.room, enemyDefinitions: run.stage.enemyDefinitions })
    : new Simulation(undefined, { weapon: cp.weapon, mode: 'encounter', enemySpawns: (run as RunDirector).stage.spawns });
  sim.restoreCarry(cp.carry);
  selectedWeapon = cp.weapon; selectedSession = run instanceof M4RunDirector ? 'm4' : 'run';
  if (cp.phase === 'reward' || cp.phase === 'cleared') {
    sim.state.outcome = 'complete';
    for (const enemy of sim.state.enemies) { enemy.health = 0; enemy.phase = 'defeated'; }
    mode = cp.phase === 'reward' ? 'reward' : 'cleared'; clearInput(); showMenu();
  }
  else { mode = 'paused'; showMenu(false); resume(); if (mode === 'paused') showMenu(); }
  updateHud();
}
function resume(): void {
  if (mode === 'error' || busy || !document.hasFocus()) return;
  mode = run instanceof M4RunDirector && run.phase === 'cleared' ? 'cleared' : 'playing'; clearInput(); input.setContext('gameplay');
  overlay.hidden = true;
  el<HTMLButtonElement>('pause-button').disabled = false;
  canvas.focus({ preventScroll: true }); lastFrame = performance.now();
}
function begin(): void {
  void audio.unlock();
  if (busy || ((selectedSession === 'run' || selectedSession === 'm4') && !storageReady)) return;
  if ((selectedSession === 'run' || selectedSession === 'm4') && stored[runKind()] && mode === 'preparation') { pendingReset = 'restart'; returnMode = mode; mode = 'confirm'; showMenu(); return; }
  void beginFresh();
}
async function beginFresh(): Promise<void> {
  if (busy) return;
  finishingPresentation = false;
  busy = true; clearInput();
  try {
    if (selectedSession === 'run' || selectedSession === 'm4') {
      mode = 'saving'; showMenu();
      const previous = stored[runKind()];
      if (previous && !temporaryRun) {
        const result = await currentStorage().settle(previous.runId); useStorageResult(result);
        if (result.status === 'conflict' || result.status === 'unsupported' || result.status === 'corrupt') { mode = 'conflict'; showMenu(); return; }
        if (result.status === 'unavailable') temporaryRun = true;
        setStored(runKind(), null);
      }
      run = selectedSession === 'm4' ? new M4RunDirector() : new RunDirector(); run.start(selectedWeapon);
      if (!(await persistRun())) return;
      busy = false; loadStage();
    } else {
      run = null; sim = new Simulation(undefined, { weapon: selectedWeapon, mode: selectedSession });
      busy = false; mode = 'paused'; resume(); if (mode === 'paused') showMenu();
    }
    frameSamples.length = 0; updateHud();
  } catch (error) { fail(error); } finally { busy = false; }
}
function pause(reason?: string): void {
  clearInput();
  audio.setGameplayPaused(true);
  if (mode !== 'playing' && mode !== 'cleared') return;
  mode = 'paused'; showMenu();
  if (reason) el('menu-copy').textContent = reason;
}
function preparation(): void {
  finishingPresentation = false;
  mode = 'preparation'; clearInput();
  run = null;
  sim = preparationSimulation();
  showMenu(); updateHud();
}
function requestReset(action: 'restart' | 'preparation'): void {
  if (mode === 'results') { if (action === 'restart') begin(); else preparation(); return; }
  if (mode !== 'paused' && mode !== 'reward') return;
  pendingReset = action; returnMode = mode; mode = 'confirm'; clearInput(); showMenu();
}
function finishRound(pillarFinisher = false): void {
  finishingPresentation = pillarFinisher;
  clearInput();
  if (!run) { mode = 'results'; showMenu(); return; }
  run.completeEncounter(sim); mode = 'saving'; busy = true; showMenu();
  void (async () => {
    try {
      if (!(await persistRun(run!.phase === 'results'))) return;
      busy = false; mode = run!.phase === 'reward' ? 'reward' : run!.phase === 'cleared' ? 'cleared' : 'results';
      if (mode === 'reward') audio.ui('reward');
      showMenu(); updateHud();
    } catch (error) { fail(error); } finally { busy = false; }
  })();
}
async function chooseReward(id: UpgradeId): Promise<void> {
  if (mode !== 'reward' || busy || !run) return;
  busy = true; clearInput(); run.chooseUpgrade(id); mode = 'saving'; showMenu();
  audio.ui();
  try { if (await persistRun()) { busy = false; loadStage(); } }
  catch (error) { fail(error); } finally { busy = false; }
}
async function leaveRoom(): Promise<void> {
  if (!(run instanceof M4RunDirector) || run.phase !== 'cleared' || busy || finishingPresentation) return;
  busy = true; clearInput(); run.advanceRoom(sim); mode = 'saving'; showMenu(); audio.ui();
  try { if (await persistRun()) { busy = false; loadStage(); } }
  catch (error) { fail(error); } finally { busy = false; }
}
async function discardRound(): Promise<void> {
  if (busy) return;
  busy = true; mode = 'saving'; clearInput(); showMenu();
  try {
    if (run && run.phase !== 'results') { run.abandon(sim); if (!(await persistRun(true))) return; }
    busy = false;
    if (pendingReset === 'restart') await beginFresh(); else preparation();
  } catch (error) { fail(error); } finally { busy = false; }
}
async function resumeStored(kind: RunKind): Promise<void> {
  if (!stored[kind] || busy) return;
  void audio.unlock();
  selectedSession = kind; temporaryRun = false; useStorageResult(storageResults[kind]!);
  if (kind === 'm4') { const director = new M4RunDirector(); director.resume(stored.m4!); run = director; }
  else { const director = new RunDirector(); director.resume(stored.run!); run = director; }
  loadStage();
}
async function recoverStorage(temporary: boolean): Promise<void> {
  if (busy) return;
  busy = true;
  try {
    if (temporary) { temporaryRun = true; setStored(runKind(), null); runSaveMessage = 'Temporary run: progress is not saved in this tab.'; }
    else {
      const result = await currentStorage().takeover(); useStorageResult(result);
      if (result.status !== 'ok' && result.status !== 'empty' && result.status !== 'settled') { showMenu(); return; }
      // Reload the winning revision before continuing; never overwrite another tab's progress.
      const loaded = await currentStorage().load(); useStorageResult(loaded); setStored(runKind(), loaded.checkpoint ?? null);
      if (loaded.status === 'conflict' || loaded.status === 'unsupported' || loaded.status === 'corrupt') { showMenu(); return; }
      run = null; busy = false; preparation(); return;
    }
    busy = false;
    if (run) {
      if (run.phase === 'results') { mode = 'results'; showMenu(); }
      else if ((run.phase === 'encounter' && sim.state.outcome === 'playing') || run.phase === 'cleared') { mode = 'paused'; showMenu(false); resume(); if (mode === 'paused') showMenu(); }
      else loadStage();
    } else preparation();
  } catch (error) { fail(error); } finally { busy = false; }
}
function openSettings(): void {
  if (mode === 'playing' || mode === 'cleared') pause();
  if (mode === 'error' || mode === 'confirm' || busy || mode === 'conflict') return;
  clearInput(); overlay.hidden = true; settings.open();
}
function fail(error: unknown): void {
  audio.setGameplayPaused(true); audio.ui('error');
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
  const coach = s.enemies.find(enemy => enemy.archetype === 'B01_M01');
  el('session-description').textContent = run ? run instanceof M4RunDirector ? `${run.stage.room.levelName} · ${run.stage.name}` : run.stage.name : encounter ? 'Read the windup. Make room for the counter.' : 'A little footwork. A lot of character.';
  el('target-label').textContent = run instanceof M4RunDirector ? 'B01 / BOXING GYM' : run ? 'M3 TEST ROUTE' : encounter ? 'BOXER ENCOUNTER' : 'TRAINING PARTNER';
  el('target-name').textContent = coach ? 'Coach · Phase ' + coach.bossPhase : encounter ? run instanceof M4RunDirector ? 'Boxers standing' : 'Jabbers standing' : 'The patient one';
  el('target-health').textContent = coach ? display(coach.health) + ' / ' + display(coach.maxHealth) : encounter ? alive.length + ' / ' + s.enemies.length : display(s.dummy.health) + ' / ' + display(s.dummy.maxHealth);
  el('health-fill').style.width = (coach ? coach.health / coach.maxHealth : encounter ? alive.length / Math.max(1, s.enemies.length) : s.dummy.health / s.dummy.maxHealth) * 100 + '%';
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
  el('interaction-hint').textContent = run instanceof M4RunDirector
    ? run.phase === 'cleared' ? `${input.label('interact')} · Exit open — walk to the marked door` : run.phase === 'encounter' ? coach ? 'Defeat the Coach to finish B01' : `Exit locked · defeat ${alive.length} remaining boxer${alive.length === 1 ? '' : 's'}` : ''
    : mode === 'playing' && nearStation ? input.label('interact') + ' · Preparation station' : '';
  el('run-hud').hidden = !run;
  if (run) {
    el('run-progress').textContent = run instanceof M4RunDirector ? `Level ${run.summary!.level}/3 · Room ${run.summary!.room}/2 · ${run.summary!.cleared}/6 cleared · ${run.checkpoint.activeSeconds.toFixed(1)}s`
      : `Stage ${run.checkpoint.stageIndex + 1}/${RUN_STAGES.length} · ${run.checkpoint.activeSeconds.toFixed(1)}s`;
    el('run-effects').textContent = s.upgrades.owned.map(id => UPGRADES[id].name + ' — ' + UPGRADES[id].description).join(' · ') || 'No upgrades yet';
    el('barrier-status').textContent = p.barrier > 0 ? `Barrier ${display(p.barrier)} · ${s.upgrades.barrierRemaining.toFixed(1)}s` : '';
  }
}

el('reload-page').addEventListener('click', () => location.reload());
try {
  view = new GameView(canvas);
  input = new Controls(canvas, { screenDirection: (x, y) => view.screenDirection(x, y), pointerAim: (x, y) => view.pointerAim(x, y, sim.state.player.position), onSafetyPause: reason => pause(reason) });
  audio.onPreferencesChange = () => view.setReducedEffects(audio.preferences.value.reducedEffects);
  view.setReducedEffects(audio.preferences.value.reducedEffects);
  settings = new SettingsUI(input, { onClose: () => { clearInput(); showMenu(); promptKey = ''; }, presentation: { markup: () => audio.settingsMarkup(), bind: container => audio.bindSettings(container) } });
  startButton.addEventListener('click', () => { void audio.unlock(); if (mode === 'preparation' || mode === 'results') begin(); else if (mode === 'paused') resume(); });
  el('restart-button').addEventListener('click', () => requestReset('restart'));
  el('preparation-button').addEventListener('click', () => requestReset('preparation'));
  el('confirm-reset').addEventListener('click', () => { void discardRound(); });
  el('cancel-reset').addEventListener('click', () => { mode = returnMode; clearInput(); showMenu(); });
  el('pause-button').addEventListener('click', () => pause());
  el('settings-button').addEventListener('click', openSettings);
  el('resume-run').addEventListener('click', () => { void resumeStored('run'); });
  el('resume-m4').addEventListener('click', () => { void resumeStored('m4'); });
  el('takeover-run').addEventListener('click', () => { void recoverStorage(false); });
  el('temporary-run').addEventListener('click', () => { void recoverStorage(true); });
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-weapon]')) button.addEventListener('click', () => {
    if (mode !== 'preparation') return;
    selectedWeapon = button.dataset.weapon as WeaponId;
    document.querySelectorAll<HTMLButtonElement>('[data-weapon]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    sim = preparationSimulation(); updateHud();
  });
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-session]')) button.addEventListener('click', () => {
    if (mode !== 'preparation') return;
    selectedSession = button.dataset.session as AppSession;
    sessionChosen = true;
    document.querySelectorAll<HTMLButtonElement>('[data-session]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    if (selectedSession === 'run' || selectedSession === 'm4') {
      const result = storageResults[selectedSession];
      if (result) { temporaryRun = result.status === 'unavailable'; useStorageResult(result); if (['conflict', 'unsupported', 'corrupt'].includes(result.status)) mode = 'conflict'; }
    }
    sim = preparationSimulation(); showMenu(false); updateHud();
  });
  window.addEventListener('resize', () => view.resize());
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); fail(new Error('Graphics context lost. Reload to reopen the gym.')); });
  window.addEventListener('pagehide', () => { void legacyStorage.close(); void m4Storage.close(); audio.dispose(); input.dispose(); view.dispose(); cancelAnimationFrame(frameHandle); });
  document.addEventListener('pointerdown', event => { if ((event.target as Element).closest('button')) audio.ui(); });
  showMenu(); updateHud();
  void (async () => {
    try {
      const loadedResults = await Promise.all(([['run', legacyStorage], ['m4', m4Storage]] as const).map(async ([kind, storage]) => {
        const opened = await storage.open(); const loaded = opened.status === 'ok' ? await storage.load() : opened;
        storageResults[kind] = loaded; setStored(kind, loaded.checkpoint ?? null); return { kind, loaded };
      }));
      // A legacy checkpoint/conflict remains directly recoverable without changing its data.
      if (mode === 'preparation') {
        if (!sessionChosen && storageResults.m4?.status === 'empty' && storageResults.run?.status !== 'empty' && storageResults.run?.status !== 'unavailable') selectedSession = 'run';
        const loaded = loadedResults.find(item => item.kind === runKind())!.loaded;
        temporaryRun = loaded.status === 'unavailable'; useStorageResult(loaded);
        document.querySelectorAll<HTMLButtonElement>('[data-session]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.session === selectedSession)));
        sim = preparationSimulation();
        if (['m4', 'run'].includes(selectedSession) && (loaded.status === 'conflict' || loaded.status === 'unsupported' || loaded.status === 'corrupt')) mode = 'conflict';
      }
      storageReady = true;
      if (mode === 'preparation' || mode === 'conflict') showMenu(false);
    } catch { storageReady = true; temporaryRun = true; runSaveMessage = 'Run storage unavailable. Progress is not saved in this tab.'; showMenu(false); }
  })();
  if (new URLSearchParams(location.search).has('debug')) {
    Object.defineProperty(window, '__prototype', { configurable: true, value: {
      snapshot: () => structuredClone({ ...sim.state, mode, selectedSession, settingsOpen: settings.isOpen, run: run?.checkpoint ?? null, summary: run?.summary ?? null, storageReady, saveStatus: storageResult?.status, temporaryRun, audio: audio.metrics(), savedM3: !!stored.run, savedM4: !!stored.m4 }),
      project: (position: Vec2) => view.project(position),
      pillarPose: () => view.getPillarPose(),
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
      if (run && !temporaryRun && !busy && ['playing', 'cleared', 'paused', 'reward'].includes(mode)) {
        if (currentStorage().status === 'conflict') {
          clearInput(); if (settings.isOpen) settings.close();
          useStorageResult({ status: 'conflict', message: currentStorage().message }); mode = 'conflict'; showMenu(); transitioned = true;
        } else if (currentStorage().status === 'unavailable') {
          temporaryRun = true; runSaveMessage = 'Progress is not saved; an earlier checkpoint may still exist after reload.';
          if (mode !== 'playing') showMenu(false);
        }
      }
      if (settings.isOpen) { settings.handleFrame(controls); transitioned = true; }
      else if (mode === 'playing' || mode === 'cleared') {
        if (controls.pausePressed) { pause(); transitioned = true; }
        else if (controls.interactPressed && run instanceof M4RunDirector && run.phase === 'cleared' && sim.state.room.exit && Math.hypot(sim.state.player.position.x - sim.state.room.exit.x, sim.state.player.position.z - sim.state.room.exit.z) <= 1.3) { void leaveRoom(); transitioned = true; }
        else if (controls.interactPressed && !(run instanceof M4RunDirector) && Math.hypot(sim.state.player.position.x, sim.state.player.position.z + 2.5) <= 1.15) { pause('Preparation station. Resume, retry, or change your equipment.'); transitioned = true; }
      } else {
        if (controls.settingsPressed && mode !== 'confirm') { openSettings(); transitioned = true; }
        else if (controls.restartPressed && (mode === 'paused' || mode === 'results' || mode === 'reward')) { requestReset('restart'); transitioned = true; }
        else if (controls.backPressed) {
          if (mode === 'paused') resume();
          else if (mode === 'confirm') { mode = returnMode; clearInput(); showMenu(); }
          else if (mode === 'results') preparation();
          else if (mode === 'reward') requestReset('preparation');
          transitioned = true;
        } else if (!busy && !visibleFinisher()) transitioned = handleMenuFrame(sessionMenu, controls);
      }
      audio.setGameplayPaused(!['playing', 'cleared'].includes(mode) || settings.isOpen || document.hidden || !document.hasFocus() || finishingPresentation);
      if ((mode === 'playing' || mode === 'cleared') && !transitioned && !settings.isOpen && !finishingPresentation) {
        if (elapsed > 0 && elapsed < 0.2) { frameSamples.push(elapsed * 1000); if (frameSamples.length > 600) frameSamples.shift(); }
        const bounds = canvas.getBoundingClientRect();
        sim.setVisibleEnemyIds(sim.state.enemies.filter(enemy => { const point = view.project(enemy.position); return point.x >= bounds.left && point.x <= bounds.right && point.y >= bounds.top && point.y <= bounds.bottom; }).map(enemy => enemy.id));
        accumulator += Math.min(elapsed, 0.10);
        attackEdge ||= controls.actions.attackPressed; dashEdge ||= controls.actions.dashPressed; reloadEdge ||= Boolean(controls.actions.reloadPressed);
        while (accumulator >= RULES.fixedStep) {
          const actions = { ...controls.actions, attackPressed: attackEdge, dashPressed: dashEdge, reloadPressed: reloadEdge };
          const stepHits = mode === 'cleared' ? sim.stepTraversal(actions) : sim.step(actions);
          events.push(...stepHits); audio.consume(sim.drainSoundEvents(), stepHits);
          attackEdge = false; dashEdge = false; reloadEdge = false; accumulator -= RULES.fixedStep;
          if (mode === 'playing' && sim.state.outcome !== 'playing') { finishRound(sim.state.outcome === 'complete' && events.some(event => event.source === 'player' && event.weapon === 'weapon_03')); break; }
        }
        if (run && (mode === 'playing' || mode === 'cleared')) run.updateFrom(sim);
      }
      const cosmeticDt = sim.state.outcome === 'complete' && ['reward', 'results', 'saving', 'cleared'].includes(mode) && document.hasFocus() && !document.hidden && !settings.isOpen ? Math.min(elapsed, 0.1) : 0;
      view.render(sim.state, events, (mode === 'playing' || mode === 'cleared') && !finishingPresentation ? Math.min(elapsed, 0.1) : 0, cosmeticDt);
      if (finishingPresentation && !view.getPillarPose().terminal) {
        finishingPresentation = false;
        if (!settings.isOpen && ['reward', 'results', 'saving', 'cleared'].includes(mode)) showMenu();
      } else if (finishingPresentation && !settings.isOpen && ['reward', 'results', 'saving'].includes(mode)) overlay.hidden = visibleFinisher();
      if (now - lastHud > 50) { updateHud(); lastHud = now; }
      frameHandle = requestAnimationFrame(frame);
    } catch (error) { fail(error); }
  }
  frameHandle = requestAnimationFrame(frame);
} catch (error) { fail(error); }
