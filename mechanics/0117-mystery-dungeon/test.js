const test = require('node:test');
const assert = require('node:assert');
const { createState, legalActions, step, isOver, score } = require('./www/logic.js');

test('createState initializes 8x8 grid, floor 1, player stats and inventory', () => {
  const s = createState(42);
  assert.strictEqual(s.grid.length, 8);
  assert.strictEqual(s.grid[0].length, 8);
  assert.strictEqual(s.floor, 1);
  assert.strictEqual(s.player.hp, 100);
  assert.strictEqual(s.player.belly, 100);
  assert.strictEqual(s.player.inventory.length, 2);
  assert.strictEqual(s.done, false);
  assert.strictEqual(isOver(s), false);
  assert.strictEqual(score(s), 0);
});

test('legalActions returns move and use item commands', () => {
  const s = createState(101);
  const actions = legalActions(s);
  assert.ok(actions.includes('wait'));
  assert.ok(actions.includes('use:0'));
  assert.ok(actions.some(a => a.startsWith('move:')));
});

test('moving shifts coordinates and depletes 1 belly', () => {
  const s = createState(102);
  const startX = s.player.x;
  const startY = s.player.y;

  step(s, 'move:right');
  assert.strictEqual(s.player.x, startX + 1);
  assert.strictEqual(s.player.y, startY);
  assert.strictEqual(s.player.belly, 99);
});

test('stepping on item tile picks it up into inventory', () => {
  const s = createState(103);
  s.items = [{ x: s.player.x + 1, y: s.player.y, type: 'apple' }];
  const startInvLen = s.player.inventory.length;

  step(s, 'move:right');
  assert.strictEqual(s.player.inventory.length, startInvLen + 1);
  assert.strictEqual(s.items.length, 0);
  assert.ok(score(s) > 0);
});

test('attack damages adjacent monster', () => {
  const s = createState(104);
  const mon = s.monsters[0];
  // Position monster right of player
  mon.x = s.player.x + 1;
  mon.y = s.player.y;
  const initialHp = mon.hp;

  const actions = legalActions(s);
  assert.ok(actions.includes('attack:right'));

  step(s, 'attack:right');
  assert.ok(mon.hp < initialHp);
});

test('eating apple restores belly and herb restores HP', () => {
  const s = createState(105);
  s.player.belly = 30;
  s.player.hp = 50;
  s.player.inventory = ['apple', 'herb'];

  step(s, 'use:0'); // Eat apple (+50 belly, -1 turn belly = 79)
  assert.strictEqual(s.player.belly, 79);

  step(s, 'use:0'); // Consume herb
  assert.strictEqual(s.player.hp, 90);
});

test('starvation inflicts HP damage when belly reaches 0', () => {
  const s = createState(106);
  s.player.belly = 1;
  const initialHp = s.player.hp;

  step(s, 'wait'); // belly becomes 0
  assert.strictEqual(s.player.belly, 0);

  step(s, 'wait'); // starvation damage
  assert.ok(s.player.hp < initialHp);
});

test('descending stairs transitions to floor 2', () => {
  const s = createState(107);
  s.player.x = s.stairs.x;
  s.player.y = s.stairs.y;

  const actions = legalActions(s);
  assert.ok(actions.includes('descend'));

  step(s, 'descend');
  assert.strictEqual(s.floor, 2);
  assert.strictEqual(s.player.x, 1);
  assert.strictEqual(s.player.y, 1);
});

test('recovering relic and defeating Minotaur on floor 4 triggers victory', () => {
  const s = createState(201);
  s.floor = 4;
  s.monsters = [{ id: 'boss', name: 'Minotaur Guardian', hp: 0, maxHp: 80, atk: 20, def: 0, x: 5, y: 5, sleep: 0 }];
  s.player.inventory = ['relic'];

  const res = step(s, 'wait');
  assert.strictEqual(res.done, true);
  assert.strictEqual(res.reward, 1.0);
  assert.strictEqual(s.victory, true);
  assert.strictEqual(isOver(s), true);
});

test('depleting HP triggers defeat', () => {
  const s = createState(301);
  s.player.hp = 1;
  s.player.belly = 0;

  const res = step(s, 'wait');
  assert.strictEqual(res.done, true);
  assert.strictEqual(res.reward, 0.0);
  assert.strictEqual(s.victory, false);
  assert.strictEqual(isOver(s), true);
});

test('illegal action throws without mutating state', () => {
  const s = createState(401);
  const serializedBefore = JSON.stringify(s);

  assert.throws(() => {
    step(s, 'move:up'); // Hits top stone wall at (1,0)
  }, /Illegal action/);

  assert.strictEqual(JSON.stringify(s), serializedBefore);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(999);
  const s2 = createState(999);

  const script = ['move:right', 'move:down', 'wait'];

  for (const act of script) {
    if (s1.done) break;
    step(s1, act);
    step(s2, act);
  }

  assert.strictEqual(JSON.stringify(s1), JSON.stringify(s2));
});
