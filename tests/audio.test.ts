import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PRESENTATION, GameAudio, PRESENTATION_KEY, PresentationStore, validPresentation } from '../src/audio/audio';

test('presentation preferences validate bounds and persist independently from controls/runs', () => {
  const data = new Map<string, string>(); const store = new PresentationStore({ getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); } });
  assert.equal(store.apply({ ...DEFAULT_PRESENTATION, muted: true, reducedEffects: true, master: 0.25 }), true);
  assert.deepEqual([...data.keys()], [PRESENTATION_KEY]);
  assert.equal(new PresentationStore({ getItem: key => data.get(key) ?? null, setItem() {} }).value.master, 0.25);
  for (const master of [-1, 2, NaN, Infinity]) assert.equal(validPresentation({ ...DEFAULT_PRESENTATION, master }), false);
  assert.equal(validPresentation({ ...DEFAULT_PRESENTATION, version: 99 }), false);
});
test('corrupt or denied presentation storage keeps usable session preferences', () => {
  const corrupt = new PresentationStore({ getItem: () => '{bad', setItem() {} }); assert.deepEqual(corrupt.value, DEFAULT_PRESENTATION);
  const denied = new PresentationStore({ getItem() { throw Error('Denied'); }, setItem() { throw Error('Denied'); } });
  assert.equal(denied.apply({ ...DEFAULT_PRESENTATION, reducedIntensity: true }), true); assert.equal(denied.value.reducedIntensity, true); assert.match(denied.status, /session/);
});
test('missing audio API reports unsupported without disabling the game or creating voices', async () => {
  const audio = new GameAudio(); await audio.unlock(); assert.equal(audio.metrics().status, 'unsupported');
  audio.setGameplayPaused(false); audio.ui('reward'); audio.consume([], []); assert.equal(audio.metrics().activeVoices, 0); audio.dispose();
});
