// Pure deterministic simulation logic for 0100-god-game (Divine Dominion)

const MAX_TURNS = 25;
const ROWS = 5;
const COLS = 5;

const MIRACLE_COSTS = {
  rain: 15,
  lightning: 25,
  raise_land: 20,
  inspire: 35,
  crusade: 40
};

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

  const grid = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      let type = 'plains';
      if ((r === 0 && c === 2) || (r === 4 && c === 2)) type = 'desert';
      else if ((r === 2 && c === 0) || (r === 2 && c === 4)) type = 'water';
      else if ((r === 0 && c === 0) || (r === 4 && c === 4)) type = 'mountain';
      else if ((r === 1 && c === 1) || (r === 3 && c === 3)) type = 'fertile';
      row.push({ type, sanctified: (r === 1 && c === 1) });
    }
    grid.push(row);
  }

  return {
    seed: numSeed,
    rngStep: 0,
    turn: 1,
    maxTurns: MAX_TURNS,
    mana: 60,
    maxMana: 160,
    faith: 40,
    grid,
    settlements: [
      { id: 'holy_temple', name: 'Temple of Light', r: 1, c: 1, owner: 'player', pop: 22, maxPop: 60, level: 1, food: 35, crusaders: 0 },
      { id: 'shadow_shrine', name: 'Shadow Shrine', r: 3, c: 3, owner: 'rival', pop: 25, maxPop: 60, level: 1, hp: 100, maxHp: 100, food: 30, cultists: 0 },
      { id: 'village_east', name: 'Eastern Vale', r: 1, c: 3, owner: 'neutral', pop: 14, maxPop: 35, level: 0, food: 20, crusaders: 0 },
      { id: 'village_south', name: 'Southern Glen', r: 3, c: 1, owner: 'neutral', pop: 14, maxPop: 35, level: 0, food: 20, crusaders: 0 }
    ],
    history: ['The heavens awaken. Mortals gather at the Temple of Light seeking divine guidance.'],
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

function legalActions(state) {
  if (state.done) return [];
  const actions = [];
  const mana = state.mana;

  // 1. Miracle: Rain (Bless parched/plains tiles to fertile)
  if (mana >= MIRACLE_COSTS.rain) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = state.grid[r][c];
        if (tile.type === 'desert' || tile.type === 'plains') {
          actions.push(`miracle_rain:${r},${c}`);
        }
      }
    }
  }

  // 2. Miracle: Lightning (Smite Shadow Shrine or convert neutral village)
  if (mana >= MIRACLE_COSTS.lightning) {
    // Can strike any settlement
    state.settlements.forEach(s => {
      actions.push(`miracle_lightning:${s.r},${s.c}`);
    });
  }

  // 3. Miracle: Raise Land (Raise water to plains or plains to mountain)
  if (mana >= MIRACLE_COSTS.raise_land) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = state.grid[r][c];
        if (tile.type === 'water' || tile.type === 'plains') {
          actions.push(`miracle_raise_land:${r},${c}`);
        }
      }
    }
  }

  // 4. Miracle: Inspire Temple (Upgrade player settlement)
  if (mana >= MIRACLE_COSTS.inspire) {
    state.settlements.filter(s => s.owner === 'player' && s.level < 3).forEach(s => {
      actions.push(`miracle_inspire:${s.id}`);
    });
  }

  // 5. Miracle: Holy Crusade (Rally crusaders from player settlement)
  if (mana >= MIRACLE_COSTS.crusade) {
    state.settlements.filter(s => s.owner === 'player' && s.pop >= 10).forEach(s => {
      actions.push(`miracle_crusade:${s.id}`);
    });
  }

  // Always can step celestial clock
  actions.push('wait');

  return actions;
}

function runMortalLifeCycle(state) {
  // Process settlements
  state.settlements.forEach(s => {
    if (s.pop <= 0) return;

    if (s.owner === 'player') {
      // Food generation from adjacent fertile tiles
      let fertileCount = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = s.r + dr;
          const nc = s.c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
            if (state.grid[nr][nc].type === 'fertile') fertileCount += 1;
          }
        }
      }

      const foodYield = 6 + fertileCount * 5;
      s.food += foodYield;

      // Population growth
      if (s.food >= s.pop && s.pop < s.maxPop) {
        const growth = Math.floor(1 + (s.food - s.pop) * 0.15);
        s.pop = Math.min(s.maxPop, s.pop + growth);
        s.food -= s.pop;
      }

      // Generate Mana & Faith
      const prayerMana = Math.floor(s.pop * 0.6) + s.level * 6;
      state.mana = Math.min(state.maxMana, state.mana + prayerMana);
      state.faith += Math.floor(s.pop * 0.4) + s.level * 4;
    } else if (s.owner === 'rival') {
      // Rival cultist generation
      s.food += 10;
      if (s.pop < s.maxPop) s.pop += 2;
    }
  });

  // Resolve active player crusades
  const playerSettlements = state.settlements.filter(s => s.owner === 'player');
  const totalCrusaders = playerSettlements.reduce((acc, s) => acc + (s.crusaders || 0), 0);

  const shrine = state.settlements.find(s => s.id === 'shadow_shrine');
  if (totalCrusaders > 0 && shrine && shrine.hp > 0) {
    const totalDmg = totalCrusaders * 7;
    shrine.hp = Math.max(0, shrine.hp - totalDmg);
    shrine.pop = Math.max(0, shrine.pop - totalCrusaders);
    state.history.push(`Holy Crusaders charged the Shadow Shrine, dealing -${totalDmg} HP and clearing cultists!`);

    // Reset crusaders once battle resolves
    playerSettlements.forEach(s => { s.crusaders = 0; });
  }

  // Rival Dark Deity AI turn
  if (shrine && shrine.hp > 0) {
    const roll = getRngValue(state);
    const holyTemple = state.settlements.find(s => s.id === 'holy_temple');

    if (roll < 0.4 && holyTemple && holyTemple.pop > 5) {
      // Dark Curse / Plague
      const plagueCasualties = 3;
      holyTemple.pop = Math.max(1, holyTemple.pop - plagueCasualties);
      state.history.push(`A Shadow Curse descended upon the Temple of Light (-${plagueCasualties} worshippers).`);
    } else if (roll < 0.7) {
      // Cultists repair shrine
      shrine.hp = Math.min(shrine.maxHp, shrine.hp + 12);
      state.history.push(`Heretic cultists fortified the Shadow Shrine (+12 HP).`);
    }
  }

  // Mountain resonance mana
  let mountainCount = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (state.grid[r][c].type === 'mountain') mountainCount += 1;
    }
  }
  state.mana = Math.min(state.maxMana, state.mana + mountainCount * 2);
}

function evaluateGameOutcome(state) {
  const shrine = state.settlements.find(s => s.id === 'shadow_shrine');
  const holyTemple = state.settlements.find(s => s.id === 'holy_temple');

  // Victory 1: Shadow Shrine Destroyed
  if (shrine && (shrine.hp <= 0 || shrine.pop <= 0)) {
    state.done = true;
    state.winner = 'player';
    state.result = 'shadow_destroyed';
    state.history.push('DIVINE APOTHEOSIS! The Shadow Shrine has collapsed and darkness is vanquished.');
    return;
  }

  // Victory 2: Transcendence via 250+ Faith & Level 3 Temple
  if (holyTemple && holyTemple.level >= 3 && state.faith >= 250) {
    state.done = true;
    state.winner = 'player';
    state.result = 'celestial_transcendence';
    state.history.push('TRANSCENDENCE ACHIEVED! The Golden Pantheon shines eternally across the cosmos.');
    return;
  }

  // Defeat: Holy temple population destroyed
  if (!holyTemple || holyTemple.pop <= 0) {
    state.done = true;
    state.winner = 'rival';
    state.result = 'temple_fell';
    state.history.push('FORSAKEN! The faithful population has fallen into ruin.');
    return;
  }

  // Max turns reached
  if (state.turn >= state.maxTurns) {
    state.done = true;
    const playerPop = state.settlements.filter(s => s.owner === 'player').reduce((acc, s) => acc + s.pop, 0);
    const rivalPop = shrine ? shrine.pop : 0;

    if (playerPop > rivalPop && state.faith >= 150) {
      state.winner = 'player';
      state.result = 'divine_supremacy';
      state.history.push('DIVINE SUPREMACY! Light reigns supreme over the realm.');
    } else {
      state.winner = 'rival';
      state.result = 'age_of_shadow';
      state.history.push('AGE OF SHADOW! The world plunged into darkness as faith waned.');
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

  if (action.startsWith('miracle_rain:')) {
    const coords = action.split(':')[1].split(',').map(Number);
    const r = coords[0];
    const c = coords[1];

    state.mana -= MIRACLE_COSTS.rain;
    state.grid[r][c].type = 'fertile';
    state.grid[r][c].sanctified = true;

    // Grant food bonus to nearby player settlement
    const playerSettlement = state.settlements.find(s => s.owner === 'player');
    if (playerSettlement) playerSettlement.food += 15;

    reward += 5;
    state.history.push(`Divine rain blessed (${r}, ${c}), transforming the earth into fertile farmland.`);
  } else if (action.startsWith('miracle_lightning:')) {
    const coords = action.split(':')[1].split(',').map(Number);
    const r = coords[0];
    const c = coords[1];

    state.mana -= MIRACLE_COSTS.lightning;
    const target = state.settlements.find(s => s.r === r && s.c === c);

    if (target) {
      if (target.owner === 'rival') {
        const smiteDmg = 35;
        target.hp = Math.max(0, target.hp - smiteDmg);
        target.pop = Math.max(0, target.pop - 6);
        reward += 15;
        state.history.push(`Holy lightning struck the Shadow Shrine for -${smiteDmg} HP!`);
      } else if (target.owner === 'neutral') {
        target.owner = 'player';
        reward += 20;
        state.history.push(`Awed by divine lightning, ${target.name} converted to the faith!`);
      }
    }
  } else if (action.startsWith('miracle_raise_land:')) {
    const coords = action.split(':')[1].split(',').map(Number);
    const r = coords[0];
    const c = coords[1];

    state.mana -= MIRACLE_COSTS.raise_land;
    const tile = state.grid[r][c];

    if (tile.type === 'water') {
      tile.type = 'plains';
      state.history.push(`Divine will raised the seabed at (${r}, ${c}) into coastal plains.`);
    } else {
      tile.type = 'mountain';
      state.history.push(`A sacred mountain was uplifted at (${r}, ${c}), resonating with celestial mana.`);
    }
    reward += 6;
  } else if (action.startsWith('miracle_inspire:')) {
    const sid = action.split(':')[1];
    state.mana -= MIRACLE_COSTS.inspire;
    const s = state.settlements.find(st => st.id === sid);
    s.level += 1;
    s.maxPop += 20;
    reward += 25;
    state.history.push(`Divine inspiration consecrated ${s.name} into Tier ${s.level} Pantheon!`);
  } else if (action.startsWith('miracle_crusade:')) {
    const sid = action.split(':')[1];
    state.mana -= MIRACLE_COSTS.crusade;
    const s = state.settlements.find(st => st.id === sid);
    const soldiers = Math.min(10, Math.floor(s.pop * 0.4));
    s.pop -= soldiers;
    s.crusaders = (s.crusaders || 0) + soldiers;
    reward += 15;
    state.history.push(`${soldiers} crusaders took up holy arms to cleanse the Shadow Shrine!`);
  } else if (action === 'wait') {
    reward += 1;
  }

  // Advance celestial day
  runMortalLifeCycle(state);
  state.turn += 1;

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
  const playerPop = state.settlements.filter(s => s.owner === 'player').reduce((acc, s) => acc + s.pop, 0);
  const shrine = state.settlements.find(s => s.id === 'shadow_shrine');
  const damageDealt = shrine ? (100 - shrine.hp) : 100;

  let total = playerPop * 4 + state.faith * 2 + damageDealt * 3;
  if (state.winner === 'player') total += 150;
  return total;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    MIRACLE_COSTS
  };
}
