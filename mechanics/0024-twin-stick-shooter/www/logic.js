// Vortex Core - Twin Stick Shooter deterministic logic
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.VortexCore = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ARENA_MIN = 30;
  const ARENA_MAX = 370;
  const MAX_WAVES = 5;
  const MAX_STEPS = 650;

  const AIM_DIRS = {
    n:  { dx: 0, dy: -1 },
    s:  { dx: 0, dy: 1 },
    w:  { dx: -1, dy: 0 },
    e:  { dx: 1, dy: 0 },
    ne: { dx: 0.7071, dy: -0.7071 },
    nw: { dx: -0.7071, dy: -0.7071 },
    se: { dx: 0.7071, dy: 0.7071 },
    sw: { dx: -0.7071, dy: 0.7071 }
  };

  const MOVE_DIRS = {
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
    let idCounter = 1;

    function addEnemy(type, x, y, hp, speed, damage) {
      enemies.push({
        id: `w${wave}_e${idCounter++}`,
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
      addEnemy('seeker', 60, 60, 15, 16, 10);
      addEnemy('seeker', 340, 60, 15, 16, 10);
      addEnemy('seeker', 60, 340, 15, 16, 10);
      addEnemy('seeker', 340, 340, 15, 16, 10);
    } else if (wave === 2) {
      addEnemy('seeker', 70, 70, 15, 16, 10);
      addEnemy('seeker', 330, 70, 15, 16, 10);
      addEnemy('turret', 200, 50, 35, 8, 12);
      addEnemy('turret', 200, 350, 35, 8, 12);
      addEnemy('seeker', 70, 330, 15, 16, 10);
      addEnemy('seeker', 330, 330, 15, 16, 10);
    } else if (wave === 3) {
      addEnemy('mine', 200, 60, 50, 4, 25);
      addEnemy('turret', 60, 200, 35, 8, 12);
      addEnemy('turret', 340, 200, 35, 8, 12);
      addEnemy('seeker', 80, 80, 15, 16, 10);
      addEnemy('seeker', 320, 80, 15, 16, 10);
      addEnemy('seeker', 200, 340, 15, 16, 10);
    } else if (wave === 4) {
      addEnemy('mine', 100, 60, 50, 4, 25);
      addEnemy('mine', 300, 60, 50, 4, 25);
      addEnemy('turret', 50, 200, 35, 8, 12);
      addEnemy('turret', 350, 200, 35, 8, 12);
      addEnemy('seeker', 100, 340, 15, 16, 10);
      addEnemy('seeker', 200, 340, 15, 16, 10);
      addEnemy('seeker', 300, 340, 15, 16, 10);
    } else {
      // Wave 5 Climax
      addEnemy('mine', 80, 80, 60, 5, 25);
      addEnemy('mine', 320, 80, 60, 5, 25);
      addEnemy('mine', 200, 340, 60, 5, 25);
      addEnemy('turret', 50, 200, 40, 8, 14);
      addEnemy('turret', 350, 200, 40, 8, 14);
      addEnemy('seeker', 120, 200, 18, 18, 10);
      addEnemy('seeker', 280, 200, 18, 18, 10);
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
        bombs: 2
      },
      enemies: [],
      projectiles: []
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
      'fire_ne', 'fire_nw', 'fire_se', 'fire_sw',
      'wait'
    ];

    if (state.player.bombs > 0) {
      actions.push('bomb');
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

    // 1. Player Action
    if (action.startsWith('move_')) {
      const dir = action.slice(5);
      const d = MOVE_DIRS[dir];
      const speed = 25;
      p.x = Math.max(ARENA_MIN, Math.min(ARENA_MAX, p.x + d.dx * speed));
      p.y = Math.max(ARENA_MIN, Math.min(ARENA_MAX, p.y + d.dy * speed));
    } else if (action.startsWith('fire_')) {
      const dir = action.slice(5);
      const d = AIM_DIRS[dir];
      state.projectiles.push({
        id: `pp_${state.stepCount}`,
        x: p.x + d.dx * 18,
        y: p.y + d.dy * 18,
        vx: d.dx * 30,
        vy: d.dy * 30,
        damage: 20,
        owner: 'player'
      });
    } else if (action === 'bomb') {
      p.bombs--;
      // Screen clearing bomb: eliminates all enemy projectiles and inflicts 45 damage to all enemies
      state.projectiles = state.projectiles.filter(pr => pr.owner === 'player');
      for (const e of state.enemies) {
        e.hp -= 45;
        state.scoreVal += 90;
      }
    }

    // 2. Projectile Simulation & Collisions
    const remainingProjectiles = [];
    for (const pr of state.projectiles) {
      pr.x += pr.vx;
      pr.y += pr.vy;

      if (pr.x < ARENA_MIN || pr.x > ARENA_MAX || pr.y < ARENA_MIN || pr.y > ARENA_MAX) {
        continue;
      }

      if (pr.owner === 'player') {
        let hit = false;
        for (const e of state.enemies) {
          const dist = Math.hypot(e.x - pr.x, e.y - pr.y);
          const hitRadius = e.type === 'mine' ? 22 : 16;
          if (dist <= hitRadius) {
            e.hp -= pr.damage;
            state.scoreVal += pr.damage * 2;
            hit = true;
            break;
          }
        }
        if (!hit) remainingProjectiles.push(pr);
      } else if (pr.owner === 'enemy') {
        const dist = Math.hypot(p.x - pr.x, p.y - pr.y);
        if (dist <= 16) {
          p.hp = Math.max(0, p.hp - pr.damage);
          continue;
        }
        remainingProjectiles.push(pr);
      }
    }
    state.projectiles = remainingProjectiles;

    // 3. Enemy AI & Projectile Spawns
    for (const e of state.enemies) {
      const dist = Math.hypot(p.x - e.x, p.y - e.y);

      if (e.type === 'turret') {
        // Orbit and shoot
        if (e.cooldown <= 0) {
          const angle = Math.atan2(p.y - e.y, p.x - e.x);
          state.projectiles.push({
            id: `ep_${state.stepCount}_${e.id}`,
            x: e.x,
            y: e.y,
            vx: Math.cos(angle) * 20,
            vy: Math.sin(angle) * 20,
            damage: e.damage,
            owner: 'enemy'
          });
          e.cooldown = 2;
        } else {
          e.cooldown--;
          // Lateral orbital strafe
          const angle = Math.atan2(p.y - e.y, p.x - e.x) + Math.PI / 2;
          e.x = Math.max(ARENA_MIN, Math.min(ARENA_MAX, e.x + Math.cos(angle) * e.speed));
          e.y = Math.max(ARENA_MIN, Math.min(ARENA_MAX, e.y + Math.sin(angle) * e.speed));
        }
      } else {
        // Seeker or Pulsar Mine
        const angle = Math.atan2(p.y - e.y, p.x - e.x);
        e.x = Math.max(ARENA_MIN, Math.min(ARENA_MAX, e.x + Math.cos(angle) * e.speed));
        e.y = Math.max(ARENA_MIN, Math.min(ARENA_MAX, e.y + Math.sin(angle) * e.speed));

        const hitDist = Math.hypot(p.x - e.x, p.y - e.y);
        const contactRadius = e.type === 'mine' ? 24 : 16;
        if (hitDist <= contactRadius) {
          p.hp = Math.max(0, p.hp - e.damage);
          if (e.type === 'mine') {
            e.hp = 0; // Mine detonates on contact
          }
        }
      }
    }

    // 4. Remove Slain Enemies
    const aliveEnemies = [];
    for (const e of state.enemies) {
      if (e.hp <= 0) {
        state.kills++;
        state.scoreVal += (e.type === 'mine' ? 200 : e.type === 'turret' ? 120 : 60);
      } else {
        aliveEnemies.push(e);
      }
    }
    state.enemies = aliveEnemies;

    // 5. Wave Progression
    if (p.hp > 0 && state.enemies.length === 0) {
      if (state.wave < MAX_WAVES) {
        state.wave++;
        p.hp = Math.min(p.maxHp, p.hp + 20);
        state.scoreVal += state.wave * 250;
        state.enemies = spawnWaveEnemies(state, state.wave);
      } else {
        state.won = true;
        state.scoreVal += 1500;
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
