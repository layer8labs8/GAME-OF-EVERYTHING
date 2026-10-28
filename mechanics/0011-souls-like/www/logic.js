// Ashen Knight - Souls-like deterministic logic
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AshenKnight = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX_STEPS = 400;

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function createState(seed = 12345) {
    const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
    const state = {
      rng: s,
      stepCount: 0,
      scoreVal: 0,
      won: false,
      lost: false,
      player: {
        hp: 100,
        maxHp: 100,
        stamina: 100,
        maxStamina: 100,
        flasks: 3
      },
      boss: {
        name: 'Ember Lord',
        hp: 250,
        maxHp: 250,
        poise: 100,
        maxPoise: 100,
        phase: 1,
        staggered: 0,
        windup: 0 // 0: ready/idle, 1: cleave windup, 2: leap slam windup, 3: flame shockwave
      }
    };

    return state;
  }

  function isOver(state) {
    return state.lost || state.won || state.player.hp <= 0 || state.boss.hp <= 0 || state.stepCount >= MAX_STEPS;
  }

  function legalActions(state) {
    if (isOver(state)) return [];

    const actions = ['rest'];
    const p = state.player;
    const b = state.boss;

    if (p.flasks > 0) actions.push('heal');

    if (p.stamina >= 15) {
      actions.push('light_slash', 'block');
    }
    if (p.stamina >= 20) {
      actions.push('parry');
    }
    if (p.stamina >= 25) {
      actions.push('dodge_roll');
    }
    if (p.stamina >= 30) {
      actions.push('heavy_thrust');
    }
    if (b.staggered > 0 && p.stamina >= 20) {
      actions.push('visceral_strike');
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
    const b = state.boss;

    let isDodging = false;
    let isParrying = false;
    let isBlocking = false;

    // Passive stamina recovery if not expending
    if (action === 'rest') {
      p.stamina = Math.min(p.maxStamina, p.stamina + 40);
    } else {
      p.stamina = Math.min(p.maxStamina, p.stamina + 8);
    }

    // 1. Resolve Player Action
    if (action === 'heal') {
      p.flasks--;
      p.hp = Math.min(p.maxHp, p.hp + 40);
    } else if (action === 'dodge_roll') {
      p.stamina -= 25;
      isDodging = true;
    } else if (action === 'parry') {
      p.stamina -= 20;
      isParrying = true;
    } else if (action === 'block') {
      p.stamina -= 15;
      isBlocking = true;
    } else if (action === 'light_slash') {
      p.stamina -= 15;
      const dmg = 15;
      b.hp = Math.max(0, b.hp - dmg);
      b.poise = Math.max(0, b.poise - 15);
      state.scoreVal += dmg * 3;
    } else if (action === 'heavy_thrust') {
      p.stamina -= 30;
      const dmg = 32;
      b.hp = Math.max(0, b.hp - dmg);
      b.poise = Math.max(0, b.poise - 35);
      state.scoreVal += dmg * 3;
    } else if (action === 'visceral_strike') {
      p.stamina -= 20;
      const dmg = 65;
      b.hp = Math.max(0, b.hp - dmg);
      b.staggered = 0; // Consumes stagger
      state.scoreVal += dmg * 4;
    }

    // Poise Break Check
    if (b.poise <= 0 && b.hp > 0) {
      b.staggered = 2; // Staggered for visceral opening
      b.poise = b.maxPoise;
      b.windup = 0; // Stagger cancels any telegraphed attack
      state.scoreVal += 200;
    }

    // Phase 2 Transition Check (at 50% HP)
    if (b.hp <= 125 && b.phase === 1 && b.hp > 0) {
      b.phase = 2;
      b.poise = b.maxPoise;
      b.staggered = 0;
      b.windup = 0;
      state.scoreVal += 500;
    }

    // 2. Boss AI Turn
    if (b.hp > 0) {
      if (b.staggered > 0) {
        b.staggered--;
      } else {
        if (b.windup === 0) {
          // Telegraph next attack
          const roll = nextRandom(state);
          if (b.phase === 1) {
            b.windup = roll < 0.6 ? 1 : 2; // 1: cleave, 2: leap slam
          } else {
            b.windup = roll < 0.5 ? 1 : 3; // 1: cleave, 3: flame shockwave
          }
        } else {
          // Execute telegraphed attack
          let incomingDmg = 20;
          if (b.windup === 2) incomingDmg = 30;
          if (b.windup === 3) incomingDmg = 42;

          b.windup = 0; // Attack executed

          if (isDodging) {
            // Invulnerability i-frames
            state.scoreVal += 50;
          } else if (isParrying) {
            // Deflected! Parried attack
            b.poise = Math.max(0, b.poise - 50);
            state.scoreVal += 150;
            if (b.poise <= 0) {
              b.staggered = 2;
              b.poise = b.maxPoise;
            }
          } else if (isBlocking) {
            // 75% damage mitigation
            const dmg = Math.floor(incomingDmg * 0.25);
            p.hp = Math.max(0, p.hp - dmg);
          } else {
            // Undefended strike!
            p.hp = Math.max(0, p.hp - incomingDmg);
          }
        }
      }
    }

    // 3. Victory & Defeat Resolution
    if (b.hp <= 0) {
      b.hp = 0;
      state.won = true;
      state.scoreVal += 3000 + p.flasks * 300;
    } else if (p.hp <= 0) {
      p.hp = 0;
      state.lost = true;
    }

    if (state.stepCount >= MAX_STEPS && !state.won) {
      state.lost = true;
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
