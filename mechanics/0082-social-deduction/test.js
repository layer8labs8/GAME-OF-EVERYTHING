const test = require('node:test');
const assert = require('node:assert/strict');
const deduction = require('./www/logic.js');

test('createState initializes 5 members with exactly 2 saboteurs and 3 loyalists', () => {
  const s = deduction.createState(42);
  const members = Object.values(s.members);
  assert.equal(members.length, 5);
  assert.equal(s.phase, 'night');
  assert.equal(s.day, 1);
  assert.equal(s.gameOver, false);

  const saboteurs = members.filter(m => m.role === 'saboteur');
  const loyalists = members.filter(m => m.role === 'loyalist');
  assert.equal(saboteurs.length, 2);
  assert.equal(loyalists.length, 3);
  assert.equal(s.members.p0.role, 'loyalist');
});

test('inspect reveals role of target member and transitions to day phase', () => {
  const s = deduction.createState(101);
  const targetId = 'm1';

  const legal = deduction.legalActions(s);
  assert.ok(legal.includes(`inspect:${targetId}`));

  deduction.step(s, `inspect:${targetId}`);
  assert.equal(s.phase, 'day');
  assert.equal(s.inspected[targetId], s.members[targetId].role);
  assert.ok(s.testimonies.length > 0);
});

test('begin_vote advances state from day to voting phase', () => {
  const s = deduction.createState(202);
  s.phase = 'day';

  const legal = deduction.legalActions(s);
  assert.ok(legal.includes('begin_vote'));

  deduction.step(s, 'begin_vote');
  assert.equal(s.phase, 'voting');
});

test('voting tallies council votes and exiles suspect', () => {
  const s = deduction.createState(303);
  s.phase = 'voting';

  const legal = deduction.legalActions(s);
  assert.ok(legal.includes('vote:m2'));

  deduction.step(s, 'vote:m2');
  assert.ok(s.lastExiled !== undefined);
});

test('exiling all saboteurs triggers Loyalist victory', () => {
  const s = deduction.createState(404);
  s.phase = 'voting';

  // Find the two saboteurs
  const saboteurs = Object.values(s.members).filter(m => m.role === 'saboteur');
  // First saboteur already neutralized
  saboteurs[0].alive = false;

  // Exile second saboteur
  const secondSaboteurId = saboteurs[1].id;
  for (const k in s.members) s.members[k].votes = 0;
  s.members[secondSaboteurId].votes = 4;

  const res = deduction.step(s, `vote:${secondSaboteurId}`);
  assert.equal(res.done, true);
  assert.equal(s.gameOver, true);
  assert.equal(s.winner, 'loyalist');
  assert.ok(res.reward >= 30);
});

test('saboteurs reaching parity with loyalists triggers defeat', () => {
  const s = deduction.createState(505);
  s.phase = 'voting';

  // Initially 3 loyalists and 2 saboteurs (game active)
  assert.equal(deduction.isOver(s), false);

  // Now an AI loyalist is voted out, reducing loyalists to 2 (2 === 2 saboteurs -> parity)
  const aiLoyalists = Object.values(s.members).filter(m => m.role === 'loyalist' && m.id !== 'p0');
  const targetLoyalist = aiLoyalists[0];
  for (const k in s.members) s.members[k].votes = 0;
  s.members[targetLoyalist.id].votes = 4;

  const res = deduction.step(s, `vote:${targetLoyalist.id}`);
  assert.equal(res.done, true);
  assert.equal(s.gameOver, true);
  assert.equal(s.winner, 'saboteur');
  assert.ok(res.reward <= -20);
});

test('illegal action throws error without mutating state', () => {
  const s = deduction.createState(606);
  s.phase = 'night';
  const snap = JSON.stringify(s);

  assert.throws(() => {
    deduction.step(s, 'begin_vote'); // Cannot vote during night
  });

  assert.equal(JSON.stringify(s), snap);
});

test('same seed and action sequence produces strictly deterministic state', () => {
  const s1 = deduction.createState(707);
  const s2 = deduction.createState(707);

  deduction.step(s1, 'pass');
  deduction.step(s2, 'pass');

  assert.deepEqual(s1, s2);
});
