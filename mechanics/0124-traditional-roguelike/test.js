const test = require('node:test');
const assert = require('node:assert');
const {
  createState,
  legalActions,
  step,
  isOver,
  score
} = require('./www/logic.js');

test('createState initializes player on Floor 1 with full stats and FOV', () => {
  const s = createState(42);
  assert.strictEqual(s.floor, 1);
  assert.strictEqual(s.player.x, 1);
  assert.strictEqual(s.player.y, 1);
  assert.strictEqual(s.player.hp, 50);
  assert.strictEqual(s.player.hunger, 100);
  assert.strictEqual(s.player.inventory.length, 1);
  assert.strictEqual(s.visible[1][1], true);
  assert.strictEqual(s.explored[1][1], true);
  assert.strictEqual(s.hasAmulet, false);
  assert.strictEqual(isOver(s), false);
});

test('move shifts player coordinates and recalculates FOV', () => {
  const s = createState(42);
  const initialX = s.player.x;
  const initialY = s.player.y;

  step(s, 'move:right');
  assert.strictEqual(s.player.x, initialX + 1);
  assert.strictEqual(s.player.y, initialY);
  assert.strictEqual(s.visible[s.player.y][s.player.x], true);
});

test('bump combat damages adjacent enemy and rewards score', () => {
  const s = createState(42);
  // Position player right next to cave rat at (4, 2)
  s.player.x = 3;
  s.player.y = 2;
  const rat = s.enemies.find(e => e.id === 'r1');
  assert.ok(rat);
  const initialHp = rat.hp;

  step(s, 'move:right'); // Bump rat
  assert.ok(rat.hp < initialHp);
  assert.ok(score(s) > 0);
});

test('wait action rests and regenerates HP when well-fed', () => {
  const s = createState(42);
  s.player.hp = 40;
  s.player.hunger = 80;

  step(s, 'wait');
  assert.strictEqual(s.player.hp, 41);
});

test('pickup collects ground item into inventory', () => {
  const s = createState(42);
  // Food ration f1 is at (3, 2)
  s.player.x = 3;
  s.player.y = 2;

  const legals = legalActions(s);
  assert.ok(legals.includes('pickup'));

  const invCountBefore = s.player.inventory.length;
  step(s, 'pickup');
  assert.strictEqual(s.player.inventory.length, invCountBefore + 1);
  assert.ok(s.player.inventory.some(it => it.id === 'f1'));
});

test('eat action consumes food ration and restores hunger', () => {
  const s = createState(42);
  s.player.hunger = 40;
  // Starting inventory has index 0 food
  step(s, 'eat:0');
  assert.strictEqual(s.player.hunger, 80);
  assert.strictEqual(s.player.inventory.length, 0);
});

test('quaff action heals and identifies potion', () => {
  const s = createState(42);
  s.player.hp = 20;
  s.player.inventory.push({ id: 'test_pot', type: 'potion', color: 'crimson', name: 'Crimson Potion' });
  const potIdx = s.player.inventory.length - 1;

  step(s, `quaff:${potIdx}`);
  assert.strictEqual(s.player.hp, 45); // 20 + 25
  assert.strictEqual(s.identified.potions.crimson, true);
});

test('read scroll casts magic mapping and identifies scroll', () => {
  const s = createState(42);
  s.player.inventory.push({ id: 'test_scr', type: 'scroll', scrollType: 'parchment', name: 'Parchment Scroll' });
  const scrIdx = s.player.inventory.length - 1;

  step(s, `read:${scrIdx}`);
  assert.strictEqual(s.identified.scrolls.parchment, true);
  // All tiles explored
  assert.strictEqual(s.explored[8][8], true);
});

test('descend advances to next floor with new map and enemies', () => {
  const s = createState(42);
  // Floor 1 stairs are at (8, 8)
  s.player.x = 8;
  s.player.y = 8;

  const legals = legalActions(s);
  assert.ok(legals.includes('descend'));

  step(s, 'descend');
  assert.strictEqual(s.floor, 2);
  assert.strictEqual(s.player.x, 1);
  assert.strictEqual(s.player.y, 1);
  assert.ok(s.enemies.some(e => e.type === 'skeleton'));
});

test('claiming Amulet and defeating Chimera achieves victory', () => {
  const s = createState(42);
  s.floor = 3;
  s.map = require('./www/logic.js').createState(42).map; // get floor 3 layout
  // Spawn floor 3 entities
  s.player.x = 7;
  s.player.y = 8;
  s.enemies = [{ id: 'boss', name: 'The Dread Chimera', type: 'chimera', x: 7, y: 7, hp: 5, maxHp: 80, atk: 16, def: 5 }];

  // 1. Slay Chimera with bump attack
  step(s, 'move:up');
  const chimera = s.enemies.find(e => e.type === 'chimera');
  assert.ok(chimera.hp <= 0);

  // 2. Step on Amulet of Yendor at (8, 8)
  s.map[8][8] = 'A';
  s.player.x = 7;
  s.player.y = 8;
  const res = step(s, 'move:right');
  assert.strictEqual(s.hasAmulet, true);
  assert.strictEqual(s.victory, true);
  assert.strictEqual(s.done, true);
  assert.strictEqual(res.reward, 1.0);
});

test('depleting HP triggers defeat and 0.0 reward', () => {
  const s = createState(42);
  s.player.hp = 2;
  s.player.hunger = 0; // Starving
  const res = step(s, 'wait');
  assert.strictEqual(s.done, true);
  assert.strictEqual(s.victory, false);
  assert.strictEqual(res.reward, 0.0);
});

test('illegal action throws error without mutating state', () => {
  const s = createState(42);
  const cloned = JSON.parse(JSON.stringify(s));

  assert.throws(() => {
    step(s, 'move:into_wall_or_invalid');
  });

  assert.deepStrictEqual(s.player, cloned.player);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(999);
  const s2 = createState(999);

  const script = ['move:right', 'move:right', 'move:down', 'wait', 'eat:0'];
  for (const act of script) {
    step(s1, act);
    step(s2, act);
  }

  assert.deepStrictEqual(s1, s2);
});
