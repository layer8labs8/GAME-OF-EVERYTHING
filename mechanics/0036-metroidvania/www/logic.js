// Metroidvania ("Chasm Crawler") deterministic logic
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ChasmCrawler = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX_STEPS = 160;

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
        x: 50,
        y: 340,
        facing: 1, // 1: right, -1: left
        hp: 100,
        maxHp: 100,
        missiles: 0,
        hasMissileUpgrade: false,
        hasDoubleJump: false,
        hasPhaseDash: false,
        isAirborne: false
      },
      upgrades: [
        { id: 'up_missile', type: 'missile', x: 130, y: 340, collected: false },
        { id: 'up_doublejump', type: 'double_jump', x: 340, y: 340, collected: false },
        { id: 'up_phasedash', type: 'phase_dash', x: 230, y: 180, collected: false }
      ],
      gates: [
        { id: 'door_red', type: 'red_door', x: 180, y: 340, open: false },
        { id: 'laser_gate', type: 'laser_gate', x: 160, y: 180, open: false }
      ],
      enemies: [
        { id: 'c1', type: 'crawler', x: 100, y: 340, hp: 20, maxHp: 20, speed: 10, damage: 8, facing: -1 },
        { id: 'c2', type: 'crawler', x: 260, y: 340, hp: 25, maxHp: 25, speed: 10, damage: 10, facing: -1 },
        { id: 's1', type: 'skitter', x: 310, y: 200, hp: 30, maxHp: 30, speed: 14, damage: 12, facing: -1 },
        { id: 'boss', type: 'guardian', x: 80, y: 140, hp: 120, maxHp: 120, speed: 6, damage: 20, cooldown: 1 }
      ],
      projectiles: []
    };

    return state;
  }

  function isOver(state) {
    return state.lost || state.won || state.player.hp <= 0 || state.stepCount >= MAX_STEPS;
  }

  function legalActions(state) {
    if (isOver(state)) return [];

    const actions = ['move_left', 'move_right', 'fire', 'rest'];
    const p = state.player;

    actions.push('jump');

    if (p.missiles > 0) {
      actions.push('missile');
    }
    if (p.hasPhaseDash) {
      actions.push('dash');
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

    let isInvulnerable = false;

    // 1. Resolve Operative Action
    if (action === 'move_left') {
      p.facing = -1;
      let targetX = p.x - 24;

      // Laser Gate Check
      const laser = state.gates.find(g => g.id === 'laser_gate');
      if (laser && !laser.open && p.y <= 200 && p.x >= 160 && targetX < 160) {
        targetX = p.x; // Blocked by laser gate without phase dash
      }

      p.x = Math.max(30, targetX);
    } else if (action === 'move_right') {
      p.facing = 1;
      let targetX = p.x + 24;

      // Red Door Check
      const redDoor = state.gates.find(g => g.id === 'door_red');
      if (redDoor && !redDoor.open && p.y >= 300 && p.x <= 180 && targetX > 180) {
        targetX = p.x; // Blocked by closed red door
      }

      p.x = Math.min(370, targetX);
    } else if (action === 'jump') {
      // Platform vertical elevation
      if (p.y >= 300) {
        if (p.x >= 320 && p.hasDoubleJump) {
          // Double jump up shaft to upper ruins (Y: 180)
          p.y = 180;
          state.scoreVal += 100;
        } else if (p.x >= 320) {
          // Single jump falls back down without upgrade
          p.y = 340;
        } else {
          // Normal hop
          p.y = 300;
        }
      } else if (p.y <= 200) {
        // High ruins ledge
        if (p.x >= 340) {
          // Drop down shaft back to Sector 2
          p.y = 340;
        }
      }
    } else if (action === 'dash') {
      isInvulnerable = true;
      p.x = Math.max(30, Math.min(370, p.x + p.facing * 50));
      // Passing through laser gate permanently disables it
      const laser = state.gates.find(g => g.id === 'laser_gate');
      if (laser && Math.abs(p.x - laser.x) <= 40 && p.y <= 200) {
        laser.open = true;
        state.scoreVal += 250;
      }
    } else if (action === 'rest') {
      p.hp = Math.min(p.maxHp, p.hp + 15);
      if (p.y >= 260 && p.y < 340) p.y = 340; // Ground settling
    } else if (action === 'fire') {
      // Beam blast
      const beamReach = 180;
      for (const e of state.enemies) {
        const dx = (e.x - p.x) * p.facing;
        const dy = Math.abs(e.y - p.y);
        if (dx > 0 && dx <= beamReach && dy <= 30) {
          e.hp -= 15;
          state.scoreVal += 30;
          break; // Single target penetration
        }
      }
    } else if (action === 'missile') {
      p.missiles--;
      const reach = 140;

      // Check red door destruction
      const redDoor = state.gates.find(g => g.id === 'door_red');
      if (redDoor && !redDoor.open && p.y >= 300 && p.facing === 1 && Math.abs(p.x - redDoor.x) <= reach) {
        redDoor.open = true;
        state.scoreVal += 300;
      }

      for (const e of state.enemies) {
        const dx = (e.x - p.x) * p.facing;
        const dy = Math.abs(e.y - p.y);
        if (dx > 0 && dx <= reach && dy <= 35) {
          e.hp -= 40;
          state.scoreVal += 120;
          break;
        }
      }
    }

    // 2. Check Ability Upgrades Pickup
    for (const up of state.upgrades) {
      if (!up.collected) {
        if (Math.hypot(p.x - up.x, p.y - up.y) <= 25) {
          up.collected = true;
          if (up.type === 'missile') {
            p.hasMissileUpgrade = true;
            p.missiles += 3;
            state.scoreVal += 500;
          } else if (up.type === 'double_jump') {
            p.hasDoubleJump = true;
            state.scoreVal += 500;
          } else if (up.type === 'phase_dash') {
            p.hasPhaseDash = true;
            state.scoreVal += 500;
          }
        }
      }
    }

    // 3. Enemy AI & Retaliation
    for (const e of state.enemies) {
      const dist = Math.hypot(p.x - e.x, p.y - e.y);

      if (e.type === 'guardian') {
        // Boss AI
        if (p.x <= 160 && p.y <= 200) {
          // Operative is inside Sector 4 Sanctuary!
          if (e.cooldown <= 0) {
            if (!isInvulnerable) {
              p.hp = Math.max(0, p.hp - e.damage);
            }
            e.cooldown = 1;
          } else {
            e.cooldown--;
          }
        }
      } else {
        // Normal hostiles: patrol back and forth
        e.x += e.facing * e.speed;
        if (e.x <= 40 || e.x >= 360) {
          e.facing *= -1;
        }

        if (dist <= 22 && !isInvulnerable) {
          p.hp = Math.max(0, p.hp - e.damage);
        }
      }
    }

    // 4. Enemy Cleanup & Boss Defeat
    let bossDefeated = false;
    const survivingEnemies = [];
    for (const e of state.enemies) {
      if (e.hp <= 0) {
        state.scoreVal += e.type === 'guardian' ? 2500 : 150;
        if (e.type === 'guardian') {
          bossDefeated = true;
        }
      } else {
        survivingEnemies.push(e);
      }
    }
    state.enemies = survivingEnemies;

    // 5. Victory & Defeat Resolution
    if (bossDefeated && p.hp > 0) {
      state.won = true;
      state.scoreVal += 2000;
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
