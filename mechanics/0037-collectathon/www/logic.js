// Relic Rush - Collectathon Platformer deterministic logic
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RelicRush = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX_STEPS = 120;

  const PLATFORMS = [
    { id: 1, x1: 0, x2: 12, y: 0 },    // Low Meadow Hub
    { id: 2, x1: 3, x2: 8, y: 3 },     // Meadow High Ridge (Shrine: Ground Pound)
    { id: 3, x1: 10, x2: 16, y: 1 },   // Sunken Crypt (Stone Chest with Relic 2)
    { id: 4, x1: 12, x2: 16, y: 5 },   // High Arch (Shrine: Glide)
    { id: 5, x1: 20, x2: 24, y: 4 },   // Cloud Islet (Relic 3)
    { id: 6, x1: 26, x2: 32, y: 2 },   // Tribute Sanctum (Relic 4)
    { id: 7, x1: 30, x2: 36, y: 6 },   // Spire Lower Balcony
    { id: 8, x1: 28, x2: 34, y: 9 },   // Spire Mid Ledge
    { id: 9, x1: 33, x2: 38, y: 12 }   // Spire Summit & Celestial Beacon (Relic 5)
  ];

  // 40 Gem locations
  const GEM_POSITIONS = [];
  // Low meadow gems
  for (let x = 1; x <= 11; x += 2) GEM_POSITIONS.push({ x: x, y: 0 }); // 6 gems
  // High ridge
  for (let x = 4; x <= 7; x++) GEM_POSITIONS.push({ x: x, y: 3 });     // 4 gems
  // Crypt
  for (let x = 11; x <= 15; x++) GEM_POSITIONS.push({ x: x, y: 1 });   // 5 gems
  // High arch
  for (let x = 13; x <= 16; x++) GEM_POSITIONS.push({ x: x, y: 5 });   // 4 gems
  // Chasm floating line
  for (let x = 17; x <= 19; x++) GEM_POSITIONS.push({ x: x, y: 3 });   // 3 gems
  // Cloud Islet
  for (let x = 21; x <= 23; x++) GEM_POSITIONS.push({ x: x, y: 4 });   // 3 gems
  // Tribute Sanctum
  for (let x = 27; x <= 31; x++) GEM_POSITIONS.push({ x: x, y: 2 });   // 5 gems
  // Spire ascent
  for (let x = 31; x <= 35; x++) GEM_POSITIONS.push({ x: x, y: 6 });   // 5 gems
  for (let x = 29; x <= 33; x += 2) GEM_POSITIONS.push({ x: x, y: 9 });// 3 gems
  for (let x = 34; x <= 35; x++) GEM_POSITIONS.push({ x: x, y: 12 });  // 2 gems
  // Total 40 gems

  function getPlatformAt(x, y) {
    for (let i = 0; i < PLATFORMS.length; i++) {
      const p = PLATFORMS[i];
      if (x >= p.x1 && x <= p.x2 && y === p.y) {
        return p;
      }
    }
    return null;
  }

  function createState(seed = 12345) {
    const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
    return {
      rng: s,
      stepCount: 0,
      player: {
        x: 1,
        y: 0,
        vy: 0,
        hp: 100,
        stamina: 100,
        maxStamina: 100,
        onGround: true,
        jumpsLeft: 2,
        gliding: false,
        abilities: {
          doubleJump: true,
          glide: false,
          groundPound: false
        }
      },
      relicsCollected: 0,
      totalRelics: 5,
      gemsCollected: 0,
      totalGems: GEM_POSITIONS.length,
      relics: [
        { id: 1, x: 7, y: 4, collected: false, name: 'Meadow Star' },
        { id: 2, x: 14, y: 1, collected: false, name: 'Crypt Diamond', insideChest: true },
        { id: 3, x: 22, y: 5, collected: false, name: 'Cloud Pearl' },
        { id: 4, x: 30, y: 2, collected: false, name: 'Sanctum Sunstone', behindGate: true },
        { id: 5, x: 36, y: 13, collected: false, name: 'Celestial Heart' }
      ],
      gems: GEM_POSITIONS.map(g => ({ x: g.x, y: g.y, collected: false })),
      chestSmashed: false,
      tributeGateOpen: false,
      scoreVal: 0,
      won: false,
      lost: false,
      lastEvent: 'Arrived at the Floating Citadel. 5 Celestial Relics await!'
    };
  }

  function legalActions(state) {
    if (state.won || state.lost || state.stepCount >= MAX_STEPS) {
      return [];
    }

    const actions = [];
    if (state.player.x > 0) actions.push('move_left');
    if (state.player.x < 38) actions.push('move_right');

    if (state.player.onGround) {
      if (state.player.stamina >= 10) actions.push('jump');
      actions.push('rest');
    } else {
      if (state.player.jumpsLeft > 0 && state.player.stamina >= 15) {
        actions.push('double_jump');
      }
      if (state.player.abilities.glide && state.player.stamina >= 5) {
        actions.push('glide');
      }
      if (state.player.abilities.groundPound) {
        actions.push('ground_pound');
      }
    }

    // Always legal to attempt interaction with nearby objects
    actions.push('interact');

    return actions;
  }

  function isOver(state) {
    return state.won || state.lost || state.stepCount >= MAX_STEPS;
  }

  function score(state) {
    return state.scoreVal;
  }

  function collectGemsAndRelics(state) {
    let reward = 0;
    const px = state.player.x;
    const py = state.player.y;

    // Pick gems
    for (let i = 0; i < state.gems.length; i++) {
      const g = state.gems[i];
      if (!g.collected && g.x === px && g.y === py) {
        g.collected = true;
        state.gemsCollected++;
        state.scoreVal += 15;
        reward += 15;
        state.lastEvent = 'Collected Sky Gem (' + state.gemsCollected + '/' + state.totalGems + ')';
      }
    }

    // Pick relics in open air
    for (let i = 0; i < state.relics.length; i++) {
      const r = state.relics[i];
      if (!r.collected && !r.insideChest && (!r.behindGate || state.tributeGateOpen)) {
        if (Math.abs(r.x - px) <= 1 && Math.abs(r.y - py) <= 1) {
          r.collected = true;
          state.relicsCollected++;
          state.scoreVal += 250;
          reward += 250;
          state.lastEvent = 'Found Celestial Relic: ' + r.name + '! (' + state.relicsCollected + '/5)';
        }
      }
    }

    return reward;
  }

  function step(state, action) {
    const valid = legalActions(state);
    if (!valid.includes(action)) {
      throw new Error('Illegal action: ' + action);
    }

    state.stepCount++;
    let reward = 2; // small exploration reward
    const p = state.player;

    if (action === 'move_left') {
      p.x = Math.max(0, p.x - 1);
      state.lastEvent = 'Moved left';
    } else if (action === 'move_right') {
      // Check tribute gate blockage
      if (p.x === 25 && !state.tributeGateOpen) {
        state.lastEvent = 'Tribute Gate is sealed! Needs 20 gems or Interact.';
      } else {
        p.x = Math.min(38, p.x + 1);
        state.lastEvent = 'Moved right';
      }
    } else if (action === 'jump') {
      p.stamina -= 10;
      p.vy = 2;
      p.y += 2;
      p.onGround = false;
      p.jumpsLeft = 1;
      state.lastEvent = 'High jump!';
      reward += 5;
    } else if (action === 'double_jump') {
      p.stamina -= 15;
      p.vy = 2;
      p.y += 2;
      p.jumpsLeft--;
      state.lastEvent = 'Double aerial leap!';
      reward += 8;
    } else if (action === 'glide') {
      p.stamina -= 5;
      p.vy = 0;
      p.x = Math.min(38, p.x + 2);
      p.y = Math.max(0, p.y - 1);
      state.lastEvent = 'Gliding across the sky!';
      reward += 10;
    } else if (action === 'ground_pound') {
      // Drop straight down to ground
      p.vy = -3;
      p.y = 1;
      state.lastEvent = 'Heavy Ground Pound impact!';
      if (p.x >= 13 && p.x <= 15 && !state.chestSmashed) {
        state.chestSmashed = true;
        const cryptRelic = state.relics.find(r => r.id === 2);
        if (cryptRelic) {
          cryptRelic.insideChest = false;
          cryptRelic.collected = true;
          state.relicsCollected++;
          state.scoreVal += 250;
          reward += 250;
          state.lastEvent = 'SMASHED Stone Chest! Obtained Relic: Crypt Diamond!';
        }
      }
    } else if (action === 'rest') {
      p.stamina = Math.min(p.maxStamina, p.stamina + 35);
      state.lastEvent = 'Catching breath on solid ground';
    } else if (action === 'interact') {
      // Check shrine 1: Ground Pound (at x=5, y=3)
      if (Math.abs(p.x - 5) <= 1 && Math.abs(p.y - 3) <= 1 && !p.abilities.groundPound) {
        p.abilities.groundPound = true;
        state.scoreVal += 100;
        reward += 100;
        state.lastEvent = 'Unlocked Ability: Ground Pound! (Can smash reinforced stone chests)';
      }
      // Check shrine 2: Glide (at x=14, y=5)
      else if (Math.abs(p.x - 14) <= 1 && Math.abs(p.y - 5) <= 1 && !p.abilities.glide) {
        p.abilities.glide = true;
        state.scoreVal += 100;
        reward += 100;
        state.lastEvent = 'Unlocked Ability: Glider Wings! (Can glide across cloud chasms)';
      }
      // Check Tribute Gate at x=25, y=2
      else if (Math.abs(p.x - 25) <= 1 && !state.tributeGateOpen) {
        if (state.gemsCollected >= 20) {
          state.tributeGateOpen = true;
          state.scoreVal += 150;
          reward += 150;
          state.lastEvent = 'Tribute accepted! Ancient Gate unlocked!';
        } else {
          state.lastEvent = 'Gate demands 20 Sky Gems (have ' + state.gemsCollected + '/20)';
        }
      }
      // Check Celestial Beacon at Spire Summit (x=36, y=12..13)
      else if (Math.abs(p.x - 36) <= 1 && p.y >= 12) {
        if (state.relicsCollected >= 5) {
          state.won = true;
          const winReward = 1000 + state.gemsCollected * 10;
          state.scoreVal += winReward;
          reward += winReward;
          state.lastEvent = 'CELESTIAL BEACON IGNITED! All 5 Relics restored!';
          return { reward, done: true };
        } else {
          state.lastEvent = 'Beacon requires all 5 Relics (have ' + state.relicsCollected + '/5)';
        }
      } else {
        state.lastEvent = 'Nothing to interact with nearby';
      }
    }

    // Gravity / Platform Landing Physics
    if (!p.onGround) {
      if (action !== 'jump' && action !== 'double_jump' && action !== 'glide') {
        p.vy -= 1;
        p.y += p.vy;
      }

      if (p.vy <= 0) {
        // Falling: check landing on platform
        let landed = false;
        for (let testY = p.y; testY >= 0; testY--) {
          const plat = getPlatformAt(p.x, testY);
          if (plat) {
            p.y = plat.y;
            p.vy = 0;
            p.onGround = true;
            p.jumpsLeft = 2;
            p.stamina = Math.min(p.maxStamina, p.stamina + 5);
            landed = true;
            break;
          }
        }
        if (!landed && p.y <= 0) {
          // Void pit!
          p.hp -= 25;
          p.x = 1;
          p.y = 0;
          p.vy = 0;
          p.onGround = true;
          p.jumpsLeft = 2;
          p.stamina = 50;
          reward -= 50;
          state.lastEvent = 'Fell into the sky void! Rescued back to Meadow Hub';
        }
      }
    } else {
      // On ground: ensure platform still exists beneath player
      const plat = getPlatformAt(p.x, p.y);
      if (!plat) {
        // Stepped off edge!
        p.onGround = false;
        p.vy = -1;
      }
    }

    // Collectibles update
    reward += collectGemsAndRelics(state);

    // Victory if all relics and at summit
    if (state.relicsCollected >= 5 && p.x >= 35 && p.y >= 12) {
      state.won = true;
      const winReward = 1000 + state.gemsCollected * 10;
      state.scoreVal += winReward;
      reward += winReward;
      state.lastEvent = 'CELESTIAL CITADEL CONQUERED! 100% Completion achieved!';
      return { reward, done: true };
    }

    if (p.hp <= 0) {
      state.lost = true;
      reward -= 100;
      state.lastEvent = 'Explorer collapsed from exhaustion';
      return { reward, done: true };
    }

    if (state.stepCount >= MAX_STEPS) {
      state.lost = true;
      reward -= 50;
      state.lastEvent = 'Daylight faded: Expedition timed out';
      return { reward, done: true };
    }

    return { reward, done: false };
  }

  return {
    MAX_STEPS,
    PLATFORMS,
    GEM_POSITIONS,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
});
