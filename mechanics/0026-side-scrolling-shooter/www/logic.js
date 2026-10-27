// Aero Striker - Side-scrolling Shooter deterministic logic
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AeroStriker = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ARENA_W = 400;
  const ARENA_H = 400;
  const MAX_STEPS = 160;
  const MAX_WAVES = 3;

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function spawnWave(state, wave) {
    const enemies = [];
    if (wave === 1) {
      enemies.push(
        { id: 'w1_s1', type: 'scout', x: 340, y: 120, hp: 15, maxHp: 15, speed: 12, damage: 8, cooldown: 1 },
        { id: 'w1_s2', type: 'scout', x: 380, y: 200, hp: 15, maxHp: 15, speed: 12, damage: 8, cooldown: 2 },
        { id: 'w1_s3', type: 'scout', x: 340, y: 280, hp: 15, maxHp: 15, speed: 12, damage: 8, cooldown: 3 }
      );
    } else if (wave === 2) {
      enemies.push(
        { id: 'w2_c1', type: 'corvette', x: 340, y: 140, hp: 40, maxHp: 40, speed: 6, damage: 16, cooldown: 2 },
        { id: 'w2_c2', type: 'corvette', x: 340, y: 260, hp: 40, maxHp: 40, speed: 6, damage: 16, cooldown: 2 },
        { id: 'w2_s1', type: 'scout', x: 380, y: 200, hp: 15, maxHp: 15, speed: 12, damage: 8, cooldown: 1 }
      );
    } else {
      enemies.push(
        { id: 'w3_boss', type: 'dreadnought', x: 320, y: 200, hp: 120, maxHp: 120, speed: 4, damage: 25, cooldown: 1 },
        { id: 'w3_c1', type: 'corvette', x: 370, y: 100, hp: 40, maxHp: 40, speed: 6, damage: 16, cooldown: 2 },
        { id: 'w3_c2', type: 'corvette', x: 370, y: 300, hp: 40, maxHp: 40, speed: 6, damage: 16, cooldown: 2 }
      );
    }
    return enemies;
  }

  function createState(seed = 12345) {
    const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
    const state = {
      rng: s,
      stepCount: 0,
      wave: 1,
      scoreVal: 0,
      won: false,
      lost: false,
      player: {
        x: 60,
        y: 200,
        hp: 100,
        maxHp: 100,
        missiles: 3,
        shields: 2,
        shieldTurns: 0
      },
      enemies: [],
      projectiles: [] // { id, x, y, vx, vy, damage, owner: 'player'|'enemy' }
    };

    state.enemies = spawnWave(state, 1);
    return state;
  }

  function isOver(state) {
    return state.lost || state.won || state.player.hp <= 0 || state.stepCount >= MAX_STEPS;
  }

  function legalActions(state) {
    if (isOver(state)) return [];

    const actions = ['move_up', 'move_down', 'move_forward', 'move_back', 'fire', 'rest'];
    const p = state.player;

    if (p.missiles > 0) {
      actions.push('missile');
    }
    if (p.shields > 0 && p.shieldTurns <= 0) {
      actions.push('barrier_shield');
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

    if (p.shieldTurns > 0) {
      p.shieldTurns--;
    }

    // 1. Resolve Player Action
    if (action === 'move_up') {
      p.y = Math.max(40, p.y - 28);
    } else if (action === 'move_down') {
      p.y = Math.min(360, p.y + 28);
    } else if (action === 'move_forward') {
      p.x = Math.min(340, p.x + 28);
    } else if (action === 'move_back') {
      p.x = Math.max(40, p.x - 28);
    } else if (action === 'rest') {
      p.hp = Math.min(p.maxHp, p.hp + 10);
    } else if (action === 'barrier_shield') {
      p.shields--;
      p.shieldTurns = 2; // Active for this turn and next
      state.scoreVal += 50;
    } else if (action === 'fire') {
      // Twin plasma bolts
      state.projectiles.push(
        { id: `p1_${state.stepCount}`, x: p.x + 16, y: p.y - 6, vx: 45, vy: 0, damage: 25, owner: 'player' },
        { id: `p2_${state.stepCount}`, x: p.x + 16, y: p.y + 6, vx: 45, vy: 0, damage: 25, owner: 'player' }
      );
    } else if (action === 'missile') {
      p.missiles--;
      // Find highest threat enemy
      let bestTarget = state.enemies[0];
      for (const e of state.enemies) {
        if (e.hp > (bestTarget ? bestTarget.hp : 0)) {
          bestTarget = e;
        }
      }
      let vy = 0;
      if (bestTarget) {
        vy = Math.sign(bestTarget.y - p.y) * 12;
      }
      state.projectiles.push(
        { id: `m_${state.stepCount}`, x: p.x + 16, y: p.y, vx: 35, vy, damage: 45, owner: 'player', isMissile: true }
      );
      state.scoreVal += 30;
    }

    // 2. Projectile Movement & Collisions
    const remainingProjectiles = [];
    for (const pr of state.projectiles) {
      pr.x += pr.vx;
      pr.y += pr.vy;

      // Offscreen culling
      if (pr.x < 10 || pr.x > ARENA_W + 10 || pr.y < 10 || pr.y > ARENA_H + 10) {
        continue;
      }

      let hit = false;
      if (pr.owner === 'player') {
        for (const e of state.enemies) {
          const hitRadius = e.type === 'dreadnought' ? 38 : e.type === 'corvette' ? 24 : 16;
          const dist = Math.hypot(e.x - pr.x, e.y - pr.y);
          if (dist <= hitRadius) {
            e.hp -= pr.damage;
            state.scoreVal += pr.damage * 2;
            hit = true;
            break;
          }
        }
      } else {
        // Enemy bullet hitting player
        const dist = Math.hypot(p.x - pr.x, p.y - pr.y);
        if (dist <= 18) {
          hit = true;
          if (p.shieldTurns <= 0) {
            p.hp = Math.max(0, p.hp - pr.damage);
          }
        }
      }

      if (!hit) {
        remainingProjectiles.push(pr);
      }
    }
    state.projectiles = remainingProjectiles;

    // 3. Enemy AI Movement & Firing
    for (const e of state.enemies) {
      if (e.type === 'scout') {
        // Oscillate y, advance left
        e.x = Math.max(140, e.x - 10);
        e.y += Math.sin(state.stepCount + e.x) * 14;
        e.y = Math.max(50, Math.min(350, e.y));

        if (e.cooldown <= 0) {
          state.projectiles.push({
            id: `ep_${state.stepCount}_${e.id}`,
            x: e.x - 14,
            y: e.y,
            vx: -24,
            vy: 0,
            damage: e.damage,
            owner: 'enemy'
          });
          e.cooldown = 2;
        } else {
          e.cooldown--;
        }
      } else if (e.type === 'corvette') {
        // Vertical strafe
        if (state.stepCount % 4 < 2) e.y = Math.min(340, e.y + 10);
        else e.y = Math.max(60, e.y - 10);

        if (e.cooldown <= 0) {
          // 3-way spread
          state.projectiles.push(
            { id: `cp1_${state.stepCount}_${e.id}`, x: e.x - 20, y: e.y, vx: -20, vy: -6, damage: e.damage, owner: 'enemy' },
            { id: `cp2_${state.stepCount}_${e.id}`, x: e.x - 20, y: e.y, vx: -22, vy: 0, damage: e.damage, owner: 'enemy' },
            { id: `cp3_${state.stepCount}_${e.id}`, x: e.x - 20, y: e.y, vx: -20, vy: 6, damage: e.damage, owner: 'enemy' }
          );
          e.cooldown = 3;
        } else {
          e.cooldown--;
        }
      } else if (e.type === 'dreadnought') {
        // Slow vertical tracking of player y
        if (p.y > e.y + 10) e.y = Math.min(320, e.y + e.speed);
        else if (p.y < e.y - 10) e.y = Math.max(80, e.y - e.speed);

        if (e.cooldown <= 0) {
          // Heavy laser barrage
          state.projectiles.push(
            { id: `bp1_${state.stepCount}`, x: e.x - 30, y: e.y - 16, vx: -26, vy: 0, damage: e.damage, owner: 'enemy' },
            { id: `bp2_${state.stepCount}`, x: e.x - 30, y: e.y + 16, vx: -26, vy: 0, damage: e.damage, owner: 'enemy' }
          );
          e.cooldown = 2;
        } else {
          e.cooldown--;
        }
      }

      // Contact crash check
      const contactRadius = e.type === 'dreadnought' ? 36 : e.type === 'corvette' ? 22 : 14;
      if (Math.hypot(p.x - e.x, p.y - e.y) <= contactRadius) {
        if (p.shieldTurns <= 0) {
          p.hp = Math.max(0, p.hp - e.damage);
        }
      }
    }

    // 4. Enemy Defeat Check
    const survivingEnemies = [];
    let dreadnoughtDown = false;
    for (const e of state.enemies) {
      if (e.hp <= 0) {
        state.scoreVal += e.type === 'dreadnought' ? 2000 : e.type === 'corvette' ? 300 : 100;
        if (e.type === 'dreadnought') {
          dreadnoughtDown = true;
        }
      } else {
        survivingEnemies.push(e);
      }
    }
    state.enemies = survivingEnemies;

    // 5. Wave Progression & Victory Check
    if (state.enemies.length === 0 && p.hp > 0) {
      if (state.wave < MAX_WAVES) {
        state.wave++;
        p.hp = Math.min(p.maxHp, p.hp + 30);
        p.missiles = Math.min(4, p.missiles + 2);
        p.shields = Math.min(3, p.shields + 1);
        state.scoreVal += state.wave * 500;
        state.enemies = spawnWave(state, state.wave);
      } else {
        state.won = true;
        state.scoreVal += 3500;
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
