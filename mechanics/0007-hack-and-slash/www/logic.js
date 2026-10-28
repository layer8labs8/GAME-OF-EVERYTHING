// Blade Mirage - Hack and Slash deterministic logic
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BladeMirage = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ARENA_WIDTH = 400;
  const FLOOR_Y = 320;
  const MAX_WAVES = 5;
  const MAX_STEPS = 500;

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function spawnEnemiesForWave(state, wave) {
    const enemies = [];
    let idCounter = 1;

    function addEnemy(type, x, y, hp, maxHp, speed, damage) {
      enemies.push({
        id: `w${wave}_e${idCounter++}`,
        type,
        x,
        y,
        hp,
        maxHp,
        speed,
        damage,
        windup: 0,
        stunned: 0,
        facing: -1
      });
    }

    if (wave === 1) {
      addEnemy('grunt', 250, FLOOR_Y, 30, 30, 8, 10);
      addEnemy('grunt', 330, FLOOR_Y, 30, 30, 8, 10);
      addEnemy('grunt', 380, FLOOR_Y, 30, 30, 8, 10);
    } else if (wave === 2) {
      addEnemy('grunt', 260, FLOOR_Y, 35, 35, 9, 12);
      addEnemy('specter', 320, FLOOR_Y - 70, 25, 25, 12, 14);
      addEnemy('grunt', 370, FLOOR_Y, 35, 35, 9, 12);
      addEnemy('specter', 390, FLOOR_Y - 70, 25, 25, 12, 14);
    } else if (wave === 3) {
      addEnemy('grunt', 240, FLOOR_Y, 40, 40, 10, 12);
      addEnemy('specter', 300, FLOOR_Y - 70, 30, 30, 12, 14);
      addEnemy('knight', 360, FLOOR_Y, 70, 70, 6, 20);
    } else if (wave === 4) {
      addEnemy('specter', 230, FLOOR_Y - 70, 35, 35, 12, 15);
      addEnemy('knight', 310, FLOOR_Y, 75, 75, 6, 20);
      addEnemy('specter', 360, FLOOR_Y - 70, 35, 35, 12, 15);
      addEnemy('knight', 390, FLOOR_Y, 75, 75, 6, 20);
    } else {
      // Wave 5 - Climax
      addEnemy('grunt', 220, FLOOR_Y, 45, 45, 10, 14);
      addEnemy('knight', 290, FLOOR_Y, 85, 85, 7, 22);
      addEnemy('specter', 340, FLOOR_Y - 70, 40, 40, 14, 16);
      addEnemy('knight', 390, FLOOR_Y, 90, 90, 7, 24);
    }
    return enemies;
  }

  function createState(seed = 12345) {
    const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
    const state = {
      rng: s,
      stepCount: 0,
      player: {
        x: 60,
        y: FLOOR_Y,
        facing: 1, // 1: right, -1: left
        hp: 100,
        maxHp: 100,
        stamina: 100,
        maxStamina: 100,
        isAirborne: false,
        combo: 0,
        comboTimer: 0,
        parryActive: false
      },
      wave: 1,
      enemies: [],
      scoreVal: 0,
      kills: 0,
      victory: false,
      defeated: false
    };
    state.enemies = spawnEnemiesForWave(state, 1);
    return state;
  }

  function isOver(state) {
    return state.defeated || state.victory || state.player.hp <= 0 || state.stepCount >= MAX_STEPS;
  }

  function legalActions(state) {
    if (isOver(state)) return [];

    const actions = ['move_left', 'move_right', 'rest', 'idle'];
    const p = state.player;

    if (!p.isAirborne) {
      actions.push('jump');
      if (p.stamina >= 10) actions.push('slash');
      if (p.stamina >= 25) actions.push('dash_strike');
      if (p.stamina >= 15) actions.push('parry');
    } else {
      if (p.stamina >= 15) actions.push('air_slash');
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

    // Reset parry from previous step
    p.parryActive = false;

    // Decay combo timer
    if (p.comboTimer > 0) {
      p.comboTimer--;
      if (p.comboTimer === 0) p.combo = 0;
    }

    // Passive stamina regeneration if not exhausting
    if (action !== 'dash_strike' && action !== 'slash' && action !== 'air_slash' && action !== 'parry') {
      p.stamina = Math.min(p.maxStamina, p.stamina + 5);
    }

    // Resolve Player Action
    if (action === 'move_left') {
      p.x = Math.max(30, p.x - 30);
      p.facing = -1;
      if (p.isAirborne) {
        p.isAirborne = false;
        p.y = FLOOR_Y;
      }
    } else if (action === 'move_right') {
      p.x = Math.min(ARENA_WIDTH - 30, p.x + 30);
      p.facing = 1;
      if (p.isAirborne) {
        p.isAirborne = false;
        p.y = FLOOR_Y;
      }
    } else if (action === 'jump') {
      p.isAirborne = true;
      p.y = FLOOR_Y - 70;
    } else if (action === 'rest') {
      p.stamina = Math.min(p.maxStamina, p.stamina + 35);
      if (p.isAirborne) {
        p.isAirborne = false;
        p.y = FLOOR_Y;
      }
    } else if (action === 'idle') {
      if (p.isAirborne) {
        p.isAirborne = false;
        p.y = FLOOR_Y;
      }
    } else if (action === 'parry') {
      p.stamina -= 15;
      p.parryActive = true;
      if (p.isAirborne) {
        p.isAirborne = false;
        p.y = FLOOR_Y;
      }
    } else if (action === 'slash') {
      p.stamina -= 10;
      p.combo = (p.combo % 3) + 1;
      p.comboTimer = 3;

      let slashDamage = 15;
      let reach = 55;
      if (p.combo === 2) slashDamage = 25;
      if (p.combo === 3) {
        slashDamage = 45;
        reach = 70;
      }

      for (const e of state.enemies) {
        const dx = (e.x - p.x) * p.facing;
        const dy = Math.abs(e.y - p.y);
        if (dx >= 0 && dx <= reach && dy <= 40) {
          let dmg = slashDamage;
          if (e.type === 'knight' && e.facing !== p.facing && e.stunned <= 0) {
            dmg = Math.floor(dmg * 0.4);
          }
          e.hp -= dmg;
          if (p.combo === 3) {
            e.x = Math.max(20, Math.min(ARENA_WIDTH - 20, e.x + p.facing * 35));
            e.stunned = 1;
          }
          state.scoreVal += dmg * (p.combo * 2);
        }
      }
    } else if (action === 'air_slash') {
      p.stamina -= 15;
      p.isAirborne = false;
      p.y = FLOOR_Y;
      p.combo++;
      p.comboTimer = 3;

      for (const e of state.enemies) {
        const dist = Math.hypot(e.x - p.x, e.y - p.y);
        if (dist <= 65) {
          const dmg = 35;
          e.hp -= dmg;
          e.stunned = 1;
          state.scoreVal += dmg * 3;
        }
      }
    } else if (action === 'dash_strike') {
      p.stamina -= 25;
      const startX = p.x;
      const targetX = Math.max(30, Math.min(ARENA_WIDTH - 30, p.x + p.facing * 100));
      p.x = targetX;
      if (p.isAirborne) {
        p.isAirborne = false;
        p.y = FLOOR_Y;
      }
      p.combo++;
      p.comboTimer = 3;

      const minX = Math.min(startX, targetX);
      const maxX = Math.max(startX, targetX);
      for (const e of state.enemies) {
        if (e.x >= minX - 20 && e.x <= maxX + 20 && Math.abs(e.y - p.y) <= 40) {
          const dmg = 32;
          e.hp -= dmg;
          e.stunned = 1;
          state.scoreVal += dmg * 4;
        }
      }
    }

    // Remove slain enemies
    const aliveEnemies = [];
    for (const e of state.enemies) {
      if (e.hp <= 0) {
        state.kills++;
        state.scoreVal += (e.type === 'knight' ? 150 : e.type === 'specter' ? 80 : 50);
      } else {
        aliveEnemies.push(e);
      }
    }
    state.enemies = aliveEnemies;

    // Enemy AI & Attack Turn
    for (const e of state.enemies) {
      if (e.stunned > 0) {
        e.stunned--;
        continue;
      }

      // Orient toward player
      e.facing = e.x < p.x ? 1 : -1;

      const dist = Math.hypot(e.x - p.x, e.y - p.y);
      const attackRange = e.type === 'specter' ? 50 : 40;

      if (dist <= attackRange) {
        if (e.windup === 0) {
          e.windup = 1;
        } else {
          e.windup = 0;
          if (p.parryActive) {
            e.stunned = 2;
            const counterDmg = 25;
            e.hp -= counterDmg;
            p.stamina = Math.min(p.maxStamina, p.stamina + 20);
            state.scoreVal += 100;
          } else {
            p.hp = Math.max(0, p.hp - e.damage);
            p.combo = 0;
          }
        }
      } else {
        e.windup = 0;
        const dx = p.x - e.x;
        const moveDist = Math.sign(dx) * Math.min(Math.abs(dx), e.speed);
        e.x = Math.max(20, Math.min(ARENA_WIDTH - 20, e.x + moveDist));

        if (e.type === 'specter') {
          e.y = FLOOR_Y - (p.isAirborne ? 70 : 40);
        }
      }
    }

    // Clean up any enemies slain by parry counter
    state.enemies = state.enemies.filter(e => {
      if (e.hp <= 0) {
        state.kills++;
        state.scoreVal += (e.type === 'knight' ? 150 : e.type === 'specter' ? 80 : 50);
        return false;
      }
      return true;
    });

    // Wave Progression
    if (state.enemies.length === 0) {
      if (state.wave < MAX_WAVES) {
        state.wave++;
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + 20);
        state.player.stamina = state.player.maxStamina;
        state.scoreVal += state.wave * 200;
        state.enemies = spawnEnemiesForWave(state, state.wave);
      } else {
        state.victory = true;
        state.scoreVal += 1000;
      }
    }

    if (p.hp <= 0) {
      p.hp = 0;
      state.defeated = true;
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
