const test = require('node:test');
const assert = require('node:assert');
const { createState, legalActions, step, isOver, score } = require('./www/logic.js');

test('createState initializes player, ammo 6, wave 1 with 2 spitters', () => {
  const s = createState(42);
  assert.strictEqual(s.wave, 1);
  assert.strictEqual(s.player.ammo, 6);
  assert.strictEqual(s.player.hp, 100);
  assert.strictEqual(s.enemies.length, 2);
  assert.strictEqual(s.done, false);
  assert.strictEqual(isOver(s), false);
  assert.strictEqual(score(s), 0);
});

test('move shifts player position within arena boundaries', () => {
  const s = createState(101);
  const initialY = s.player.y;

  step(s, 'move:up');
  assert.strictEqual(s.player.y, initialY - 1);
});

test('shoot consumes 1 ammo and spawns bullet projectile', () => {
  const s = createState(102);
  step(s, 'shoot:up');
  assert.strictEqual(s.player.ammo, 5);
  assert.ok(s.bullets.some(b => b.fromPlayer && b.dy === -1));
});

test('bullet damages enemy and increases score', () => {
  const s = createState(103);
  // Put enemy directly 1 tile above player
  s.enemies[0].x = s.player.x;
  s.enemies[0].y = s.player.y - 1;
  const initialHp = s.enemies[0].hp;

  step(s, 'shoot:up');
  assert.ok(s.enemies[0].hp < initialHp);
  assert.ok(score(s) > 0);
});

test('dash leaps 2 tiles, consumes 10 stamina and activates i-frames', () => {
  const s = createState(104);
  const startY = s.player.y;

  step(s, 'dash:up');
  assert.strictEqual(s.player.y, startY - 2);
  assert.strictEqual(s.player.stamina, 24); // 30 - 10 + 4 regen = 24
  assert.strictEqual(s.player.isInvulnerable, true);
});

test('reload refills magazine to maxAmmo', () => {
  const s = createState(105);
  s.player.ammo = 1;

  step(s, 'reload');
  assert.strictEqual(s.player.ammo, s.player.maxAmmo);
});

test('clearing wave 1 prompts perk selection, which starts wave 2', () => {
  const s = createState(106);
  s.enemies.forEach(e => e.hp = 0);

  const res = step(s, 'wait');
  assert.strictEqual(s.perkPending, true);

  const actions = legalActions(s);
  assert.ok(actions.includes('choose_perk:triple_shot'));

  step(s, 'choose_perk:triple_shot');
  assert.strictEqual(s.wave, 2);
  assert.strictEqual(s.player.perks.includes('triple_shot'), true);
  assert.strictEqual(s.perkPending, false);
});

test('defeating Wave 4 Void Overlord triggers victory and 1.0 reward', () => {
  const s = createState(201);
  s.wave = 4;
  s.enemies = [{ id: 'boss', name: 'The Void Overlord', hp: 0, maxHp: 160, atk: 24, x: 3, y: 1, type: 'boss' }];

  const res = step(s, 'wait');
  assert.strictEqual(res.done, true);
  assert.strictEqual(res.reward, 1.0);
  assert.strictEqual(s.victory, true);
  assert.strictEqual(isOver(s), true);
});

test('depleting HP triggers defeat and 0.0 reward', () => {
  const s = createState(301);
  s.player.hp = 1;
  // Place bullet right on player
  s.bullets.push({ x: s.player.x, y: s.player.y, dx: 0, dy: 0, fromPlayer: false, dmg: 50 });

  const res = step(s, 'wait');
  assert.strictEqual(res.done, true);
  assert.strictEqual(res.reward, 0.0);
  assert.strictEqual(s.victory, false);
  assert.strictEqual(isOver(s), true);
});

test('illegal action throws error without mutating state', () => {
  const s = createState(401);
  const serializedBefore = JSON.stringify(s);

  assert.throws(() => {
    step(s, 'shoot:invalid_direction');
  }, /Illegal action/);

  assert.strictEqual(JSON.stringify(s), serializedBefore);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(888);
  const s2 = createState(888);

  const script = ['move:up', 'shoot:up', 'move:left'];

  for (const act of script) {
    if (s1.done) break;
    step(s1, act);
    step(s2, act);
  }

  assert.strictEqual(JSON.stringify(s1), JSON.stringify(s2));
});
