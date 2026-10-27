// Rail Phantom - On-Rails Shooter deterministic logic
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RailPhantom = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX_STEPS = 100;

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
      nextEnemyId: 1,
      distance: 0,
      targetDistance: 1000,
      player: {
        x: 0, // -2, -1, 0, 1, 2
        y: 0, // -1, 0, 1
        hp: 100,
        maxHp: 100,
        energy: 100,
        maxEnergy: 100,
        heat: 0,
        maxHeat: 100,
        missiles: 4,
        barrelRolling: false
      },
      enemies: [],
      boss: null,
      scoreVal: 0,
      won: false,
      lost: false,
      lastEvent: 'Mission start: Sector Sigma conduit approach'
    };

    // Pre-populate initial wave of 2 scout drones at distance
    spawnEnemy(state, -1, 0, 5, 'scout');
    spawnEnemy(state, 1, 0, 7, 'scout');

    return state;
  }

  function spawnEnemy(state, x, y, z, type) {
    const hp = type === 'interceptor' ? 50 : 30;
    const enemyId = state.nextEnemyId++;
    state.enemies.push({
      id: enemyId,
      type: type,
      x: x,
      y: y,
      z: z,
      hp: hp,
      maxHp: hp,
      scoreReward: type === 'interceptor' ? 150 : 80
    });
  }

  function legalActions(state) {
    if (state.won || state.lost || state.stepCount >= MAX_STEPS) {
      return [];
    }

    const actions = [];
    if (state.player.y > -1) actions.push('move_up');
    if (state.player.y < 1) actions.push('move_down');
    if (state.player.x > -2) actions.push('move_left');
    if (state.player.x < 2) actions.push('move_right');

    if (state.player.heat < 80) {
      actions.push('fire_blaster');
    }
    if (state.player.missiles > 0) {
      actions.push('lock_missile');
    }
    if (state.player.energy >= 25) {
      actions.push('barrel_roll');
    }
    if (state.player.energy >= 20) {
      actions.push('boost');
    }
    actions.push('vent_heat');

    return actions;
  }

  function isOver(state) {
    return state.won || state.lost || state.stepCount >= MAX_STEPS;
  }

  function score(state) {
    return state.scoreVal;
  }

  function step(state, action) {
    const valid = legalActions(state);
    if (!valid.includes(action)) {
      throw new Error('Illegal action: ' + action);
    }

    state.stepCount++;
    let reward = 5; // small survival reward
    let distStep = 15;
    state.player.barrelRolling = false;

    // 1. Process Player Action
    if (action === 'move_up') {
      state.player.y = Math.max(-1, state.player.y - 1);
      state.lastEvent = 'Evasive climb';
    } else if (action === 'move_down') {
      state.player.y = Math.min(1, state.player.y + 1);
      state.lastEvent = 'Evasive dive';
    } else if (action === 'move_left') {
      state.player.x = Math.max(-2, state.player.x - 1);
      state.lastEvent = 'Banking port';
    } else if (action === 'move_right') {
      state.player.x = Math.min(2, state.player.x + 1);
      state.lastEvent = 'Banking starboard';
    } else if (action === 'fire_blaster') {
      state.player.heat = Math.min(state.player.maxHeat, state.player.heat + 20);
      let hitTarget = false;

      if (state.boss && state.boss.active) {
        if (state.player.x < 0 && state.boss.leftGen > 0) {
          state.boss.leftGen = Math.max(0, state.boss.leftGen - 35);
          hitTarget = true;
          reward += 40;
          state.scoreVal += 40;
          state.lastEvent = 'Blasters hit Boss Left Generator';
        } else if (state.player.x > 0 && state.boss.rightGen > 0) {
          state.boss.rightGen = Math.max(0, state.boss.rightGen - 35);
          hitTarget = true;
          reward += 40;
          state.scoreVal += 40;
          state.lastEvent = 'Blasters hit Boss Right Generator';
        } else if (state.player.x === 0) {
          if (state.boss.leftGen <= 0 && state.boss.rightGen <= 0) {
            state.boss.core = Math.max(0, state.boss.core - 40);
            hitTarget = true;
            reward += 60;
            state.scoreVal += 60;
            state.lastEvent = 'CRITICAL HIT on Dreadnought Core!';
          } else {
            state.boss.core = Math.max(0, state.boss.core - 10);
            hitTarget = true;
            reward += 10;
            state.scoreVal += 10;
            state.lastEvent = 'Shields absorbed blaster fire';
          }
        }
      } else {
        // Target closest enemy in line of sight (matching x and y or nearby x)
        let bestIdx = -1;
        let minZ = 999;
        for (let i = 0; i < state.enemies.length; i++) {
          const e = state.enemies[i];
          if (e.x === state.player.x && e.y === state.player.y && e.z < minZ) {
            minZ = e.z;
            bestIdx = i;
          }
        }
        if (bestIdx === -1) {
          for (let i = 0; i < state.enemies.length; i++) {
            const e = state.enemies[i];
            if (Math.abs(e.x - state.player.x) <= 1 && e.y === state.player.y && e.z < minZ) {
              minZ = e.z;
              bestIdx = i;
            }
          }
        }
        if (bestIdx !== -1) {
          const target = state.enemies[bestIdx];
          target.hp -= 35;
          hitTarget = true;
          if (target.hp <= 0) {
            reward += target.scoreReward;
            state.scoreVal += target.scoreReward;
            state.lastEvent = 'Destroyed enemy ' + target.type + '!';
            state.enemies.splice(bestIdx, 1);
          } else {
            reward += 20;
            state.scoreVal += 20;
            state.lastEvent = 'Blasters hit enemy ' + target.type;
          }
        } else {
          state.lastEvent = 'Plasma bolt discharged into conduit void';
        }
      }
    } else if (action === 'lock_missile') {
      state.player.missiles--;
      reward += 30;
      state.lastEvent = 'Homing missiles launched!';

      if (state.boss && state.boss.active) {
        if (state.boss.leftGen > 0) state.boss.leftGen = Math.max(0, state.boss.leftGen - 30);
        if (state.boss.rightGen > 0) state.boss.rightGen = Math.max(0, state.boss.rightGen - 30);
        if (state.boss.leftGen <= 0 && state.boss.rightGen <= 0) {
          state.boss.core = Math.max(0, state.boss.core - 45);
        }
        reward += 50;
        state.scoreVal += 50;
      } else {
        // Damage all visible enemies
        for (let i = state.enemies.length - 1; i >= 0; i--) {
          const e = state.enemies[i];
          e.hp -= 40;
          if (e.hp <= 0) {
            reward += e.scoreReward;
            state.scoreVal += e.scoreReward;
            state.enemies.splice(i, 1);
          }
        }
      }
    } else if (action === 'barrel_roll') {
      state.player.energy -= 25;
      state.player.barrelRolling = true;
      state.lastEvent = 'Deflector barrel roll initiated!';
    } else if (action === 'boost') {
      state.player.energy -= 20;
      distStep = 35;
      state.lastEvent = 'Sub-light booster ignited (+35m)';
    } else if (action === 'vent_heat') {
      state.player.heat = Math.max(0, state.player.heat - 40);
      state.player.energy = Math.min(state.player.maxEnergy, state.player.energy + 25);
      state.lastEvent = 'Thermal vents cleared and capacitors replenished';
    }

    // 2. Advance Rail Distance & Energy
    state.distance += distStep;
    state.player.heat = Math.max(0, state.player.heat - 5);
    state.player.energy = Math.min(state.player.maxEnergy, state.player.energy + 10);

    // 3. Enemy Spawns & Boss Trigger
    if (state.distance >= 750 && !state.boss) {
      state.boss = {
        active: true,
        z: 6,
        leftGen: 60,
        rightGen: 60,
        core: 120,
        attackTimer: 0
      };
      state.enemies = []; // Clear grunts for boss fight
      state.lastEvent = 'WARNING: Giga Dreadnought flagship intercepted!';
    } else if (!state.boss && state.enemies.length < 4) {
      if (nextRandom(state) < 0.65) {
        const type = nextRandom(state) < 0.4 ? 'interceptor' : 'scout';
        const ex = Math.floor(nextRandom(state) * 5) - 2;
        const ey = Math.floor(nextRandom(state) * 3) - 1;
        const ez = 6 + Math.floor(nextRandom(state) * 3);
        spawnEnemy(state, ex, ey, ez, type);
      }
    }

    // 4. Enemy Movement & Attack Phase
    if (state.boss && state.boss.active) {
      state.boss.attackTimer++;
      if (state.boss.attackTimer % 2 === 0) {
        if (!state.player.barrelRolling) {
          state.player.hp = Math.max(0, state.player.hp - 18);
          reward -= 18;
          state.lastEvent = 'Dreadnought plasma beam strikes your hull!';
        } else {
          state.lastEvent = 'Barrel roll deflected Dreadnought plasma beam!';
        }
      }

      if (state.boss.core <= 0) {
        state.boss.active = false;
        state.scoreVal += 1000;
        reward += 1000;
        state.lastEvent = 'Dreadnought reactor core detonated!';
      }
    } else {
      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const e = state.enemies[i];
        e.z -= 1;
        if (e.z <= 0) {
          // Attacking player upon passing
          if (Math.abs(e.x - state.player.x) <= 1 && e.y === state.player.y) {
            if (!state.player.barrelRolling) {
              const dmg = e.type === 'interceptor' ? 20 : 12;
              state.player.hp = Math.max(0, state.player.hp - dmg);
              reward -= dmg;
              state.lastEvent = 'Hit by enemy ' + e.type + ' strafe!';
            } else {
              state.lastEvent = 'Barrel roll deflected enemy fire!';
            }
          }
          state.enemies.splice(i, 1);
        }
      }
    }

    // 5. Victory & Defeat Checks
    if ((state.boss && !state.boss.active && state.distance >= 1000) || state.distance >= 1200) {
      state.won = true;
      const winReward = 800 + state.player.hp * 5;
      state.scoreVal += winReward;
      reward += winReward;
      state.lastEvent = 'SECTOR CLEARED: Hyperspace conduit opened!';
      return { reward, done: true };
    }

    if (state.player.hp <= 0) {
      state.lost = true;
      reward -= 150;
      state.lastEvent = 'CRITICAL FAILURE: Starfighter hull collapsed!';
      return { reward, done: true };
    }

    if (state.stepCount >= MAX_STEPS) {
      state.lost = true;
      reward -= 50;
      state.lastEvent = 'Conduit energy collapsed: Mission timed out';
      return { reward, done: true };
    }

    return { reward, done: false };
  }

  return {
    MAX_STEPS,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
});
