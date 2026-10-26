const test = require('node:test');
const assert = require('node:assert/strict');
const { createState, legalActions, step, isOver, score } = require('./www/logic.js');

test('createState initializes player at center with 100 HP, level 1, wand & aura', () => {
  const s = createState(888);
  assert.equal(s.player.x, 180);
  assert.equal(s.player.y, 320);
  assert.equal(s.player.hp, 100);
  assert.equal(s.player.level, 1);
  assert.equal(s.player.weapons.wand.damage, 8);
  assert.equal(isOver(s), false);
});

test('moving shifts player position and respects arena boundaries', () => {
  const s = createState(888);
  step(s, 'right');
  assert.equal(s.player.x, 186);

  s.player.x = 350;
  step(s, 'right');
  assert.equal(s.player.x, 345); // clamped
});

test('wand auto-fires seeking projectile at nearest enemy', () => {
  const s = createState(888);
  s.enemies = [{ id: 1, type: 'bat', x: 220, y: 320, hp: 10, maxHp: 10, speed: 2, damage: 4, xpValue: 2 }];
  s.player.weapons.wand.cooldown = 0;

  step(s, 'wait');
  assert.ok(s.projectiles.length > 0);
  assert.equal(s.projectiles[0].vx > 0, true); // flying right towards enemy
});

test('holy aura inflicts contact damage on close enemies', () => {
  const s = createState(888);
  s.enemies = [{ id: 1, type: 'bat', x: 190, y: 320, hp: 10, maxHp: 10, speed: 0, damage: 0, xpValue: 2 }];

  step(s, 'wait');
  assert.ok(s.enemies[0].hp < 10);
});

test('slaying enemy spawns XP gem on the ground', () => {
  const s = createState(888);
  s.enemies = [{ id: 1, type: 'bat', x: 260, y: 320, hp: 1, maxHp: 10, speed: 0, damage: 0, xpValue: 4 }];
  s.projectiles = [{ x: 255, y: 320, vx: 5, vy: 0, damage: 8 }];

  step(s, 'wait');
  assert.equal(s.kills, 1);
  assert.ok(s.gems.length > 0);
  assert.equal(s.gems[0].value, 4);
});

test('collecting gem advances XP and triggers level up with weapon boost', () => {
  const s = createState(888);
  s.gems = [{ x: 185, y: 320, value: 12 }]; // close to player, exceeds nextXp (8)
  const prevLevel = s.player.level;

  step(s, 'wait');
  assert.ok(s.player.level > prevLevel);
  assert.ok(s.player.weapons.wand.damage > 8);
});

test('depleting player HP triggers game over', () => {
  const s = createState(888);
  s.player.hp = 2;
  s.enemies = [{ id: 1, type: 'zombie', x: 180, y: 320, hp: 20, maxHp: 20, speed: 0, damage: 10, xpValue: 5 }];

  step(s, 'wait');
  assert.equal(s.player.hp, 0);
  assert.equal(isOver(s), true);
});

test('surviving past MAX_STEPS triggers victory', () => {
  const s = createState(888);
  s.stepCount = 599;

  step(s, 'wait');
  assert.equal(s.won, true);
  assert.equal(isOver(s), true);
  assert.ok(score(s) >= 1000);
});

test('illegal action throws without mutating state', () => {
  const s = createState(888);
  const snapshot = JSON.stringify(s);

  assert.throws(() => {
    step(s, 'teleport');
  });

  assert.equal(JSON.stringify(s), snapshot);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(7733);
  const s2 = createState(7733);

  for (let i = 0; i < 25; i++) {
    const a1 = legalActions(s1);
    const a2 = legalActions(s2);
    assert.deepEqual(a1, a2);
    if (a1.length === 0) break;

    const chosen = a1[i % a1.length];
    step(s1, chosen);
    step(s2, chosen);
    assert.deepEqual(s1, s2);
  }
});
