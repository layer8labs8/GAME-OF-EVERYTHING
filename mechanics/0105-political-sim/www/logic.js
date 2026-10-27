// Pure deterministic simulation logic for 0105-political-sim (Statecraft)

const MAX_QUARTERS = 16;

const POLICIES = {
  healthcare: {
    id: 'healthcare',
    name: 'Universal Healthcare Program',
    cost: 110,
    labor: 15,
    capitalists: -5,
    patriots: 0,
    reformists: 10,
    stability: 5
  },
  tax_cut: {
    id: 'tax_cut',
    name: 'Corporate Tax & Deregulation Cut',
    cost: 130,
    labor: -8,
    capitalists: 22,
    patriots: 0,
    reformists: -6,
    stability: 2
  },
  defense: {
    id: 'defense',
    name: 'National Defense Modernization',
    cost: 140,
    labor: 0,
    capitalists: 5,
    patriots: 24,
    reformists: -8,
    stability: 10
  },
  education: {
    id: 'education',
    name: 'Public Education & Research Act',
    cost: 95,
    labor: 8,
    capitalists: 4,
    patriots: 0,
    reformists: 18,
    stability: 4
  },
  anti_corruption: {
    id: 'anti_corruption',
    name: 'Independent Anti-Corruption Commission',
    cost: 75,
    labor: 6,
    capitalists: -12,
    patriots: 4,
    reformists: 20,
    stability: 12
  },
  austerity: {
    id: 'austerity',
    name: 'Emergency Fiscal Austerity Measures',
    cost: -170, // Generates revenue
    labor: -18,
    capitalists: 8,
    patriots: -5,
    reformists: -15,
    stability: -10
  }
};

const CRISES = [
  {
    id: 'strike',
    quarter: 3,
    title: 'General Industrial Transit Strike',
    desc: 'Transportation unions have paralyzed national logistics demanding wage indexed increases.',
    choiceA: { name: 'Meet Wage Demands', cost: 100, labor: 15, capitalists: -10, stability: 5 },
    choiceB: { name: 'Enforce Back-to-Work Order', cost: 20, labor: -18, capitalists: 12, stability: -6 }
  },
  {
    id: 'border',
    quarter: 7,
    title: 'Regional Border Infiltration Crisis',
    desc: 'Armed foreign smugglers and border skirmishes have inflamed the frontier provinces.',
    choiceA: { name: 'Deploy Rapid Border Patrol', cost: 120, labor: 0, patriots: 18, stability: 10 },
    choiceB: { name: 'Convene Regional Summit', cost: 30, labor: 0, reformists: 14, patriots: -10, stability: 2 }
  },
  {
    id: 'inflation',
    quarter: 11,
    title: 'Consumer Price Inflation Spike',
    desc: 'Essential staple goods and fuel prices have surged 15% across metropolitan zones.',
    choiceA: { name: 'Subsidize Essential Groceries', cost: 110, labor: 14, capitalists: -6, stability: 6 },
    choiceB: { name: 'Raise Central Bank Interest', cost: 0, labor: -10, capitalists: 14, stability: -4 }
  },
  {
    id: 'scandal',
    quarter: 15,
    title: 'High-Level Cabinet Procurement Scandal',
    desc: 'Investigative journalists uncovered kickbacks in naval defense contracts.',
    choiceA: { name: 'Dismiss Minister & Open Inquest', cost: 40, labor: 8, reformists: 16, capitalists: -8, stability: 8 },
    choiceB: { name: 'Shield Cabinet & Censure Press', cost: 10, labor: -15, reformists: -20, patriots: 8, stability: -12 }
  }
];

function createRng(seed) {
  let s = (Math.imul(seed ^ 0x6d2b79f5, 1) + 1) >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createState(seed = 12345) {
  const numSeed = typeof seed === 'number' ? seed : 12345;

  return {
    seed: numSeed,
    rngStep: 0,
    quarter: 1,
    maxQuarters: MAX_QUARTERS,
    treasury: 420,
    taxRevenue: 280,
    stability: 65,
    factions: {
      labor: 55,
      capitalists: 55,
      patriots: 55,
      reformists: 55
    },
    activePolicies: ['education'],
    activeCrisis: null,
    electionsWon: 0,
    history: ['Inauguration Day: Sworn in as Head of State. Mandate for stable governance affirmed.'],
    winner: null,
    result: null,
    done: false
  };
}

function getRngValue(state) {
  state.rngStep = (state.rngStep + 1) | 0;
  const rng = createRng(state.seed + state.rngStep);
  return rng();
}

function getApproval(state) {
  const f = state.factions;
  return Math.round((f.labor + f.capitalists + f.patriots + f.reformists) / 4);
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function legalActions(state) {
  if (state.done) return [];
  const actions = [];

  // If crisis is pending, resolving it takes priority
  if (state.activeCrisis) {
    actions.push('resolve_crisis:A');
    actions.push('resolve_crisis:B');
    return actions;
  }

  // 1. Enact inactive policies
  for (const pid in POLICIES) {
    if (!state.activePolicies.includes(pid)) {
      actions.push(`enact:${pid}`);
    } else {
      actions.push(`repeal:${pid}`);
    }
  }

  // 2. Campaign speeches to key demographics ($50M cost)
  if (state.treasury >= 50) {
    for (const f of ['labor', 'capitalists', 'patriots', 'reformists']) {
      if (state.factions[f] < 90) {
        actions.push(`campaign:${f}`);
      }
    }
  }

  // 3. Advance fiscal quarter
  actions.push('advance_quarter');

  return actions;
}

function processQuarterlyFiscal(state) {
  // 1. Tax Revenue minus Active Policy Costs
  let policyOutflow = 0;
  state.activePolicies.forEach(pid => {
    policyOutflow += POLICIES[pid].cost;
  });

  const netBalance = state.taxRevenue - policyOutflow;
  state.treasury += netBalance;
  state.history.push(`Quarterly Fiscal Balance: Tax receipts +$${state.taxRevenue}M, Policy costs -$${policyOutflow}M (Net: ${netBalance >= 0 ? '+' : ''}$${netBalance}M).`);

  // 2. Natural decay towards 50 for factions
  for (const f in state.factions) {
    if (state.factions[f] > 55) state.factions[f] -= 2;
    else if (state.factions[f] < 45) state.factions[f] += 2;
  }

  // 3. Check for National Crisis
  const nextQ = state.quarter + 1;
  const crisis = CRISES.find(c => c.quarter === nextQ);
  if (crisis) {
    state.activeCrisis = crisis.id;
    state.history.push(`CABINET EMERGENCY: ${crisis.title}! Executive decision demanded.`);
  }

  // 4. Check for General Election Day (Quarters 4, 8, 12, 16)
  if (state.quarter % 4 === 0) {
    const approval = getApproval(state);
    state.history.push(`GENERAL ELECTION DAY: Public Approval at ${approval}%.`);
    if (approval >= 50) {
      state.electionsWon += 1;
      state.stability = clamp(state.stability + 10, 0, 100);
      state.history.push(`VICTORY AT THE POLLS! Administration re-elected with ${approval}% democratic majority.`);
    } else {
      state.done = true;
      state.winner = 'opposition';
      state.result = 'election_defeat';
      state.history.push(`DEFEATED! Government ousted at the ballot box with only ${approval}% public support.`);
      return;
    }
  }
}

function evaluateGameOutcome(state) {
  const approval = getApproval(state);

  // Defeat 1: Impeachment / Vote of No Confidence
  if (approval < 25) {
    state.done = true;
    state.winner = 'parliament';
    state.result = 'impeached';
    state.history.push('VOTE OF NO CONFIDENCE! Administration impeached amid widespread civil revolt.');
    return;
  }

  // Defeat 2: Civil Collapse / Coup d'état
  if (state.stability <= 0) {
    state.done = true;
    state.winner = 'junta';
    state.result = 'coup';
    state.history.push('MILITARY COUP! National security forces dissolved civilian government following collapse of public order.');
    return;
  }

  // Defeat 3: Sovereign Bankruptcy
  if (state.treasury < -1500) {
    state.done = true;
    state.winner = 'creditors';
    state.result = 'bankruptcy';
    state.history.push('SOVEREIGN DEFAULT! National treasury insolvent and international receivership imposed.');
    return;
  }

  // Victory: Completed all 16 quarters with 4 successful election terms
  if (state.quarter >= state.maxQuarters && !state.done) {
    state.done = true;
    if (state.stability >= 60 && approval >= 55) {
      state.winner = 'player';
      state.result = 'golden_republic';
      state.history.push('GOLDEN ERA OF STATECRAFT! Transformed the nation into a prosperous, enduring republic.');
    } else {
      state.winner = 'player';
      state.result = 'survived_mandate';
      state.history.push('TENURE CONCLUDED: Survived full constitutional terms with constitutional continuity intact.');
    }
  }
}

function step(state, action) {
  if (state.done) {
    throw new Error('Game is already over');
  }

  const valid = legalActions(state);
  if (!valid.includes(action)) {
    throw new Error(`Illegal action: ${action}`);
  }

  let reward = 0;

  if (action.startsWith('enact:')) {
    const pid = action.split(':')[1];
    const pol = POLICIES[pid];
    state.activePolicies.push(pid);

    state.factions.labor = clamp(state.factions.labor + pol.labor, 0, 100);
    state.factions.capitalists = clamp(state.factions.capitalists + pol.capitalists, 0, 100);
    state.factions.patriots = clamp(state.factions.patriots + pol.patriots, 0, 100);
    state.factions.reformists = clamp(state.factions.reformists + pol.reformists, 0, 100);
    state.stability = clamp(state.stability + pol.stability, 0, 100);

    reward += 10;
    state.history.push(`Enacted legislative policy: "${pol.name}".`);
  } else if (action.startsWith('repeal:')) {
    const pid = action.split(':')[1];
    const pol = POLICIES[pid];
    const idx = state.activePolicies.indexOf(pid);
    if (idx !== -1) state.activePolicies.splice(idx, 1);

    // Partial reversal
    state.factions.labor = clamp(state.factions.labor - Math.floor(pol.labor * 0.7), 0, 100);
    state.factions.capitalists = clamp(state.factions.capitalists - Math.floor(pol.capitalists * 0.7), 0, 100);
    state.factions.patriots = clamp(state.factions.patriots - Math.floor(pol.patriots * 0.7), 0, 100);
    state.factions.reformists = clamp(state.factions.reformists - Math.floor(pol.reformists * 0.7), 0, 100);

    reward += 5;
    state.history.push(`Repealed policy: "${pol.name}".`);
  } else if (action.startsWith('campaign:')) {
    const f = action.split(':')[1];
    state.treasury -= 50;
    state.factions[f] = clamp(state.factions[f] + 14, 0, 100);
    reward += 8;
    state.history.push(`Delivered major policy address to ${f.toUpperCase()} demographic (+14% faction trust).`);
  } else if (action.startsWith('resolve_crisis:')) {
    const choiceKey = action.split(':')[1];
    const crisis = CRISES.find(c => c.id === state.activeCrisis);
    const chosen = choiceKey === 'A' ? crisis.choiceA : crisis.choiceB;

    state.treasury -= chosen.cost;
    if (chosen.labor) state.factions.labor = clamp(state.factions.labor + chosen.labor, 0, 100);
    if (chosen.capitalists) state.factions.capitalists = clamp(state.factions.capitalists + chosen.capitalists, 0, 100);
    if (chosen.patriots) state.factions.patriots = clamp(state.factions.patriots + chosen.patriots, 0, 100);
    if (chosen.reformists) state.factions.reformists = clamp(state.factions.reformists + chosen.reformists, 0, 100);
    if (chosen.stability) state.stability = clamp(state.stability + chosen.stability, 0, 100);

    state.activeCrisis = null;
    reward += 15;
    state.history.push(`Crisis Resolved: Adopted policy "${chosen.name}".`);
  } else if (action === 'advance_quarter') {
    processQuarterlyFiscal(state);
    state.quarter += 1;
    reward += 10;
  }

  evaluateGameOutcome(state);

  if (state.done) {
    if (state.winner === 'player') reward += 100;
    else reward -= 50;
  }

  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  const approval = getApproval(state);
  const treasuryBonus = Math.max(0, Math.floor(state.treasury * 0.25));
  let total = approval * 6 + state.stability * 5 + state.electionsWon * 75 + treasuryBonus;
  if (state.winner === 'player') total += 150;
  return Math.max(0, total);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    getApproval,
    POLICIES,
    CRISES
  };
}
