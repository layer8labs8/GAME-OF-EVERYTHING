// Magma Surge - Auto-Scrolling Platformer deterministic logic
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MagmaSurge = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX_STEPS = 120;
  const SHAFT_WIDTH = 120;
  const GOAL_HEIGHT = 500;

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function generateShaft(seed) {
    const dummyState = { rng: (seed >>> 0) || 12345 };
    const platforms = [];
    const crystals = [];

    // Starting ground floor
    platforms.push({ id: 1, x1: 0, x2: 120, y: 0, type: 'solid' });

    let currentY = 5;
    let idCounter = 2;

    while (currentY < GOAL_HEIGHT + 30) {
      // 1 to 2 ledges at this height tier
      const count = 1 + Math.floor(nextRandom(dummyState) * 2);
      for (let c = 0; c < count; c++) {
        const width = 20 + Math.floor(nextRandom(dummyState) * 25);
        const x1 = Math.floor(nextRandom(dummyState) * (SHAFT_WIDTH - width));
        const x2 = x1 + width;
        const typeRoll = nextRandom(dummyState);
        const type = typeRoll < 0.2 ? 'vent' : (typeRoll < 0.4 ? 'crumbling' : 'solid');

        platforms.push({
          id: idCounter++,
          x1: x1,
          x2: x2,
          y: currentY,
          type: type
        });

        // 35% chance to spawn an obsidian crystal above platform
        if (nextRandom(dummyState) < 0.35) {
          crystals.push({
            id: crystals.length + 1,
            x: Math.round((x1 + x2) / 2),
            y: currentY + 2,
            collected: false
          });
        }
      }
      currentY += 4 + Math.floor(nextRandom(dummyState) * 4); // gap 4..7 units
    }

    // Final caldera rim landing platform
    platforms.push({ id: idCounter++, x1: 30, x2: 90, y: GOAL_HEIGHT, type: 'solid' });

    return { platforms, crystals };
  }

  function createState(seed = 12345) {
    const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
    const { platforms, crystals } = generateShaft(s);

    return {
      rng: s,
      stepCount: 0,
      scrollY: -5,
      scrollSpeed: 2,
      player: {
        x: 60,
        y: 0,
        vy: 0,
        hp: 100,
        stamina: 100,
        maxStamina: 100,
        grapples: 4,
        onGround: true,
        wallSliding: false
      },
      platforms: platforms,
      crystals: crystals,
      crystalsCollected: 0,
      scoreVal: 0,
      won: false,
      lost: false,
      lastEvent: 'CALDERA TREMOR: Molten lava begins rising from the abyss!'
    };
  }

  function legalActions(state) {
    if (state.won || state.lost || state.stepCount >= MAX_STEPS) {
      return [];
    }

    const actions = [];
    if (state.player.x > 2) actions.push('move_left');
    if (state.player.x < SHAFT_WIDTH - 2) actions.push('move_right');

    if (state.player.onGround) {
      if (state.player.stamina >= 10) actions.push('jump');
      actions.push('rest');
    } else {
      const nearWall = state.player.x <= 4 || state.player.x >= SHAFT_WIDTH - 4;
      if (nearWall) {
        actions.push('wall_slide');
        if (state.player.stamina >= 10) actions.push('wall_kick');
      }
      if (state.player.stamina >= 20) {
        if (state.player.x > 8) actions.push('dash_left');
        if (state.player.x < SHAFT_WIDTH - 8) actions.push('dash_right');
      }
    }

    if (state.player.grapples > 0) {
      actions.push('grapple_up');
    }

    return actions;
  }

  function isOver(state) {
    return state.won || state.lost || state.stepCount >= MAX_STEPS;
  }

  function score(state) {
    return state.scoreVal;
  }

  function getPlatformBeneath(platforms, x, startY, endY) {
    for (let i = 0; i < platforms.length; i++) {
      const p = platforms[i];
      if (x >= p.x1 && x <= p.x2 && p.y <= startY && p.y >= endY) {
        return p;
      }
    }
    return null;
  }

  function step(state, action) {
    const valid = legalActions(state);
    if (!valid.includes(action)) {
      throw new Error('Illegal action: ' + action);
    }

    state.stepCount++;
    let reward = 2; // small survival tick
    const p = state.player;
    p.wallSliding = false;

    // 1. Process Action
    if (action === 'move_left') {
      p.x = Math.max(2, p.x - 3);
      state.lastEvent = 'Ascending leftward';
    } else if (action === 'move_right') {
      p.x = Math.min(SHAFT_WIDTH - 2, p.x + 3);
      state.lastEvent = 'Ascending rightward';
    } else if (action === 'jump') {
      p.stamina -= 10;
      p.vy = 4;
      p.y += 4;
      p.onGround = false;
      state.lastEvent = 'High vertical leap!';
      reward += 5;
    } else if (action === 'wall_slide') {
      p.wallSliding = true;
      p.vy = -1;
      state.lastEvent = 'Clinging to basalt shaft wall';
    } else if (action === 'wall_kick') {
      p.stamina -= 10;
      p.vy = 4;
      p.y += 4;
      p.x = p.x <= 4 ? p.x + 8 : p.x - 8;
      p.onGround = false;
      state.lastEvent = 'Wall rebound leap!';
      reward += 10;
    } else if (action === 'dash_left') {
      p.stamina -= 20;
      p.x = Math.max(2, p.x - 8);
      state.lastEvent = 'Air dash left!';
      reward += 8;
    } else if (action === 'dash_right') {
      p.stamina -= 20;
      p.x = Math.min(SHAFT_WIDTH - 2, p.x + 8);
      state.lastEvent = 'Air dash right!';
      reward += 8;
    } else if (action === 'grapple_up') {
      p.grapples--;
      // Find closest platform above player
      let targetPlat = null;
      let minAboveDist = 999;
      for (let i = 0; i < state.platforms.length; i++) {
        const plat = state.platforms[i];
        if (plat.y > p.y && (plat.y - p.y) < minAboveDist) {
          if (Math.abs(p.x - (plat.x1 + plat.x2) / 2) <= 30) {
            minAboveDist = plat.y - p.y;
            targetPlat = plat;
          }
        }
      }
      if (targetPlat) {
        p.x = Math.round((targetPlat.x1 + targetPlat.x2) / 2);
        p.y = targetPlat.y;
        p.vy = 0;
        p.onGround = true;
        state.lastEvent = 'Grapple cable reeled up to ledge! Height: ' + p.y + 'm';
        reward += 25;
        state.scoreVal += 25;
      } else {
        p.vy = 5;
        p.y += 5;
        p.onGround = false;
        state.lastEvent = 'Grapple hoisted player upward (+5m)';
        reward += 15;
      }
    } else if (action === 'rest') {
      p.stamina = Math.min(p.maxStamina, p.stamina + 35);
      state.lastEvent = 'Catching breath on basalt ledge';
    }

    // 2. Passive Recovery & Auto-Scrolling Magma Rise
    p.stamina = Math.min(p.maxStamina, p.stamina + 5);
    state.scrollY += state.scrollSpeed;

    // 3. Platform Gravity & Landing Physics
    if (!p.onGround) {
      if (action !== 'jump' && action !== 'wall_kick' && action !== 'grapple_up') {
        if (!p.wallSliding) {
          p.vy -= 1;
        }
        p.y += p.vy;
      }

      if (p.vy <= 0) {
        // Falling: test landing
        const plat = getPlatformBeneath(state.platforms, p.x, p.y + Math.abs(p.vy), p.y);
        if (plat) {
          if (plat.type === 'vent') {
            // Steam vent launches player up
            p.vy = 6;
            p.y = plat.y + 6;
            p.onGround = false;
            state.lastEvent = 'GEO-VENT ERUPTION! Launched +6m into the air!';
            reward += 15;
            state.scoreVal += 15;
          } else {
            p.y = plat.y;
            p.vy = 0;
            p.onGround = true;
            if (plat.type === 'crumbling') {
              state.lastEvent = 'Pumice platform crumbled away!';
              state.platforms = state.platforms.filter(pl => pl.id !== plat.id);
            }
          }
        }
      }
    } else {
      // Check if stepped off ledge
      const currentPlat = getPlatformBeneath(state.platforms, p.x, p.y, p.y);
      if (!currentPlat) {
        p.onGround = false;
        p.vy = -1;
      }
    }

    // 4. Collect Crystals
    for (let i = 0; i < state.crystals.length; i++) {
      const c = state.crystals[i];
      if (!c.collected && Math.abs(c.x - p.x) <= 4 && Math.abs(c.y - p.y) <= 3) {
        c.collected = true;
        state.crystalsCollected++;
        state.scoreVal += 25;
        reward += 25;
        state.lastEvent = 'Gathered Obsidian Crystal (+25 PTS)';
      }
    }

    // 5. Score for climbing higher
    const altitudeScore = Math.max(0, p.y * 2);
    if (altitudeScore > state.scoreVal) {
      state.scoreVal = altitudeScore + state.crystalsCollected * 25;
    }

    // 6. Lava Burn Check (Auto-Scrolling screen edge)
    if (p.y <= state.scrollY) {
      p.hp = 0;
      state.lost = true;
      reward -= 150;
      state.lastEvent = 'CONSUMED BY LAVA! Volcanic magma engulfed the explorer!';
      return { reward, done: true };
    }

    // 7. Victory Check
    if (p.y >= GOAL_HEIGHT) {
      state.won = true;
      const winReward = 1000 + p.stamina * 2 + state.crystalsCollected * 20;
      state.scoreVal += winReward;
      reward += winReward;
      state.lastEvent = 'CALDERA RIM REACHED! Evacuation helicopter secured!';
      return { reward, done: true };
    }

    // 8. Timeout
    if (state.stepCount >= MAX_STEPS) {
      state.lost = true;
      reward -= 50;
      state.lastEvent = 'Eruption shockwave sealed the shaft';
      return { reward, done: true };
    }

    return { reward, done: false };
  }

  return {
    MAX_STEPS,
    SHAFT_WIDTH,
    GOAL_HEIGHT,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
});
