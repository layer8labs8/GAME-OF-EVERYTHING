// Cyber Ronin - Side-Scroller Action Platformer deterministic logic
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CyberRonin = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX_STEPS = 120;

  const PLATFORMS = [
    { x1: 0, x2: 40, y: 0 },
    { x1: 15, x2: 35, y: 3 },
    { x1: 42, x2: 55, y: 4 },
    { x1: 50, x2: 90, y: 0 },
    { x1: 91, x2: 130, y: 5 },
    { x1: 132, x2: 148, y: 4 },
    { x1: 150, x2: 200, y: 0 }
  ];

  const SPIKES = [
    { x1: 41, x2: 49 },
    { x1: 131, x2: 140 }
  ];

  function getPlatformAt(x, y) {
    for (let i = 0; i < PLATFORMS.length; i++) {
      const p = PLATFORMS[i];
      if (x >= p.x1 && x <= p.x2 && y === p.y) {
        return p;
      }
    }
    return null;
  }

  function isOverSpikes(x, y) {
    if (y > 0) return false;
    for (let i = 0; i < SPIKES.length; i++) {
      if (x >= SPIKES[i].x1 && x <= SPIKES[i].x2) return true;
    }
    return false;
  }

  function createState(seed = 12345) {
    const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
    return {
      rng: s,
      stepCount: 0,
      player: {
        x: 2,
        y: 0,
        vy: 0,
        facing: 1, // 1: Right, -1: Left
        hp: 100,
        maxHp: 100,
        stamina: 100,
        maxStamina: 100,
        shurikens: 5,
        combo: 0,
        onGround: true,
        deflecting: false,
        dashing: false
      },
      enemies: [
        { id: 1, type: 'drone', x: 22, y: 3, hp: 25, maxHp: 25, scoreReward: 80 },
        { id: 2, type: 'enforcer', x: 34, y: 0, hp: 50, maxHp: 50, scoreReward: 120 },
        { id: 3, type: 'drone', x: 68, y: 2, hp: 25, maxHp: 25, scoreReward: 80 },
        { id: 4, type: 'enforcer', x: 82, y: 0, hp: 50, maxHp: 50, scoreReward: 120 },
        { id: 5, type: 'drone', x: 110, y: 6, hp: 25, maxHp: 25, scoreReward: 80 },
        { id: 6, type: 'enforcer', x: 142, y: 4, hp: 50, maxHp: 50, scoreReward: 120 },
        { id: 99, type: 'boss', name: 'Goliath Forge Mech', x: 180, y: 0, hp: 150, maxHp: 150, scoreReward: 800 }
      ],
      scoreVal: 0,
      won: false,
      lost: false,
      lastEvent: 'Infiltrating Neo-Tokyo Industrial Sector. Blade drawn!'
    };
  }

  function legalActions(state) {
    if (state.won || state.lost || state.stepCount >= MAX_STEPS) {
      return [];
    }

    const actions = [];
    if (state.player.x > 0) actions.push('move_left');
    if (state.player.x < 200) actions.push('move_right');

    if (state.player.onGround) {
      if (state.player.stamina >= 10) actions.push('jump');
      actions.push('rest');
    } else {
      // Wall kick available near wall at x=90
      if (Math.abs(state.player.x - 90) <= 2) {
        actions.push('wall_kick');
      }
    }

    actions.push('slash');

    if (state.player.shurikens > 0) {
      actions.push('throw_shuriken');
    }
    if (state.player.stamina >= 25) {
      actions.push('phase_dash');
    }
    if (state.player.stamina >= 15) {
      actions.push('deflect');
    }

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
    let reward = 2; // small exploration reward
    const p = state.player;
    p.deflecting = false;
    p.dashing = false;

    // 1. Process Player Action
    if (action === 'move_left') {
      p.facing = -1;
      p.x = Math.max(0, p.x - 3);
      state.lastEvent = 'Stepped left';
    } else if (action === 'move_right') {
      p.facing = 1;
      p.x = Math.min(200, p.x + 3);
      state.lastEvent = 'Stepped right';
    } else if (action === 'jump') {
      p.stamina -= 10;
      p.vy = 3;
      p.y += 3;
      p.onGround = false;
      state.lastEvent = 'Acrobatic leap!';
      reward += 5;
    } else if (action === 'wall_kick') {
      p.stamina -= 10;
      p.vy = 3;
      p.facing = -p.facing;
      p.x += p.facing * 5;
      p.y += 3;
      p.onGround = false;
      state.lastEvent = 'Wall rebound kick!';
      reward += 10;
    } else if (action === 'slash') {
      p.combo = Math.min(3, p.combo + 1);
      const mult = 1 + (p.combo - 1) * 0.3;
      const dmg = Math.round(35 * mult);
      let hit = false;

      for (let i = 0; i < state.enemies.length; i++) {
        const e = state.enemies[i];
        const dx = e.x - p.x;
        // In front of player within reach 6
        if ((p.facing > 0 && dx >= 0 && dx <= 6) || (p.facing < 0 && dx <= 0 && dx >= -6)) {
          if (Math.abs(e.y - p.y) <= 2) {
            e.hp -= dmg;
            e.stunned = true;
            hit = true;
            reward += 25;
            state.scoreVal += 25;
            state.lastEvent = 'Katana slash hit ' + e.type + ' for ' + dmg + ' dmg! (Combo x' + p.combo + ')';
            break;
          }
        }
      }
      if (!hit) {
        p.combo = 0;
        state.lastEvent = 'Blade cut empty air';
      }
    } else if (action === 'throw_shuriken') {
      p.shurikens--;
      let hit = false;
      for (let i = 0; i < state.enemies.length; i++) {
        const e = state.enemies[i];
        const dx = e.x - p.x;
        if ((p.facing > 0 && dx > 0 && dx <= 25) || (p.facing < 0 && dx < 0 && dx >= -25)) {
          if (Math.abs(e.y - p.y) <= 2) {
            e.hp -= 30;
            e.stunned = true;
            hit = true;
            reward += 30;
            state.scoreVal += 30;
            state.lastEvent = 'Shuriken pierced enemy ' + e.type + '!';
            break;
          }
        }
      }
      if (!hit) {
        state.lastEvent = 'Shuriken embedded into steel bulkhead';
      }
    } else if (action === 'phase_dash') {
      p.stamina -= 25;
      p.dashing = true;
      p.x = Math.max(0, Math.min(200, p.x + p.facing * 8));
      state.lastEvent = 'Phase Dash surged forward!';
      reward += 8;
    } else if (action === 'deflect') {
      p.stamina -= 15;
      p.deflecting = true;
      state.lastEvent = 'Plasma parry stance raised';
    } else if (action === 'rest') {
      p.stamina = Math.min(p.maxStamina, p.stamina + 35);
      p.combo = 0;
      state.lastEvent = 'Recovered stamina on solid footing';
    }

    // 2. Passive Stamina Recovery
    p.stamina = Math.min(p.maxStamina, p.stamina + 5);

    // 3. Platform Gravity & Landing Physics
    if (!p.onGround) {
      if (action !== 'jump' && action !== 'wall_kick') {
        p.vy -= 1;
        p.y += p.vy;
      }

      if (p.vy <= 0) {
        let landed = false;
        for (let testY = p.y; testY >= 0; testY--) {
          const plat = getPlatformAt(p.x, testY);
          if (plat) {
            p.y = plat.y;
            p.vy = 0;
            p.onGround = true;
            landed = true;
            break;
          }
        }
        if (!landed && p.y <= 0) {
          // Check spikes
          if (isOverSpikes(p.x, p.y) && !p.dashing) {
            p.hp -= 30;
            reward -= 30;
            p.y = 0;
            p.onGround = true;
            state.lastEvent = 'IMPACT! Impaled on industrial hazard spikes!';
          } else {
            p.y = 0;
            p.onGround = true;
          }
        }
      }
    } else {
      // Check if stepped off edge
      const plat = getPlatformAt(p.x, p.y);
      if (!plat) {
        if (isOverSpikes(p.x, p.y) && !p.dashing) {
          p.hp -= 30;
          reward -= 30;
          state.lastEvent = 'Stepped onto floor hazard spikes!';
        } else {
          p.onGround = false;
          p.vy = -1;
        }
      }
    }

    // 4. Enemy Defeats & Attacks
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      if (e.hp <= 0) {
        state.scoreVal += e.scoreReward;
        reward += e.scoreReward;
        if (e.type === 'boss') {
          state.lastEvent = 'GOLIATH FORGE MECH DESTROYED! Extraction gate opened!';
        } else {
          state.lastEvent = 'Neutralized ' + e.type + '!';
        }
        state.enemies.splice(i, 1);
        continue;
      }

      if (e.stunned) {
        e.stunned = false;
        continue;
      }

      // Attack if close to player
      const dist = Math.abs(e.x - p.x);
      if (dist <= 4 && Math.abs(e.y - p.y) <= 2) {
        if (!p.deflecting && !p.dashing) {
          const dmg = e.type === 'boss' ? 25 : 15;
          p.hp = Math.max(0, p.hp - dmg);
          p.combo = 0;
          reward -= dmg;
          state.lastEvent = e.type + ' struck your armor!';
        } else if (p.deflecting) {
          e.hp -= 15;
          state.lastEvent = 'Parried strike and riposted ' + e.type + '!';
        }
      }
    }

    // 5. Victory & Defeat Checks
    const bossAlive = state.enemies.some(e => e.type === 'boss');
    if (!bossAlive && p.x >= 195) {
      state.won = true;
      const winReward = 1000 + p.hp * 5;
      state.scoreVal += winReward;
      reward += winReward;
      state.lastEvent = 'MISSION COMPLETE: Cyber Ronin escaped with the blueprints!';
      return { reward, done: true };
    }

    if (p.hp <= 0) {
      state.lost = true;
      reward -= 150;
      state.lastEvent = 'MISSION FAILED: Cyber Ronin fell in battle';
      return { reward, done: true };
    }

    if (state.stepCount >= MAX_STEPS) {
      state.lost = true;
      reward -= 50;
      state.lastEvent = 'Sector lockdown initiated: Mission timed out';
      return { reward, done: true };
    }

    return { reward, done: false };
  }

  return {
    MAX_STEPS,
    PLATFORMS,
    SPIKES,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
});
