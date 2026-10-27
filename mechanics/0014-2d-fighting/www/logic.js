// Clash of Titans - 2D Fighting deterministic logic
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ClashOfTitans = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ARENA_WIDTH = 360;
  const FLOOR_Y = 280;
  const MAX_STEPS = 160;
  const ROUNDS_TO_WIN = 2;

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function resetRoundFighters(state) {
    state.player.x = 80;
    state.player.y = FLOOR_Y;
    state.player.hp = 100;
    state.player.stamina = 100;
    state.player.isAirborne = false;
    state.player.isCrouching = false;
    state.player.isBlocking = false;

    state.rival.x = 280;
    state.rival.y = FLOOR_Y;
    state.rival.hp = 100;
    state.rival.stamina = 100;
    state.rival.isAirborne = false;
    state.rival.isCrouching = false;
    state.rival.isBlocking = false;

    state.projectiles = [];
  }

  function createState(seed = 12345) {
    const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
    const state = {
      rng: s,
      stepCount: 0,
      round: 1,
      playerRounds: 0,
      rivalRounds: 0,
      scoreVal: 0,
      won: false,
      lost: false,
      player: {
        x: 80,
        y: FLOOR_Y,
        hp: 100,
        maxHp: 100,
        stamina: 100,
        maxStamina: 100,
        superGauge: 0,
        isAirborne: false,
        isCrouching: false,
        isBlocking: false
      },
      rival: {
        x: 280,
        y: FLOOR_Y,
        hp: 100,
        maxHp: 100,
        stamina: 100,
        maxStamina: 100,
        superGauge: 0,
        isAirborne: false,
        isCrouching: false,
        isBlocking: false
      },
      projectiles: []
    };

    return state;
  }

  function isOver(state) {
    return state.won || state.lost || state.playerRounds >= ROUNDS_TO_WIN || state.rivalRounds >= ROUNDS_TO_WIN || state.stepCount >= MAX_STEPS;
  }

  function legalActions(state) {
    if (isOver(state)) return [];

    const actions = [
      'step_forward', 'step_back', 'block', 'light_punch', 'heavy_kick'
    ];

    const p = state.player;

    if (!p.isAirborne) {
      actions.push('jump', 'crouch');
      if (p.stamina >= 20) actions.push('hadouken');
      if (p.stamina >= 30) actions.push('dragon_uppercut');
      if (p.superGauge >= 100) actions.push('super');
    }

    return actions;
  }

  function score(state) {
    return state.scoreVal;
  }

  function step(state, action) {
    if (isOver(state)) {
      throw new Error('Game is over; no actions allowed');
    }
    const legals = legalActions(state);
    if (!legals.includes(action)) {
      throw new Error(`Illegal action "${action}"`);
    }

    const prevScore = state.scoreVal;
    state.stepCount++;
    const p = state.player;
    const r = state.rival;

    // Reset temporary states
    p.isBlocking = false;
    p.isCrouching = false;
    r.isBlocking = false;
    r.isCrouching = false;

    // Passive stamina recovery
    p.stamina = Math.min(p.maxStamina, p.stamina + 10);
    r.stamina = Math.min(r.maxStamina, r.stamina + 10);

    // Land airborne fighters from previous jump turn
    if (p.isAirborne) {
      p.isAirborne = false;
      p.y = FLOOR_Y;
    }
    if (r.isAirborne) {
      r.isAirborne = false;
      r.y = FLOOR_Y;
    }

    // 1. Resolve Player Action
    let playerDealtDmg = 0;
    if (action === 'step_forward') {
      p.x = Math.min(r.x - 30, p.x + 28);
    } else if (action === 'step_back') {
      p.x = Math.max(20, p.x - 28);
    } else if (action === 'jump') {
      p.isAirborne = true;
      p.y = FLOOR_Y - 55;
      p.x = Math.min(r.x - 20, p.x + 20); // Jump forward slightly
    } else if (action === 'crouch') {
      p.isCrouching = true;
    } else if (action === 'block') {
      p.isBlocking = true;
    } else if (action === 'light_punch') {
      const dist = Math.abs(p.x - r.x);
      if (dist <= 48) {
        playerDealtDmg = 10;
        p.superGauge = Math.min(100, p.superGauge + 12);
      }
    } else if (action === 'heavy_kick') {
      const dist = Math.abs(p.x - r.x);
      if (dist <= 62) {
        playerDealtDmg = 24;
        p.superGauge = Math.min(100, p.superGauge + 20);
      }
    } else if (action === 'hadouken') {
      p.stamina -= 20;
      state.projectiles.push({
        x: p.x + 24,
        y: FLOOR_Y - 20,
        vx: 40,
        damage: 18,
        owner: 'player'
      });
    } else if (action === 'dragon_uppercut') {
      p.stamina -= 30;
      const dist = Math.abs(p.x - r.x);
      if (dist <= 50) {
        playerDealtDmg = r.isAirborne ? 45 : 30; // Massive bonus if striking airborne rival
        p.superGauge = Math.min(100, p.superGauge + 25);
      }
    } else if (action === 'super') {
      p.superGauge = 0;
      const dist = Math.abs(p.x - r.x);
      if (dist <= 80) {
        playerDealtDmg = 50; // Unblockable
      }
    }

    // 2. Rival AI Turn
    let rivalAction = 'step_forward';
    const dist = Math.abs(p.x - r.x);
    const aiRoll = nextRandom(state);

    if (p.isAirborne && dist <= 55 && r.stamina >= 30) {
      rivalAction = 'dragon_uppercut';
    } else if (r.superGauge >= 100 && dist <= 80) {
      rivalAction = 'super';
    } else if (dist <= 45) {
      if (aiRoll < 0.35) rivalAction = 'light_punch';
      else if (aiRoll < 0.65) rivalAction = 'heavy_kick';
      else if (aiRoll < 0.85) rivalAction = 'block';
      else rivalAction = 'step_back';
    } else if (dist <= 75) {
      if (aiRoll < 0.4) rivalAction = 'heavy_kick';
      else if (aiRoll < 0.7 && r.stamina >= 20) rivalAction = 'hadouken';
      else rivalAction = 'step_forward';
    } else {
      if (aiRoll < 0.5 && r.stamina >= 20) rivalAction = 'hadouken';
      else rivalAction = 'step_forward';
    }

    // Execute Rival Action
    let rivalDealtDmg = 0;
    if (rivalAction === 'step_forward') {
      r.x = Math.max(p.x + 30, r.x - 28);
    } else if (rivalAction === 'step_back') {
      r.x = Math.min(ARENA_WIDTH - 20, r.x + 28);
    } else if (rivalAction === 'block') {
      r.isBlocking = true;
    } else if (rivalAction === 'light_punch') {
      if (dist <= 48) {
        rivalDealtDmg = 10;
        r.superGauge = Math.min(100, r.superGauge + 12);
      }
    } else if (rivalAction === 'heavy_kick') {
      if (dist <= 62) {
        rivalDealtDmg = 24;
        r.superGauge = Math.min(100, r.superGauge + 20);
      }
    } else if (rivalAction === 'hadouken') {
      r.stamina -= 20;
      state.projectiles.push({
        x: r.x - 24,
        y: FLOOR_Y - 20,
        vx: -40,
        damage: 18,
        owner: 'rival'
      });
    } else if (rivalAction === 'dragon_uppercut') {
      r.stamina -= 30;
      if (dist <= 50) {
        rivalDealtDmg = p.isAirborne ? 45 : 30;
        r.superGauge = Math.min(100, r.superGauge + 25);
      }
    } else if (rivalAction === 'super') {
      r.superGauge = 0;
      if (dist <= 80) {
        rivalDealtDmg = 50;
      }
    }

    // 3. Projectile Collisions
    const remainingProjectiles = [];
    for (const pr of state.projectiles) {
      pr.x += pr.vx;
      if (pr.x < 10 || pr.x > ARENA_WIDTH - 10) continue;

      if (pr.owner === 'player') {
        if (Math.abs(pr.x - r.x) <= 22) {
          let dmg = pr.damage;
          if (r.isBlocking) dmg = Math.floor(dmg * 0.15);
          r.hp = Math.max(0, r.hp - dmg);
          state.scoreVal += dmg * 3;
          continue;
        }
      } else if (pr.owner === 'rival') {
        if (Math.abs(pr.x - p.x) <= 22) {
          let dmg = pr.damage;
          if (p.isBlocking) dmg = Math.floor(dmg * 0.15);
          p.hp = Math.max(0, p.hp - dmg);
          continue;
        }
      }
      remainingProjectiles.push(pr);
    }
    state.projectiles = remainingProjectiles;

    // 4. Apply Direct Melee Damage
    if (playerDealtDmg > 0) {
      let dmg = playerDealtDmg;
      if (r.isBlocking && action !== 'super') {
        dmg = Math.floor(dmg * 0.15);
      }
      r.hp = Math.max(0, r.hp - dmg);
      state.scoreVal += dmg * 4;
    }

    if (rivalDealtDmg > 0) {
      let dmg = rivalDealtDmg;
      if (p.isBlocking && rivalAction !== 'super') {
        dmg = Math.floor(dmg * 0.15);
      }
      p.hp = Math.max(0, p.hp - dmg);
    }

    // 5. Round Completion & Resolution
    if (r.hp <= 0 && p.hp > 0) {
      state.playerRounds++;
      state.scoreVal += 1000;
      if (state.playerRounds >= ROUNDS_TO_WIN) {
        state.won = true;
        state.scoreVal += 2000;
      } else {
        state.round++;
        resetRoundFighters(state);
      }
    } else if (p.hp <= 0 && r.hp > 0) {
      state.rivalRounds++;
      if (state.rivalRounds >= ROUNDS_TO_WIN) {
        state.lost = true;
      } else {
        state.round++;
        resetRoundFighters(state);
      }
    } else if (p.hp <= 0 && r.hp <= 0) {
      // Double KO: both get round
      state.playerRounds++;
      state.rivalRounds++;
      if (state.playerRounds >= ROUNDS_TO_WIN && state.rivalRounds < ROUNDS_TO_WIN) {
        state.won = true;
      } else if (state.rivalRounds >= ROUNDS_TO_WIN && state.playerRounds < ROUNDS_TO_WIN) {
        state.lost = true;
      } else if (state.playerRounds >= ROUNDS_TO_WIN && state.rivalRounds >= ROUNDS_TO_WIN) {
        state.won = true; // Tie break favors player
      } else {
        state.round++;
        resetRoundFighters(state);
      }
    }

    if (state.stepCount >= MAX_STEPS && !state.won) {
      if (state.playerRounds > state.rivalRounds) state.won = true;
      else state.lost = true;
    }

    const reward = state.scoreVal - prevScore;
    const done = isOver(state);
    return { reward, done };
  }

  return {
    createState,
    legalActions,
    step,
    isOver,
    score
  };
});
