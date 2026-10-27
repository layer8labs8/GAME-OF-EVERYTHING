const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  MAX_TURNS
} = require('./www/logic.js');

test('createState initializes galaxy with Sol, Omicron, and starting fleets', () => {
  const s = createState(42);
  assert.equal(s.turn, 1);
  assert.equal(s.systems.length, 8);
  assert.equal(s.systems[0].owner, 'player');
  assert.equal(s.systems[0].exploredByPlayer, true);
  assert.equal(s.systems[0].playerFleet, 3);

  assert.equal(s.systems[7].owner, 'alien');
  assert.equal(s.systems[7].exploredByAlien, true);
  assert.equal(s.systems[7].alienFleet, 3);
  assert.equal(s.done, false);
});

test('legalActions provides exploration of neighbor stars and fleet management', () => {
  const s = createState(101);
  const actions = legalActions(s);

  assert.ok(actions.includes('end_turn'));
  assert.ok(actions.includes('explore:1') || actions.includes('explore:2'));
  assert.ok(actions.includes('build_fleet:0'));
});

test('eXplore action uncovers system telemetry and consumes energy', () => {
  const s = createState(202);
  const initialEnergy = s.energy;

  assert.equal(s.systems[1].exploredByPlayer, false);
  const res = step(s, 'explore:1');
  assert.equal(s.systems[1].exploredByPlayer, true);
  assert.equal(s.energy, initialEnergy - 5);
  assert.ok(res.reward > 0);
});

test('eXpand action colonizes an explored neutral star system', () => {
  const s = createState(303);
  step(s, 'explore:1');
  const initialMinerals = s.minerals;
  const initialEnergy = s.energy;

  const res = step(s, 'colonize:1');
  assert.equal(s.systems[1].owner, 'player');
  assert.equal(s.minerals, initialMinerals - 15);
  assert.equal(s.energy, initialEnergy - 10);
  assert.ok(res.reward >= 20);
});

test('eXterminate action builds warships and engages in space combat', () => {
  const s = createState(404);
  step(s, 'explore:1');
  step(s, 'colonize:1');
  const initialFleet = s.systems[0].playerFleet;

  // Build fleet
  step(s, 'build_fleet:0');
  assert.equal(s.systems[0].playerFleet, initialFleet + 1);

  // Move fleet to Alpha Centauri
  step(s, 'move_fleet:0:1');
  assert.equal(s.systems[0].playerFleet, 0);
  assert.ok(s.systems[1].playerFleet >= initialFleet + 1);
});

test('eXploit research advances technology level', () => {
  const s = createState(505);
  s.science = 25;

  assert.equal(s.techLevel, 1);
  step(s, 'research');
  assert.equal(s.techLevel, 2);
  assert.equal(s.science, 5);
});

test('end_turn gathers resources, executes alien AI, and advances turn', () => {
  const s = createState(606);
  const initialTurn = s.turn;
  const initialMinerals = s.minerals;

  step(s, 'end_turn');
  assert.equal(s.turn, initialTurn + 1);
  assert.ok(s.minerals > initialMinerals);
});

test('conquering alien homeworld triggers Domination Victory', () => {
  const s = createState(707);
  // Prepare fleet to conquer Omicron Prime
  s.systems[7].exploredByPlayer = true;
  s.systems[7].alienFleet = 1;
  s.systems[5].exploredByPlayer = true;
  s.systems[5].playerFleet = 20; // Overwhelming force

  step(s, 'move_fleet:5:7');
  assert.equal(s.done, true);
  assert.equal(s.winner, 'player');
  assert.equal(s.result, 'conquest_victory');
  assert.equal(isOver(s), true);
  assert.ok(score(s) > 500);
});

test('losing Sol homeworld triggers catastrophic defeat', () => {
  const s = createState(808);
  s.systems[0].owner = 'alien';
  s.systems[0].playerFleet = 0;

  step(s, 'end_turn');
  assert.equal(s.done, true);
  assert.equal(s.winner, 'alien');
  assert.equal(s.result, 'defeat');
});

test('illegal action throws error without state mutation', () => {
  const s = createState(909);
  const snapshot = JSON.stringify(s);

  assert.throws(() => {
    step(s, 'colonize:7'); // Cannot colonize alien homeworld without exploring/clearing
  }, /Illegal action/);

  assert.equal(JSON.stringify(s), snapshot);
});

test('same seed and actions yield strictly deterministic galactic evolution', () => {
  const s1 = createState(1111);
  const s2 = createState(1111);

  const script = ['explore:1', 'colonize:1', 'end_turn'];
  for (const act of script) {
    if (legalActions(s1).includes(act) && legalActions(s2).includes(act)) {
      step(s1, act);
      step(s2, act);
    }
  }

  assert.deepEqual(s1, s2);
});
