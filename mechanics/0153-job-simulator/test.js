const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score
} = require('./www/logic.js');

test('createState initializes Megacorp office with junior clerk credentials and initial tasks', () => {
  const state = createState(42);
  assert.equal(state.jobTitle, 'Junior Clerk');
  assert.equal(state.energy, 90);
  assert.equal(state.stress, 15);
  assert.equal(state.performance, 75);
  assert.equal(state.salary, 350);
  assert.equal(state.tasksCompleted, 0);
  assert.equal(state.tasksFailed, 0);
  assert.equal(state.victory, false);
  assert.equal(state.defeat, false);
  assert.equal(state.tasks.length, 2);
  assert.equal(isOver(state), false);
  assert.ok(score(state) > 0);
});

test('workstation actions update items, energy and stress', () => {
  const state = createState(100);
  
  // Stamp contracts
  const initialContracts = state.items.contractsSigned;
  step(state, 'action:stamp_contracts');
  assert.equal(state.items.contractsSigned, initialContracts + 1);
  assert.equal(state.energy, 80);

  // Print reports
  const initialReports = state.items.reportsPrinted;
  const initialPaper = state.items.paperReams;
  step(state, 'action:print_reports');
  assert.equal(state.items.reportsPrinted, initialReports + 1);
  assert.equal(state.items.paperReams, initialPaper - 1);

  // Shred documents
  const initialMemos = state.items.shreddedMemos;
  step(state, 'action:shred_documents');
  assert.equal(state.items.shreddedMemos, initialMemos + 2);

  // Brew coffee
  const initialBeans = state.items.coffeeBeans;
  step(state, 'action:brew_coffee');
  assert.equal(state.items.coffeeBeans, initialBeans - 1);

  // Water cooler chat
  const preStress = state.stress;
  step(state, 'action:water_cooler_chat');
  assert.ok(state.stress <= preStress);
});

test('delivering tasks consumes requisite items and rewards salary and performance', () => {
  const state = createState(200);
  
  // Set up an explicit task in state
  state.tasks = [{
    id: 'test_task_1',
    type: 'contract',
    description: 'Special legal audit',
    requiredCount: 2,
    deadlineTurns: 20,
    reward: 200
  }];
  state.items.contractsSigned = 2;

  const actions = legalActions(state);
  assert.ok(actions.includes('action:deliver_task:test_task_1'));

  const prevSalary = state.salary;
  const prevCompleted = state.tasksCompleted;
  step(state, 'action:deliver_task:test_task_1');

  assert.equal(state.items.contractsSigned, 0);
  assert.equal(state.salary, prevSalary + 200);
  assert.equal(state.tasksCompleted, prevCompleted + 1);
  assert.ok(state.tasks.length <= 1); // might spawn replenishment
});

test('promotion ladder advances clerk through ranks to Vice President victory', () => {
  const state = createState(300);
  
  // Qualify for Account Specialist
  state.tasksCompleted = 4;
  state.salary = 700;
  state.performance = 80;
  assert.ok(legalActions(state).includes('action:ask_for_promotion'));
  step(state, 'action:ask_for_promotion');
  assert.equal(state.jobTitle, 'Account Specialist');

  // Qualify for Senior Manager
  state.tasksCompleted = 8;
  state.salary = 1500;
  state.performance = 85;
  assert.ok(legalActions(state).includes('action:ask_for_promotion'));
  step(state, 'action:ask_for_promotion');
  assert.equal(state.jobTitle, 'Senior Manager');

  // Qualify for Vice President
  state.tasksCompleted = 12;
  state.salary = 2500;
  state.performance = 90;
  assert.ok(legalActions(state).includes('action:ask_for_promotion'));
  step(state, 'action:ask_for_promotion');
  assert.equal(state.jobTitle, 'Vice President');
  assert.equal(state.victory, true);
  assert.equal(isOver(state), true);
});

test('defeat occurs when player stress reaches 100 burnout threshold', () => {
  const state = createState(400);
  state.stress = 98;
  step(state, 'action:stamp_contracts'); // +4 stress
  assert.ok(state.stress >= 100);
  assert.equal(state.defeat, true);
  assert.equal(isOver(state), true);
});

test('defeat occurs when 5 deadlines are failed', () => {
  const state = createState(500);
  state.tasksFailed = 4;
  state.tasks = [{
    id: 'failing_task',
    type: 'contract',
    description: 'Doomed filing',
    requiredCount: 5,
    deadlineTurns: 1,
    reward: 100
  }];

  step(state, 'action:water_cooler_chat');
  assert.equal(state.tasksFailed, 5);
  assert.equal(state.defeat, true);
  assert.equal(isOver(state), true);
});

test('defeat occurs when performance drops to zero', () => {
  const state = createState(600);
  state.performance = 10;
  state.tasks = [{
    id: 'failing_urgent',
    type: 'report',
    description: 'Late briefing',
    requiredCount: 5,
    deadlineTurns: 1,
    reward: 100
  }];

  step(state, 'action:water_cooler_chat');
  assert.equal(state.performance, 0);
  assert.equal(state.defeat, true);
  assert.equal(isOver(state), true);
});

test('power nap restores substantial energy when fatigued', () => {
  const state = createState(700);
  state.energy = 30;
  const actions = legalActions(state);
  assert.ok(actions.includes('action:take_power_nap'));
  step(state, 'action:take_power_nap');
  assert.equal(state.energy, 70);
});

test('illegal action throws without mutating state', () => {
  const state = createState(800);
  state.items.paperReams = 0; // cannot print
  const snapshot = JSON.stringify(state);

  assert.throws(() => {
    step(state, 'action:print_reports');
  }, /Illegal action/);

  assert.equal(JSON.stringify(state), snapshot);
});

test('deterministic seeds produce identical task trajectories', () => {
  const s1 = createState(9999);
  const s2 = createState(9999);

  assert.deepEqual(s1, s2);

  step(s1, 'action:stamp_contracts');
  step(s2, 'action:stamp_contracts');
  step(s1, 'action:water_cooler_chat');
  step(s2, 'action:water_cooler_chat');

  assert.deepEqual(s1, s2);
});
