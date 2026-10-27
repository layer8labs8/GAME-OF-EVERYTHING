// 0157-mining: Subterranean Core - Pure Bot Contract Logic
// Deterministic, zero DOM, pure state machine.

function nextRand(state) {
  let s = (state.prngState ^ (state.prngState << 13)) >>> 0;
  s = (s ^ (s >>> 17)) >>> 0;
  s = (s ^ (s << 5)) >>> 0;
  state.prngState = s;
  return (s >>> 0) / 4294967296;
}

function cargoWeight(state) {
  const c = state.cargo;
  return c.coal + c.copper + c.iron + c.gold + c.diamonds;
}

function createState(seed = 12345) {
  const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
  const state = {
    seed: s,
    prngState: s,
    turns: 0,
    maxTurns: 120,
    depth: 0,
    drillDurability: 100,
    fuel: 80,
    shaftIntegrity: 100,
    cash: 250,
    cargoCapacity: 6,
    drillTier: 1,
    cargo: {
      coal: 0,
      copper: 0,
      iron: 0,
      gold: 0,
      diamonds: 0
    },
    diamondsRecovered: 0,
    totalOreSold: 0,
    victory: false,
    defeat: false,
    gameMessage: 'Mining rig assembled at shaft collar. Ready to drill downward into the crust.'
  };

  return state;
}

function isOver(state) {
  return Boolean(state.victory || state.defeat || state.turns >= state.maxTurns);
}

function score(state) {
  let val = state.cash;
  val += state.diamondsRecovered * 400;
  val += state.totalOreSold * 60;
  val += state.depth * 4;
  val += state.drillTier * 200;
  val += state.shaftIntegrity * 5;
  if (state.victory) val += 3000;
  return Math.max(0, Math.floor(val));
}

function legalActions(state) {
  if (isOver(state)) return [];

  const actions = [];
  const currentWeight = cargoWeight(state);

  // Surface exclusive operations
  if (state.depth === 0) {
    actions.push('action:hand_panning_scrape');

    if (state.cash >= 60 && (state.fuel < 100 || state.drillDurability < 100)) {
      actions.push('action:refuel_and_repair');
    }
    if (state.cash >= 200 && state.drillTier < 4) {
      actions.push('action:upgrade_drill_bit');
    }
    if (state.cash >= 120 && state.cargoCapacity < 20) {
      actions.push('action:expand_cargo_hopper');
    }
  }

  // Underground exclusive operations
  if (state.depth > 0) {
    if (state.fuel >= 8) {
      actions.push('action:surface_haul_and_sell');
    } else {
      actions.push('action:emergency_winch_to_surface');
    }
  }

  // Drilling and extraction
  if (state.fuel >= 10 && state.drillDurability >= 10 && currentWeight < state.cargoCapacity) {
    actions.push('action:drill_downward');
  }

  if (state.depth > 0 && state.fuel >= 12 && state.drillDurability >= 10 && currentWeight < state.cargoCapacity) {
    actions.push('action:extract_rich_vein');
  }

  // Shaft structural maintenance
  if (state.cash >= 45 && state.shaftIntegrity < 100) {
    actions.push('action:install_shaft_struts');
  }

  return actions;
}

function step(state, action) {
  if (isOver(state)) {
    return { reward: 0, done: true };
  }

  const validActions = legalActions(state);
  if (!validActions.includes(action)) {
    throw new Error('Illegal mining action "' + action + '" in current subterranean state');
  }

  const oldScore = score(state);

  if (action === 'action:hand_panning_scrape') {
    state.cash += 30;
    state.fuel = Math.min(100, state.fuel + 15);
    state.gameMessage = 'Panned river gravels manually for surface nuggets. +$30 Cash, +15 Fuel.';
  } else if (action === 'action:emergency_winch_to_surface') {
    state.depth = 0;
    for (const k of Object.keys(state.cargo)) {
      state.cargo[k] = Math.floor(state.cargo[k] / 2);
    }
    state.gameMessage = 'Emergency winch pulled rig back to surface! Half cargo sacrificed.';
  } else if (action === 'action:refuel_and_repair') {
    state.cash -= 60;
    state.fuel = Math.min(100, state.fuel + 45);
    state.drillDurability = Math.min(100, state.drillDurability + 40);
    state.gameMessage = 'Refueled diesel reservoir and sharpened cutting head bits.';
  } else if (action === 'action:upgrade_drill_bit') {
    state.cash -= 200;
    state.drillTier += 1;
    state.gameMessage = 'Upgraded cutting head to Tier ' + state.drillTier + ' industrial hardness!';
  } else if (action === 'action:expand_cargo_hopper') {
    state.cash -= 120;
    state.cargoCapacity += 4;
    state.gameMessage = 'Expanded ore cart hopper capacity to ' + state.cargoCapacity + ' tons.';
  } else if (action === 'action:install_shaft_struts') {
    state.cash -= 45;
    state.shaftIntegrity = Math.min(100, state.shaftIntegrity + 35);
    state.gameMessage = 'Bolstered shaft walls with steel braces. Integrity restored to ' + state.shaftIntegrity + '%.';
  } else if (action === 'action:drill_downward') {
    state.fuel = Math.max(0, state.fuel - 10);
    state.depth += 25;
    const wear = Math.max(3, 12 - state.drillTier * 2);
    state.drillDurability = Math.max(0, state.drillDurability - wear);
    state.shaftIntegrity = Math.max(0, state.shaftIntegrity - 4);

    if (state.depth < 50) {
      state.cargo.coal += 1;
    } else if (state.depth < 150) {
      state.cargo.iron += 1;
    } else if (state.depth < 300) {
      state.cargo.gold += 1;
    } else {
      state.cargo.diamonds += 1;
      state.diamondsRecovered += 1;
    }
    state.gameMessage = 'Bored deeper into strata! Current depth: ' + state.depth + 'm.';
  } else if (action === 'action:extract_rich_vein') {
    state.fuel = Math.max(0, state.fuel - 12);
    state.drillDurability = Math.max(0, state.drillDurability - 8);

    if (state.depth < 50) {
      state.cargo.coal += 2;
    } else if (state.depth < 150) {
      state.cargo.iron += 2;
    } else if (state.depth < 300) {
      state.cargo.gold += 2;
    } else {
      state.cargo.diamonds += 2;
      state.diamondsRecovered += 2;
    }
    state.gameMessage = 'Blasted concentrated mineral vein pocket at ' + state.depth + 'm depth!';
  } else if (action === 'action:surface_haul_and_sell') {
    state.fuel = Math.max(0, state.fuel - 8);
    const c = state.cargo;
    const totalSale = c.coal * 25 + c.copper * 45 + c.iron * 85 + c.gold * 175 + c.diamonds * 380;
    const totalTons = c.coal + c.copper + c.iron + c.gold + c.diamonds;

    state.cash += totalSale;
    state.totalOreSold += totalTons;
    state.cargo = { coal: 0, copper: 0, iron: 0, gold: 0, diamonds: 0 };
    state.depth = 0;
    state.gameMessage = 'Elevator surfaced! Smelted ' + totalTons + ' tons of ore for $' + totalSale + ' cash.';
  }

  // Turn advance & Seismic hazard check
  state.turns += 1;

  if (state.depth > 0) {
    const tremor = nextRand(state);
    if (tremor < 0.18) {
      state.shaftIntegrity = Math.max(0, state.shaftIntegrity - 12);
      state.gameMessage += ' (Warning: Seismic tremor rattled tunnel! -12 Integrity.)';
    }
  }

  // Win / Loss evaluation
  if (state.depth >= 350 && state.diamondsRecovered >= 3 && state.cash >= 3500) {
    state.victory = true;
    state.gameMessage = 'Victory! Lithospheric Core penetrated! Ancient Diamond hoard excavated.';
  } else if (state.shaftIntegrity <= 0) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Catastrophic cave-in collapse! The shaft collapsed entirely.';
  } else if (state.drillDurability <= 0 && state.depth > 0) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Rotary cutting head shattered at depth! Equipment totaled.';
  } else if (state.fuel <= 0 && state.depth > 0) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Stranded deep underground with zero fuel power.';
  } else if (state.turns >= state.maxTurns) {
    if (state.diamondsRecovered >= 2 && state.cash >= 2500) {
      state.victory = true;
      state.gameMessage = 'Victory: Mining season concluded with monumental ore yields!';
    } else {
      state.gameMessage = 'Subterranean mining lease term concluded.';
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
    score,
    cargoWeight
  };
}
