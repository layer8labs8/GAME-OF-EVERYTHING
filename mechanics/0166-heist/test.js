const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  ZONE_NAMES
} = require('./www/logic.js');

test('0166-heist: initial state contracts', () => {
  const state = createState(42);
  assert.equal(state.zone, 0);
  assert.equal(state.suspicion, 10);
  assert.equal(state.alarmTriggered, false);
  assert.equal(state.pagersRemaining, 4);
  assert.equal(state.crewHealth, 100);
  assert.equal(state.lootValue, 0);
  assert.equal(state.hasImperialDiamond, false);
  assert.equal(state.vaultOpened, false);
  assert.equal(state.victory, false);
  assert.equal(state.defeat, false);
  assert.equal(isOver(state), false);

  const actions = legalActions(state);
  assert.ok(actions.includes('action:recon_surveillance'));
  assert.ok(actions.includes('action:deploy_emp_jammer'));
  assert.ok(actions.includes('action:pick_security_lock'));
});

test('0166-heist: surveillance recon and EMP jammers reduce suspicion', () => {
  const state = createState(101);
  state.suspicion = 50;

  step(state, 'action:recon_surveillance');
  assert.equal(state.suspicion, 40);

  step(state, 'action:deploy_emp_jammer');
  assert.equal(state.empJammers, 1);
  assert.equal(state.empActiveTurns, 2); // 3 minus 1 turn tick
  assert.equal(state.suspicion, 15);
});

test('0166-heist: camera hacking and lockpicking doors', () => {
  const state = createState(202);
  step(state, 'action:pick_security_lock');
  assert.equal(state.doorUnlocked[1], true);

  step(state, 'action:advance_to_zone:1');
  assert.equal(state.zone, 1);

  const actions = legalActions(state);
  assert.ok(actions.includes('action:hack_camera_loop'));
  step(state, 'action:hack_camera_loop');
  assert.equal(state.cctvLooped[1], true);
});

test('0166-heist: silent guard takedown and pager exhaustion trigger alarm', () => {
  const state = createState(303);
  state.zone = 1;
  assert.equal(state.guardsInZone[1], 2);

  step(state, 'action:silent_guard_takedown');
  assert.equal(state.guardsInZone[1], 1);
  assert.equal(state.pagersRemaining, 3);
  assert.equal(state.alarmTriggered, false);

  // Exhaust all pagers
  state.pagersRemaining = 0;
  step(state, 'action:silent_guard_takedown');
  assert.equal(state.alarmTriggered, true);
});

test('0166-heist: thermal drill progression and vault opening', () => {
  const state = createState(404);
  state.zone = 2;
  state.doorUnlocked[2] = true;

  step(state, 'action:start_thermal_drill');
  assert.equal(state.drillDeployed, true);
  assert.ok(state.drillProgress >= 20);

  // Keep drilling / servicing until vault opens
  let count = 0;
  while (!state.vaultOpened && count < 20) {
    if (state.drillJammed) {
      step(state, 'action:service_drill');
    } else {
      step(state, 'action:recon_surveillance');
    }
    count++;
  }

  assert.equal(state.vaultOpened, true);
});

test('0166-heist: looting cash, gold, and imperial diamond', () => {
  const state = createState(505);
  state.zone = 3;
  state.vaultOpened = true;

  step(state, 'action:bag_cash');
  assert.equal(state.cashBags, 1);
  assert.equal(state.lootValue, 50000);

  step(state, 'action:bag_gold');
  assert.equal(state.goldBags, 1);
  assert.equal(state.lootValue, 150000);

  step(state, 'action:bag_imperial_diamond');
  assert.equal(state.hasImperialDiamond, true);
  assert.equal(state.lootValue, 650000);
});

test('0166-heist: complete heist infiltration, extraction, and getaway victory', () => {
  const state = createState(606);
  // Unlock all doors and breach vault
  state.doorUnlocked = [true, true, true, true];
  state.vaultOpened = true;
  state.zone = 3;

  step(state, 'action:bag_imperial_diamond');
  assert.ok(state.lootValue >= 500000);

  // Move back to zone 0 (getaway van)
  step(state, 'action:advance_to_zone:2');
  step(state, 'action:advance_to_zone:1');
  step(state, 'action:advance_to_zone:0');
  assert.equal(state.zone, 0);

  const actions = legalActions(state);
  assert.ok(actions.includes('action:escape_in_getaway_van'));

  const res = step(state, 'action:escape_in_getaway_van');
  assert.equal(state.victory, true);
  assert.equal(res.done, true);
  assert.ok(score(state) >= 4000);
});

test('0166-heist: defeat on crew health depletion from SWAT assault', () => {
  const state = createState(707);
  state.alarmTriggered = true;
  state.crewHealth = 8;

  step(state, 'action:recon_surveillance');
  assert.equal(state.crewHealth, 0);
  assert.equal(state.defeat, true);
  assert.equal(isOver(state), true);
});

test('0166-heist: determinism on identical seed and actions', () => {
  const s1 = createState(888);
  const s2 = createState(888);

  const script = [
    'action:recon_surveillance',
    'action:pick_security_lock',
    'action:advance_to_zone:1'
  ];

  for (const act of script) {
    if (!isOver(s1) && legalActions(s1).includes(act)) step(s1, act);
    if (!isOver(s2) && legalActions(s2).includes(act)) step(s2, act);
  }

  assert.equal(s1.prngState, s2.prngState);
  assert.equal(s1.zone, s2.zone);
  assert.equal(s1.suspicion, s2.suspicion);
  assert.equal(score(s1), score(s2));
});

test('0166-heist: bot contract fuzzing to completion', () => {
  const state = createState(999);
  let steps = 0;

  while (!isOver(state) && steps < 200) {
    const actions = legalActions(state);
    assert.ok(actions.length > 0, 'Legal actions must not be empty');
    const act = actions[steps % actions.length];
    step(state, act);
    steps++;
  }

  assert.ok(isOver(state));
  assert.ok(score(state) >= 0);
});
