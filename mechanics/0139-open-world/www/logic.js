/**
 * 0139-open-world: Wilds of Eldoria
 * Pure open-world exploration engine conforming strictly to the Bot Contract.
 * No browser globals, seedable PRNG, fully deterministic and serializable.
 */

const MAX_TURNS = 150;

const REGIONS = ['plateau', 'forest', 'canyon', 'peaks'];

const REGION_NAMES = {
  plateau: 'Highland Plateau',
  forest: 'Whispering Forest',
  canyon: 'Arid Canyon',
  peaks: 'Storm Peaks'
};

const REGIONAL_PATHS = {
  plateau: ['forest', 'canyon'],
  forest: ['plateau', 'peaks'],
  canyon: ['plateau', 'peaks'],
  peaks: ['forest', 'canyon']
};

const REGIONAL_SHRINES = {
  plateau: ['shrine_magnesis', 'shrine_bombs'],
  forest: ['shrine_cryonis', 'shrine_stasis'],
  canyon: ['shrine_flame', 'shrine_thunder'],
  peaks: ['shrine_blizzard', 'shrine_apex']
};

const WEAPONS = [
  { name: 'Tree Branch', atk: 5 },
  { name: 'Soldier Broadsword', atk: 14 },
  { name: 'Sunforged Blade', atk: 30 }
];

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
    region: 'plateau',
    hp: 100,
    maxHp: 100,
    stamina: 100,
    maxStamina: 100,
    spiritOrbs: 0,
    food: 2,
    meals: 1,
    hasColdElixir: false,
    towers: {
      plateau: true,
      forest: false,
      canyon: false,
      peaks: false
    },
    shrinesCleared: {},
    weaponTier: 0,
    boss: null,
    bossStunned: false,
    score: 10,
    done: false,
    victory: false,
    log: [
      'Awaken, champion of Eldoria.',
      'The realm is fractured under the tempest of Zephyros the Storm Sovereign.'
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
  state.log.push(line);
  if (state.log.length > 20) {
    state.log.shift();
  }
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];

  // In boss combat
  if (state.boss !== null) {
    actions.push('combat:strike');
    actions.push('combat:shoot_bow');
    actions.push('combat:parry');
    if (state.meals > 0 && state.hp < state.maxHp) {
      actions.push('combat:eat_meal');
    }
    actions.push('combat:flee');
    return actions;
  }

  // Travel to adjacent regions
  const neighbors = REGIONAL_PATHS[state.region] || [];
  for (let i = 0; i < neighbors.length; i++) {
    actions.push('travel:' + neighbors[i]);
  }

  // Fast travel to unlocked towers
  for (let i = 0; i < REGIONS.length; i++) {
    const r = REGIONS[i];
    if (state.towers[r] && r !== state.region) {
      actions.push('fast_travel:' + r);
    }
  }

  // Tower activation
  if (!state.towers[state.region]) {
    actions.push('action:activate_tower');
  }

  // Shrines in current region
  const shrines = REGIONAL_SHRINES[state.region] || [];
  for (let i = 0; i < shrines.length; i++) {
    const sId = shrines[i];
    if (!state.shrinesCleared[sId]) {
      actions.push('explore_shrine:' + sId);
    }
  }

  // Forage & Cooking
  actions.push('action:forage_gather');
  if (state.food >= 2) {
    actions.push('action:cook_meal');
  }
  if (state.region === 'canyon' && !state.hasColdElixir) {
    actions.push('action:brew_cold_elixir');
  }

  // Upgrades if spirit orbs available
  if (state.spiritOrbs >= 2) {
    actions.push('upgrade:health');
    actions.push('upgrade:stamina');
  }

  // Scavenge Soldier Broadsword in Canyon
  if (state.region === 'canyon' && state.weaponTier === 0) {
    actions.push('action:scavenge_weapon');
  }

  // Pull Sunforged Blade in Forest
  if (state.region === 'forest' && state.weaponTier < 2) {
    actions.push('action:draw_sunforged_blade');
  }

  // Challenge Boss in Peaks
  if (state.region === 'peaks') {
    actions.push('action:challenge_boss');
  }

  return actions;
}

function step(state, action) {
  if (state.done) {
    throw new Error('Adventure is already over.');
  }

  const legal = legalActions(state);
  if (!legal.includes(action)) {
    throw new Error(`Illegal action "${action}".`);
  }

  state.turns += 1;
  let reward = 0;

  // Travel & Fast Travel
  if (action.startsWith('travel:') || action.startsWith('fast_travel:')) {
    const dest = action.split(':')[1];
    state.region = dest;
    reward += 2;
    state.score += 5;
    addLog(state, `Traveled to ${REGION_NAMES[dest]}. The open horizon expands.`);

    // Freezing climate at Peaks without cold elixir
    if (dest === 'peaks' && !state.hasColdElixir) {
      state.hp = Math.max(1, state.hp - 15);
      addLog(state, 'Sub-zero mountain blizzard chills your core! (-15 HP without Cold Elixir).');
    }
  }

  // Tower Activation
  else if (action === 'action:activate_tower') {
    state.towers[state.region] = true;
    reward += 10;
    state.score += 25;
    addLog(state, `Tower of ${REGION_NAMES[state.region]} synchronized! Regional topography and fast travel unlocked.`);
  }

  // Explore Shrine
  else if (action.startsWith('explore_shrine:')) {
    const sId = action.split(':')[1];
    state.shrinesCleared[sId] = true;
    state.spiritOrbs += 1;
    reward += 15;
    state.score += 30;
    addLog(state, `Sheikah Trial conquered! Obtained Spirit Orb (${state.spiritOrbs} in possession).`);
  }

  // Forage & Cook
  else if (action === 'action:forage_gather') {
    state.food += 2;
    reward += 3;
    state.score += 5;
    addLog(state, `Foraged wild apples and sun-ripened herbs (+2 Food supplies).`);
  } else if (action === 'action:cook_meal') {
    state.food -= 2;
    state.meals += 1;
    reward += 5;
    state.score += 10;
    addLog(state, `Cooked a Hearty Simmered Feast over the campfire (+1 Restorative Meal).`);
  } else if (action === 'action:brew_cold_elixir') {
    state.hasColdElixir = true;
    reward += 8;
    state.score += 15;
    addLog(state, 'Brewed Warm Spiced Elixir! Gained permanent thermal resistance against mountain blizzards.');
  }

  // Upgrades
  else if (action === 'upgrade:health') {
    state.spiritOrbs -= 2;
    state.maxHp += 20;
    state.hp = state.maxHp;
    reward += 15;
    state.score += 30;
    addLog(state, `Prayed to the Goddess Statue: Maximum Health permanently expanded to ${state.maxHp} HP!`);
  } else if (action === 'upgrade:stamina') {
    state.spiritOrbs -= 2;
    state.maxStamina += 20;
    state.stamina = state.maxStamina;
    reward += 15;
    state.score += 30;
    addLog(state, `Prayed to the Goddess Statue: Maximum Stamina permanently expanded to ${state.maxStamina}!`);
  }

  // Scavenge Broadsword
  else if (action === 'action:scavenge_weapon') {
    state.weaponTier = 1;
    reward += 10;
    state.score += 20;
    addLog(state, 'Unearthed a Soldier Broadsword from the desert ruins (+14 Attack)!');
  }

  // Draw Sunforged Blade
  else if (action === 'action:draw_sunforged_blade') {
    if (state.maxHp >= 140) {
      state.weaponTier = 2;
      reward += 25;
      state.score += 50;
      addLog(state, 'DIVINE TRIAL OVERCOME! You drew the legendary Sunforged Blade from the pedestal (+30 Attack)!');
    } else {
      state.hp = Math.max(1, state.hp - 30);
      reward -= 5;
      addLog(state, `The divine pedestal burned your grasp (-30 HP). You need at least 140 Max HP to claim the blade.`);
    }
  }

  // Challenge Boss
  else if (action === 'action:challenge_boss') {
    state.boss = {
      name: 'Zephyros the Storm Sovereign',
      hp: 120,
      maxHp: 120,
      atk: 16
    };
    state.bossStunned = false;
    reward += 5;
    addLog(state, 'Zephyros the Storm Sovereign descends from the tempestuous storm clouds!');
  }

  // Combat Actions
  else if (action.startsWith('combat:')) {
    const boss = state.boss;
    const wpn = WEAPONS[state.weaponTier];

    if (action === 'combat:flee') {
      state.boss = null;
      state.region = 'plateau';
      reward -= 5;
      addLog(state, 'You deployed your glider and retreated safely back to the Highland Plateau.');
      return { reward, done: false };
    }

    if (action === 'combat:eat_meal') {
      state.meals -= 1;
      state.hp = Math.min(state.maxHp, state.hp + 40);
      reward += 4;
      addLog(state, 'Consumed hearty meal in battle, recovering 40 HP!');
    } else if (action === 'combat:strike') {
      const dmg = 10 + wpn.atk + (state.bossStunned ? 15 : 0);
      boss.hp -= dmg;
      reward += 5;
      addLog(state, `Struck Zephyros with ${wpn.name} for ${dmg} damage!`);
    } else if (action === 'combat:shoot_bow') {
      const bowDmg = 18 + (state.bossStunned ? 10 : 0);
      boss.hp -= bowDmg;
      reward += 5;
      addLog(state, `Fired a precision arrow into the storm core for ${bowDmg} damage!`);
    } else if (action === 'combat:parry') {
      state.bossStunned = true;
      reward += 8;
      addLog(state, 'Perfect Shield Parry! Deflected tempest gale and stunned the dragon!');
    }

    // Check boss defeated
    if (boss.hp <= 0) {
      state.victory = true;
      state.done = true;
      state.boss = null;
      reward += 100;
      state.score += 150;
      addLog(state, 'VICTORY OF ELDORIA! Zephyros has fallen! The eternal tempest clears into golden sunlight!');
      return { reward, done: true };
    }

    // Boss counter-attack if not stunned
    if (state.bossStunned && action !== 'combat:parry') {
      state.bossStunned = false;
      addLog(state, 'Zephyros recovered his aerial composure.');
    } else if (!state.bossStunned && action !== 'combat:parry') {
      state.hp -= boss.atk;
      addLog(state, `Zephyros blasted you with gale lightning, dealing ${boss.atk} damage!`);

      if (state.hp <= 0) {
        state.hp = 0;
        state.done = true;
        reward -= 50;
        addLog(state, 'Champion fallen... The storm consumed Eldoria.');
        return { reward, done: true };
      }
    }
  }

  // Turn bound check
  if (state.turns >= state.maxTurns) {
    state.done = true;
    addLog(state, 'The chronicle of Eldoria reached its timeframe bound.');
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
    REGIONS,
    REGIONAL_SHRINES,
    WEAPONS
  };
}
