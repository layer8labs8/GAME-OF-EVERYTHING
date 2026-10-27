const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  START_YEAR,
  MAX_TURNS
} = require('./www/logic.js');

test('createState initializes continental realm, capital, and ministries', () => {
  const s = createState(42);
  assert.equal(s.year, 1400);
  assert.equal(s.turn, 1);
  assert.equal(s.gold, 80);
  assert.equal(s.manpower, 60);
  assert.equal(s.stability, 80);
  assert.equal(s.provinces.length, 12);

  const valoriaProvs = s.provinces.filter(p => p.nation === 'valoria');
  assert.equal(valoriaProvs.length, 3);
  assert.equal(s.provinces[0].isCapital, true);
  assert.equal(s.done, false);
});

test('legalActions contains governance, levy muster, and diplomatic options', () => {
  const s = createState(101);
  const actions = legalActions(s);

  assert.ok(actions.includes('end_turn'));
  assert.ok(actions.includes('enact_reform'));
  assert.ok(actions.some(a => a.startsWith('recruit_levy:')));
  assert.ok(actions.some(a => a.startsWith('diplomacy_alliance:')));
});

test('mustering levies costs gold and manpower, raising local garrison', () => {
  const s = createState(202);
  const initialGold = s.gold;
  const initialManpower = s.manpower;
  const initialGarrison = s.provinces[0].garrison;

  const res = step(s, 'recruit_levy:0');
  assert.equal(s.provinces[0].garrison, initialGarrison + 3);
  assert.equal(s.gold, initialGold - 20);
  assert.equal(s.manpower, initialManpower - 15);
  assert.ok(res.reward > 0);
});

test('enact_reform elevates stability and costs gold', () => {
  const s = createState(303);
  s.stability = 70;
  const initialGold = s.gold;

  const res = step(s, 'enact_reform');
  assert.equal(s.stability, 85);
  assert.equal(s.gold, initialGold - 30);
  assert.ok(res.reward > 0);
});

test('diplomacy alliance establishes mutual pact and provides trade', () => {
  const s = createState(404);
  const initialInfluence = s.influence;

  assert.equal(s.diplomacy.solaris, 'peace');
  step(s, 'diplomacy_alliance:solaris');
  assert.equal(s.diplomacy.solaris, 'ally');
  assert.equal(s.influence, initialInfluence - 25);

  const goldBefore = s.gold;
  step(s, 'end_turn');
  // Alliance gives +15 trade bonus on end_turn
  assert.ok(s.gold >= goldBefore + 15);
});

test('declaring war unlocks campaign maneuvers into enemy realm', () => {
  const s = createState(505);
  step(s, 'declare_war:solaris');
  assert.equal(s.diplomacy.solaris, 'at_war');

  const actions = legalActions(s);
  // High Plains (1) borders Sol Citadel (3)
  assert.ok(actions.includes('march_campaign:1:3') || actions.includes('march_campaign:2:3'));
});

test('campaign siege conquest transfers province ownership', () => {
  const s = createState(606);
  s.diplomacy.solaris = 'at_war';
  s.provinces[1].garrison = 25; // Overwhelming force
  s.provinces[3].garrison = 1;

  step(s, 'march_campaign:1:3');
  assert.equal(s.provinces[3].nation, 'valoria');
  assert.ok(s.warScore.solaris >= 20);
});

test('sue_peace concludes hostilities with war indemnities', () => {
  const s = createState(707);
  s.diplomacy.solaris = 'at_war';
  s.warScore.solaris = 35;
  const goldBefore = s.gold;

  step(s, 'sue_peace:solaris');
  assert.equal(s.diplomacy.solaris, 'peace');
  assert.equal(s.warScore.solaris, 0);
  assert.equal(s.gold, goldBefore + 50);
});

test('controlling 8 provinces achieves Continental Dominion Victory', () => {
  const s = createState(808);
  // Assign 7 provinces to Valoria, capture 8th
  for (let i = 0; i < 7; i++) {
    s.provinces[i].nation = 'valoria';
  }
  s.provinces[7].nation = 'iron_duchy';
  s.provinces[7].garrison = 1;
  s.provinces[2].garrison = 20;
  s.diplomacy.iron_duchy = 'at_war';

  step(s, 'march_campaign:2:7');
  assert.equal(s.done, true);
  assert.equal(s.winner, 'player');
  assert.equal(s.result, 'dominion_victory');
  assert.equal(isOver(s), true);
  assert.ok(score(s) > 500);
});

test('losing capital city precipitates total defeat', () => {
  const s = createState(909);
  s.provinces[0].nation = 'iron_duchy';

  step(s, 'end_turn');
  assert.equal(s.done, true);
  assert.equal(s.winner, 'enemy');
  assert.equal(s.result, 'defeat');
});

test('illegal action throws error without state corruption', () => {
  const s = createState(1010);
  const snapshot = JSON.stringify(s);

  assert.throws(() => {
    step(s, 'recruit_levy:9'); // Enemy steppe camp
  }, /Illegal action/);

  assert.equal(JSON.stringify(s), snapshot);
});

test('same seed and decrees yield strictly deterministic simulation', () => {
  const s1 = createState(1212);
  const s2 = createState(1212);

  const actions = ['recruit_levy:0', 'enact_reform', 'end_turn'];
  for (const act of actions) {
    if (legalActions(s1).includes(act) && legalActions(s2).includes(act)) {
      step(s1, act);
      step(s2, act);
    }
  }

  assert.deepEqual(s1, s2);
});
