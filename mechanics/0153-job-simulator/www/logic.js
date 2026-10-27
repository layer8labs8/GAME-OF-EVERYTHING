// 0153-job-simulator: Office Mayhem - Pure Bot Contract Logic
// Strictly deterministic, pure state machine. No DOM or ambient dependencies.

function nextRand(state) {
  let s = (state.prngState ^ (state.prngState << 13)) >>> 0;
  s = (s ^ (s >>> 17)) >>> 0;
  s = (s ^ (s << 5)) >>> 0;
  state.prngState = s;
  return (s >>> 0) / 4294967296;
}

const TASK_TEMPLATES = [
  {
    type: 'contract',
    description: 'Review and sign supplier contracts',
    requiredCount: 2,
    deadlineTurns: 16,
    reward: 180
  },
  {
    type: 'report',
    description: 'Print executive financial reports',
    requiredCount: 2,
    deadlineTurns: 18,
    reward: 220
  },
  {
    type: 'compliance',
    description: 'Shred obsolete audit documents',
    requiredCount: 3,
    deadlineTurns: 15,
    reward: 160
  },
  {
    type: 'coffee_run',
    description: 'Brew double-shot roast for directors',
    requiredCount: 2,
    deadlineTurns: 12,
    reward: 140
  }
];

function spawnTask(state) {
  const templateIdx = Math.floor(nextRand(state) * TASK_TEMPLATES.length);
  const tpl = TASK_TEMPLATES[templateIdx];
  const task = {
    id: 'task_' + state.nextTaskId++,
    type: tpl.type,
    description: tpl.description,
    requiredCount: tpl.requiredCount,
    deadlineTurns: tpl.deadlineTurns,
    reward: tpl.reward
  };
  state.tasks.push(task);
}

function createState(seed = 12345) {
  const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
  const state = {
    seed: s,
    prngState: s,
    turns: 0,
    maxTurns: 120,
    energy: 90,
    stress: 15,
    performance: 75,
    salary: 350,
    jobTitle: 'Junior Clerk',
    items: {
      coffeeBeans: 4,
      paperReams: 5,
      reportsPrinted: 0,
      contractsSigned: 0,
      shreddedMemos: 0
    },
    tasks: [],
    nextTaskId: 1,
    tasksCompleted: 0,
    tasksFailed: 0,
    victory: false,
    defeat: false,
    gameMessage: 'Shift commenced at Megacorp HQ. Check your pending office tickets!'
  };

  // Generate initial office workload
  spawnTask(state);
  spawnTask(state);

  return state;
}

function isOver(state) {
  return Boolean(state.victory || state.defeat || state.turns >= state.maxTurns);
}

function score(state) {
  let val = state.salary;
  val += state.tasksCompleted * 150;
  val += state.performance * 10;
  val -= state.stress * 5;
  val -= state.tasksFailed * 100;
  if (state.jobTitle === 'Account Specialist') val += 500;
  if (state.jobTitle === 'Senior Manager') val += 1200;
  if (state.jobTitle === 'Vice President') val += 2500;
  if (state.victory) val += 3000;
  return Math.max(0, Math.floor(val));
}

function canPromote(state) {
  if (state.jobTitle === 'Junior Clerk') {
    return state.tasksCompleted >= 4 && state.salary >= 650 && state.performance >= 75;
  }
  if (state.jobTitle === 'Account Specialist') {
    return state.tasksCompleted >= 8 && state.salary >= 1400 && state.performance >= 80;
  }
  if (state.jobTitle === 'Senior Manager') {
    return state.tasksCompleted >= 12 && state.salary >= 2400 && state.performance >= 85;
  }
  return false;
}

function legalActions(state) {
  if (isOver(state)) return [];

  const actions = [];

  // Workstation operations
  if (state.energy >= 10) {
    actions.push('action:stamp_contracts');
  }
  if (state.energy >= 12 && state.items.paperReams >= 1) {
    actions.push('action:print_reports');
  }
  if (state.energy >= 8) {
    actions.push('action:shred_documents');
  }
  if (state.items.coffeeBeans >= 1) {
    actions.push('action:brew_coffee');
  }
  if (state.salary >= 25 && state.energy >= 10) {
    actions.push('action:restock_supplies');
  }
  if (state.energy < 75) {
    actions.push('action:take_power_nap');
  }

  // Water cooler break is always accessible as long as game is active
  actions.push('action:water_cooler_chat');

  // Task deliveries
  for (const t of state.tasks) {
    if (t.type === 'contract' && state.items.contractsSigned >= t.requiredCount) {
      actions.push('action:deliver_task:' + t.id);
    } else if (t.type === 'report' && state.items.reportsPrinted >= t.requiredCount) {
      actions.push('action:deliver_task:' + t.id);
    } else if (t.type === 'compliance' && state.items.shreddedMemos >= t.requiredCount) {
      actions.push('action:deliver_task:' + t.id);
    } else if (t.type === 'coffee_run' && state.items.coffeeBeans >= t.requiredCount && state.energy >= 10) {
      actions.push('action:deliver_task:' + t.id);
    }
  }

  // Promotion review
  if (canPromote(state)) {
    actions.push('action:ask_for_promotion');
  }

  return actions;
}

function step(state, action) {
  if (isOver(state)) {
    return { reward: 0, done: true };
  }

  const validActions = legalActions(state);
  if (!validActions.includes(action)) {
    throw new Error('Illegal action "' + action + '" in current workplace state');
  }

  const oldScore = score(state);

  if (action === 'action:stamp_contracts') {
    state.energy = Math.max(0, state.energy - 10);
    state.stress = Math.min(100, state.stress + 4);
    state.items.contractsSigned += 1;
    state.gameMessage = 'Stamped and signed supplier agreements.';
  } else if (action === 'action:print_reports') {
    state.items.paperReams = Math.max(0, state.items.paperReams - 1);
    state.energy = Math.max(0, state.energy - 12);
    state.stress = Math.min(100, state.stress + 3);
    state.items.reportsPrinted += 1;
    state.gameMessage = 'Collated and printed executive dossiers.';
  } else if (action === 'action:shred_documents') {
    state.energy = Math.max(0, state.energy - 8);
    state.stress = Math.max(0, state.stress - 4);
    state.items.shreddedMemos += 2;
    state.gameMessage = 'Fed confidential memos through the cross-cut shredder.';
  } else if (action === 'action:brew_coffee') {
    state.items.coffeeBeans = Math.max(0, state.items.coffeeBeans - 1);
    state.energy = Math.min(100, state.energy + 28);
    state.stress = Math.max(0, state.stress - 8);
    state.gameMessage = 'Brewed rich dark roast espresso! Energy rejuvenated.';
  } else if (action === 'action:water_cooler_chat') {
    state.energy = Math.min(100, state.energy + 10);
    state.stress = Math.max(0, state.stress - 22);
    state.gameMessage = 'Chatted around water dispenser about weekend plans. Stress relieved.';
  } else if (action === 'action:restock_supplies') {
    state.salary = Math.max(0, state.salary - 25);
    state.energy = Math.max(0, state.energy - 10);
    state.items.paperReams += 4;
    state.items.coffeeBeans += 3;
    state.gameMessage = 'Ordered fresh paper reams and artisan coffee beans from supply room.';
  } else if (action === 'action:take_power_nap') {
    state.energy = Math.min(100, state.energy + 40);
    state.stress = Math.max(0, state.stress - 15);
    state.gameMessage = 'Took a discreet power nap under the swivel desk.';
  } else if (action.startsWith('action:deliver_task:')) {
    const taskId = action.split(':')[2];
    const taskIdx = state.tasks.findIndex(t => t.id === taskId);
    if (taskIdx >= 0) {
      const task = state.tasks[taskIdx];
      if (task.type === 'contract') {
        state.items.contractsSigned = Math.max(0, state.items.contractsSigned - task.requiredCount);
      } else if (task.type === 'report') {
        state.items.reportsPrinted = Math.max(0, state.items.reportsPrinted - task.requiredCount);
      } else if (task.type === 'compliance') {
        state.items.shreddedMemos = Math.max(0, state.items.shreddedMemos - task.requiredCount);
      } else if (task.type === 'coffee_run') {
        state.items.coffeeBeans = Math.max(0, state.items.coffeeBeans - task.requiredCount);
        state.energy = Math.max(0, state.energy - 10);
      }

      state.salary += task.reward;
      state.performance = Math.min(100, state.performance + 10);
      state.stress = Math.max(0, state.stress - 10);
      state.tasksCompleted += 1;
      state.tasks.splice(taskIdx, 1);
      state.gameMessage = 'Delivered "' + task.description + '"! Earned $' + task.reward + ' bonus.';
    }
  } else if (action === 'action:ask_for_promotion') {
    if (state.jobTitle === 'Junior Clerk') {
      state.jobTitle = 'Account Specialist';
      state.salary += 200;
      state.performance = Math.min(100, state.performance + 5);
      state.gameMessage = 'Promoted to Account Specialist! Received bonus and salary elevation.';
    } else if (state.jobTitle === 'Account Specialist') {
      state.jobTitle = 'Senior Manager';
      state.salary += 400;
      state.performance = Math.min(100, state.performance + 5);
      state.gameMessage = 'Promoted to Senior Manager! You now oversee key office operations.';
    } else if (state.jobTitle === 'Senior Manager') {
      state.jobTitle = 'Vice President';
      state.salary += 800;
      state.victory = true;
      state.gameMessage = 'Victory! Crowned Vice President of Megacorp! The executive suite is yours.';
    }
  }

  // Turn advance & task deadline clock
  state.turns += 1;

  for (let i = state.tasks.length - 1; i >= 0; i--) {
    state.tasks[i].deadlineTurns -= 1;
    if (state.tasks[i].deadlineTurns <= 0) {
      state.tasksFailed += 1;
      state.performance = Math.max(0, state.performance - 15);
      state.stress = Math.min(100, state.stress + 12);
      state.gameMessage = 'Deadline missed for ticket: "' + state.tasks[i].description + '"! Management is upset.';
      state.tasks.splice(i, 1);
    }
  }

  // Task generation
  if (state.tasks.length < 3 && nextRand(state) < 0.55) {
    spawnTask(state);
  }
  if (state.tasks.length === 0) {
    spawnTask(state);
  }

  // Check loss conditions
  if (state.stress >= 100) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Acute burnout syndrome! You collapsed during the department meeting.';
  } else if (state.performance <= 0) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Terminated for performance deficiency. Your keycard has been deactivated.';
  } else if (state.tasksFailed >= 5) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Dismissed after failing 5 critical executive deadlines.';
  } else if (state.turns >= state.maxTurns) {
    if (state.salary >= 2500 && state.performance >= 80) {
      state.victory = true;
      state.gameMessage = 'Victory: Fiscal fiscal cycle completed with outstanding executive honors!';
    } else {
      state.gameMessage = 'Fiscal year ended. Shift concluded with standard performance.';
    }
  }

  const newScore = score(state);
  const reward = newScore - oldScore;
  const done = isOver(state);

  return { reward, done };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score
  };
}
