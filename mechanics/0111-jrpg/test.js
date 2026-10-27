const test = require('node:test');
const assert = require('node:assert');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  BATTLES
} = require('./www/logic.js');

test('createState initializes 3-member party, limit gauge, and Stage 1 encounter', () => {
  const s = createState(111);
  assert.strictEqual(s.turn, 1);
  assert.strictEqual(s.done, false);
  assert.strictEqual(s.party.length, 3);
  assert.strictEqual(s.party[0].id, 'aiden');
  assert.strictEqual(s.party[1].id, 'lyra');
  assert.strictEqual(s.party[2].id, 'rowan');
  assert.strictEqual(s.stage, 1);
  assert.strictEqual(s.enemies.length, 2);
  assert.strictEqual(s.limitGauge, 20);
});

test('legalActions lists attacks, skills, and defend for active party member', () => {
  const s = createState(222);
  const actions = legalActions(s);

  // Aiden is active member
  assert.ok(actions.includes('attack:0'));
  assert.ok(actions.includes('skill_taunt:self'));
  assert.ok(actions.includes('skill_power_slash:0'));
  assert.ok(actions.includes('defend:self'));
});

test('exploiting elemental weakness reduces enemy shield and builds limit gauge', () => {
  const s = createState(333);
  // Pass turn to Lyra (index 1)
  step(s, 'attack:0'); // Aiden acts -> Lyra is active

  const initLimit = s.limitGauge;
  const frostStalker = s.enemies[0]; // weak to fire
  assert.strictEqual(frostStalker.weakness, 'fire');
  const initShields = frostStalker.shields;

  step(s, 'skill_fire:0');

  assert.strictEqual(frostStalker.shields, initShields - 1);
  assert.ok(s.limitGauge > initLimit);
});

test('shattering all shields triggers Stagger state with double damage', () => {
  const s = createState(444);
  s.activeMemberIndex = 1; // Lyra active
  s.enemies[0].shields = 1; // 1 shield remaining

  step(s, 'skill_fire:0');

  assert.strictEqual(s.enemies[0].shields, 0);
  assert.strictEqual(s.enemies[0].staggered, true);
});

test('cleric cure heals damaged party member', () => {
  const s = createState(555);
  s.party[0].hp = 50; // Aiden damaged
  s.activeMemberIndex = 2; // Rowan active

  const legals = legalActions(s);
  assert.ok(legals.includes('skill_cure:0'));

  step(s, 'skill_cure:0');

  assert.ok(s.party[0].hp > 50);
});

test('sacred revive brings fallen hero back to life', () => {
  const s = createState(666);
  s.party[0].hp = 0; // Aiden fallen
  s.activeMemberIndex = 2; // Rowan active

  const legals = legalActions(s);
  assert.ok(legals.includes('skill_revive:0'));

  step(s, 'skill_revive:0');

  assert.ok(s.party[0].hp > 0);
});

test('limit break at 100 gauge delivers massive power and resets gauge', () => {
  const s = createState(777);
  s.limitGauge = 100;
  const legals = legalActions(s);

  assert.ok(legals.includes('limit_break:0'));

  step(s, 'limit_break:0');

  assert.strictEqual(s.limitGauge, 0);
});

test('clearing stage enemies advances to next stage with fresh foes', () => {
  const s = createState(888);
  s.enemies[0].alive = true;
  s.enemies[0].hp = 5;
  s.enemies[1].alive = false;

  step(s, 'attack:0');

  assert.strictEqual(s.stage, 2);
  assert.strictEqual(s.enemies.length, 2);
  assert.strictEqual(s.enemies[0].name, 'Storm Wyvern');
});

test('slaying stage 3 boss Ancient Behemoth achieves complete victory', () => {
  const s = createState(999);
  s.stage = 3;
  s.enemies = [
    { id: 'boss', name: 'Ancient Behemoth', hp: 10, maxHp: 240, atk: 26, shields: 0, weakness: 'fire', isBoss: true, staggered: true, alive: true }
  ];

  step(s, 'attack:0');

  assert.strictEqual(s.done, true);
  assert.strictEqual(s.winner, 'player');
  assert.ok(score(s) > 350);
});

test('all party members falling triggers defeat', () => {
  const s = createState(1010);
  s.party[0].hp = 0;
  s.party[1].hp = 0;
  s.party[2].hp = 2; // Only Rowan alive with 2 HP
  s.activeMemberIndex = 2; // Rowan active

  step(s, 'defend:self'); // Wraps around to enemy phase, enemy strikes Rowan for > 2 dmg

  assert.strictEqual(s.party[2].hp, 0);
  assert.strictEqual(s.done, true);
  assert.strictEqual(s.winner, 'enemy');
});

test('same seed and sequence of jrpg decisions yields deterministic state', () => {
  const s1 = createState(111000);
  const s2 = createState(111000);

  for (let i = 0; i < 6; i++) {
    if (s1.done) break;
    const legals = legalActions(s1);
    if (legals.length === 0) break;
    const act = legals[0];
    step(s1, act);
    step(s2, act);
  }

  assert.strictEqual(JSON.stringify(s1), JSON.stringify(s2));
});
