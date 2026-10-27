/**
 * 0137-dating-sim: Starcross Academy
 * Pure dating sim engine conforming strictly to the Bot Contract.
 * No browser globals, seedable PRNG, fully deterministic and serializable.
 */

const MAX_TURNS = 150;
const MAX_DAYS = 14;

const HEROINES = ['aria', 'chloe', 'serena'];

const HEROINE_NAMES = {
  aria: 'Aria Vance',
  chloe: 'Chloe Rivera',
  serena: 'Serena Laurent'
};

function createPrng(seed) {
  let s = (seed >>> 0) || 123456789;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createState(seed = 1) {
  return {
    seed: seed >>> 0,
    prngState: seed >>> 0,
    turns: 0,
    maxTurns: MAX_TURNS,
    day: 1,
    timeOfDay: 0, // 0 = Morning, 1 = Afternoon
    maxDays: MAX_DAYS,
    intellect: 10,
    athletics: 10,
    charm: 10,
    stress: 0,
    allowance: 35,
    affection: {
      aria: 0,
      chloe: 0,
      serena: 0
    },
    datesCount: {
      aria: 0,
      chloe: 0,
      serena: 0
    },
    giftsGiven: {
      aria: 0,
      chloe: 0,
      serena: 0
    },
    cgUnlocked: [],
    score: 0,
    done: false,
    victory: false,
    dialogue: [
      'Welcome to your first semester at Starcross Academy.',
      'The Starlight Autumn Festival takes place in 14 days.'
    ]
  };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  return state.score;
}

function addLog(state, line) {
  state.dialogue.push(line);
  if (state.dialogue.length > 20) {
    state.dialogue.shift();
  }
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];

  // Festival Day (Day 14): Confession time!
  if (state.day >= MAX_DAYS) {
    for (let i = 0; i < HEROINES.length; i++) {
      actions.push('confess:' + HEROINES[i]);
    }
    actions.push('confess:solo');
    return actions;
  }

  // Regular Academic Days (Days 1 to 13)
  actions.push('activity:study');
  actions.push('activity:train');
  actions.push('activity:art');
  actions.push('activity:rest');

  for (let i = 0; i < HEROINES.length; i++) {
    const h = HEROINES[i];
    actions.push('talk:' + h);

    if (state.allowance >= 20) {
      actions.push('date:' + h);
    }
    if (state.allowance >= 25 && state.giftsGiven[h] < 3) {
      actions.push('gift:' + h);
    }
  }

  return actions;
}

function advanceTime(state) {
  state.timeOfDay += 1;
  if (state.timeOfDay >= 2) {
    state.timeOfDay = 0;
    state.day += 1;
    state.allowance += 15;
    if (state.day <= MAX_DAYS) {
      addLog(state, `Day ${state.day} begins. Allowance replenished (+15 Coins).`);
    }
  }
}

function step(state, action) {
  if (state.done) {
    throw new Error('Semester has already concluded.');
  }

  const legal = legalActions(state);
  if (!legal.includes(action)) {
    throw new Error(`Illegal action "${action}".`);
  }

  state.turns += 1;
  let reward = 0;

  // Activities
  if (action === 'activity:study') {
    state.intellect += 5;
    state.stress = Math.min(100, state.stress + 7);
    reward += 3;
    state.score += 10;
    addLog(state, `Studied advanced astrophysics in the campus library (+5 Intellect, +7 Stress).`);
    advanceTime(state);
  } else if (action === 'activity:train') {
    state.athletics += 5;
    state.stress = Math.min(100, state.stress + 7);
    reward += 3;
    state.score += 10;
    addLog(state, `Ran interval sprints across the athletics field (+5 Athletics, +7 Stress).`);
    advanceTime(state);
  } else if (action === 'activity:art') {
    state.charm += 5;
    state.stress = Math.min(100, state.stress + 7);
    reward += 3;
    state.score += 10;
    addLog(state, `Practiced aesthetic design and conversational eloquence (+5 Charm, +7 Stress).`);
    advanceTime(state);
  } else if (action === 'activity:rest') {
    const relieved = Math.min(state.stress, 25);
    state.stress -= relieved;
    reward += 2;
    state.score += 5;
    addLog(state, `Relaxed with aromatic tea in the botanical courtyard (-${relieved} Stress).`);
    advanceTime(state);
  }

  // Talk
  else if (action.startsWith('talk:')) {
    const heroine = action.split(':')[1];
    let boost = 4;
    if (heroine === 'aria') boost += Math.floor(state.intellect / 8);
    if (heroine === 'chloe') boost += Math.floor(state.athletics / 8);
    if (heroine === 'serena') boost += Math.floor(state.charm / 8);

    state.affection[heroine] = Math.min(100, state.affection[heroine] + boost);
    reward += 4;
    state.score += 15;

    if (heroine === 'aria') {
      addLog(state, `Discussed lunar trajectories with Aria. Her quiet eyes brighten (+${boost} Affection).`);
    } else if (heroine === 'chloe') {
      addLog(state, `Chatted with Chloe beside the lockers. She laughs warmly (+${boost} Affection).`);
    } else {
      addLog(state, `Complimented Serena on her cello cadence. She smiles gracefully (+${boost} Affection).`);
    }
    advanceTime(state);
  }

  // Date
  else if (action.startsWith('date:')) {
    const heroine = action.split(':')[1];
    state.allowance -= 20;
    state.datesCount[heroine] += 1;
    const boost = 16;
    state.affection[heroine] = Math.min(100, state.affection[heroine] + boost);
    reward += 10;
    state.score += 30;

    const cgId = `cg_${heroine}_date_${state.datesCount[heroine]}`;
    if (!state.cgUnlocked.includes(cgId)) {
      state.cgUnlocked.push(cgId);
    }

    if (heroine === 'aria') {
      addLog(state, `Planetarium Date: You shared the telescope view of Orion with Aria (+${boost} Affection)!`);
    } else if (heroine === 'chloe') {
      addLog(state, `Boardwalk Date: Shared fruit smoothies with Chloe after a seaside run (+${boost} Affection)!`);
    } else {
      addLog(state, `Rooftop Cafe Date: Serena performed an acoustic sonata just for you (+${boost} Affection)!`);
    }
    advanceTime(state);
  }

  // Gift
  else if (action.startsWith('gift:')) {
    const heroine = action.split(':')[1];
    state.allowance -= 25;
    state.giftsGiven[heroine] += 1;
    const boost = 20;
    state.affection[heroine] = Math.min(100, state.affection[heroine] + boost);
    reward += 12;
    state.score += 35;

    if (heroine === 'aria') {
      addLog(state, `Presented Aria with an antique Star Atlas. She blushes with genuine joy (+${boost} Affection)!`);
    } else if (heroine === 'chloe') {
      addLog(state, `Gifted Chloe pro-grade running wristbands. She hugs you happily (+${boost} Affection)!`);
    } else {
      addLog(state, `Gifted Serena vintage classical sheet music. Her eyes sparkle (+${boost} Affection)!`);
    }
    advanceTime(state);
  }

  // Confession at Autumn Festival
  else if (action.startsWith('confess:')) {
    const choice = action.split(':')[1];
    state.done = true;

    if (choice === 'solo') {
      state.victory = false;
      reward += 5;
      addLog(state, 'You enjoyed the Autumn Festival fireworks with peaceful solitude under the lantern lights.');
      return { reward, done: true };
    }

    const aff = state.affection[choice];
    const targetName = HEROINE_NAMES[choice];

    let statMet = false;
    if (choice === 'aria' && state.intellect >= 25) statMet = true;
    if (choice === 'chloe' && state.athletics >= 25) statMet = true;
    if (choice === 'serena' && state.charm >= 25) statMet = true;

    if (aff >= 70 && statMet) {
      state.victory = true;
      reward += 100;
      state.score += 150;
      addLog(state, `ROMANTIC TRIUMPH! Beneath the Starlight Clock Tower, ${targetName} takes your hand and confesses her love!`);
    } else {
      state.victory = false;
      reward -= 30;
      addLog(state, `${targetName} smiles softly: "You are a cherished friend, but my heart isn't ready for romance."`);
    }
    return { reward, done: true };
  }

  // Stress Collapse check
  if (state.stress >= 100) {
    state.stress = 40;
    state.day = Math.min(MAX_DAYS, state.day + 1);
    reward -= 15;
    addLog(state, 'Burnout! You collapsed from exhaustion and spent the day recovering in the infirmary.');
  }

  // Safety Turn limit
  if (state.turns >= state.maxTurns) {
    state.done = true;
    addLog(state, 'The academic semester concludes.');
  }

  return { reward, done: state.done };
}

// Module export for Node.js test runners & Bot checkers
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    MAX_TURNS,
    MAX_DAYS,
    HEROINES,
    HEROINE_NAMES
  };
}
