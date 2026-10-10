import type { HitEvent, SimulationSoundEvent } from '../game/types';

export const PRESENTATION_KEY = 'krewetekbuldogul.presentation.v1';
export interface PresentationPreferences {
  version: 1; master: number; effects: number; ui: number; ambience: number;
  muted: boolean; reducedIntensity: boolean; reducedEffects: boolean;
}
export const DEFAULT_PRESENTATION: PresentationPreferences = {
  version: 1, master: 0.65, effects: 0.7, ui: 0.55, ambience: 0.25,
  muted: false, reducedIntensity: false, reducedEffects: false,
};
interface PreferenceStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export function validPresentation(value: unknown): value is PresentationPreferences {
  if (!value || typeof value !== 'object') return false;
  const p = value as PresentationPreferences;
  return p.version === 1 && ['master', 'effects', 'ui', 'ambience'].every(key => {
    const v = p[key as keyof PresentationPreferences]; return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
  }) && [p.muted, p.reducedIntensity, p.reducedEffects].every(v => typeof v === 'boolean');
}
export class PresentationStore {
  value = { ...DEFAULT_PRESENTATION };
  status = 'Presentation preferences saved on this browser.';
  constructor(private storage?: PreferenceStorage) {
    try {
      const raw = storage?.getItem(PRESENTATION_KEY);
      if (raw) { const value: unknown = JSON.parse(raw); if (validPresentation(value)) this.value = value; else this.status = 'Invalid presentation preferences; using safe defaults.'; }
      if (!storage) this.status = 'Presentation preferences are session-only.';
    } catch { this.status = 'Presentation storage unavailable; using safe session preferences.'; }
  }
  apply(value: PresentationPreferences): boolean {
    if (!validPresentation(value)) return false;
    this.value = { ...value };
    try { if (!this.storage) throw new Error('No storage'); this.storage.setItem(PRESENTATION_KEY, JSON.stringify(value)); this.status = 'Presentation preferences saved on this browser.'; }
    catch { this.status = 'Presentation preferences work for this session; storage is unavailable.'; }
    return true;
  }
}
type Voice = { source: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode; group: 'effects' | 'ui' | 'ambience'; family: string; critical: boolean };
export type AudioStatus = 'locked' | 'running' | 'blocked' | 'unsupported';

/** Original noise percussion, authored here. No recordings, tonal oscillators or music. */
export class GameAudio {
  readonly preferences: PresentationStore;
  onPreferencesChange?: () => void;
  private context: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  private voices = new Set<Voice>();
  private lastFamily = new Map<string, number>();
  private gameplayPaused = true;
  private status: AudioStatus = 'locked';
  private played = 0;
  private dropped = 0;
  constructor(storage?: PreferenceStorage) { this.preferences = new PresentationStore(storage); }
  async unlock(): Promise<void> {
    try {
      if (!this.context) {
        if (!globalThis.AudioContext) { this.status = 'unsupported'; return; }
        this.context = new AudioContext();
        this.noise = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
        const data = this.noise.getChannelData(0); let seed = 0x4b425346;
        for (let i = 0; i < data.length; i++) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; data[i] = ((seed >>> 0) / 0xffffffff * 2 - 1) * 0.8; }
      }
      if (this.context.state !== 'running') await this.context.resume();
      this.status = this.context.state === 'running' ? 'running' : 'blocked';
    } catch { this.status = 'blocked'; }
  }
  setGameplayPaused(paused: boolean): void {
    if (paused === this.gameplayPaused) return;
    this.gameplayPaused = paused;
    if (paused) for (const voice of [...this.voices]) if (voice.group !== 'ui') this.stop(voice);
  }
  private stop(voice: Voice): void {
    this.voices.delete(voice);
    try { voice.source.stop(); } catch { /* Already ended. */ }
    voice.source.disconnect(); voice.filter.disconnect(); voice.gain.disconnect();
  }
  private percussion(family: string, group: Voice['group'], cutoff: number, duration: number, level: number, critical = false): void {
    const ctx = this.context, prefs = this.preferences.value;
    if (!ctx || ctx.state !== 'running' || !this.noise || prefs.muted || prefs.master === 0 || prefs[group] === 0 || group !== 'ui' && this.gameplayPaused) return;
    const now = ctx.currentTime;
    if (!critical && now - (this.lastFamily.get(family) ?? -1) < 0.05) { this.dropped++; return; }
    const same = [...this.voices].filter(voice => voice.family === family);
    if (same.length >= 3) this.stop(same[0]);
    if (this.voices.size >= 24) {
      const expendable = [...this.voices].find(voice => !voice.critical);
      if (critical && expendable) this.stop(expendable); else { this.dropped++; return; }
    }
    this.lastFamily.set(family, now);
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = this.noise; filter.type = 'lowpass'; filter.frequency.value = cutoff;
    const peak = level * prefs.master * prefs[group] * (prefs.reducedIntensity ? 0.55 : 1);
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(peak, now + 0.009);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    const voice: Voice = { source, filter, gain, family, group, critical }; this.voices.add(voice);
    source.onended = () => { if (this.voices.delete(voice)) { source.disconnect(); filter.disconnect(); gain.disconnect(); } };
    source.start(now, (this.played % 7) * 0.08, duration); this.played++;
  }
  consume(cues: readonly SimulationSoundEvent[], hits: readonly HitEvent[]): void {
    if (this.gameplayPaused) return;
    for (const cue of cues) {
      const pillar = cue.weapon === 'weapon_03', rifle = cue.weapon === 'weapon_01';
      if (cue.kind === 'attack') this.percussion('attack-' + (cue.weapon ?? 'enemy'), 'effects', pillar ? 520 : rifle ? 2100 : 1100, pillar ? 0.18 : 0.075, pillar ? 0.18 : 0.12);
      else if (cue.kind === 'miss') this.percussion('miss-' + cue.weapon, 'effects', pillar ? 750 : rifle ? 2400 : 1600, pillar ? 0.17 : 0.11, 0.045);
      else if (cue.kind === 'reload-start' || cue.kind === 'reload-end') this.percussion(cue.kind, 'effects', 2600, 0.055, 0.075);
      else if (cue.kind === 'dash') this.percussion('dash', 'effects', 1700, 0.18, 0.075);
      else if (cue.kind === 'step') this.percussion('step', 'effects', 600, 0.05, 0.035);
      else if (cue.kind === 'warning' || cue.kind === 'phase-change') this.percussion(cue.kind, 'effects', cue.archetype === 'B01_M01' ? 700 : 1200, 0.2, 0.14, true);
    }
    for (const hit of hits) this.percussion(hit.source === 'enemy' ? 'hurt' : 'impact-' + hit.weapon, 'effects', hit.weapon === 'weapon_03' ? 400 : 850, hit.weapon === 'weapon_03' ? 0.2 : 0.10, hit.source === 'enemy' ? 0.17 : 0.11, hit.source === 'enemy');
  }
  ui(kind: 'confirm' | 'reward' | 'error' = 'confirm'): void {
    if (typeof document !== 'undefined' && (document.hidden || !document.hasFocus())) return;
    this.percussion('ui-' + kind, 'ui', kind === 'error' ? 700 : kind === 'reward' ? 2200 : 1500, kind === 'reward' ? 0.12 : 0.065, 0.09, kind === 'error');
  }
  metrics() { return { status: this.status, contextState: this.context?.state ?? 'none', gameplayPaused: this.gameplayPaused, activeVoices: this.voices.size, played: this.played, dropped: this.dropped, preferences: { ...this.preferences.value } }; }
  settingsMarkup(): string {
    const p = this.preferences.value;
    return `<fieldset class="presentation-settings"><legend>Sound and presentation</legend><p>No music. Noise percussion for attacks, warnings and menus.</p><div class="presentation-grid">${(['master', 'effects', 'ui', 'ambience'] as const).map(key => `<label>${key[0].toUpperCase() + key.slice(1)} <output id="presentation-${key}-value">${Math.round(p[key] * 100)}%</output><input id="presentation-${key}" type="range" min="0" max="1" step="0.05" value="${p[key]}" aria-label="${key} volume"></label>`).join('')}${(['muted', 'reducedIntensity', 'reducedEffects'] as const).map((key, i) => `<label><input id="presentation-${key}" type="checkbox" ${p[key] ? 'checked' : ''}>${['Mute all sound', 'Softer sound intensity', 'Reduced decorative effects'][i]}</label>`).join('')}</div><button id="enable-audio" type="button">Enable / retry sound</button><p id="presentation-status" role="status">${this.preferences.status} Audio ${this.status}.</p></fieldset>`;
  }
  bindSettings(container: HTMLElement): void {
    for (const key of ['master', 'effects', 'ui', 'ambience', 'muted', 'reducedIntensity', 'reducedEffects'] as const) {
      const field = container.querySelector<HTMLInputElement>('#presentation-' + key)!;
      field.addEventListener('input', () => {
        const next = { ...this.preferences.value, [key]: field.type === 'checkbox' ? field.checked : Number(field.value) };
        this.preferences.apply(next); for (const voice of [...this.voices]) this.stop(voice);
        const output = container.querySelector('#presentation-' + key + '-value'); if (output) output.textContent = Math.round(Number(field.value) * 100) + '%';
        container.querySelector('#presentation-status')!.textContent = this.preferences.status + ` Audio ${this.status}.`;
        this.onPreferencesChange?.();
      });
    }
    container.querySelector('#enable-audio')!.addEventListener('click', () => { void this.unlock().then(() => { container.querySelector('#presentation-status')!.textContent = this.preferences.status + ` Audio ${this.status}.`; this.ui(); }); });
  }
  dispose(): void { for (const voice of [...this.voices]) this.stop(voice); void this.context?.close().catch(() => {}); }
}
