// Crimson Arena - Arena Shooter deterministic logic
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CrimsonArena = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ARENA_SIZE = 400;
  const ARENA_MIN = 30;
  const ARENA_MAX = 370;
  const MAX_WAVES = 5;
  const MAX_STEPS = 650;

  const DIRS = {
    n: { dx: 0, dy: -1 },
    s: { dx: 0, dy: 1 },
    w: { dx: -1, dy: 0 },
    e: { dx: 1, dy: 0 }
  };

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function spawnWaveEnemies(state, wave) {
    const enemies = [];
    let idGen = 1;

    function addEnemy(type, x, y, hp, speed, damage) {
      enemies.push({
        id: `w${wave}_e${idGen++}`,
        type,
        x,
        y,
        hp,
        maxHp: hp,
        speed,
        damage,
        cooldown: 1
      });
    }

    if (wave === 1) {
      addEnemy('drone', 60, 60, 15, 18, 8);
      addEnemy('drone', 340, 60, 15, 18, 8);
      addEnemy('drone', 60, 340, 15, 18, 8);
      addEnemy('drone', 340, 340, 15, 18, 8);
    } else if (wave === 2) {
      addEnemy('drone', 70, 70, 15, 18, 8);
      addEnemy('drone', 330, 70, 15, 18, 8);
      addEnemy('spitter', 200, 50, 30, 10, 12);
      addEnemy('spitter', 200, 350, 30, 10, 12);
      addEnemy('drone', 70, 330, 15, 18, 8);
      addEnemy('drone', 330, 330, 15, 18, 8);
    } else if (wave === 3) {
      addEnemy('juggernaut', 200, 60, 90, 8, 22);
      addEnemy('spitter', 60, 200, 30, 10, 12);
      addEnemy('spitter', 340, 200, 30, 10, 12);
      addEnemy('drone', 80, 80, 15, 18, 8);
      addEnemy('drone', 320, 80, 15, 18, 8);
      addEnemy('drone', 200, 340, 15, 18, 8);
    } else if (wave === 4) {
      addEnemy('juggernaut', 100, 60, 90, 8, 22);
      addEnemy('juggernaut', 300, 60, 90, 8, 22);
      addEnemy('spitter', 50, 200, 30, 10, 12);
      addEnemy('spitter', 350, 200, 30, 10, 12);
      addEnemy('drone', 100, 340, 15, 18, 8);
      addEnemy('drone', 200, 340, 15, 18, 8);
      addEnemy('drone', 300, 340, 15, 18, 8);
    } else {
      // Wave 5 Climax
      addEnemy('juggernaut', 80, 80, 100, 8, 24);
      addEnemy('juggernaut', 320, 80, 100, 8, 24);
      addEnemy('juggernaut', 200, 340, 100, 8, 24);
      addEnemy('spitter', 50, 200, 35, 10, 14);
      addEnemy('spitter', 350, 200, 35, 10, 14);
      addEnemy('drone', 120, 200, 18, 18, 8);
      addEnemy('drone', 280, 200, 18, 18, 8);
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
      kills: 0,
      won: false,
      lost: false,
      player: {
        x: 200,
        y: 200,
        hp: 100,
        maxHp: 100,
        weapon: 'blaster', // 'blaster', 'shotgun', 'plasma'
        shells: 12,
        plasma: 6,
        dodgeCooldown: 0
      },
      enemies: [],
      projectiles: [],
      pickups: []
    };

    state.enemies = spawnWaveEnemies(state, 1);
    return state;
  }

  function isOver(state) {
    return state.lost || state.won || state.player.hp <= 0 || state.stepCount >= MAX_STEPS;
  }

  function legalActions(state) {
    if (isOver(state)) return [];

    const actions = [
      'move_n', 'move_s', 'move_e', 'move_w',
      'fire_n', 'fire_s', 'fire_e', 'fire_w',
      'wait'
    ];

    const p = state.player;

    if (p.weapon !== 'blaster') actions.push('select_blaster');
    if (p.weapon !== 'shotgun' && p.shells > 0) actions.push('select_shotgun');
    if (p.weapon !== 'plasma' && p.plasma > 0) actions.push('select_plasma');

    if (p.dodgeCooldown === 0) actions.push('dodge');

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

    if (p.dodgeCooldown > 0) p.dodgeCooldown--;

    let isDodging = false;

    // 1. Player Action
    if (action.startsWith('move_')) {
      const dir = action.slice(5);
      const moveDist = 26;
      p.x = Math.max(ARENA_MIN, Math.min(ARENA_MAX, p.x + DIRS[dir].dx * moveDist));
      p.y = Math.max(ARENA_MIN, Math.min(ARENA_MAX, p.y + DIRS[dir].dy * moveDist));
    } else if (action === 'dodge') {
      isDodging = true;
      p.dodgeCooldown = 3;
      p.x = Math.max(ARENA_MIN, Math.min(ARENA_MAX, p.x + (nextRandom(state) < 0.5 ? -40 : 40)));
      p.y = Math.max(ARENA_MIN, Math.min(ARENA_MAX, p.y + (nextRandom(state) < 0.5 ? -40 : 40)));
    } else if (action === 'select_blaster') {
      p.weapon = 'blaster';
    } else if (action === 'select_shotgun') {
      p.weapon = 'shotgun';
    } else if (action === 'select_plasma') {
      p.weapon = 'plasma';
    } else if (action.startsWith('fire_')) {
      const dir = action.slice(5);
      const d = DIRS[dir];

      if (p.weapon === 'blaster') {
        state.projectiles.push({
          id: `p_${state.stepCount}_1`,
          x: p.x + d.dx * 16,
          y: p.y + d.dy * 16,
          vx: d.dx * 45,
          vy: d.dy * 45,
          damage: 15,
          pierce: false,
          owner: 'player'
        });
      } else if (p.weapon === 'shotgun') {
        p.shells = Math.max(0, p.shells - 1);
        if (p.shells === 0) p.weapon = 'blaster';

        // 3 spread pellets
        state.projectiles.push({
          id: `p_${state.stepCount}_s1`,
          x: p.x + d.dx * 16,
          y: p.y + d.dy * 16,
          vx: d.dx * 40 - d.dy * 8,
          vy: d.dy * 40 + d.dx * 8,
          damage: 15,
          pierce: false,
          owner: 'player'
        });
        state.projectiles.push({
          id: `p_${state.stepCount}_s2`,
          x: p.x + d.dx * 16,
          y: p.y + d.dy * 16,
          vx: d.dx * 40,
          vy: d.dy * 40,
          damage: 15,
          pierce: false,
          owner: 'player'
        });
        state.projectiles.push({
          id: `p_${state.stepCount}_s3`,
          x: p.x + d.dx * 16,
          y: p.y + d.dy * 16,
          vx: d.dx * 40 + d.dy * 8,
          vy: d.dy * 40 - d.dx * 8,
          damage: 15,
          pierce: false,
          owner: 'player'
        });
      } else if (p.weapon === 'plasma') {
        p.plasma = Math.max(0, p.plasma - 1);
        if (p.plasma === 0) p.weapon = 'blaster';

        state.projectiles.push({
          id: `p_${state.stepCount}_pl`,
          x: p.x + d.dx * 16,
          y: p.y + d.dy * 16,
          vx: d.dx * 55,
          vy: d.dy * 55,
          damage: 40,
          pierce: true,
          owner: 'player'
        });
      }
    }

    // 2. Collect Pickups
    const remainingPickups = [];
    for (const pk of state.pickups) {
      const dist = Math.hypot(pk.x - p.x, pk.y - p.y);
      if (dist <= 28) {
        if (pk.type === 'shells') {
          p.shells = Math.min(24, p.shells + 6);
          state.scoreVal += 40;
        } else if (pk.type === 'plasma') {
          p.plasma = Math.min(12, p.plasma + 3);
          state.scoreVal += 50;
        } else if (pk.type === 'medkit') {
          p.hp = Math.min(p.maxHp, p.hp + 30);
          state.scoreVal += 50;
        }
      } else {
        remainingPickups.push(pk);
      }
    }
    state.pickups = remainingPickups;

    // 3. Projectile Simulation & Collisions
    const remainingProjectiles = [];
    for (const pr of state.projectiles) {
      pr.x += pr.vx;
      pr.y += pr.vy;

      // Arena boundary collision
      if (pr.x < ARENA_MIN || pr.x > ARENA_MAX || pr.y < ARENA_MIN || pr.y > ARENA_MAX) {
        continue;
      }

      if (pr.owner === 'player') {
        let consumed = false;
        for (const e of state.enemies) {
          const dist = Math.hypot(e.x - pr.x, e.y - pr.y);
          const hitRadius = e.type === 'juggernaut' ? 24 : 16;
          if (dist <= hitRadius) {
            e.hp -= pr.damage;
            state.scoreVal += pr.damage * 2;
            if (!pr.pierce) {
              consumed = true;
              break;
            }
          }
        }
        if (!consumed) remainingProjectiles.push(pr);
      } else if (pr.owner === 'enemy') {
        const dist = Math.hypot(p.x - pr.x, p.y - pr.y);
        if (dist <= 18) {
          if (!isDodging) {
            p.hp = Math.max(0, p.hp - pr.damage);
          }
          continue; // Enemy projectile consumed
        }
        remainingProjectiles.push(pr);
      }
    }
    state.projectiles = remainingProjectiles;

    // 4. Enemy AI Turn & Collisions
    for (const e of state.enemies) {
      const dist = Math.hypot(p.x - e.x, p.y - e.y);

      if (e.type === 'spitter') {
        // Ranged mortar
        if (e.cooldown <= 0) {
          const angle = Math.atan2(p.y - e.y, p.x - e.x);
          state.projectiles.push({
            id: `ep_${state.stepCount}_${e.id}`,
            x: e.x,
            y: e.y,
            vx: Math.cos(angle) * 22,
            vy: Math.sin(angle) * 22,
            damage: e.damage,
            pierce: false,
            owner: 'enemy'
          });
          e.cooldown = 2;
        } else {
          e.cooldown--;
          // Maintain distance
          if (dist < 100) {
            const angle = Math.atan2(e.y - p.y, e.x - p.x);
            e.x = Math.max(ARENA_MIN, Math.min(ARENA_MAX, e.x + Math.cos(angle) * e.speed));
            e.y = Math.max(ARENA_MIN, Math.min(ARENA_MAX, e.y + Math.sin(angle) * e.speed));
          }
        }
      } else {
        // Melee Drone or Juggernaut
        const angle = Math.atan2(p.y - e.y, p.x - e.x);
        e.x = Math.max(ARENA_MIN, Math.min(ARENA_MAX, e.x + Math.cos(angle) * e.speed));
        e.y = Math.max(ARENA_MIN, Math.min(ARENA_MAX, e.y + Math.sin(angle) * e.speed));

        const hitDist = Math.hypot(p.x - e.x, p.y - e.y);
        const touchRadius = e.type === 'juggernaut' ? 26 : 18;
        if (hitDist <= touchRadius && !isDodging) {
          p.hp = Math.max(0, p.hp - e.damage);
        }
      }
    }

    // 5. Clean up slain enemies and spawn drop crates
    const aliveEnemies = [];
    for (const e of state.enemies) {
      if (e.hp <= 0) {
        state.kills++;
        const points = e.type === 'juggernaut' ? 300 : e.type === 'spitter' ? 150 : 80;
        state.scoreVal += points;

        // Spawn pickup on slain enemies
        const roll = nextRandom(state);
        if (roll < 0.35) {
          const type = roll < 0.15 ? 'medkit' : roll < 0.25 ? 'plasma' : 'shells';
          state.pickups.push({ type, x: e.x, y: e.y });
        }
      } else {
        aliveEnemies.push(e);
      }
    }
    state.enemies = aliveEnemies;

    // 6. Wave Progression
    if (state.enemies.length === 0) {
      if (state.wave < MAX_WAVES) {
        state.wave++;
        p.hp = Math.min(p.maxHp, p.hp + 25);
        p.shells = Math.min(24, p.shells + 6);
        p.plasma = Math.min(12, p.plasma + 3);
        state.scoreVal += state.wave * 300;
        state.enemies = spawnWaveEnemies(state, state.wave);
      } else {
        state.won = true;
        state.scoreVal += 2000;
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
    ARENA_SIZE,
    ARENA_MIN,
    ARENA_MAX,
    MAX_WAVES,
    MAX_STEPS,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
});
