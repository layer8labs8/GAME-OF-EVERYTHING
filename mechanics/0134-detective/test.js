const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  MAX_TURNS,
  SUSPECTS
} = require('./www/logic.js');

test('createState initializes case in the study with zero evidence and valid culprit', () => {
  const state = createState(42);
  assert.equal(state.room, 'study');
  assert.equal(state.evidence.length, 0);
  assert.equal(state.contradictionsFound, 0);
  assert.equal(SUSPECTS.includes(state.culprit), true);
  assert.equal(state.done, false);
  assert.equal(state.victory, false);
});

test('move:library switches room and enables library targets', () => {
  const state = createState(10);
  step(state, 'move:library');
  assert.equal(state.room, 'library');
  const acts = legalActions(state);
  assert.equal(acts.includes('examine:encyclopedia'), true);
  assert.equal(acts.includes('question:prof_hawthorne'), true);
});

test('examine:body and examine:goblet uncover forensic poison evidence', () => {
  const state = createState(10);
  step(state, 'examine:body');
  assert.equal(state.evidence.includes('autopsy_notes'), true);

  step(state, 'examine:goblet');
  assert.equal(state.evidence.includes('cyanide_goblet'), true);
});

test('examine:desk uncovers debt_letter and torn_will', () => {
  const state = createState(10);
  step(state, 'examine:desk');
  assert.equal(state.evidence.includes('debt_letter'), true);
  assert.equal(state.evidence.includes('torn_will'), true);
});

test('question:prof_hawthorne in library logs testimony', () => {
  const state = createState(10);
  step(state, 'move:library');
  step(state, 'question:prof_hawthorne');
  assert.equal(state.questionedSuspects.prof_hawthorne, true);
});

test('confront:prof_hawthorne:debt_letter exposes contradiction and awards score', () => {
  const state = createState(10);
  step(state, 'examine:desk');
  step(state, 'move:library');
  const initScore = state.score;

  step(state, 'confront:prof_hawthorne:debt_letter');
  assert.equal(state.contradictionsFound, 1);
  assert.equal(state.score > initScore, true);
});

test('confront:lady_sterling:silk_handkerchief exposes contradiction', () => {
  const state = createState(10);
  step(state, 'examine:handkerchief');
  step(state, 'move:conservatory');

  step(state, 'confront:lady_sterling:silk_handkerchief');
  assert.equal(state.contradictionsFound, 1);
});

test('confront:butler_graves:muddy_footprints exposes contradiction', () => {
  const state = createState(10);
  step(state, 'move:conservatory');
  step(state, 'examine:footprints');

  step(state, 'confront:butler_graves:muddy_footprints');
  assert.equal(state.contradictionsFound, 1);
});

test('accusing wrong suspect triggers defeat', () => {
  const state = createState(1);
  const innocent = SUSPECTS.find(s => s !== state.culprit);

  const res = step(state, 'accuse:' + innocent);
  assert.equal(state.done, true);
  assert.equal(state.victory, false);
  assert.equal(res.reward < 0, true);
});

test('accusing culprit prematurely with insufficient proof triggers failure', () => {
  const state = createState(1);
  const res = step(state, 'accuse:' + state.culprit);
  assert.equal(state.done, true);
  assert.equal(state.victory, false);
  assert.equal(res.reward < 0, true);
});

test('accusing culprit with substantiated proof achieves victory and solves the case', () => {
  const state = createState(1);
  // Gather 4 evidence items
  step(state, 'examine:body');
  step(state, 'examine:goblet');
  step(state, 'examine:desk');

  assert.equal(state.evidence.length >= 4, true);

  const res = step(state, 'accuse:' + state.culprit);
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
    step(state, 'invalid:detective:action');
  });
  assert.equal(JSON.stringify(state), snap);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(505);
  const s2 = createState(505);

  step(s1, 'examine:body');
  step(s2, 'examine:body');
  step(s1, 'move:library');
  step(s2, 'move:library');

  assert.deepEqual(s1, s2);
});
