const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  MAX_TURNS,
  RECRUIT_COST
} = require('./www/logic.js');

test('createState initializes provinces, garrisons, and treasuries', () => {
  const s = createState(42);
  assert.equal(s.turn, 1);
  assert.equal(s.gold, 6);
  assert.equal(s.enemyGold, 6);
  assert.equal(s.done, false);
  assert.equal(s.territories.length, 9);

  const playerTerrs = s.territories.filter(t => t.owner === 'player');
  const enemyTerrs = s.territories.filter(t => t.owner === 'enemy');
  const neutralTerrs = s.territories.filter(t => t.owner === 'neutral');

  assert.equal(playerTerrs.length, 2);
  assert.equal(enemyTerrs.length, 2);
  assert.equal(neutralTerrs.length, 5);
});

test('legalActions contains recruit, attack, and end_turn options', () => {
  const s = createState(101);
  const actions = legalActions(s);

  assert.ok(actions.includes('end_turn'));
  assert.ok(actions.some(a => a.startsWith('recruit:')));
  assert.ok(actions.some(a => a.startsWith('attack:')));
});

test('recruiting deducts gold and increments army count', () => {
  const s = createState(202);
  const targetId = s.territories.find(t => t.owner === 'player').id;
  const initialArmies = s.territories.find(t => t.id === targetId).armies;
  const initialGold = s.gold;

  const res = step(s, `recruit:${targetId}`);
  assert.equal(s.gold, initialGold - RECRUIT_COST);
  assert.equal(s.territories.find(t => t.id === targetId).armies, initialArmies + 1);
  assert.ok(res.reward > 0);
});

test('marching into friendly territory reinforces garrison', () => {
  const s = createState(303);
  // Set territory 0 and 1 to player
  s.territories[0].owner = 'player';
  s.territories[0].armies = 5;
  s.territories[1].owner = 'player';
  s.territories[1].armies = 2;

  step(s, 'attack:0:1');
  assert.equal(s.territories[0].armies, 1); // 1 stays behind
  assert.equal(s.territories[1].armies, 6); // 2 + 4
});

test('marching into hostile province engages in deterministic combat', () => {
  const s = createState(404);
  // Set overwhelming force to ensure victory
  s.territories[0].owner = 'player';
  s.territories[0].armies = 20;
  s.territories[1].owner = 'neutral';
  s.territories[1].armies = 1;

  step(s, 'attack:0:1');
  assert.equal(s.territories[0].armies, 1);
  assert.equal(s.territories[1].owner, 'player');
  assert.ok(s.territories[1].armies >= 1);
});

test('end_turn awards income, runs enemy AI, and advances turn', () => {
  const s = createState(505);
  const initialTurn = s.turn;
  const initialPlayerGold = s.gold;

  step(s, 'end_turn');
  assert.equal(s.turn, initialTurn + 1);
  assert.ok(s.gold > initialPlayerGold);
});

test('eliminating all enemy provinces triggers victory', () => {
  const s = createState(606);
  // Set all enemy territories to neutral
  s.territories.forEach(t => {
    if (t.owner === 'enemy') t.owner = 'neutral';
  });
  s.territories[0].owner = 'player';
  s.territories[0].armies = 10;
  s.territories[1].owner = 'neutral';
  s.territories[1].armies = 1;

  step(s, 'attack:0:1');
  assert.equal(s.done, true);
  assert.equal(s.winner, 'player');
  assert.equal(isOver(s), true);
  assert.ok(score(s) > 500);
});

test('losing all territories triggers defeat', () => {
  const s = createState(707);
  // Set player to only 1 territory with 2 armies, attack overwhelming enemy
  s.territories.forEach(t => {
    if (t.owner === 'player') t.owner = 'neutral';
  });
  s.territories[0].owner = 'player';
  s.territories[0].armies = 2; // sends 1, 1 left
  s.territories[1].owner = 'enemy';
  s.territories[1].armies = 15;

  step(s, 'attack:0:1'); // Attack fails
  // Now wipe last garrison
  s.territories[0].owner = 'enemy';
  step(s, 'end_turn');

  assert.equal(s.done, true);
  assert.equal(s.winner, 'enemy');
});

test('illegal action throws without mutating state', () => {
  const s = createState(808);
  const snapshot = JSON.stringify(s);

  assert.throws(() => {
    step(s, 'recruit:99');
  }, /Illegal action/);

  assert.equal(JSON.stringify(s), snapshot);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(999);
  const s2 = createState(999);

  const actions = ['recruit:3', 'attack:3:0', 'end_turn'];
  for (const act of actions) {
    if (legalActions(s1).includes(act) && legalActions(s2).includes(act)) {
      step(s1, act);
      step(s2, act);
    }
  }

  assert.deepEqual(s1, s2);
});
