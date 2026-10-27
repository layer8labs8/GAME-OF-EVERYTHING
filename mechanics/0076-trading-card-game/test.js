const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_HERO_HP,
  MAX_MANA,
  MAX_TURNS,
  CARD_TEMPLATES,
  createState,
  legalActions,
  step,
  isOver,
  score
} = require('./www/logic.js');

test('createState initializes both champions with 30 HP, 1 mana, 3 hand cards', () => {
  const s = createState(42);
  assert.equal(s.turn, 1);
  assert.equal(s.player.hp, 30);
  assert.equal(s.opp.hp, 30);
  assert.equal(s.player.mana, 1);
  assert.equal(s.player.hand.length, 3);
  assert.equal(s.opp.hand.length, 3);
  assert.equal(s.done, false);
  assert.equal(s.won, false);
});

test('playing a minion consumes mana and places it on the battlefield', () => {
  const s = createState(42);
  // Give player 2 mana and a 2-cost minion
  s.player.mana = 2;
  s.player.hand.push({
    id: 'test_raptor',
    name: 'Bloodfen Raptor',
    type: 'minion',
    cost: 2,
    attack: 3,
    hp: 2,
    maxHp: 2,
    taunt: false,
    charge: false
  });

  step(s, 'play:test_raptor');

  assert.equal(s.player.mana, 0);
  assert.equal(s.player.board.length, 1);
  assert.equal(s.player.board[0].id, 'test_raptor');
  assert.equal(s.player.board[0].canAttack, false); // No charge
});

test('battlecry effect triggers upon summon', () => {
  const s = createState(42);
  s.player.mana = 3;
  s.player.hand.push({
    id: 'test_shaman',
    name: 'Frostfang Shaman',
    type: 'minion',
    cost: 3,
    attack: 2,
    hp: 3,
    maxHp: 3,
    battlecry: 'face2'
  });

  const oppHpBefore = s.opp.hp;
  step(s, 'play:test_shaman');

  assert.equal(s.opp.hp, oppHpBefore - 2);
});

test('charge minion can attack immediately', () => {
  const s = createState(42);
  s.player.mana = 5;
  s.player.hand.push({
    id: 'test_lancer',
    name: 'Stormpike Lancer',
    type: 'minion',
    cost: 5,
    attack: 4,
    hp: 4,
    maxHp: 4,
    charge: true
  });

  step(s, 'play:test_lancer');
  assert.equal(s.player.board[0].canAttack, true);
  assert.ok(legalActions(s).includes('attack:test_lancer,opp_hero'));
});

test('taunt minion prevents direct face attacks', () => {
  const s = createState(42);
  // Player has a ready minion
  s.player.board.push({
    id: 'p_minion',
    name: 'Attacker',
    attack: 3,
    hp: 3,
    canAttack: true,
    hasAttacked: false
  });
  // Opponent has a Taunt minion
  s.opp.board.push({
    id: 'o_taunt',
    name: 'Shieldbearer',
    attack: 0,
    hp: 4,
    taunt: true
  });

  const legals = legalActions(s);
  assert.ok(legals.includes('attack:p_minion,o_taunt'));
  assert.ok(!legals.includes('attack:p_minion,opp_hero'), 'Cannot attack face while taunt is active');
});

test('mutual minion combat deals damage simultaneously', () => {
  const s = createState(42);
  s.player.board.push({
    id: 'p_fighter',
    name: 'Fighter',
    attack: 3,
    hp: 3,
    canAttack: true,
    hasAttacked: false
  });
  s.opp.board.push({
    id: 'o_target',
    name: 'Target',
    attack: 2,
    hp: 4,
    taunt: false
  });

  step(s, 'attack:p_fighter,o_target');

  assert.equal(s.opp.board[0].hp, 1); // 4 - 3 = 1
  assert.equal(s.player.board[0].hp, 1); // 3 - 2 = 1
  assert.equal(s.player.board[0].hasAttacked, true);
});

test('fireball deals 6 damage to target', () => {
  const s = createState(42);
  s.player.mana = 4;
  s.player.hand.push({
    id: 'test_fb',
    name: 'Fireball',
    type: 'spell',
    cost: 4,
    target: true,
    damage: 6
  });

  const oppHp = s.opp.hp;
  step(s, 'play:test_fb,opp_hero');
  assert.equal(s.opp.hp, oppHp - 6);
});

test('endTurn advances turn, increments max mana and triggers opponent AI', () => {
  const s = createState(42);
  s.player.mana = 0;

  step(s, 'endTurn');

  assert.equal(s.turn, 2);
  assert.equal(s.player.maxMana, 2);
  assert.equal(s.player.mana, 2);
  assert.equal(s.player.hand.length, 4); // Drew 1 card
});

test('reducing opponent HP to 0 achieves Victory', () => {
  const s = createState(100);
  s.opp.hp = 6;
  s.player.mana = 4;
  s.player.hand.push({
    id: 'test_lethal',
    name: 'Fireball',
    type: 'spell',
    cost: 4,
    target: true,
    damage: 6
  });

  step(s, 'play:test_lethal,opp_hero');

  assert.equal(s.opp.hp, 0);
  assert.equal(s.done, true);
  assert.equal(s.won, true);
  assert.ok(score(s) > 1000);
});

test('illegal action throws error', () => {
  const s = createState(42);
  assert.throws(() => {
    step(s, 'attack:nonexistent,opp_hero');
  }, /Illegal action/);
});

test('state simulation is deterministic across identical seed', () => {
  const s1 = createState(888);
  const s2 = createState(888);
  assert.deepEqual(s1, s2);

  const act = legalActions(s1)[0];
  step(s1, act);
  step(s2, act);
  assert.deepEqual(s1, s2);
});
