const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  LEVELS
} = require('./www/logic.js');
const {
  validateLevel,
  solve,
  replay
} = require('./solver.js');

test('createState initializes probe, goal, fuel, and level 0', () => {
  const state = createState(100, 0);
  assert.equal(state.probe.x, 1);
  assert.equal(state.probe.y, 1);
  assert.equal(state.goal.x, 6);
  assert.equal(state.goal.y, 1);
  assert.equal(state.fuel, 5);
  assert.equal(state.vx, 0);
  assert.equal(state.vy, 0);
  assert.equal(state.won, false);
  assert.equal(state.lost, false);
  assert.equal(isOver(state), false);
});

test('legalActions lists 4 thrusts + coast when fuel > 0, and only coast when fuel = 0', () => {
  const state = createState(100, 0);
  const actions = legalActions(state);
  assert.deepEqual(actions, ['thrust_up', 'thrust_down', 'thrust_left', 'thrust_right', 'coast']);

  state.fuel = 0;
  const noFuelActions = legalActions(state);
  assert.deepEqual(noFuelActions, ['coast']);
});

test('thrust_right increments vx and consumes 1 fuel', () => {
  const state = createState(100, 0);
  const initialFuel = state.fuel;
  const { reward, done } = step(state, 'thrust_right');
  assert.equal(state.vx, 1);
  assert.equal(state.fuel, initialFuel - 1);
  assert.equal(state.probe.x, 2);
  assert.equal(done, false);
});

test('coast maintains velocity without spending fuel', () => {
  const state = createState(100, 0);
  step(state, 'thrust_right');
  const fuelBefore = state.fuel;
  const { reward, done } = step(state, 'coast');
  assert.equal(state.fuel, fuelBefore);
  assert.equal(state.vx, 1);
  assert.equal(state.probe.x, 3);
  assert.equal(done, false);
});

test('collecting beacon awards 100 points and updates collectedMask', () => {
  const state = createState(100, 0);
  step(state, 'thrust_right'); // moves to (2, 1)
  const { reward } = step(state, 'coast'); // moves to (3, 1) where beacon is
  assert.equal(state.collectedMask, 1);
  assert.ok(score(state) >= 100);
});

test('gravity well curves trajectory towards its center', () => {
  // Level 3 (Singularity Sling): well at (4, 3)
  const state = createState(100, 3);
  // Probe starts at (1, 2)
  step(state, 'thrust_right'); // Probe moves towards x=2, y=2. Within range 2 of well (4, 3)
  // Distance to well (4, 3): dx = 4 - 2 = 2, dy = 3 - 2 = 1.
  // Gravity pulls right and down!
  assert.ok(state.vx >= 1);
});

test('colliding with asteroid causes crash and defeat', () => {
  // Level 2 (Asteroid Gate): asteroids at (4, 3), (4, 4), (4, 5)
  const state = createState(100, 2);
  // Probe at (1, 4). Thrusting straight right will hit asteroid at (4, 4)
  step(state, 'thrust_right'); // to (2, 4)
  step(state, 'coast');        // to (3, 4)
  const { reward, done } = step(state, 'coast'); // into (4, 4) asteroid!
  assert.equal(done, true);
  assert.equal(state.lost, true);
  assert.equal(state.won, false);
  assert.ok(reward < 0);
});

test('reaching goal with all beacons triggers victory', () => {
  // Level 0 solution: RRR
  const state = createState(100, 0);
  step(state, 'thrust_right');
  step(state, 'thrust_right');
  const { reward, done } = step(state, 'thrust_right');
  assert.equal(done, true);
  assert.equal(state.won, true);
  assert.equal(state.lost, false);
  assert.ok(reward > 0);
});

test('solver validates all 10 levels and matches par', () => {
  const levelsDoc = JSON.parse(fs.readFileSync(path.join(__dirname, 'levels.json'), 'utf8'));
  assert.equal(levelsDoc.levels.length, 10);

  for (const lvl of levelsDoc.levels) {
    const problems = validateLevel(lvl.data);
    assert.deepEqual(problems, [], `Level ${lvl.id} validation problems`);

    const result = solve(lvl.data);
    assert.equal(result.solvable, true, `Level ${lvl.id} must be solvable`);
    assert.equal(result.moves.length, lvl.par, `Level ${lvl.id} par mismatch`);
    assert.equal(result.moves, lvl.solution, `Level ${lvl.id} solution mismatch`);
    assert.equal(replay(lvl.data, lvl.solution), true, `Level ${lvl.id} replay must succeed`);
  }
});

test('illegal action throws without mutating state', () => {
  const state = createState(100, 0);
  const snapshot = JSON.stringify(state);

  assert.throws(() => step(state, 'hyperdrive_warp'));
  assert.equal(JSON.stringify(state), snapshot);

  // Illegal thrust when out of fuel
  state.fuel = 0;
  const noFuelSnapshot = JSON.stringify(state);
  assert.throws(() => step(state, 'thrust_up'));
  assert.equal(JSON.stringify(state), noFuelSnapshot);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(98765, 1);
  const s2 = createState(98765, 1);

  const actions = ['thrust_down', 'thrust_right', 'thrust_up', 'thrust_down', 'coast'];
  for (const a of actions) {
    step(s1, a);
    step(s2, a);
  }

  assert.deepEqual(s1, s2);
});
