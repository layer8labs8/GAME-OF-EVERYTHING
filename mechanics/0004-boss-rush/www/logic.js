(function (root) {
  const MAX_STEPS = 400;
  const PLAYER_MAX_HP = 100;
  const PLAYER_MAX_STAMINA = 100;

  const BOSS_ROSTER = [
    { name: 'Iron Golem', maxHp: 90, attacks: ['Overhead Slam', 'Hammer Sweep'] },
    { name: 'Storm Chimera', maxHp: 120, attacks: ['Lightning Charge', 'Electric Claw'] },
    { name: 'Obsidian Wyrm', maxHp: 160, attacks: ['Magma Burst', 'Tail Whip'] },
  ];

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function createState(seed) {
    const state = {
      rng: (seed >>> 0) || 1,
      player: {
        hp: PLAYER_MAX_HP,
        stamina: PLAYER_MAX_STAMINA,
        potions: 2,
        combo: 0,
      },
      bossIdx: 0,
      boss: {
        name: BOSS_ROSTER[0].name,
        hp: BOSS_ROSTER[0].maxHp,
        maxHp: BOSS_ROSTER[0].maxHp,
        windup: false,
        intent: 'Overhead Slam',
        stunned: 0,
      },
      stepCount: 0,
      score: 0,
      won: false,
      lost: false,
      lastEvent: 'Encounter begins!',
    };
    return state;
  }

  function hasBasicTermination(state) {
    return Boolean(state.won || state.lost || state.stepCount >= MAX_STEPS);
  }

  function legalActions(state) {
    if (hasBasicTermination(state)) return [];

    const actions = ['rest'];

    if (state.player.stamina >= 15) {
      actions.push('light_slash');
    }
    if (state.player.stamina >= 35) {
      actions.push('heavy_smash');
    }
    if (state.player.stamina >= 10) {
      actions.push('parry');
    }
    if (state.player.stamina >= 20) {
      actions.push('dodge');
    }
    if (state.player.potions > 0) {
      actions.push('heal');
    }

    return actions;
  }

  function isOver(state) {
    return hasBasicTermination(state) || legalActions(state).length === 0;
  }

  function step(state, action) {
    const legal = legalActions(state);
    if (!legal.includes(action)) throw new Error('Illegal action: ' + action);

    let reward = 2;

    // 1. Resolve player action
    if (action === 'rest') {
      state.player.stamina = Math.min(PLAYER_MAX_STAMINA, state.player.stamina + 40);
      state.lastEvent = 'You caught your breath (+40 Stamina).';
    } else if (action === 'heal') {
      state.player.potions -= 1;
      state.player.hp = Math.min(PLAYER_MAX_HP, state.player.hp + 35);
      state.lastEvent = 'You quaffed an elixir (+35 HP).';
    } else if (action === 'light_slash') {
      state.player.stamina -= 15;
      const dmg = 12 + Math.floor(state.player.combo * 1.5);
      state.boss.hp -= dmg;
      state.player.combo += 1;
      state.score += dmg;
      reward += dmg;
      state.lastEvent = `Light Slash landed for ${dmg} damage!`;
    } else if (action === 'heavy_smash') {
      state.player.stamina -= 35;
      const dmg = 28 + Math.floor(state.player.combo * 2);
      state.boss.hp -= dmg;
      state.player.combo += 2;
      state.score += dmg;
      reward += dmg;
      state.lastEvent = `Heavy Smash crushed the titan for ${dmg} damage!`;
    } else if (action === 'parry') {
      state.player.stamina -= 10;
      state.lastEvent = 'You raised your shield in parry stance.';
    } else if (action === 'dodge') {
      state.player.stamina -= 20;
      state.lastEvent = 'You executed an evasive roll.';
    }

    // 2. Check if boss is slain
    if (state.boss.hp <= 0) {
      state.score += 100;
      reward += 100;
      state.bossIdx += 1;

      if (state.bossIdx >= BOSS_ROSTER.length) {
        state.won = true;
        state.lastEvent = 'All titans defeated! You conquered the Trials!';
        state.stepCount += 1;
        return { reward, done: true };
      }

      // Next titan advances
      const nextBoss = BOSS_ROSTER[state.bossIdx];
      state.boss = {
        name: nextBoss.name,
        hp: nextBoss.maxHp,
        maxHp: nextBoss.maxHp,
        windup: false,
        intent: nextBoss.attacks[0],
        stunned: 0,
      };
      state.player.hp = Math.min(PLAYER_MAX_HP, state.player.hp + 30);
      state.player.potions = Math.min(3, state.player.potions + 1);
      state.lastEvent = `${nextBoss.name} enters the arena! (+30 HP, +1 Potion)`;
      state.stepCount += 1;
      return { reward, done: false };
    }

    // 3. Boss turn
    if (state.boss.stunned > 0) {
      state.boss.stunned -= 1;
      state.lastEvent += ` ${state.boss.name} is stunned and unable to act!`;
    } else if (state.boss.windup) {
      // Impending attack lands
      if (action === 'parry') {
        state.boss.stunned = 2;
        state.player.stamina = Math.min(PLAYER_MAX_STAMINA, state.player.stamina + 35);
        state.score += 30;
        reward += 30;
        state.lastEvent = `PERFECT PARRY! ${state.boss.name}'s ${state.boss.intent} deflected! Boss is stunned!`;
      } else if (action === 'dodge') {
        reward += 10;
        state.lastEvent = `You rolled through ${state.boss.name}'s ${state.boss.intent} safely!`;
      } else {
        // Player takes hit
        const bossDmg = 25;
        state.player.hp -= bossDmg;
        state.player.combo = 0;
        reward -= 20;
        state.lastEvent = `${state.boss.name} struck you with ${state.boss.intent} for ${bossDmg} damage!`;
        if (state.player.hp <= 0) {
          state.lost = true;
        }
      }
      state.boss.windup = false;
    } else {
      // Boss winds up next attack
      state.boss.windup = true;
      const attackOpts = BOSS_ROSTER[state.bossIdx].attacks;
      const pick = attackOpts[Math.floor(nextRandom(state) * attackOpts.length)];
      state.boss.intent = pick;
      state.lastEvent += ` ${state.boss.name} is preparing ${pick}!`;
    }

    // 4. Passive stamina recovery
    state.player.stamina = Math.min(PLAYER_MAX_STAMINA, state.player.stamina + 5);

    state.stepCount += 1;
    const done = isOver(state);
    return { reward, done };
  }

  function score(state) {
    return Math.max(0, state.score);
  }

  const api = {
    MAX_STEPS,
    PLAYER_MAX_HP,
    PLAYER_MAX_STAMINA,
    BOSS_ROSTER,
    createState,
    legalActions,
    step,
    isOver,
    score,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
