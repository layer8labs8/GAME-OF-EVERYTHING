const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CARD_DATABASE,
  REWARD_POOL,
  ENCOUNTER_DATA,
  MAX_TURNS,
  createState,
  legalActions,
  step,
  isOver,
  score
} = require('./www/logic.js');

test('createState initializes hero at 75 HP, Floor 1 Cultist encounter and 5 cards in hand', () => {
  const s = createState(42);
  assert.equal(s.floor, 1);
  assert.equal(s.mode, 'combat');
  assert.equal(s.player.hp, 75);
  assert.equal(s.player.maxHp, 75);
  assert.equal(s.player.energy, 3);
  assert.equal(s.hand.length, 5);
  assert.ok(s.enemy);
  assert.equal(s.enemy.name, 'Cultist');
  assert.equal(s.enemy.hp, 48);
  assert.equal(s.done, false);
  assert.equal(s.won, false);
});

test('playing Strike deals 6 damage to enemy and costs 1 energy', () => {
  const s = createState(42);
  // Ensure Strike is in hand
  s.hand.push({
    id: 'Strike_test',
    name: 'Strike',
    type: 'attack',
    cost: 1,
    damage: 6,
    block: 0,
    desc: 'Deal 6 damage.'
  });

  const enemyHpBefore = s.enemy.hp;
  step(s, 'play:Strike_test');

  assert.equal(s.enemy.hp, enemyHpBefore - 6);
  assert.equal(s.player.energy, 2);
  assert.equal(s.totalDamageDealt, 6);
});

test('playing Defend adds 5 block to player', () => {
  const s = createState(42);
  s.hand.push({
    id: 'Defend_test',
    name: 'Defend',
    type: 'skill',
    cost: 1,
    damage: 0,
    block: 5,
    desc: 'Gain 5 block.'
  });

  step(s, 'play:Defend_test');
  assert.equal(s.player.block, 5);
  assert.equal(s.player.energy, 2);
});

test('playing Bash inflicts Vulnerable on target', () => {
  const s = createState(42);
  s.hand.push({
    id: 'Bash_test',
    name: 'Bash',
    type: 'attack',
    cost: 2,
    damage: 8,
    block: 0,
    vulnerable: 2,
    desc: 'Deal 8 damage. Apply 2 Vulnerable.'
  });

  step(s, 'play:Bash_test');
  assert.equal(s.enemy.vulnerable, 2);
});

test('vulnerable targets take 50% extra attack damage', () => {
  const s = createState(42);
  s.enemy.vulnerable = 2;
  s.hand.push({
    id: 'Strike_v',
    name: 'Strike',
    type: 'attack',
    cost: 1,
    damage: 6,
    block: 0,
    desc: 'Deal 6 damage.'
  });

  const hpBefore = s.enemy.hp;
  step(s, 'play:Strike_v'); // 6 * 1.5 = 9 damage
  assert.equal(s.enemy.hp, hpBefore - 9);
});

test('endTurn resolves enemy intent, resets energy and draws new hand', () => {
  const s = createState(42);
  s.player.energy = 0;
  // Cultist initial intent is buff
  step(s, 'endTurn');

  assert.equal(s.player.energy, 3);
  assert.equal(s.hand.length, 5);
  assert.equal(s.totalTurns, 1);
  assert.ok(s.enemy.strength > 0);
});

test('slaying Cultist triggers card reward draft', () => {
  const s = createState(42);
  s.enemy.hp = 5;
  s.hand.push({
    id: 'Strike_finisher',
    name: 'Strike',
    type: 'attack',
    cost: 1,
    damage: 6,
    block: 0,
    desc: 'Deal 6 damage.'
  });

  step(s, 'play:Strike_finisher');
  assert.equal(s.mode, 'reward');
  assert.ok(s.rewardCards.length > 0);
  assert.ok(legalActions(s).includes('skipReward'));
});

test('selecting reward card adds to deck and transitions to campfire', () => {
  const s = createState(42);
  s.mode = 'reward';
  s.rewardCards = ['Carnage', 'IronWave', 'ShrugItOff'];

  step(s, 'chooseReward:Carnage');
  assert.equal(s.floor, 2);
  assert.equal(s.mode, 'campfire');
  assert.ok(s.deck.some(c => c.name === 'Carnage'));
});

test('campfire rest heals 25 HP and advances to Floor 3', () => {
  const s = createState(42);
  s.floor = 2;
  s.mode = 'campfire';
  s.player.hp = 40;

  step(s, 'rest');
  assert.equal(s.player.hp, 65);
  assert.equal(s.floor, 3);
  assert.equal(s.mode, 'combat');
  assert.equal(s.enemy.name, 'Lava Golem');
});

test('defeating Void Sovereign on Floor 4 achieves Victory', () => {
  const s = createState(100);
  initFloorTest(s, 4);
  s.enemy.hp = 6;
  s.hand.push({
    id: 'Strike_final',
    name: 'Strike',
    type: 'attack',
    cost: 1,
    damage: 6,
    block: 0,
    desc: 'Deal 6 damage.'
  });

  step(s, 'play:Strike_final');
  assert.equal(s.done, true);
  assert.equal(s.won, true);
  assert.ok(score(s) > 1000);
});

test('depleting player HP triggers defeat', () => {
  const s = createState(42);
  s.player.hp = 2;
  // Lava golem attacks for 16
  s.enemy.currentIntent = { type: 'attack', damage: 16 };
  step(s, 'endTurn');

  assert.equal(s.done, true);
  assert.equal(s.won, false);
  assert.ok(isOver(s));
});

test('state simulation is deterministic across identical seed', () => {
  const s1 = createState(999);
  const s2 = createState(999);
  assert.deepEqual(s1, s2);

  const act = legalActions(s1)[0];
  step(s1, act);
  step(s2, act);
  assert.deepEqual(s1, s2);
});

function initFloorTest(state, floorNum) {
  state.floor = floorNum;
  state.mode = 'combat';
  const enc = ENCOUNTER_DATA[floorNum];
  state.enemy = {
    name: enc.name,
    hp: enc.hp,
    maxHp: enc.maxHp,
    block: 0,
    strength: 0,
    vulnerable: 0,
    weak: 0,
    turnCount: 0,
    intents: enc.intents,
    currentIntent: enc.intents[0]
  };
}
