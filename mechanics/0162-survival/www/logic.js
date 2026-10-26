(function (root) {
  'use strict';

  const MAX_DAYS = 20;
  const MAX_STEPS = 200;

  function nextRandom(state) {
    state.rng = ((state.rng * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    return state.rng / 0x7fffffff;
  }

  function createState(seed = 12345) {
    const curRng = (seed >>> 0) || 1;

    return {
      day: 1,
      stepCount: 0,
      health: 100,
      warmth: 85,
      hunger: 20,
      fireLevel: 65,
      shelter: {
        integrity: 90,
        insulation: 1,
      },
      supplies: {
        wood: 12,
        food: 8,
        medical: 2,
        scrap: 4,
      },
      weather: 'clear',
      threat: 'none',
      won: false,
      rng: curRng,
    };
  }

  function isOver(state) {
    return state.health <= 0 || state.day > MAX_DAYS || state.stepCount >= MAX_STEPS;
  }

  function legalActions(state) {
    if (isOver(state)) return [];

    const actions = [];
    if (state.supplies.wood >= 3 && state.fireLevel < 100) {
      actions.push({ type: 'stoke_fire' });
    }
    if (state.supplies.food >= 2 && state.hunger > 0) {
      actions.push({ type: 'eat' });
    }
    if (state.supplies.medical >= 1 && state.health < 100) {
      actions.push({ type: 'heal' });
    }
    if (state.health > 15 && state.warmth > 15) {
      actions.push({ type: 'forage_wood' });
      actions.push({ type: 'hunt_food' });
    }
    if (state.supplies.wood >= 4 && state.supplies.scrap >= 2 && state.shelter.integrity < 100) {
      actions.push({ type: 'repair_shelter' });
    }
    if (state.supplies.wood >= 8 && state.supplies.scrap >= 8 && state.shelter.insulation < 3) {
      actions.push({ type: 'upgrade_insulation' });
    }
    if (state.threat === 'wolves' && state.supplies.wood >= 2) {
      actions.push({ type: 'defend' });
    }
    actions.push({ type: 'sleep' });

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
      case 'stoke_fire': {
        if (state.supplies.wood < 3 || state.fireLevel >= 100) {
          throw new Error('Cannot stoke fire');
        }
        state.supplies.wood -= 3;
        state.fireLevel = Math.min(100, state.fireLevel + 35);
        reward = 5;
        break;
      }

      case 'eat': {
        if (state.supplies.food < 2 || state.hunger <= 0) {
          throw new Error('Cannot eat food');
        }
        state.supplies.food -= 2;
        state.hunger = Math.max(0, state.hunger - 35);
        state.health = Math.min(100, state.health + 5);
        reward = 5;
        break;
      }

      case 'heal': {
        if (state.supplies.medical < 1 || state.health >= 100) {
          throw new Error('Cannot heal');
        }
        state.supplies.medical -= 1;
        state.health = Math.min(100, state.health + 30);
        reward = 10;
        break;
      }

      case 'forage_wood': {
        if (state.health <= 15 || state.warmth <= 15) {
          throw new Error('Too weak or cold to forage');
        }
        const roll = nextRandom(state);
        const gained = 4 + Math.floor(roll * 4);
        state.supplies.wood += gained;
        state.hunger = Math.min(100, state.hunger + 8);
        const chill = state.weather === 'blizzard' ? 20 : 12;
        state.warmth = Math.max(0, state.warmth - chill);
        reward = 8;
        break;
      }

      case 'hunt_food': {
        if (state.health <= 15 || state.warmth <= 15) {
          throw new Error('Too weak or cold to hunt');
        }
        const r1 = nextRandom(state);
        const r2 = nextRandom(state);
        const foodGained = 3 + Math.floor(r1 * 3);
        const scrapGained = 1 + Math.floor(r2 * 2);
        state.supplies.food += foodGained;
        state.supplies.scrap += scrapGained;
        state.hunger = Math.min(100, state.hunger + 10);
        const chill = state.weather === 'blizzard' ? 24 : 16;
        state.warmth = Math.max(0, state.warmth - chill);

        if (state.threat === 'wolves') {
          state.health = Math.max(0, state.health - 12);
        }
        reward = 12;
        break;
      }

      case 'repair_shelter': {
        if (state.supplies.wood < 4 || state.supplies.scrap < 2 || state.shelter.integrity >= 100) {
          throw new Error('Cannot repair shelter');
        }
        state.supplies.wood -= 4;
        state.supplies.scrap -= 2;
        state.shelter.integrity = Math.min(100, state.shelter.integrity + 30);
        reward = 10;
        break;
      }

      case 'upgrade_insulation': {
        if (state.supplies.wood < 8 || state.supplies.scrap < 8 || state.shelter.insulation >= 3) {
          throw new Error('Cannot upgrade insulation');
        }
        state.supplies.wood -= 8;
        state.supplies.scrap -= 8;
        state.shelter.insulation += 1;
        reward = 25;
        break;
      }

      case 'defend': {
        if (state.threat !== 'wolves' || state.supplies.wood < 2) {
          throw new Error('Cannot defend');
        }
        state.supplies.wood -= 2;
        state.threat = 'none';
        reward = 15;
        break;
      }

      case 'sleep': {
        state.day += 1;

        if (state.day > MAX_DAYS) {
          state.won = true;
          state.stepCount += 1;
          return { reward: 100, done: true };
        }

        // Fire fuel consumption
        state.fireLevel = Math.max(0, state.fireLevel - 20);

        // Weather roll
        const wRoll = nextRandom(state);
        if (wRoll < 0.40) state.weather = 'clear';
        else if (wRoll < 0.75) state.weather = 'windy';
        else state.weather = 'blizzard';

        // Unresolved wolf threat attacks shelter overnight
        if (state.threat === 'wolves') {
          state.shelter.integrity = Math.max(0, state.shelter.integrity - 25);
          if (state.shelter.integrity <= 20) {
            state.health = Math.max(0, state.health - 20);
          }
          state.threat = 'none';
        }

        // Potential new wolf pack threat
        const tRoll = nextRandom(state);
        if (tRoll < 0.30) {
          state.threat = 'wolves';
        }

        // Thermal calculation
        let cooling = state.weather === 'clear' ? 15 : state.weather === 'windy' ? 25 : 40;
        cooling -= (state.shelter.insulation - 1) * 8;
        const heat = state.fireLevel > 30 ? 25 : state.fireLevel > 0 ? 10 : 0;
        const netWarmth = heat - cooling;

        state.warmth = Math.max(0, Math.min(100, state.warmth + netWarmth));
        if (state.warmth <= 0) {
          state.health = Math.max(0, state.health - 18);
        }

        // Hunger advance
        state.hunger = Math.min(100, state.hunger + 14);
        if (state.hunger >= 85) {
          state.health = Math.max(0, state.health - 16);
        }

        // Blizzard shelter strain
        if (state.weather === 'blizzard') {
          state.shelter.integrity = Math.max(0, state.shelter.integrity - 10);
        }

        reward = state.health > 0 ? 10 : -50;
        break;
      }

      default:
        throw new Error('Unknown action type');
    }

    state.stepCount += 1;
    if (state.health <= 0) {
      state.health = 0;
    }
    return { reward, done: isOver(state) };
  }

  function score(state) {
    const totalSupplies = state.supplies.wood + state.supplies.food + state.supplies.medical * 5 + state.supplies.scrap * 2;
    return (state.won ? 500 : 0) + state.day * 35 + state.health * 2 + state.shelter.integrity + totalSupplies;
  }

  const api = {
    MAX_DAYS,
    MAX_STEPS,
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
