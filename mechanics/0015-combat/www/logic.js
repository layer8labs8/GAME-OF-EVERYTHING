// Brawler Strike - Combat deterministic logic
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BrawlerStrike = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX_STEPS = 160;
  const MAX_RINGS = 3;

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function spawnRingOpponents(state, ring) {
    const enemies = [];
    if (ring === 1) {
      enemies.push(
        { id: 'r1_b1', type: 'brawler', x: 250, hp: 30, maxHp: 30, damage: 8, stunned: 0, windup: 0 },
        { id: 'r1_b2', type: 'brawler', x: 310, hp: 30, maxHp: 30, damage: 8, stunned: 0, windup: 0 }
      );
    } else if (ring === 2) {
      enemies.push(
        { id: 'r2_k1', type: 'kickboxer', x: 260, hp: 50, maxHp: 50, damage: 14, stunned: 0, windup: 0 },
        { id: 'r2_b1', type: 'brawler', x: 320, hp: 35, maxHp: 35, damage: 8, stunned: 0, windup: 0 }
      );
    } else {
      enemies.push(
        { id: 'r3_champion', type: 'champion', x: 280, hp: 120, maxHp: 120, damage: 25, stunned: 0, windup: 1 },
        { id: 'r3_k1', type: 'kickboxer', x: 340, hp: 50, maxHp: 50, damage: 14, stunned: 0, windup: 0 }
      );
    }
    return enemies;
  }

  function createState(seed = 12345) {
    const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
    const state = {
      rng: s,
      stepCount: 0,
      ring: 1,
      scoreVal: 0,
      won: false,
      lost: false,
      player: {
        x: 120,
        hp: 100,
        maxHp: 100,
        stamina: 100,
        maxStamina: 100,
        stance: 'high', // 'high' or 'low'
        combo: 0
      },
      enemies: []
    };

    state.enemies = spawnRingOpponents(state, 1);
    return state;
  }

  function isOver(state) {
    return state.lost || state.won || state.player.hp <= 0 || state.stepCount >= MAX_STEPS;
  }

  function legalActions(state) {
    if (isOver(state)) return [];

    const actions = ['shift_stance', 'breathe'];
    const p = state.player;

    if (p.stamina >= 5) actions.push('jab');
    if (p.stamina >= 10) actions.push('counter_parry');
    if (p.stamina >= 10) actions.push('dodge');

    if (p.stance === 'high') {
      if (p.stamina >= 15) actions.push('heavy_kick');
    } else {
      if (p.stamina >= 12) actions.push('sweep');
    }

    // Grab throw requires at least one enemy in close range (<= 50px)
    const hasCloseEnemy = state.enemies.some(e => Math.abs(e.x - p.x) <= 50);
    if (p.stamina >= 20 && hasCloseEnemy) {
      actions.push('grab_throw');
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

    let isDodging = false;
    let isParrying = false;
    let parrySucceeded = false;

    // 1. Resolve Fighter Martial Action
    if (action === 'shift_stance') {
      p.stance = p.stance === 'high' ? 'low' : 'high';
      p.stamina = Math.min(p.maxStamina, p.stamina + 5);
    } else if (action === 'breathe') {
      p.stamina = Math.min(p.maxStamina, p.stamina + 40);
      p.combo = 0; // Combo drops during deliberate breath
    } else if (action === 'dodge') {
      p.stamina -= 10;
      isDodging = true;
      p.x = Math.max(50, p.x - 20); // Quick backstep
    } else if (action === 'counter_parry') {
      p.stamina -= 10;
      isParrying = true;
    } else if (action === 'jab') {
      p.stamina -= 5;
      p.combo++;
      const target = state.enemies[0];
      if (target && Math.abs(target.x - p.x) <= 65) {
        const dmg = 8 + Math.min(10, p.combo * 2);
        target.hp -= dmg;
        state.scoreVal += dmg * 2;
      }
    } else if (action === 'heavy_kick') {
      p.stamina -= 15;
      p.combo++;
      const target = state.enemies[0];
      if (target && Math.abs(target.x - p.x) <= 80) {
        const dmg = 24 + p.combo * 3;
        target.hp -= dmg;
        target.x += 35; // Knockback
        state.scoreVal += dmg * 2;
      }
    } else if (action === 'sweep') {
      p.stamina -= 12;
      p.combo++;
      const target = state.enemies[0];
      if (target && Math.abs(target.x - p.x) <= 75) {
        const dmg = 16 + p.combo * 2;
        target.hp -= dmg;
        target.stunned = 2; // Trip knockdown stuns for 2 turns
        state.scoreVal += dmg * 2 + 50;
      }
    } else if (action === 'grab_throw') {
      p.stamina -= 20;
      p.combo += 2;
      const target = state.enemies[0];
      if (target && Math.abs(target.x - p.x) <= 50) {
        const dmg = 32 + p.combo * 3;
        target.hp -= dmg;
        target.x += 60; // Hurled back
        target.stunned = 2;
        state.scoreVal += dmg * 3;

        // Splash knockdown onto second enemy
        if (state.enemies[1]) {
          state.enemies[1].hp -= 15;
          state.enemies[1].stunned = 1;
        }
      }
    }

    // 2. Opponents AI & Strike Turn
    let incomingAttack = false;
    for (const e of state.enemies) {
      if (e.stunned > 0) {
        e.stunned--;
        continue;
      }

      const dist = Math.abs(e.x - p.x);
      const reach = e.type === 'champion' ? 65 : 45;

      if (dist <= reach) {
        incomingAttack = true;

        if (isParrying) {
          parrySucceeded = true;
          // Counter strike immediately triggered
          e.hp -= 35;
          e.stunned = 2;
          p.stamina = Math.min(p.maxStamina, p.stamina + 20);
          state.scoreVal += 250;
        } else if (!isDodging) {
          // Player takes hit
          p.hp = Math.max(0, p.hp - e.damage);
          p.combo = 0; // Combo shattered
        }
      } else {
        // Advance toward player
        const speed = e.type === 'champion' ? 14 : 18;
        e.x = Math.max(p.x + 35, e.x - speed);
      }
    }

    // If parry was held but nobody attacked, minor stamina penalty
    if (isParrying && !parrySucceeded) {
      p.combo = 0;
    }

    // 3. Remove knocked out opponents
    let championDefeated = false;
    const remainingEnemies = [];
    for (const e of state.enemies) {
      if (e.hp <= 0) {
        state.scoreVal += e.type === 'champion' ? 1200 : e.type === 'kickboxer' ? 300 : 150;
        if (e.type === 'champion') {
          championDefeated = true;
        }
      } else {
        remainingEnemies.push(e);
      }
    }
    state.enemies = remainingEnemies;

    // 4. Ring Progression & Victory
    if (state.enemies.length === 0 && p.hp > 0) {
      if (state.ring < MAX_RINGS) {
        state.ring++;
        p.hp = Math.min(p.maxHp, p.hp + 35);
        p.stamina = p.maxStamina;
        p.combo = 0;
        p.x = 120;
        state.scoreVal += state.ring * 500;
        state.enemies = spawnRingOpponents(state, state.ring);
      } else {
        state.won = true;
        state.scoreVal += 3000;
      }
    }

    if (p.hp <= 0) {
      p.hp = 0;
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
