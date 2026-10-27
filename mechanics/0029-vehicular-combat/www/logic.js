// Metal Carnage - Vehicular Combat deterministic logic
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MetalCarnage = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX_STEPS = 120;
  const ARENA_MIN = 20;
  const ARENA_MAX = 380;

  // 8 Headings (0: East, 1: SE, 2: South, 3: SW, 4: West, 5: NW, 6: North, 7: NE)
  const DIRS = [
    { dx: 1, dy: 0 },
    { dx: 0.7071, dy: 0.7071 },
    { dx: 0, dy: 1 },
    { dx: -0.7071, dy: 0.7071 },
    { dx: -1, dy: 0 },
    { dx: -0.7071, dy: -0.7071 },
    { dx: 0, dy: -1 },
    { dx: 0.7071, dy: -0.7071 }
  ];

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function spawnWave(state, waveNum) {
    state.enemies = [];
    if (waveNum === 1) {
      state.enemies.push({ id: 1, type: 'buggy', x: 80, y: 80, heading: 1, speed: 3, hp: 40, maxHp: 40, ramPower: 15, scoreReward: 100 });
      state.enemies.push({ id: 2, type: 'buggy', x: 320, y: 80, heading: 3, speed: 3, hp: 40, maxHp: 40, ramPower: 15, scoreReward: 100 });
    } else if (waveNum === 2) {
      state.enemies.push({ id: 3, type: 'buggy', x: 60, y: 100, heading: 1, speed: 3, hp: 40, maxHp: 40, ramPower: 15, scoreReward: 100 });
      state.enemies.push({ id: 4, type: 'crusher', x: 200, y: 60, heading: 2, speed: 4, hp: 80, maxHp: 80, ramPower: 30, scoreReward: 200 });
      state.enemies.push({ id: 5, type: 'buggy', x: 340, y: 100, heading: 3, speed: 3, hp: 40, maxHp: 40, ramPower: 15, scoreReward: 100 });
    } else if (waveNum === 3) {
      state.enemies.push({ id: 6, type: 'warrig', x: 200, y: 70, heading: 2, speed: 3, hp: 200, maxHp: 200, ramPower: 45, scoreReward: 600 });
      state.enemies.push({ id: 7, type: 'buggy', x: 80, y: 200, heading: 0, speed: 3, hp: 40, maxHp: 40, ramPower: 15, scoreReward: 100 });
    }
  }

  function createState(seed = 12345) {
    const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
    const state = {
      rng: s,
      stepCount: 0,
      wave: 1,
      maxWaves: 3,
      player: {
        x: 200,
        y: 300,
        heading: 6, // facing North
        speed: 0,
        armor: 100,
        maxArmor: 100,
        hull: 100,
        maxHull: 100,
        nitro: 100,
        maxNitro: 100,
        ammo: 60,
        maxAmmo: 60,
        rockets: 4,
        mines: 3,
        scrap: 0
      },
      enemies: [],
      mines: [],
      crates: [],
      scoreVal: 0,
      won: false,
      lost: false,
      lastEvent: 'Arena gates drop! Wave 1 raiders approaching!'
    };

    spawnWave(state, 1);
    return state;
  }

  function legalActions(state) {
    if (state.won || state.lost || state.stepCount >= MAX_STEPS) {
      return [];
    }

    const actions = [
      'accelerate',
      'reverse',
      'steer_left',
      'steer_right'
    ];

    if (state.player.ammo >= 4) {
      actions.push('fire_cannons');
    }
    if (state.player.rockets > 0) {
      actions.push('fire_rocket');
    }
    if (state.player.mines > 0) {
      actions.push('deploy_mine');
    }
    if (state.player.nitro >= 25) {
      actions.push('nitro_boost');
    }
    if (state.player.nitro >= 15) {
      actions.push('handbrake_turn');
    }
    if (state.player.scrap >= 20 && state.player.armor < state.player.maxArmor) {
      actions.push('repair_armor');
    }

    return actions;
  }

  function isOver(state) {
    return state.won || state.lost || state.stepCount >= MAX_STEPS;
  }

  function score(state) {
    return state.scoreVal;
  }

  function applyDamageToPlayer(state, amount) {
    if (state.player.armor >= amount) {
      state.player.armor -= amount;
    } else {
      const leftover = amount - state.player.armor;
      state.player.armor = 0;
      state.player.hull = Math.max(0, state.player.hull - leftover);
    }
  }

  function moveVehicle(vehicle, dist) {
    const dir = DIRS[vehicle.heading];
    vehicle.x = Math.max(ARENA_MIN, Math.min(ARENA_MAX, Math.round(vehicle.x + dir.dx * dist)));
    vehicle.y = Math.max(ARENA_MIN, Math.min(ARENA_MAX, Math.round(vehicle.y + dir.dy * dist)));
  }

  function step(state, action) {
    const valid = legalActions(state);
    if (!valid.includes(action)) {
      throw new Error('Illegal action: ' + action);
    }

    state.stepCount++;
    let reward = 2; // small survival tick
    const p = state.player;

    // 1. Process Player Action
    if (action === 'accelerate') {
      p.speed = Math.min(6, p.speed + 2);
      moveVehicle(p, p.speed * 8);
      state.lastEvent = 'Throttle down! Speed: ' + p.speed;
    } else if (action === 'reverse') {
      p.speed = Math.max(-2, p.speed - 2);
      moveVehicle(p, p.speed * 8);
      state.lastEvent = 'Reversing battle-rig';
    } else if (action === 'steer_left') {
      p.heading = (p.heading + 7) % 8; // CCW 45°
      p.speed = Math.max(2, p.speed);
      moveVehicle(p, p.speed * 6);
      state.lastEvent = 'Banking hard port';
    } else if (action === 'steer_right') {
      p.heading = (p.heading + 1) % 8; // CW 45°
      p.speed = Math.max(2, p.speed);
      moveVehicle(p, p.speed * 6);
      state.lastEvent = 'Banking hard starboard';
    } else if (action === 'fire_cannons') {
      p.ammo -= 4;
      state.lastEvent = 'Twin autocannons discharged!';
      // Check line of sight along current heading
      const pDir = DIRS[p.heading];
      let hit = false;
      for (let i = 0; i < state.enemies.length; i++) {
        const e = state.enemies[i];
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= 160) {
          // Dot product to check forward cone
          const dot = (dx * pDir.dx + dy * pDir.dy) / dist;
          if (dot > 0.6) {
            e.hp -= 28;
            reward += 20;
            state.scoreVal += 20;
            hit = true;
            state.lastEvent = 'Autocannon rounds shredded enemy ' + e.type + '!';
            break;
          }
        }
      }
      if (!hit) {
        state.lastEvent = 'Autocannon bursts ricocheted off arena walls';
      }
    } else if (action === 'fire_rocket') {
      p.rockets--;
      state.lastEvent = 'Tracking rocket fired!';
      // Finds nearest enemy
      let closestIdx = -1;
      let minDist = 9999;
      for (let i = 0; i < state.enemies.length; i++) {
        const e = state.enemies[i];
        const dist = Math.hypot(e.x - p.x, e.y - p.y);
        if (dist < minDist) {
          minDist = dist;
          closestIdx = i;
        }
      }
      if (closestIdx !== -1) {
        const target = state.enemies[closestIdx];
        target.hp -= 65;
        reward += 50;
        state.scoreVal += 50;
        state.lastEvent = 'DIRECT HIT! Rocket detonated on ' + target.type + '!';
      }
    } else if (action === 'deploy_mine') {
      p.mines--;
      const pDir = DIRS[p.heading];
      state.mines.push({
        id: state.mines.length + 1,
        x: Math.round(p.x - pDir.dx * 25),
        y: Math.round(p.y - pDir.dy * 25)
      });
      state.lastEvent = 'Proximity mine deployed behind rig';
      reward += 10;
    } else if (action === 'nitro_boost') {
      p.nitro -= 25;
      p.speed = 8;
      moveVehicle(p, 65);
      state.lastEvent = 'NITRO OVERDRIVE IGNITED!';
      reward += 15;
    } else if (action === 'handbrake_turn') {
      p.nitro -= 15;
      p.heading = (p.heading + 2) % 8; // 90° pivot
      p.speed = Math.max(1, p.speed - 1);
      state.lastEvent = 'Handbrake drift pivot executed!';
      reward += 10;
    } else if (action === 'repair_armor') {
      p.scrap -= 20;
      p.armor = Math.min(p.maxArmor, p.armor + 35);
      state.lastEvent = 'Scrap plates welded onto hull (+35 Armor)';
      reward += 25;
    }

    // 2. Passive Nitro Regeneration
    p.nitro = Math.min(p.maxNitro, p.nitro + 5);

    // 3. Check Mine Detonations
    for (let m = state.mines.length - 1; m >= 0; m--) {
      const mine = state.mines[m];
      for (let e = 0; e < state.enemies.length; e++) {
        const enemy = state.enemies[e];
        if (Math.hypot(enemy.x - mine.x, enemy.y - mine.y) < 30) {
          enemy.hp -= 80;
          reward += 60;
          state.scoreVal += 60;
          state.lastEvent = 'MINE DETONATED! Enemy ' + enemy.type + ' took massive damage!';
          state.mines.splice(m, 1);
          break;
        }
      }
    }

    // 4. Check Scrap Crate Pickups
    for (let c = state.crates.length - 1; c >= 0; c--) {
      const crate = state.crates[c];
      if (Math.hypot(p.x - crate.x, p.y - crate.y) < 30) {
        p.scrap += crate.scrapValue;
        p.ammo = Math.min(p.maxAmmo, p.ammo + crate.ammoValue);
        state.scoreVal += 40;
        reward += 30;
        state.lastEvent = 'Salvaged scrap crate (+15 Scrap, +15 Ammo)';
        state.crates.splice(c, 1);
      }
    }

    // 5. Enemy AI Updates & Attacks
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];

      // Check if dead
      if (e.hp <= 0) {
        state.scoreVal += e.scoreReward;
        reward += e.scoreReward;
        state.lastEvent = 'Wrecked enemy ' + e.type + '! Dropped salvage crate.';
        state.crates.push({
          id: state.crates.length + 1,
          x: e.x,
          y: e.y,
          scrapValue: 15,
          ammoValue: 15
        });
        state.enemies.splice(i, 1);
        continue;
      }

      // Drive toward player
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.hypot(dx, dy);

      // Best heading towards player
      let bestHeading = e.heading;
      let minAngleDiff = 999;
      const targetAngle = Math.atan2(dy, dx);
      for (let h = 0; h < 8; h++) {
        const hAngle = Math.atan2(DIRS[h].dy, DIRS[h].dx);
        let diff = Math.abs(targetAngle - hAngle);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;
        if (diff < minAngleDiff) {
          minAngleDiff = diff;
          bestHeading = h;
        }
      }
      e.heading = bestHeading;
      moveVehicle(e, e.speed * 6);

      // Collision Ramming check
      const newDist = Math.hypot(p.x - e.x, p.y - e.y);
      if (newDist < 35) {
        // Ramming occurred!
        const playerRam = (p.speed >= 6) ? 50 : 20;
        e.hp -= playerRam;
        const enemyRam = e.ramPower;
        applyDamageToPlayer(state, enemyRam);
        reward -= 10;
        state.lastEvent = 'CRASH! Rammed ' + e.type + ' (Dealt ' + playerRam + ', took ' + enemyRam + ')';
      } else if (newDist < 140) {
        // Ranged attack from enemy
        const enemyDmg = e.type === 'warrig' ? 22 : 12;
        applyDamageToPlayer(state, enemyDmg);
        reward -= enemyDmg;
        state.lastEvent = e.type + ' fired upon your battle-rig!';
      }
    }

    // 6. Wave Progression Check
    if (state.enemies.length === 0) {
      if (state.wave < state.maxWaves) {
        state.wave++;
        reward += 150;
        state.scoreVal += 150;
        spawnWave(state, state.wave);
        state.lastEvent = 'WAVE ' + state.wave + ' APPROACHING! More hostiles entered the arena!';
      } else {
        // Victory!
        state.won = true;
        const winReward = 1000 + p.hull * 5 + p.armor * 3;
        state.scoreVal += winReward;
        reward += winReward;
        state.lastEvent = 'ARENA CHAMPION! All raider war parties demolished!';
        return { reward, done: true };
      }
    }

    // 7. Defeat Checks
    if (p.hull <= 0) {
      state.lost = true;
      reward -= 150;
      state.lastEvent = 'CATASTROPHIC HULL BREACH! Battle-rig destroyed!';
      return { reward, done: true };
    }

    if (state.stepCount >= MAX_STEPS) {
      state.lost = true;
      reward -= 50;
      state.lastEvent = 'Fuel depleted: Battle-rig stranded in the wasteland arena';
      return { reward, done: true };
    }

    return { reward, done: false };
  }

  return {
    MAX_STEPS,
    ARENA_MIN,
    ARENA_MAX,
    DIRS,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
});
