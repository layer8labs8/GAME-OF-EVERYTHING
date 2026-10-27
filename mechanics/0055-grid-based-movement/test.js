const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  WIDTH,
  HEIGHT
} = require('./www/logic.js');

test('createState initializes floor 1, player at (1,1), 3 HP and 0 keys', () => {
  const s = createState(42);
  assert.equal(s.floor, 1);
  assert.equal(s.hp, 3);
  assert.equal(s.keys, 0);
  assert.equal(s.player.x, 1);
  assert.equal(s.player.y, 1);
  assert.equal(s.done, false);
});

test('legalActions forbids walking into perimeter walls', () => {
  const s = createState(42);
  const actions = legalActions(s);
  // (1,1) has walls at up (1,0) and left (0,1)
  assert.ok(!actions.includes('up'));
  assert.ok(!actions.includes('left'));
  assert.ok(actions.includes('wait'));
});

test('moving shifts player and collects key when stepping on it', () => {
  const s = createState(0);
  // In template 0: player at (1,1), boulder at (2,2), key at (2,7)
  // Let us step down to (1,2)
  const initialKeys = s.keys;
  assert.ok(legalActions(s).includes('down'));
  step(s, 'down');
  assert.equal(s.player.x, 1);
  assert.equal(s.player.y, 2);
});

test('pushing boulder shifts boulder coordinates', () => {
  const s = createState(0);
  // In template 0, boulder is at (2,2). Player is at (1,1).
  // Step down to (1,2), then right into (2,2). Boulder should move to (3,2).
  step(s, 'down');
  assert.ok(legalActions(s).includes('right'));
  step(s, 'right');
  assert.equal(s.player.x, 2);
  assert.equal(s.player.y, 2);
  const b = s.boulders.find(b => b.x === 3 && b.y === 2);
  assert.ok(b, 'Boulder should have moved to (3,2)');
});

test('pushing boulder into pit chasm fills the pit into walkable floor', () => {
  const s = createState(0);
  s.grid[1][1] = '.';
  s.grid[1][2] = '.';
  s.grid[1][3] = 'W';
  s.player = { x: 1, y: 1 };
  s.boulders = [{ x: 2, y: 1 }];

  assert.ok(legalActions(s).includes('right'));
  const res = step(s, 'right');
  assert.equal(s.player.x, 2);
  assert.equal(s.player.y, 1);
  assert.equal(s.grid[1][3], '.', 'Pit should now be floor');
  assert.equal(s.boulders.length, 0, 'Boulder should be consumed');
  assert.ok(res.reward > 0);
});

test('locked door cannot be passed without key, opens with key', () => {
  const s = createState(0);
  // Set door at (1,3)
  s.grid[3][1] = 'D';
  s.player = { x: 1, y: 2 };
  s.keys = 0;
  assert.ok(!legalActions(s).includes('down'), 'Cannot enter door without key');

  s.keys = 1;
  assert.ok(legalActions(s).includes('down'), 'Can enter door with key');
  step(s, 'down');
  assert.equal(s.player.x, 1);
  assert.equal(s.player.y, 3);
  assert.equal(s.keys, 0, 'Key consumed');
  assert.equal(s.grid[3][1], '.', 'Door opened');
});

test('stepping on pressure plate deactivates spikes', () => {
  const s = createState(0);
  s.plates = [{ x: 2, y: 5 }];
  s.spikes = [{ x: 1, y: 6 }];
  s.player = { x: 2, y: 5 }; // player stands on plate
  step(s, 'wait');
  assert.equal(s.spikesActive, false, 'Spikes must be deactivated when plate is pressed');
});

test('standing on active spike reduces player HP', () => {
  const s = createState(0);
  s.plates = [];
  s.spikes = [{ x: 1, y: 2 }];
  s.player = { x: 1, y: 1 };
  s.floorSteps = 0; // step count will become 1, making spikes active (1 % 2 === 1)
  const initialHp = s.hp;
  step(s, 'down');
  assert.equal(s.player.x, 1);
  assert.equal(s.player.y, 2);
  assert.equal(s.hp, initialHp - 1, 'Player should lose 1 HP on active spike');
});

test('sentry patrols and reverses direction when hitting wall', () => {
  const s = createState(0);
  s.sentries = [{ x: 6, y: 1, dx: 0, dy: -1 }]; // moving UP toward wall at y=0
  s.player = { x: 1, y: 1 };
  step(s, 'wait');
  const sentry = s.sentries[0];
  assert.equal(sentry.dy, 1, 'Sentry should have reversed direction to downward');
});

test('sentry colliding with player inflicts 1 damage', () => {
  const s = createState(0);
  s.grid[1][1] = '.';
  s.grid[2][1] = '.';
  s.player = { x: 1, y: 1 };
  s.sentries = [{ x: 1, y: 2, dx: 0, dy: -1 }];
  const initialHp = s.hp;
  step(s, 'wait');
  assert.equal(s.hp, initialHp - 1);
});

test('reaching exit stairs advances floor or wins the descent', () => {
  const s = createState(0);
  s.floor = 1;
  s.player = { x: s.exit.x - 1, y: s.exit.y };
  // Check legal action toward exit
  assert.ok(legalActions(s).includes('right'));
  step(s, 'right');
  assert.equal(s.floor, 2, 'Should have descended to Floor 2');
});

test('depleting HP ends the game with defeat', () => {
  const s = createState(0);
  s.grid[1][1] = '.';
  s.grid[2][1] = '.';
  s.hp = 1;
  s.player = { x: 1, y: 1 };
  s.sentries = [{ x: 1, y: 2, dx: 0, dy: -1 }];
  const res = step(s, 'wait');
  assert.equal(s.hp, 0);
  assert.equal(s.done, true);
  assert.equal(isOver(s), true);
  assert.ok(res.done);
});

test('illegal action throws without mutating state', () => {
  const s = createState(0);
  // (1,0) is wall, up is illegal
  const snap = JSON.stringify(s);
  assert.throws(() => {
    step(s, 'up');
  }, /Illegal action/);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(12345);
  const s2 = createState(12345);
  assert.deepEqual(s1, s2);

  const actions = ['down', 'wait', 'down', 'wait'];
  for (const act of actions) {
    if (legalActions(s1).includes(act)) {
      step(s1, act);
      step(s2, act);
    }
  }

  assert.deepEqual(s1, s2);
  assert.equal(score(s1), score(s2));
});
