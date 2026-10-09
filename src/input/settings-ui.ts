import './settings.css';
import { Controls, bindingLabel, type ControlFrame } from './adapter';
import { ACTIONS, ACTION_IDS, convertKeySemantics, defaultProfile, rebind, validateProfile, type ActionId, type Binding, type Calibration, type DeviceKind, type Profile } from './settings';

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const focusable = (container: HTMLElement): HTMLElement[] => [...container.querySelectorAll<HTMLElement>('button,input,select,textarea,[tabindex="0"]')].filter(el => !el.closest('[hidden]') && !(el as HTMLButtonElement).disabled && el.getClientRects().length > 0);
/** Shared menu navigation consumes only remappable semantic actions. Pointer clicks remain native. */
export function handleMenuFrame(container: HTMLElement, frame: ControlFrame): boolean {
  const controls = focusable(container); if (!controls.length) return false;
  let index = controls.indexOf(document.activeElement as HTMLElement);
  if (index < 0) index = 0;
  let current = controls[index]; let handled = false;
  const direction = frame.tabDirection || frame.menuDirection;
  if (direction) { index = (index + direction + controls.length) % controls.length; current = controls[index]; current.focus({ preventScroll: true }); current.scrollIntoView({ block: 'nearest' }); handled = true; }
  if (frame.menuHorizontal) {
    if (current instanceof HTMLSelectElement) { current.selectedIndex = Math.max(0, Math.min(current.options.length - 1, current.selectedIndex + frame.menuHorizontal)); current.dispatchEvent(new Event('change', { bubbles: true })); }
    else if (current instanceof HTMLInputElement && current.type === 'range') {
      current.value = String(Math.max(Number(current.min), Math.min(Number(current.max), Number(current.value) + Number(current.step || 1) * frame.menuHorizontal)));
      current.dispatchEvent(new Event('input', { bubbles: true })); current.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (current instanceof HTMLInputElement && current.type === 'checkbox') current.click();
    else { index = (index + frame.menuHorizontal + controls.length) % controls.length; current = controls[index]; current.focus({ preventScroll: true }); current.scrollIntoView({ block: 'nearest' }); }
    handled = true;
  }
  if (frame.confirmPressed) {
    if (current instanceof HTMLSelectElement) { current.selectedIndex = (current.selectedIndex + 1) % current.options.length; current.dispatchEvent(new Event('change', { bubbles: true })); }
    else if (current instanceof HTMLInputElement && (current.type === 'text' || current.type === 'range')) controls[(index + 1) % controls.length].focus({ preventScroll: true });
    else current.click();
    handled = true;
  }
  if (frame.scrollDirection) { const scrollable = container.querySelector<HTMLElement>('.settings-scroll') ?? container; scrollable.scrollBy({ top: frame.scrollDirection * 160 }); handled = true; }
  return handled;
}

export class SettingsUI {
  readonly element: HTMLDivElement;
  isOpen = false;
  private kind: DeviceKind = 'keyboard';
  private profileId = 'keyboard';
  private tab: 'bindings' | 'calibration' = 'bindings';
  private selected: ActionId | null = null;
  private candidate: Binding | null = null;
  private append = false;
  private guide = false;
  private guideIndex = 0;
  private lastCaptureState = '';
  private calibrationDraft: Profile | null = null;
  private status = '';
  private refreshAt = 0;
  constructor(private input: Controls, private callbacks: { onClose: () => void }) {
    this.element = document.createElement('div'); this.element.className = 'settings-overlay'; this.element.id = 'controls-settings'; this.element.hidden = true;
    document.body.append(this.element);
  }
  open(): void { this.isOpen = true; this.element.hidden = false; this.input.setContext('menu'); this.kind = this.input.currentFamily === 'keyboard' ? 'keyboard' : 'controller'; this.profileId = this.input.settings.profile(this.kind).id; this.status = ''; this.render(); }
  close(): void { this.isOpen = false; this.element.hidden = true; this.input.endCapture(); this.selected = null; this.candidate = null; this.guide = false; this.calibrationDraft = null; this.callbacks.onClose(); }
  handleFrame(frame: ControlFrame): void {
    if (!this.isOpen) return;
    if (this.input.capture) {
      if (frame.backPressed) { this.cancelCapture(); return; }
      const capture = this.input.capture;
      const stateText = capture.state === 'release' ? 'Release the input used to start capture, and center sticks.' : capture.state === 'armed' ? 'Press a key, mouse button, wheel direction, or move a controller axis deliberately.' : capture.state === 'neutral' ? 'Release the captured input and return axes to neutral.' : 'Input captured.';
      const line = this.element.querySelector<HTMLElement>('#capture-status'); if (line) line.textContent = stateText;
      if (capture.state === 'preview' && capture.candidate) { this.candidate = capture.candidate; this.input.endCapture(); this.renderCapture(); }
      return;
    }
    if (frame.backPressed) { if (this.selected) this.cancelCapture(); else this.close(); return; }
    handleMenuFrame(this.element.querySelector<HTMLElement>('.binding-dialog') ?? this.element, frame);
    if (performance.now() > this.refreshAt) {
      this.refreshAt = performance.now() + 150;
      const sample = this.input.calibrationSample(this.calibrationDraft ?? undefined); const output = this.element.querySelector<HTMLElement>('#calibration-live');
      if (output) output.textContent = `Live axes: ${sample.axes.map((v, i) => `${i + 1}: ${v.toFixed(2)}`).join(' · ') || 'No controller visible'} | Buttons: ${sample.buttons.map((v, i) => v > .08 ? `${i + 1}: ${v.toFixed(2)}` : '').filter(Boolean).join(' · ') || 'neutral'} | Movement ${sample.move.x.toFixed(2)}, ${sample.move.z.toFixed(2)} · Aim ${sample.aim.x.toFixed(2)}, ${sample.aim.z.toFixed(2)}`;
      const connection = this.element.querySelector<HTMLElement>('#settings-connection'); if (connection) connection.textContent = frame.controllerStatus;
    }
  }
  private profile(): Profile { return this.input.settings.value.profiles.find(p => p.id === this.profileId)!; }
  private button(id: string, handler: () => void): void { this.element.querySelector<HTMLButtonElement>(`#${id}`)?.addEventListener('click', handler); }
  private render(focusId?: string): void {
    const profile = this.profile(); const family = this.kind === 'keyboard' ? 'keyboard' : this.input.currentFamily === 'keyboard' ? 'gamepad' : this.input.currentFamily;
    const profiles = this.input.settings.value.profiles.filter(p => p.kind === this.kind);
    this.element.innerHTML = `<section class="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <header><div><span class="eyebrow">YOUR CONTROLS</span><h2 id="settings-title">Make yourself at home.</h2></div><button id="settings-close" class="small-button">Back to session</button></header>
      <p class="settings-instructions">Navigate: ${escapeHtml(this.input.label('menuUp'))} / ${escapeHtml(this.input.label('menuDown'))} · Adjust: ${escapeHtml(this.input.label('menuLeft'))} / ${escapeHtml(this.input.label('menuRight'))} · Confirm: ${escapeHtml(this.input.label('confirm'))} · Back: ${escapeHtml(this.input.label('back'))}</p>
      <div class="settings-toolbar"><label>Device profile <select id="settings-kind"><option value="keyboard" ${this.kind === 'keyboard' ? 'selected' : ''}>Keyboard + mouse</option><option value="controller" ${this.kind === 'controller' ? 'selected' : ''}>Controller</option></select></label>
      <label>Profile <select id="settings-profile">${profiles.map(p => `<option value="${escapeHtml(p.id)}" ${p.id === profile.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}</select></label>
      <button id="profile-clone">Duplicate profile</button><label>Profile name <input id="profile-name" type="text" maxlength="80" value="${escapeHtml(profile.name)}"></label><button id="profile-rename">Save name</button></div>
      ${this.kind === 'controller' ? `<div class="settings-toolbar"><label>Active controller <select id="active-controller"><option value="">Choose connected device</option>${this.input.listControllers().map(p => `<option value="${p.index}" ${p.active ? 'selected' : ''}>${escapeHtml(p.id)} · ${p.mapping || 'nonstandard'}</option>`).join('')}</select></label><button id="refresh-controllers">Refresh controllers</button><button id="controller-guide">Guided mapping</button><button id="confirm-mapping">Use this profile for this controller</button></div>` : ''}
      <p id="settings-connection"></p><div class="settings-tabs"><button id="bindings-tab" aria-pressed="${this.tab === 'bindings'}">Bindings</button><button id="calibration-tab" aria-pressed="${this.tab === 'calibration'}">Calibration & behavior</button></div>
      <div class="settings-scroll">${this.tab === 'bindings' ? `<p>Each row replaces its mapping after preview. Enable “Keep existing alternatives” to add instead. Bindings may be reused in different contexts. Keyboard labels show stored physical keys or characters explicitly.</p><table class="bindings-table"><thead><tr><th>Action / context</th><th>Current bindings</th><th>Reset</th></tr></thead><tbody>${ACTION_IDS.map(action => `<tr><th scope="row">${ACTIONS[action][0]}<small>${ACTIONS[action][1]}</small></th><td><button class="binding-button" id="bind-${action}" data-action="${action}" aria-label="Rebind ${ACTIONS[action][0]}">${escapeHtml(profile.bindings[action].map(b => bindingLabel(b, family)).join(' / ') || 'Unbound')}</button></td><td><button data-clear="${action}" aria-label="Clear ${ACTIONS[action][0]}">Clear</button><button data-restore="${action}" aria-label="Restore ${ACTIONS[action][0]}">Default</button></td></tr>`).join('')}</tbody></table>` : this.calibrationMarkup(profile)}
      <p class="settings-limitations">Only inputs exposed by this browser can be captured. OS/browser shortcuts and controller system buttons may be reserved. Motion sensors, touchpad gestures and rumble are not mapped here. Left-click still selects visible UI controls; a mapped left-click menu action works on the menu background. Unknown controllers use neutral button/axis labels; use Guided mapping and verify each action. Device names identify stored assignments, not transient connection indices.</p></div>
      <footer><p id="settings-status" role="status">${escapeHtml(this.status || this.input.settings.status)}</p><div class="settings-toolbar"><button id="restore-profile">Restore this profile’s defaults</button><button id="recover-controls">Recover last working controls</button><button id="settings-done" class="primary-button">Done</button></div></footer>
    </section>`;
    this.button('settings-close', () => this.close()); this.button('settings-done', () => this.close());
    this.button('bindings-tab', () => { this.tab = 'bindings'; this.calibrationDraft = null; this.render('bindings-tab'); });
    this.button('calibration-tab', () => { this.tab = 'calibration'; this.calibrationDraft = structuredClone(this.profile()); this.render('calibration-tab'); });
    this.button('restore-profile', () => { this.status = this.input.settings.restoreProfile(profile.id).join(' ') || 'Selected profile restored. Other profiles and unrelated settings are unchanged.'; this.calibrationDraft = null; this.render('restore-profile'); });
    this.button('recover-controls', () => { this.input.settings.recover(); this.profileId = this.input.settings.profile(this.kind).id; this.status = 'Previous valid settings recovered. Release held inputs before continuing.'; this.calibrationDraft = null; this.render('recover-controls'); });
    this.button('profile-clone', () => {
      const clone = structuredClone(profile); clone.id = `${this.kind}-${Date.now()}`; clone.name = `${profile.name.slice(0, 60)} copy`;
      const errors = this.input.settings.applyProfile(clone); if (errors.length) this.status = errors.join(' '); else { this.profileId = clone.id; this.activateProfile(); }
      this.render('settings-profile');
    });
    this.button('profile-rename', () => { const next = structuredClone(profile); next.name = this.element.querySelector<HTMLInputElement>('#profile-name')!.value.trim(); this.status = this.input.settings.applyProfile(next).join(' ') || 'Profile name saved.'; this.render('profile-rename'); });
    this.button('refresh-controllers', () => this.render('active-controller'));
    this.button('confirm-mapping', () => { this.input.assignCurrentController(this.profileId); this.status = 'Controller profile selected explicitly. Test navigation and gameplay before combat.'; this.render('confirm-mapping'); });
    this.button('controller-guide', () => { this.guide = true; this.guideIndex = 0; this.beginCapture(ACTION_IDS[0]); });
    this.element.querySelector<HTMLSelectElement>('#settings-kind')?.addEventListener('change', event => { this.kind = (event.target as HTMLSelectElement).value as DeviceKind; this.profileId = this.input.settings.profile(this.kind).id; this.calibrationDraft = null; this.render('settings-kind'); });
    this.element.querySelector<HTMLSelectElement>('#settings-profile')?.addEventListener('change', event => { this.profileId = (event.target as HTMLSelectElement).value; this.activateProfile(); this.calibrationDraft = null; this.render('settings-profile'); });
    this.element.querySelector<HTMLSelectElement>('#active-controller')?.addEventListener('change', event => { const value = (event.target as HTMLSelectElement).value; if (value !== '') this.input.selectController(Number(value)); this.profileId = this.input.settings.profile('controller').id; this.render('active-controller'); });
    this.element.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button => button.addEventListener('click', () => { this.guide = false; this.beginCapture(button.dataset.action as ActionId); }));
    this.element.querySelectorAll<HTMLButtonElement>('[data-clear]').forEach(button => button.addEventListener('click', () => {
      const action = button.dataset.clear as ActionId; const result = rebind(this.profile(), action, null); this.status = result.profile ? this.input.settings.applyProfile(result.profile).join(' ') || `${ACTIONS[action][0]} cleared.` : result.errors.join(' '); this.render(`bind-${action}`);
    }));
    this.element.querySelectorAll<HTMLButtonElement>('[data-restore]').forEach(button => button.addEventListener('click', () => {
      const action = button.dataset.restore as ActionId; const next = structuredClone(this.profile()); const defaults = defaultProfile(this.kind); convertKeySemantics(defaults, next.calibration.keySemantics); next.bindings[action] = defaults.bindings[action]; const errors = validateProfile(next); this.status = errors.length ? `Cannot restore this action: ${errors.join(' ')} Use profile defaults or resolve the conflict first.` : this.input.settings.applyProfile(next).join(' ') || `${ACTIONS[action][0]} restored.`; this.render(`bind-${action}`);
    }));
    if (this.tab === 'calibration') this.bindCalibration();
    (this.element.querySelector<HTMLElement>(`#${focusId ?? 'settings-close'}`) ?? this.element.querySelector<HTMLElement>('button'))?.focus({ preventScroll: true });
  }
  private activateProfile(): void {
    if (this.kind === 'controller') this.input.assignCurrentController(this.profileId);
    else { const next = structuredClone(this.input.settings.value); next.keyboardProfile = this.profileId; this.input.settings.apply(next); }
  }
  private beginCapture(action: ActionId): void { this.selected = action; this.candidate = null; this.append = false; this.input.beginCapture(this.kind, this.profile().calibration.keySemantics); this.renderCapture(); }
  private renderCapture(): void {
    this.element.querySelector('.binding-backdrop')?.remove(); if (!this.selected) return;
    const action = this.selected; const candidate = this.candidate;
    const result = candidate ? rebind(this.profile(), action, candidate, 'cancel', this.append) : null;
    const backdrop = document.createElement('div'); backdrop.className = 'binding-backdrop';
    backdrop.innerHTML = `<section class="binding-dialog" role="dialog" aria-modal="true" aria-labelledby="capture-title"><span class="eyebrow">${this.guide ? `GUIDED SETUP ${this.guideIndex + 1} / ${ACTION_IDS.length}` : 'BINDING PREVIEW'}</span><h3 id="capture-title">${ACTIONS[action][0]}</h3>
      <p id="capture-status" role="status">${candidate ? `New binding: ${escapeHtml(bindingLabel(candidate, this.kind === 'controller' ? 'gamepad' : 'keyboard'))}` : 'Release all inputs to arm capture.'}</p>
      <p>${candidate ? 'Nothing changes until you apply. The complete profile is validated, including required menu controls.' : `Tap any exposed input to bind it, including the current Back input. Hold ${escapeHtml(this.input.label('back'))} for 1.2 seconds to cancel capture. Pointer Cancel is always available.`}</p>
      ${this.guide ? '<p>Each applied step is saved. Cancel ends the guide without reverting steps you already applied. Duplicate your profile before setup to preserve the original.</p>' : ''}
      ${candidate ? `<label><input id="capture-append" type="checkbox" ${this.append ? 'checked' : ''}> Keep existing alternatives</label><p id="capture-conflict">${result?.conflicts.length ? `Conflicts with: ${result.conflicts.map(a => ACTIONS[a][0]).join(', ')}.` : 'No same-context conflict.'}</p><div class="settings-toolbar"><button id="binding-apply" ${result?.conflicts.length ? 'hidden' : ''}>Apply binding</button><button id="binding-replace" ${!result?.conflicts.length ? 'hidden' : ''}>Replace conflicting binding</button><button id="binding-swap" ${!result?.conflicts.length ? 'hidden' : ''}>Swap bindings</button><button id="binding-recapture">Capture another input</button></div>` : ''}
      <p id="capture-error" role="alert"></p><button id="binding-cancel">Cancel${this.guide ? ' guided setup' : ''}</button></section>`;
    this.element.querySelector('.settings-panel')!.append(backdrop);
    this.button('binding-cancel', () => this.cancelCapture()); this.button('binding-recapture', () => this.beginCapture(action));
    this.button('binding-apply', () => this.applyCapture('cancel')); this.button('binding-replace', () => this.applyCapture('replace')); this.button('binding-swap', () => this.applyCapture('swap'));
    this.element.querySelector<HTMLInputElement>('#capture-append')?.addEventListener('change', event => { this.append = (event.target as HTMLInputElement).checked; this.renderCapture(); });
    if (candidate) (this.element.querySelector<HTMLButtonElement>('#binding-apply:not([hidden])') ?? this.element.querySelector<HTMLButtonElement>('#binding-swap'))?.focus({ preventScroll: true });
    else this.element.querySelector<HTMLButtonElement>('#binding-cancel')?.focus({ preventScroll: true });
  }
  private applyCapture(resolution: 'cancel' | 'replace' | 'swap'): void {
    if (!this.selected || !this.candidate) return;
    const result = rebind(this.profile(), this.selected, this.candidate, resolution, this.append);
    const errors = result.profile ? this.input.settings.applyProfile(result.profile) : result.errors;
    if (errors.length) { this.element.querySelector<HTMLElement>('#capture-error')!.textContent = errors.join(' '); return; }
    const selected = this.selected;
    if (this.guide && ++this.guideIndex < ACTION_IDS.length) { this.beginCapture(ACTION_IDS[this.guideIndex]); return; }
    if (this.guide) this.input.assignCurrentController(this.profileId);
    this.status = this.guide ? 'Guided mapping complete. Verify movement, aiming and every menu action before starting combat.' : `${ACTIONS[selected][0]} updated. Release held inputs before continuing.`;
    this.selected = null; this.candidate = null; this.guide = false; this.input.endCapture(); this.render(`bind-${selected}`);
  }
  private cancelCapture(): void { const selected = this.selected; this.input.endCapture(); this.selected = null; this.candidate = null; this.guide = false; this.status = 'Capture canceled; unapplied input was discarded.'; this.render(selected ? `bind-${selected}` : undefined); }
  private calibrationMarkup(profile: Profile): string {
    const draft = this.calibrationDraft ?? profile; const c = draft.calibration;
    const numeric: [keyof Calibration, string, number, number, number][] = [
      ['innerDeadzone', 'Inner dead zone', 0, .8, .01], ['outerDeadzone', 'Outer dead zone', 0, .4, .01], ['sensitivity', 'Movement sensitivity', .25, 2, .05], ['aimSensitivity', 'Aim sensitivity', .25, 2, .05], ['triggerThreshold', 'Trigger / digital-axis threshold', .1, .95, .05], ['menuThreshold', 'Menu axis threshold', .3, .95, .05], ['repeatDelay', 'Menu repeat delay (ms)', 150, 1000, 10], ['repeatInterval', 'Menu repeat interval (ms)', 60, 500, 10],
    ];
    return `<p>Adjust with the bound left/right actions or a pointer. Live raw values help identify drift. Save applies the profile after validation; Cancel discards these edits.</p><div class="calibration-grid">${numeric.map(([key, label, min, max, step]) => `<label>${label} <output id="out-${key}">${c[key]}</output><input data-number="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${c[key]}" aria-label="${label}"></label>`).join('')}
      ${(['invertMoveX', 'invertMoveY', 'invertAimX', 'invertAimY', 'pointerAim'] as const).map((key, i) => `<label><input data-boolean="${key}" type="checkbox" ${c[key] ? 'checked' : ''}> ${['Invert movement X', 'Invert movement Y', 'Invert aim X', 'Invert aim Y', 'Pointer aiming (keyboard/mouse)'][i]}</label>`).join('')}
      <label>Attack behavior <select data-choice="attackMode"><option value="hold" ${c.attackMode === 'hold' ? 'selected' : ''}>Hold to attack</option><option value="toggle" ${c.attackMode === 'toggle' ? 'selected' : ''}>Press to toggle continuous attack</option></select></label>
      <label>Keyboard profile semantics <select data-choice="keySemantics"><option value="physical" ${c.keySemantics === 'physical' ? 'selected' : ''}>Physical key position (event.code)</option><option value="character" ${c.keySemantics === 'character' ? 'selected' : ''}>Character on current layout (event.key)</option></select></label>
      <label>Controller prompt family <select id="prompt-family">${['auto', 'playstation', 'xbox', 'gamepad'].map(value => `<option value="${value}" ${value === this.input.settings.value.promptFamily ? 'selected' : ''}>${value === 'gamepad' ? 'Generic button / axis numbers' : value}</option>`).join('')}</select></label></div><p id="calibration-live" class="calibration-live"></p><p>Physical bindings keep their stored key position when the OS layout changes. Character bindings follow the stored character. Changing semantics converts the whole profile; verify the displayed characters afterward. Where layout access is unavailable, letters/numbers use Latin default labels. Absolute pointer aiming uses world position; aim sensitivity controls stick turning response.</p><div class="settings-toolbar"><button id="calibration-save">Save calibration</button><button id="calibration-cancel">Cancel calibration edits</button></div>`;
  }
  private bindCalibration(): void {
    this.calibrationDraft ??= structuredClone(this.profile());
    this.element.querySelectorAll<HTMLInputElement>('[data-number]').forEach(el => el.addEventListener('input', () => { const key = el.dataset.number as keyof Calibration; (this.calibrationDraft!.calibration as unknown as Record<string, number>)[key] = Number(el.value); this.element.querySelector<HTMLOutputElement>(`#out-${key}`)!.value = el.value; }));
    this.element.querySelectorAll<HTMLInputElement>('[data-boolean]').forEach(el => el.addEventListener('change', () => { (this.calibrationDraft!.calibration as unknown as Record<string, boolean>)[el.dataset.boolean!] = el.checked; }));
    this.element.querySelectorAll<HTMLSelectElement>('[data-choice]').forEach(el => el.addEventListener('change', () => { (this.calibrationDraft!.calibration as unknown as Record<string, string>)[el.dataset.choice!] = el.value; }));
    this.button('calibration-save', async () => {
      let layout: ReadonlyMap<string, string> | undefined;
      try { layout = await (navigator as Navigator & { keyboard?: { getLayoutMap(): Promise<ReadonlyMap<string, string>> } }).keyboard?.getLayoutMap(); } catch { /* Explicit fallback is described alongside this setting. */ }
      const errors = convertKeySemantics(this.calibrationDraft!, this.calibrationDraft!.calibration.keySemantics, layout);
      errors.push(...validateProfile(this.calibrationDraft!)); if (errors.length) { this.status = errors.join(' '); this.element.querySelector<HTMLElement>('#settings-status')!.textContent = this.status; return; }
      const next = structuredClone(this.input.settings.value); next.profiles[next.profiles.findIndex(p => p.id === this.profileId)] = this.calibrationDraft!; next.promptFamily = this.element.querySelector<HTMLSelectElement>('#prompt-family')!.value as typeof next.promptFamily;
      this.status = this.input.settings.apply(next).join(' ') || 'Calibration saved. Held inputs cleared.'; this.calibrationDraft = null; this.render('calibration-save');
    });
    this.button('calibration-cancel', () => { this.calibrationDraft = null; this.status = 'Calibration edits discarded.'; this.render('calibration-cancel'); });
  }
}
