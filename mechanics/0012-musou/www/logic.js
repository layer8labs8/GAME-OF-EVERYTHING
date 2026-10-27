// Dynasty Cleave - Musou deterministic logic
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DynastyCleave = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ARENA_MIN = 25;
  const ARENA_MAX = 375;
  const MAX_ZONES = 3;
  const MAX_STEPS = 160;

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function spawnZoneEnemies(state, zone) {
    const enemies = [];
    let idGen = 1;

    function addEnemy(type, x, y, hp, speed, damage) {
      enemies.push({
        id: `z${zone}_e${idGen++}`,
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

    const gruntCount = zone === 1 ? 10 : zone === 2 ? 12 : 15;
    const archerCount = zone === 1 ? 3 : zone === 2 ? 4 : 5;
    const captainHp = zone === 1 ? 80 : zone === 2 ? 95 : 110;

    // Spawn Grunts in clustered formations
    for (let i = 0; i < gruntCount; i++) {
      const angle = (i / gruntCount) * Math.PI * 2;
      const dist = 110 + (i % 3) * 25;
      const x = Math.max(ARENA_MIN, Math.min(ARENA_MAX, 200 + Math.cos(angle) * dist));
      const y = Math.max(ARENA_MIN, Math.min(ARENA_MAX, 200 + Math.sin(angle) * dist));
      addEnemy('grunt', x, y, 15, 12, 4);
    }

    // Spawn Archers on backline
    for (let i = 0; i < archerCount; i++) {
      const x = 50 + (i * 70);
      const y = 40;
      addEnemy('archer', x, y, 12, 7, 8);
    }

    // Spawn Vanguard Captain
    addEnemy('captain', 200, 70, captainHp, 9, 18);

    return enemies;
  }

  function createState(seed = 12345) {
    const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
    const state = {
      rng: s,
      stepCount: 0,
      zone: 1,
      koCount: 0,
      scoreVal: 0,
      won: false,
      lost: false,
      player: {
        x: 200,
        y: 200,
        facingX: 1,
        facingY: 0,
        hp: 100,
        maxHp: 100,
        stamina: 100,
        maxStamina: 100,
        musouGauge: 0
      },
      enemies: [],
      projectiles: []
    };

    state.enemies = spawnZoneEnemies(state, 1);
    return state;
  }

  function isOver(state) {
    return state.lost || state.won || state.player.hp <= 0 || state.stepCount >= MAX_STEPS;
  }

  function legalActions(state) {
    if (isOver(state)) return [];

    const actions = ['move_n', 'move_s', 'move_e', 'move_w', 'rest'];
    const p = state.player;

    if (p.stamina >= 12) actions.push('wide_cleave');
    if (p.stamina >= 25) actions.push('heavy_smash');
    if (p.stamina >= 20) actions.push('dash');
    if (p.musouGauge >= 100) actions.push('musou_rampage');

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

    // Passive stamina recovery if not expending
    if (action === 'rest') {
      p.stamina = Math.min(p.maxStamina, p.stamina + 40);
    } else if (action.startsWith('move_')) {
      p.stamina = Math.min(p.maxStamina, p.stamina + 8);
    }

    // 1. Resolve Player Action
    if (action === 'move_n') {
      p.y = Math.max(ARENA_MIN, p.y - 25);
      p.facingX = 0; p.facingY = -1;
    } else if (action === 'move_s') {
      p.y = Math.min(ARENA_MAX, p.y + 25);
      p.facingX = 0; p.facingY = 1;
    } else if (action === 'move_w') {
      p.x = Math.max(ARENA_MIN, p.x - 25);
      p.facingX = -1; p.facingY = 0;
    } else if (action === 'move_e') {
      p.x = Math.min(ARENA_MAX, p.x + 25);
      p.facingX = 1; p.facingY = 0;
    } else if (action === 'dash') {
      p.stamina -= 20;
      p.x = Math.max(ARENA_MIN, Math.min(ARENA_MAX, p.x + p.facingX * 50));
      p.y = Math.max(ARENA_MIN, Math.min(ARENA_MAX, p.y + p.facingY * 50));
      isInvulnerable = true;
    } else if (action === 'wide_cleave') {
      p.stamina -= 12;
      const reach = 68;
      const dmg = 18;
      let hitCount = 0;

      for (const e of state.enemies) {
        const dist = Math.hypot(e.x - p.x, e.y - p.y);
        if (dist <= reach) {
          // Front semicircle dot product check
          const dot = (e.x - p.x) * p.facingX + (e.y - p.y) * p.facingY;
          if (dot >= -5) {
            e.hp -= dmg;
            hitCount++;
            state.scoreVal += dmg * 2;
          }
        }
      }
      p.musouGauge = Math.min(100, p.musouGauge + hitCount * 6);
    } else if (action === 'heavy_smash') {
      p.stamina -= 25;
      const reach = 55;
      const dmg = 35;
      let hitCount = 0;

      for (const e of state.enemies) {
        const dist = Math.hypot(e.x - p.x, e.y - p.y);
        if (dist <= reach) {
          const dot = (e.x - p.x) * p.facingX + (e.y - p.y) * p.facingY;
          if (dot >= 0) {
            e.hp -= dmg;
            hitCount++;
            state.scoreVal += dmg * 2;
            // Knockback
            e.x = Math.max(ARENA_MIN, Math.min(ARENA_MAX, e.x + p.facingX * 28));
            e.y = Math.max(ARENA_MIN, Math.min(ARENA_MAX, e.y + p.facingY * 28));
          }
        }
      }
      p.musouGauge = Math.min(100, p.musouGauge + hitCount * 12);
    } else if (action === 'musou_rampage') {
      p.musouGauge = 0;
      isInvulnerable = true;
      const reach = 92;
      const dmg = 60;

      for (const e of state.enemies) {
        const dist = Math.hypot(e.x - p.x, e.y - p.y);
        if (dist <= reach) {
          e.hp -= dmg;
          state.scoreVal += dmg * 3;
        }
      }
    }

    // 2. Projectile Simulation & Collisions (Archer Arrows)
    const remainingProjectiles = [];
    for (const pr of state.projectiles) {
      pr.x += pr.vx;
      pr.y += pr.vy;

      if (pr.x < ARENA_MIN || pr.x > ARENA_MAX || pr.y < ARENA_MIN || pr.y > ARENA_MAX) {
        continue;
      }

      const dist = Math.hypot(p.x - pr.x, p.y - pr.y);
      if (dist <= 16) {
        if (!isInvulnerable) {
          p.hp = Math.max(0, p.hp - pr.damage);
        }
        continue;
      }
      remainingProjectiles.push(pr);
    }
    state.projectiles = remainingProjectiles;

    // 3. Enemy AI & Assault Turn
    for (const e of state.enemies) {
      const dist = Math.hypot(p.x - e.x, p.y - e.y);

      if (e.type === 'archer') {
        if (e.cooldown <= 0) {
          const angle = Math.atan2(p.y - e.y, p.x - e.x);
          state.projectiles.push({
            id: `arrow_${state.stepCount}_${e.id}`,
            x: e.x,
            y: e.y,
            vx: Math.cos(angle) * 22,
            vy: Math.sin(angle) * 22,
            damage: e.damage,
            owner: 'enemy'
          });
          e.cooldown = 2;
        } else {
          e.cooldown--;
          // Reposition to maintain shooting range
          if (dist < 80) {
            const angle = Math.atan2(e.y - p.y, e.x - p.x);
            e.x = Math.max(ARENA_MIN, Math.min(ARENA_MAX, e.x + Math.cos(angle) * e.speed));
            e.y = Math.max(ARENA_MIN, Math.min(ARENA_MAX, e.y + Math.sin(angle) * e.speed));
          }
        }
      } else {
        // Grunt or Captain: Swarm toward general
        const angle = Math.atan2(p.y - e.y, p.x - e.x);
        e.x = Math.max(ARENA_MIN, Math.min(ARENA_MAX, e.x + Math.cos(angle) * e.speed));
        e.y = Math.max(ARENA_MIN, Math.min(ARENA_MAX, e.y + Math.sin(angle) * e.speed));

        const hitDist = Math.hypot(p.x - e.x, p.y - e.y);
        const contactRadius = e.type === 'captain' ? 24 : 16;
        if (hitDist <= contactRadius && !isInvulnerable) {
          p.hp = Math.max(0, p.hp - e.damage);
        }
      }
    }

    // 4. Clean up fallen hostiles & Commander defeat check
    let captainSlain = false;
    const aliveEnemies = [];
    for (const e of state.enemies) {
      if (e.hp <= 0) {
        state.koCount++;
        if (e.type === 'captain') {
          captainSlain = true;
          state.scoreVal += 1000;
          p.hp = Math.min(p.maxHp, p.hp + 30); // Health bun recovery
        } else {
          state.scoreVal += e.type === 'archer' ? 50 : 25;
        }
      } else {
        aliveEnemies.push(e);
      }
    }
    state.enemies = aliveEnemies;

    // 5. Zone Progression
    if (captainSlain && p.hp > 0) {
      if (state.zone < MAX_ZONES) {
        state.zone++;
        p.stamina = p.maxStamina;
        p.musouGauge = Math.min(100, p.musouGauge + 40);
        state.scoreVal += state.zone * 500;
        state.enemies = spawnZoneEnemies(state, state.zone);
      } else {
        state.won = true;
        state.scoreVal += 2500;
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
