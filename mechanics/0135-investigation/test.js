const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  MAX_TURNS,
  CORRECT_TIMELINE
} = require('./www/logic.js');

test('createState initializes investigation at vault_door with empty timeline and evidence', () => {
  const state = createState(42);
  assert.equal(state.station, 'vault_door');
  assert.equal(state.evidence.length, 0);
  assert.equal(state.timelineSlots.phase_1, null);
  assert.equal(state.done, false);
  assert.equal(state.victory, false);
});

test('move:security_console changes station and updates available scans', () => {
  const state = createState(10);
  step(state, 'move:security_console');
  assert.equal(state.station, 'security_console');
  const acts = legalActions(state);
  assert.equal(acts.includes('scan:tool:cipher_decoder'), true);
});

test('scan:tool:spectrometer at vault_door discovers thermite_residue', () => {
  const state = createState(10);
  const initScore = state.score;
  step(state, 'scan:tool:spectrometer');
  assert.equal(state.evidence.includes('thermite_residue'), true);
  assert.equal(state.score > initScore, true);
});

test('scan:tool:cipher_decoder at security_console discovers corrupted_timestamps', () => {
  const state = createState(10);
  step(state, 'move:security_console');
  step(state, 'scan:tool:cipher_decoder');
  assert.equal(state.evidence.includes('corrupted_timestamps'), true);
});

test('scan:tool:ballistics_laser at ventilation_shaft discovers optic_trajectory', () => {
  const state = createState(10);
  step(state, 'move:ventilation_shaft');
  step(state, 'scan:tool:ballistics_laser');
  assert.equal(state.evidence.includes('optic_trajectory'), true);
});

test('scan:tool:ballistics_laser at glass_display discovers vitrine_impact', () => {
  const state = createState(10);
  step(state, 'move:glass_display');
  step(state, 'scan:tool:ballistics_laser');
  assert.equal(state.evidence.includes('vitrine_impact'), true);
});

test('uncovering evidence unlocks timeline assignment actions', () => {
  const state = createState(10);
  step(state, 'move:ventilation_shaft');
  step(state, 'scan:tool:ballistics_laser');
  const acts = legalActions(state);
  assert.equal(acts.includes('assign:phase_1:event_optic'), true);
});

test('assigning incorrect timeline and finalizing triggers penalty and does not win', () => {
  const state = createState(10);
  // Discover all 4 pieces of evidence
  step(state, 'scan:tool:spectrometer'); // thermite
  step(state, 'move:security_console');
  step(state, 'scan:tool:cipher_decoder'); // console
  step(state, 'move:ventilation_shaft');
  step(state, 'scan:tool:ballistics_laser'); // optic
  step(state, 'move:glass_display');
  step(state, 'scan:tool:ballistics_laser'); // vitrine

  // Assign wrong order
  step(state, 'assign:phase_1:event_vitrine');
  step(state, 'assign:phase_2:event_console');
  step(state, 'assign:phase_3:event_thermite');
  step(state, 'assign:phase_4:event_optic');

  const res = step(state, 'action:finalize_report');
  assert.equal(state.done, false);
  assert.equal(state.victory, false);
  assert.equal(res.reward < 0, true);
});

test('assigning correct timeline and finalizing report achieves victory', () => {
  const state = createState(10);
  // Discover all 4 pieces of evidence
  step(state, 'scan:tool:spectrometer'); // thermite
  step(state, 'move:security_console');
  step(state, 'scan:tool:cipher_decoder'); // console
  step(state, 'move:ventilation_shaft');
  step(state, 'scan:tool:ballistics_laser'); // optic
  step(state, 'move:glass_display');
  step(state, 'scan:tool:ballistics_laser'); // vitrine

  // Assign correct order
  step(state, 'assign:phase_1:' + CORRECT_TIMELINE.phase_1);
  step(state, 'assign:phase_2:' + CORRECT_TIMELINE.phase_2);
  step(state, 'assign:phase_3:' + CORRECT_TIMELINE.phase_3);
  step(state, 'assign:phase_4:' + CORRECT_TIMELINE.phase_4);

  const res = step(state, 'action:finalize_report');
  assert.equal(state.done, true);
  assert.equal(state.victory, true);
  assert.equal(isOver(state), true);
  assert.equal(res.done, true);
  assert.equal(res.reward > 50, true);
});

test('illegal action throws without mutating state', () => {
  const state = createState(1);
  const snap = JSON.stringify(state);
  assert.throws(() => {
    step(state, 'invalid:action:code');
  });
  assert.equal(JSON.stringify(state), snap);
});

test('same seed and actions produce strictly deterministic state', () => {
  const s1 = createState(777);
  const s2 = createState(777);

  step(s1, 'scan:tool:spectrometer');
  step(s2, 'scan:tool:spectrometer');
  step(s1, 'move:glass_display');
  step(s2, 'move:glass_display');

  assert.deepEqual(s1, s2);
});
