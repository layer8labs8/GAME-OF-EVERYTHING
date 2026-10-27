const test = require('node:test');
const assert = require('node:assert');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  GRID_SIZE,
  DIRS,
  VECTORS,
  getPortDir,
  getStarboardDir
} = require('./www/logic.js');

test('createState initializes flagship, 3 enemies, wind, and turn 1', () => {
  const s = createState(123);
  assert.strictEqual(s.turn, 1);
  assert.strictEqual(s.done, false);
  assert.strictEqual(s.player.hp, 120);
  assert.strictEqual(s.player.heading, 'N');
  assert.strictEqual(s.enemies.length, 3);
  assert.strictEqual(s.enemies.every(e => e.alive), true);
});

test('legalActions provides maneuvers, cannon fire, and damage control', () => {
  const s = createState(456);
  const actions = legalActions(s);

  assert.ok(actions.includes('sail_ahead'));
  assert.ok(actions.includes('rudder_port'));
  assert.ok(actions.includes('rudder_starboard'));
  assert.ok(actions.includes('fire_broadside_port'));
  assert.ok(actions.includes('fire_broadside_starboard'));
  assert.ok(actions.includes('fire_bow_chaser'));
  // Full HP at start, damage_control not legal yet
  assert.strictEqual(actions.includes('damage_control'), false);
});

test('rudder commands adjust ship heading predictably', () => {
  const s = createState(789);
  assert.strictEqual(s.player.heading, 'N');

  step(s, 'rudder_port');
  assert.strictEqual(s.player.heading, 'W');

  step(s, 'rudder_port');
  assert.strictEqual(s.player.heading, 'S');

  step(s, 'rudder_starboard');
  assert.strictEqual(s.player.heading, 'W');
});

test('bow chaser damages enemy in direct forward line of sight', () => {
  const s = createState(101);
  // Imperial Ironclad is at (3, 0), player is at (3, 5), heading N
  const ironclad = s.enemies.find(e => e.id === 'ironclad');
  const initHp = ironclad.hp;

  // Advance closer so within 3 tiles range
  step(s, 'sail_ahead'); // y: 4
  step(s, 'sail_ahead'); // y: 3 (dist 3 from y:0)

  step(s, 'fire_bow_chaser');
  assert.ok(ironclad.hp < initHp);
});

test('broadside triggers cooldown on that flank', () => {
  const s = createState(202);
  assert.strictEqual(s.player.portCooldown, 0);

  step(s, 'fire_broadside_port');
  assert.strictEqual(s.player.portCooldown, 1);

  const legals = legalActions(s);
  assert.strictEqual(legals.includes('fire_broadside_port'), false);
  assert.ok(legals.includes('fire_broadside_starboard'));
});

test('damage control restores flagship hull when damaged', () => {
  const s = createState(303);
  s.player.hp = 80;
  const legals = legalActions(s);
  assert.ok(legals.includes('damage_control'));

  step(s, 'damage_control');
  assert.ok(s.player.hp > 80);
  assert.strictEqual(s.player.repairsRemaining, 2);
});

test('sinking all enemy vessels awards decisive victory', () => {
  const s = createState(404);
  s.enemies[0].alive = false;
  s.enemies[1].alive = false;
  s.enemies[2].alive = true;
  s.enemies[2].hp = 5;
  s.enemies[2].x = 3;
  s.enemies[2].y = 4;

  step(s, 'fire_bow_chaser');

  assert.strictEqual(s.done, true);
  assert.strictEqual(s.winner, 'player');
  assert.ok(score(s) > 200);
});

test('depleting player hull causes defeat', () => {
  const s = createState(505);
  s.player.hp = 5;
  // Place enemy right next to player to trigger counter-attack
  s.enemies[0].x = 3;
  s.enemies[0].y = 4;
  s.enemies[0].heading = 'S';

  step(s, 'rudder_port'); // Player turns, enemy then fires bow chaser and sinks player

  assert.strictEqual(s.done, true);
  assert.strictEqual(s.winner, 'enemy');
});

test('illegal action throws error without state corruption', () => {
  const s = createState(606);
  const snap = JSON.stringify(s);

  assert.throws(() => {
    step(s, 'fire_torpedo_alpha');
  }, /Illegal action/);

  assert.strictEqual(JSON.stringify(s), snap);
});

test('same seed and sequence of commands produce strictly deterministic battle state', () => {
  const s1 = createState(7777);
  const s2 = createState(7777);

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
