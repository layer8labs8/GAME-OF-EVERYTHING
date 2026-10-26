(function (root) {
  'use strict';

  const MAX_DAYS = 20;
  const MAX_STEPS = 200;
  const MAX_ENERGY = 100;

  const CROPS = {
    wheat: { seedCost: 5, sellPrice: 12, growthNeeded: 2 },
    carrot: { seedCost: 12, sellPrice: 30, growthNeeded: 4 },
    berry: { seedCost: 25, sellPrice: 70, growthNeeded: 6 },
  };

  function nextRandom(state) {
    state.rng = ((state.rng * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    return state.rng / 0x7fffffff;
  }

  function createState(seed = 12345) {
    let curRng = (seed >>> 0) || 1;
    function rand() {
      curRng = ((curRng * 1103515245 + 12345) & 0x7fffffff) >>> 0;
      return curRng / 0x7fffffff;
    }

    const grid = [];
    for (let i = 0; i < 9; i++) {
      const isWild = rand() < 0.55;
      grid.push({
        id: i,
        status: isWild ? 'wild' : 'tilled',
        crop: null,
        growth: 0,
        watered: false,
      });
    }

    return {
      grid,
      day: 1,
      stepCount: 0,
      energy: MAX_ENERGY,
      coins: 35,
      weather: 'sunny',
      inventory: { wheat: 0, carrot: 0, berry: 0 },
      seeds: { wheat: 3, carrot: 1, berry: 0 },
      stats: { totalHarvested: 0, totalEarned: 0 },
      rng: curRng,
    };
  }

  function isOver(state) {
    return state.day > MAX_DAYS || state.stepCount >= MAX_STEPS;
  }

  function legalActions(state) {
    if (isOver(state)) return [];

    const actions = [];
    const cropNames = ['wheat', 'carrot', 'berry'];

    for (let i = 0; i < state.grid.length; i++) {
      const p = state.grid[i];
      if (p.status === 'wild' && state.energy >= 5) {
        actions.push({ type: 'clear', plot: i });
      } else if (p.status === 'tilled') {
        for (let c = 0; c < cropNames.length; c++) {
          const crop = cropNames[c];
          if (state.seeds[crop] > 0 && state.energy >= 2) {
            actions.push({ type: 'plant', plot: i, crop });
          }
        }
      } else if (p.status === 'planted') {
        if (!p.watered && state.energy >= 3) {
          actions.push({ type: 'water', plot: i });
        }
      } else if (p.status === 'ripe' && state.energy >= 3) {
        actions.push({ type: 'harvest', plot: i });
      }
    }

    for (let c = 0; c < cropNames.length; c++) {
      const crop = cropNames[c];
      if (state.inventory[crop] > 0) {
        actions.push({ type: 'sell', crop });
      }
    }

    for (let c = 0; c < cropNames.length; c++) {
      const crop = cropNames[c];
      if (state.coins >= CROPS[crop].seedCost) {
        actions.push({ type: 'buy_seed', crop });
      }
    }

    actions.push({ type: 'rest' });
    return actions;
  }

  function step(state, action) {
    if (!action || typeof action.type !== 'string') {
      throw new Error('Invalid action');
    }
    if (isOver(state)) {
      throw new Error('Game is already over');
    }

    let reward = 0;

    switch (action.type) {
      case 'clear': {
        const idx = action.plot;
        if (idx === undefined || idx < 0 || idx >= state.grid.length) throw new Error('Invalid plot index');
        const plot = state.grid[idx];
        if (plot.status !== 'wild' || state.energy < 5) throw new Error('Cannot clear plot');
        state.energy -= 5;
        plot.status = 'tilled';
        reward = 2;
        break;
      }

      case 'plant': {
        const idx = action.plot;
        const crop = action.crop;
        if (idx === undefined || idx < 0 || idx >= state.grid.length) throw new Error('Invalid plot index');
        if (!CROPS[crop]) throw new Error('Invalid crop');
        const plot = state.grid[idx];
        if (plot.status !== 'tilled' || state.seeds[crop] <= 0 || state.energy < 2) {
          throw new Error('Cannot plant crop');
        }
        state.energy -= 2;
        state.seeds[crop] -= 1;
        plot.status = 'planted';
        plot.crop = crop;
        plot.growth = 0;
        plot.watered = false;
        reward = 1;
        break;
      }

      case 'water': {
        const idx = action.plot;
        if (idx === undefined || idx < 0 || idx >= state.grid.length) throw new Error('Invalid plot index');
        const plot = state.grid[idx];
        if (plot.status !== 'planted' || plot.watered || state.energy < 3) {
          throw new Error('Cannot water plot');
        }
        state.energy -= 3;
        plot.watered = true;
        reward = 1;
        break;
      }

      case 'harvest': {
        const idx = action.plot;
        if (idx === undefined || idx < 0 || idx >= state.grid.length) throw new Error('Invalid plot index');
        const plot = state.grid[idx];
        if (plot.status !== 'ripe' || !plot.crop || state.energy < 3) {
          throw new Error('Cannot harvest plot');
        }
        state.energy -= 3;
        state.inventory[plot.crop] += 1;
        state.stats.totalHarvested += 1;
        plot.status = 'tilled';
        plot.crop = null;
        plot.growth = 0;
        plot.watered = false;
        reward = 15;
        break;
      }

      case 'sell': {
        const crop = action.crop;
        if (!CROPS[crop] || state.inventory[crop] <= 0) {
          throw new Error('Cannot sell crop');
        }
        const count = state.inventory[crop];
        const revenue = count * CROPS[crop].sellPrice;
        state.inventory[crop] = 0;
        state.coins += revenue;
        state.stats.totalEarned += revenue;
        reward = revenue;
        break;
      }

      case 'buy_seed': {
        const crop = action.crop;
        if (!CROPS[crop] || state.coins < CROPS[crop].seedCost) {
          throw new Error('Cannot buy seed');
        }
        state.coins -= CROPS[crop].seedCost;
        state.seeds[crop] += 1;
        reward = 0;
        break;
      }

      case 'rest': {
        state.day += 1;
        state.energy = Math.min(MAX_ENERGY, state.energy + 50);

        const roll = nextRandom(state);
        const isRain = roll < 0.3;
        state.weather = isRain ? 'rainy' : 'sunny';

        for (let i = 0; i < state.grid.length; i++) {
          const p = state.grid[i];
          if (p.status === 'planted') {
            if (p.watered || isRain) {
              p.growth += 1;
              const target = CROPS[p.crop].growthNeeded;
              if (p.growth >= target) {
                p.status = 'ripe';
              }
            }
            p.watered = isRain;
          }
        }
        reward = 1;
        break;
      }

      default:
        throw new Error('Unknown action type');
    }

    state.stepCount += 1;
    return { reward, done: isOver(state) };
  }

  function score(state) {
    return state.coins + state.stats.totalHarvested * 15 + state.stats.totalEarned;
  }

  const api = {
    MAX_DAYS,
    MAX_STEPS,
    MAX_ENERGY,
    CROPS,
    createState,
    legalActions,
    step,
    isOver,
    score,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.GameLogic = api;
  }
})(typeof self !== 'undefined' ? self : globalThis);
