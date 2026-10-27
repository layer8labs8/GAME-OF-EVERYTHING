/**
 * 0133-choose-your-own-adventure: Paths of Destiny
 * Pure gamebook engine conforming strictly to the Bot Contract.
 * No browser globals, seedable PRNG, fully deterministic and serializable.
 */

const MAX_TURNS = 150;

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
    passageId: 'start',
    stamina: 24,
    maxStamina: 24,
    skill: 10,
    luck: 10,
    provisions: 3,
    inventory: [],
    enemy: null,
    score: 0,
    done: false,
    victory: false,
    visitedNodes: { start: true },
    fountainDrunk: false,
    orchidHarvested: false,
    chestLooted: false,
    armoryLooted: false,
    log: [
      'You arrive at the jagged gates of Kar-Drakis.',
      'Your gamebook chronicle begins now.'
    ]
  };
}

function getRng(state) {
  let s = (state.prngState >>> 0) || 123456789;
  s = (s + 0x6D2B79F5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  state.prngState = s;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function rollDice(state, count = 2) {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.floor(getRng(state) * 6) + 1;
  }
  return total;
}

function isOver(state) {
  return state.done;
}

function score(state) {
  return state.score;
}

function addLog(state, msg) {
  state.log.push(msg);
  if (state.log.length > 20) {
    state.log.shift();
  }
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];

  // Combat active
  if (state.enemy !== null) {
    actions.push('fight:strike');
    if (state.luck > 2) {
      actions.push('fight:test_luck');
    }
    if (!state.enemy.isBoss) {
      actions.push('fight:flee');
    }
    return actions;
  }

  // Sustenance provision
  if (state.provisions > 0 && state.stamina < state.maxStamina) {
    actions.push('action:eat_ration');
  }

  // Node choices
  const pid = state.passageId;

  if (pid === 'start') {
    actions.push('choice:scale_battlement');
    actions.push('choice:enter_portcullis');
    actions.push('choice:search_watchtower');
  } else if (pid === 'watchtower') {
    if (!state.chestLooted) {
      actions.push('choice:loot_chest');
    }
    actions.push('choice:descend_courtyard');
    actions.push('choice:return_start');
  } else if (pid === 'battlement') {
    actions.push('choice:test_luck_balance');
    actions.push('choice:leap_courtyard');
  } else if (pid === 'armory') {
    if (!state.armoryLooted) {
      actions.push('choice:take_armory_loot');
    }
    actions.push('choice:descend_courtyard');
  } else if (pid === 'portcullis') {
    actions.push('choice:fight_imps');
    actions.push('choice:toss_torch');
  } else if (pid === 'courtyard') {
    actions.push('choice:enter_garden');
    actions.push('choice:descend_crypt');
    actions.push('choice:approach_hall');
  } else if (pid === 'garden') {
    if (!state.fountainDrunk) {
      actions.push('choice:drink_fountain');
    }
    if (!state.orchidHarvested) {
      actions.push('choice:harvest_orchid');
    }
    actions.push('choice:return_courtyard');
  } else if (pid === 'crypt') {
    if (state.inventory.includes('moon_orchid')) {
      actions.push('choice:banish_wraith');
    }
    actions.push('choice:fight_wraith');
    actions.push('choice:flee_crypt');
  } else if (pid === 'crypt_cleared') {
    actions.push('choice:ascend_courtyard');
  } else if (pid === 'great_hall') {
    if (state.inventory.includes('brass_key') && state.inventory.includes('silver_runestone')) {
      actions.push('choice:unlock_doors');
    }
    actions.push('choice:force_doors');
    actions.push('choice:return_courtyard');
  } else if (pid === 'sanctuary') {
    actions.push('choice:engage_colossus');
    if (state.luck >= 3) {
      actions.push('choice:test_luck_weakpoint');
    }
  }

  // Fallback safe action if needed
  if (actions.length === 0) {
    actions.push('choice:descend_courtyard');
  }

  return actions;
}

function step(state, action) {
  if (state.done) {
    throw new Error('Game is already over.');
  }

  const legal = legalActions(state);
  if (!legal.includes(action)) {
    throw new Error(`Illegal action "${action}".`);
  }

  state.turns += 1;
  let reward = 0;

  // Eat ration
  if (action === 'action:eat_ration') {
    state.provisions -= 1;
    const heal = 6;
    state.stamina = Math.min(state.maxStamina, state.stamina + heal);
    reward += 2;
    addLog(state, `Ate travel ration. Restored ${heal} Stamina. (Provisions left: ${state.provisions})`);
    return checkEndState(state, reward);
  }

  // Combat choices
  if (action.startsWith('fight:')) {
    const enemy = state.enemy;

    if (action === 'fight:flee') {
      state.stamina -= 2;
      state.enemy = null;
      state.passageId = 'courtyard';
      reward -= 3;
      addLog(state, 'You disengaged and fled back into the misty courtyard, taking 2 fleeing damage.');
      return checkEndState(state, reward);
    }

    if (action === 'fight:strike') {
      const pRoll = rollDice(state, 2) + state.skill;
      const eRoll = rollDice(state, 2) + enemy.skill;

      if (pRoll > eRoll) {
        const dmg = 4 + Math.floor(state.skill / 4);
        enemy.hp -= dmg;
        reward += 3;
        addLog(state, `Strike landed! You dealt ${dmg} damage to ${enemy.name} (${pRoll} vs ${eRoll}).`);
      } else if (eRoll > pRoll) {
        state.stamina -= enemy.dmg;
        addLog(state, `${enemy.name} overpowered your defense, striking for ${enemy.dmg} damage (${eRoll} vs ${pRoll}).`);
      } else {
        addLog(state, `Weapons clashed in a deadlock (${pRoll} vs ${eRoll}). No damage taken.`);
      }
    } else if (action === 'fight:test_luck') {
      state.luck -= 1;
      const testRoll = rollDice(state, 2);
      const isLucky = testRoll <= state.luck + 1; // evaluated against tested luck

      if (isLucky) {
        const critDmg = 8 + Math.floor(state.skill / 2);
        enemy.hp -= critDmg;
        reward += 6;
        addLog(state, `Fortune smiles! Critical strike for ${critDmg} damage! (Rolled ${testRoll} vs Luck ${state.luck + 1})`);
      } else {
        const penaltyDmg = enemy.dmg + 2;
        state.stamina -= penaltyDmg;
        addLog(state, `Ill fortune! You slipped and suffered ${penaltyDmg} damage! (Rolled ${testRoll} vs Luck ${state.luck + 1})`);
      }
    }

    // Check if enemy defeated
    if (enemy.hp <= 0) {
      addLog(state, `You vanquished ${enemy.name}!`);
      state.score += (enemy.isBoss ? 150 : 30);
      reward += (enemy.isBoss ? 80 : 15);

      if (enemy.isBoss) {
        state.passageId = 'victory_throne';
        state.victory = true;
        state.done = true;
        state.enemy = null;
        reward += 100;
        addLog(state, 'TRIUMPH! The Iron Colossus shatters. You claim the Crown of Kar-Drakis!');
        return { reward, done: true };
      }

      // Non-boss defeated
      if (state.passageId === 'crypt') {
        state.passageId = 'crypt_cleared';
        if (!state.inventory.includes('silver_runestone')) {
          state.inventory.push('silver_runestone');
          addLog(state, 'Retrieved the Silver Runestone from the defeated wraith.');
        }
      } else {
        state.passageId = 'courtyard';
      }
      state.enemy = null;
    }

    return checkEndState(state, reward);
  }

  // Narrative passage choices
  if (action === 'choice:scale_battlement') {
    state.passageId = 'battlement';
    reward += 1;
    addLog(state, 'You scaled the jagged western masonry onto the wind-whipped battlement.');
  } else if (action === 'choice:search_watchtower') {
    state.passageId = 'watchtower';
    reward += 1;
    addLog(state, 'You stepped inside the hollow watchtower.');
  } else if (action === 'choice:return_start') {
    state.passageId = 'start';
    reward += 1;
  } else if (action === 'choice:loot_chest') {
    state.chestLooted = true;
    if (!state.inventory.includes('brass_key')) {
      state.inventory.push('brass_key');
    }
    state.score += 15;
    reward += 10;
    addLog(state, 'Opened the decaying chest: acquired the heavy Brass Key!');
  } else if (action === 'choice:test_luck_balance') {
    const testRoll = rollDice(state, 2);
    const lucky = testRoll <= state.luck;
    state.luck = Math.max(1, state.luck - 1);

    if (lucky) {
      state.passageId = 'armory';
      reward += 8;
      state.score += 10;
      addLog(state, `Fortune favored your step! (Rolled ${testRoll} vs Luck). You crossed into the High Armory!`);
    } else {
      state.stamina -= 5;
      state.passageId = 'courtyard';
      reward -= 2;
      addLog(state, `A violent squall threw you down! Suffered 5 fall damage, landing in the courtyard.`);
    }
  } else if (action === 'choice:leap_courtyard') {
    state.stamina -= 3;
    state.passageId = 'courtyard';
    reward += 1;
    addLog(state, 'You made a controlled drop into the courtyard below (-3 Stamina).');
  } else if (action === 'choice:take_armory_loot') {
    state.armoryLooted = true;
    state.skill += 1;
    state.provisions += 2;
    state.score += 20;
    reward += 12;
    addLog(state, 'Armory looted: Sharpened blade (+1 Skill) and acquired 2 provisions!');
  } else if (action === 'choice:enter_portcullis') {
    state.passageId = 'portcullis';
    reward += 1;
    addLog(state, 'Crept beneath the iron teeth of the portcullis.');
  } else if (action === 'choice:fight_imps') {
    state.enemy = {
      id: 'shadow_imps',
      name: 'Shadow Imps',
      hp: 14,
      maxHp: 14,
      skill: 8,
      dmg: 4,
      isBoss: false
    };
    reward += 2;
    addLog(state, 'Drew steel as the twin Shadow Imps leapt from the gloom!');
  } else if (action === 'choice:toss_torch') {
    state.luck = Math.max(1, state.luck - 1);
    state.passageId = 'courtyard';
    reward += 2;
    addLog(state, 'Hurled a blazing torch! The imps scattered shrieking into the night as you slipped to the courtyard.');
  } else if (action === 'choice:descend_courtyard' || action === 'choice:return_courtyard' || action === 'choice:ascend_courtyard') {
    state.passageId = 'courtyard';
    reward += 1;
  } else if (action === 'choice:enter_garden') {
    state.passageId = 'garden';
    reward += 1;
    addLog(state, 'Entered the tranquil overgrown Garden of Thorns.');
  } else if (action === 'choice:drink_fountain') {
    state.fountainDrunk = true;
    state.stamina = Math.min(state.maxStamina, state.stamina + 8);
    state.luck = Math.min(12, state.luck + 1);
    state.score += 15;
    reward += 10;
    addLog(state, 'Drank the blessed lunar waters: +8 Stamina and restored +1 Luck!');
  } else if (action === 'choice:harvest_orchid') {
    state.orchidHarvested = true;
    if (!state.inventory.includes('moon_orchid')) {
      state.inventory.push('moon_orchid');
    }
    state.score += 15;
    reward += 8;
    addLog(state, 'Harvested the glowing Moon Orchid with reverence.');
  } else if (action === 'choice:descend_crypt') {
    state.passageId = 'crypt';
    reward += 1;
    addLog(state, 'Descended into the frosty subterranean catacombs.');
  } else if (action === 'choice:banish_wraith') {
    state.passageId = 'crypt_cleared';
    if (!state.inventory.includes('silver_runestone')) {
      state.inventory.push('silver_runestone');
    }
    state.score += 35;
    reward += 25;
    addLog(state, 'Held high the Moon Orchid! Holy radiance incinerated the wraith instantly. Obtained Silver Runestone!');
  } else if (action === 'choice:fight_wraith') {
    state.enemy = {
      id: 'spectral_wraith',
      name: 'Spectral Wraith',
      hp: 22,
      maxHp: 22,
      skill: 10,
      dmg: 6,
      isBoss: false
    };
    reward += 2;
    addLog(state, 'Steeled your nerves and confronted the chilling Spectral Wraith!');
  } else if (action === 'choice:flee_crypt') {
    state.passageId = 'courtyard';
    reward += 1;
  } else if (action === 'choice:approach_hall') {
    state.passageId = 'great_hall';
    reward += 1;
    addLog(state, 'Stood before the adamantine portal of the Great Hall.');
  } else if (action === 'choice:unlock_doors') {
    state.passageId = 'sanctuary';
    state.score += 40;
    reward += 30;
    addLog(state, 'Turned the Brass Key and slotted the Silver Runestone. The great doors groaned open!');
  } else if (action === 'choice:force_doors') {
    const roll = rollDice(state, 2);
    if (roll <= state.skill) {
      state.stamina -= 4;
      state.passageId = 'sanctuary';
      state.score += 25;
      reward += 15;
      addLog(state, `Through raw grit you forced the portal ajar (-4 Stamina). Stepped into the Sanctuary!`);
    } else {
      state.stamina -= 3;
      reward -= 2;
      addLog(state, `The adamantine doors resisted your assault (-3 Stamina). The mechanism held firm.`);
    }
  } else if (action === 'choice:engage_colossus') {
    state.enemy = {
      id: 'iron_colossus',
      name: 'Iron Colossus',
      hp: 38,
      maxHp: 38,
      skill: 11,
      dmg: 7,
      isBoss: true
    };
    reward += 5;
    addLog(state, 'The colossal guardian arose, grinding gears igniting ruby eyes of fury!');
  } else if (action === 'choice:test_luck_weakpoint') {
    const roll = rollDice(state, 2);
    const lucky = roll <= state.luck;
    state.luck = Math.max(1, state.luck - 1);

    state.enemy = {
      id: 'iron_colossus',
      name: 'Iron Colossus',
      hp: lucky ? 24 : 38,
      maxHp: 38,
      skill: 11,
      dmg: 7,
      isBoss: true
    };

    if (lucky) {
      reward += 15;
      addLog(state, `Flawless intuition! Struck the power conduit early for 14 damage before combat begins!`);
    } else {
      reward += 2;
      addLog(state, 'The strike glanced harmlessly off reinforced adamantine plating.');
    }
  }

  return checkEndState(state, reward);
}

function checkEndState(state, reward) {
  state.visitedNodes[state.passageId] = true;

  if (state.stamina <= 0) {
    state.stamina = 0;
    state.done = true;
    state.victory = false;
    state.passageId = 'defeat_fallen';
    reward -= 50;
    addLog(state, 'Your stamina was exhausted. You fell in the Citadel of Shadows.');
  } else if (state.turns >= state.maxTurns) {
    state.done = true;
    addLog(state, 'The chronicle reaches its final page.');
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
    MAX_TURNS
  };
}
