// 0177-creature-collector: Beast Tamer Arena - Pure Bot Contract Logic
// Deterministic creature collection and elemental arena combat state machine. Zero DOM.

const TYPE_CHART = {
  Fire: { Grass: 1.5, Water: 0.7, Fire: 1.0, Electric: 1.0 },
  Water: { Fire: 1.5, Electric: 0.7, Water: 1.0, Grass: 0.7 },
  Grass: { Water: 1.5, Fire: 0.7, Grass: 1.0, Electric: 1.0 },
  Electric: { Water: 1.5, Grass: 1.0, Fire: 1.0, Electric: 1.0 }
};

const WILD_SPECIES = [
  { name: 'Ignisaur', element: 'Fire', baseHp: 45, attack: 14, defense: 6 },
  { name: 'Aquafin', element: 'Water', baseHp: 55, attack: 11, defense: 8 },
  { name: 'Florawing', element: 'Grass', baseHp: 50, attack: 12, defense: 7 },
  { name: 'Sparkfang', element: 'Electric', baseHp: 40, attack: 16, defense: 5 }
];

const ARENA_LEADERS = [
  { leaderName: 'Captain Flint', beast: { name: 'Pyrodrake', element: 'Fire', hp: 60, maxHp: 60, attack: 16, defense: 7, level: 2 } },
  { leaderName: 'Mistress Coral', beast: { name: 'Tidejaw', element: 'Water', hp: 75, maxHp: 75, attack: 18, defense: 9, level: 3 } },
  { leaderName: 'Master Surge', beast: { name: 'Thunderfox', element: 'Electric', hp: 90, maxHp: 90, attack: 22, defense: 10, level: 4 } },
  { leaderName: 'Grand Champion', beast: { name: 'Solarchon', element: 'Fire', hp: 120, maxHp: 120, attack: 26, defense: 12, level: 6 } }
];

function nextRand(state) {
  let s = (state.prngState ^ (state.prngState << 13)) >>> 0;
  s = (s ^ (s >>> 17)) >>> 0;
  s = (s ^ (s << 5)) >>> 0;
  state.prngState = s;
  return (s >>> 0) / 4294967296;
}

function createState(seed = 12345) {
  const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
  const state = {
    seed: s,
    prngState: s,
    turns: 0,
    maxTurns: 120,
    party: [
      {
        name: 'Sparkfang',
        element: 'Electric',
        hp: 50,
        maxHp: 50,
        attack: 16,
        defense: 7,
        level: 1,
        exp: 0
      }
    ],
    activeBeastIndex: 0,
    enemy: null,
    inBattle: false,
    isArenaMatch: false,
    badges: 0,
    spheres: 5,
    potions: 3,
    creaturesCaught: 1,
    defending: false,
    victory: false,
    defeat: false,
    gameMessage: 'Starter creature Sparkfang ready. Explore tall grass or challenge regional arena leaders.'
  };

  return state;
}

function isOver(state) {
  return Boolean(state.victory || state.defeat || state.turns >= state.maxTurns);
}

function score(state) {
  let val = state.badges * 2000;
  val += state.creaturesCaught * 400;
  for (const b of state.party) {
    val += b.level * 300 + b.hp * 5;
  }
  val += state.spheres * 50 + state.potions * 80;
  if (state.victory) val += 5000;
  return Math.max(0, Math.floor(val));
}

function anyBeastAlive(state) {
  return state.party.some(b => b.hp > 0);
}

function getActiveBeast(state) {
  return state.party[state.activeBeastIndex];
}

function legalActions(state) {
  if (isOver(state)) return [];

  const actions = [];
  const active = getActiveBeast(state);

  // If active beast fainted, must switch to an alive beast
  if (active.hp <= 0) {
    for (let i = 0; i < state.party.length; i++) {
      if (state.party[i].hp > 0) {
        actions.push('action:switch_beast:' + i);
      }
    }
    if (state.potions > 0) {
      actions.push('action:use_potion');
    }
    return actions;
  }

  if (state.inBattle) {
    // Battle actions
    actions.push('action:command_attack');
    actions.push('action:command_defend');

    if (state.potions > 0 && active.hp < active.maxHp) {
      actions.push('action:use_potion');
    }

    if (!state.isArenaMatch && state.spheres > 0) {
      actions.push('action:throw_tamer_sphere');
    }

    for (let i = 0; i < state.party.length; i++) {
      if (i !== state.activeBeastIndex && state.party[i].hp > 0) {
        actions.push('action:switch_beast:' + i);
      }
    }
  } else {
    // Overworld actions
    actions.push('action:explore_tall_grass');

    if (state.badges < ARENA_LEADERS.length) {
      actions.push('action:challenge_arena_leader');
    }

    if (state.potions > 0 && active.hp < active.maxHp) {
      actions.push('action:use_potion');
    }

    for (let i = 0; i < state.party.length; i++) {
      if (i !== state.activeBeastIndex && state.party[i].hp > 0) {
        actions.push('action:switch_beast:' + i);
      }
    }
  }

  return actions;
}

function step(state, action) {
  if (isOver(state)) {
    return { reward: 0, done: true };
  }

  const validActions = legalActions(state);
  if (!validActions.includes(action)) {
    throw new Error('Illegal tamer action "' + action + '" in current state');
  }

  const oldScore = score(state);
  let active = getActiveBeast(state);

  if (action === 'action:explore_tall_grass') {
    const r = Math.floor(nextRand(state) * WILD_SPECIES.length);
    const spec = WILD_SPECIES[r];
    const lvl = Math.min(6, Math.max(1, state.badges + Math.floor(nextRand(state) * 2)));
    state.enemy = {
      name: 'Wild ' + spec.name,
      element: spec.element,
      hp: spec.baseHp + (lvl - 1) * 8,
      maxHp: spec.baseHp + (lvl - 1) * 8,
      attack: spec.attack + (lvl - 1) * 2,
      defense: spec.defense + (lvl - 1) * 1,
      level: lvl
    };
    state.inBattle = true;
    state.isArenaMatch = false;
    state.defending = false;
    state.gameMessage = 'Rustling in the tall grass! A ' + state.enemy.name + ' (Lv' + lvl + ' ' + state.enemy.element + ') appeared!';
  } else if (action === 'action:challenge_arena_leader') {
    const leader = ARENA_LEADERS[state.badges];
    state.enemy = {
      name: leader.beast.name,
      element: leader.beast.element,
      hp: leader.beast.hp,
      maxHp: leader.beast.maxHp,
      attack: leader.beast.attack,
      defense: leader.beast.defense,
      level: leader.beast.level
    };
    state.inBattle = true;
    state.isArenaMatch = true;
    state.defending = false;
    state.gameMessage = leader.leaderName + ' steps forward: "Face my ' + state.enemy.name + ' in official Arena Combat!"';
  } else if (action.startsWith('action:switch_beast:')) {
    const idx = parseInt(action.split(':')[2], 10);
    state.activeBeastIndex = idx;
    active = getActiveBeast(state);
    state.defending = false;
    state.gameMessage = 'Swapped into combat: Go, ' + active.name + ' (Lv' + active.level + ' ' + active.element + ')!';

    // Enemy free strike on switch if in battle
    if (state.inBattle && state.enemy && state.enemy.hp > 0) {
      const mult = (TYPE_CHART[state.enemy.element] && TYPE_CHART[state.enemy.element][active.element]) || 1.0;
      const enemyDmg = Math.max(4, Math.floor((state.enemy.attack - active.defense / 2) * mult));
      active.hp = Math.max(0, active.hp - enemyDmg);
      state.gameMessage += ' ' + state.enemy.name + ' attacked on switch for ' + enemyDmg + ' damage!';
    }
  } else if (action === 'action:use_potion') {
    state.potions -= 1;
    active.hp = Math.min(active.maxHp, active.hp + 40);
    state.gameMessage = 'Administered Potion to ' + active.name + ' (+40 HP). Current HP: ' + active.hp + '/' + active.maxHp + '.';

    // Enemy counters if in battle
    if (state.inBattle && state.enemy && state.enemy.hp > 0) {
      const mult = (TYPE_CHART[state.enemy.element] && TYPE_CHART[state.enemy.element][active.element]) || 1.0;
      const enemyDmg = Math.max(4, Math.floor((state.enemy.attack - active.defense / 2) * mult));
      active.hp = Math.max(0, active.hp - enemyDmg);
      state.gameMessage += ' ' + state.enemy.name + ' struck for ' + enemyDmg + ' damage!';
    }
  } else if (action === 'action:command_defend') {
    state.defending = true;
    state.gameMessage = active.name + ' braced into defensive posture!';

    // Enemy attacks against defense
    if (state.inBattle && state.enemy && state.enemy.hp > 0) {
      const mult = (TYPE_CHART[state.enemy.element] && TYPE_CHART[state.enemy.element][active.element]) || 1.0;
      const enemyDmg = Math.max(2, Math.floor(((state.enemy.attack - active.defense / 2) * mult) * 0.5));
      active.hp = Math.max(0, active.hp - enemyDmg);
      state.gameMessage += ' ' + state.enemy.name + ' attacked guarded ' + active.name + ' for ' + enemyDmg + ' damage.';
    }
    state.defending = false;
  } else if (action === 'action:command_attack') {
    const mult = (TYPE_CHART[active.element] && TYPE_CHART[active.element][state.enemy.element]) || 1.0;
    const playerDmg = Math.max(5, Math.floor((active.attack - state.enemy.defense / 2) * mult));
    state.enemy.hp = Math.max(0, state.enemy.hp - playerDmg);

    let hitText = ' hit ';
    if (mult > 1.2) hitText = ' SUPER EFFECTIVELY hit ';
    else if (mult < 0.8) hitText = ' weakly struck ';
    state.gameMessage = active.name + hitText + state.enemy.name + ' for ' + playerDmg + ' damage!';

    if (state.enemy.hp <= 0) {
      // Enemy Defeated
      active.exp += 35 + state.enemy.level * 15;
      state.gameMessage += ' ' + state.enemy.name + ' fainted!';

      // Level up check
      const nextExp = active.level * 40;
      if (active.exp >= nextExp) {
        active.level += 1;
        active.exp = 0;
        active.maxHp += 12;
        active.hp = active.maxHp;
        active.attack += 4;
        active.defense += 2;
        state.gameMessage += ' ' + active.name + ' grew to Level ' + active.level + '! HP fully restored!';
      }

      if (state.isArenaMatch) {
        state.badges += 1;
        state.gameMessage += ' Arena Leader defeated! Awarded Badge #' + state.badges + '!';
        if (state.badges >= ARENA_LEADERS.length) {
          state.victory = true;
          state.gameMessage = 'VICTORY! Defeated Grand Champion Solarchon and crowned Master Beast Tamer!';
        }
      } else {
        // Wild victory spoils
        if (nextRand(state) < 0.4) {
          state.spheres += 1;
          state.gameMessage += ' Found 1 Tamer Sphere on the ground.';
        }
        if (nextRand(state) < 0.3) {
          state.potions += 1;
          state.gameMessage += ' Recovered 1 Potion.';
        }
      }

      state.inBattle = false;
      state.enemy = null;
    } else {
      // Enemy Counter-Attacks
      const eMult = (TYPE_CHART[state.enemy.element] && TYPE_CHART[state.enemy.element][active.element]) || 1.0;
      const enemyDmg = Math.max(4, Math.floor((state.enemy.attack - active.defense / 2) * eMult));
      active.hp = Math.max(0, active.hp - enemyDmg);
      state.gameMessage += ' ' + state.enemy.name + ' retaliated for ' + enemyDmg + ' damage!';
    }
  } else if (action === 'action:throw_tamer_sphere') {
    state.spheres -= 1;
    const hpFactor = 1 - (state.enemy.hp / state.enemy.maxHp);
    const catchRate = 0.35 + hpFactor * 0.6;
    const roll = nextRand(state);

    if (roll < catchRate) {
      // Caught!
      const caughtBeast = {
        name: state.enemy.name.replace('Wild ', ''),
        element: state.enemy.element,
        hp: state.enemy.hp,
        maxHp: state.enemy.maxHp,
        attack: state.enemy.attack,
        defense: state.enemy.defense,
        level: state.enemy.level,
        exp: 0
      };

      if (state.party.length < 3) {
        state.party.push(caughtBeast);
      } else {
        // Bench replacement
        state.party[1] = caughtBeast;
      }

      state.creaturesCaught += 1;
      state.gameMessage = 'Gotcha! ' + caughtBeast.name + ' was successfully captured and added to your roster!';
      state.inBattle = false;
      state.enemy = null;
    } else {
      state.gameMessage = 'Oh no! The wild creature broke free of the Tamer Sphere!';
      // Enemy strike on failed sphere
      const eMult = (TYPE_CHART[state.enemy.element] && TYPE_CHART[state.enemy.element][active.element]) || 1.0;
      const enemyDmg = Math.max(4, Math.floor((state.enemy.attack - active.defense / 2) * eMult));
      active.hp = Math.max(0, active.hp - enemyDmg);
      state.gameMessage += ' ' + state.enemy.name + ' retaliated for ' + enemyDmg + ' damage!';
    }
  }

  // Check fainted party
  if (active && active.hp <= 0) {
    state.gameMessage += ' ' + active.name + ' fainted!';
    if (!anyBeastAlive(state) && state.potions <= 0) {
      state.defeat = true;
      state.gameMessage = 'Defeat: All party creatures have fainted and no potions remain!';
    }
  }

  state.turns += 1;
  if (!state.victory && !state.defeat && state.turns >= state.maxTurns) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Tournament championship season closed before claiming title.';
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
    TYPE_CHART,
    WILD_SPECIES,
    ARENA_LEADERS
  };
}
