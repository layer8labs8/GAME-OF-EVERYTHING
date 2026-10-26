(function (root) {
  'use strict';

  const W = 360;
  const H = 640;
  const MAX_STEPS = 600;

  function nextRandom(state) {
    state.rng = ((state.rng * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    return state.rng / 0x7fffffff;
  }

  function createState(seed = 12345) {
    const curRng = (seed >>> 0) || 1;

    const state = {
      player: {
        x: 180,
        y: 320,
        hp: 100,
        maxHp: 100,
        speed: 6,
        level: 1,
        xp: 0,
        nextXp: 8,
        weapons: {
          wand: { level: 1, cooldown: 0, maxCooldown: 4, damage: 8 },
          aura: { level: 1, radius: 45, damage: 2 },
        },
      },
      enemies: [],
      projectiles: [],
      gems: [],
      spawnTimer: 0,
      enemyId: 1,
      kills: 0,
      stepCount: 0,
      won: false,
      rng: curRng,
    };

    return state;
  }

  function isOver(state) {
    return state.player.hp <= 0 || state.won || state.stepCount >= MAX_STEPS;
  }

  function legalActions(state) {
    if (isOver(state)) return [];
    return [
      'up', 'down', 'left', 'right',
      'up_left', 'up_right', 'down_left', 'down_right',
      'wait',
    ];
  }

  function step(state, action) {
    if (!action || typeof action !== 'string') {
      throw new Error('Invalid action');
    }
    if (isOver(state)) {
      throw new Error('Game is already over');
    }

    const legal = legalActions(state);
    if (!legal.includes(action)) {
      throw new Error('Illegal action: ' + action);
    }

    let reward = 0;
    const p = state.player;

    // 1. Move player
    const spd = p.speed;
    const diag = spd * 0.7071;

    switch (action) {
      case 'up': p.y -= spd; break;
      case 'down': p.y += spd; break;
      case 'left': p.x -= spd; break;
      case 'right': p.x += spd; break;
      case 'up_left': p.x -= diag; p.y -= diag; break;
      case 'up_right': p.x += diag; p.y -= diag; break;
      case 'down_left': p.x -= diag; p.y += diag; break;
      case 'down_right': p.x += diag; p.y += diag; break;
      case 'wait': break;
    }

    p.x = Math.max(15, Math.min(W - 15, p.x));
    p.y = Math.max(15, Math.min(H - 15, p.y));

    // 2. Weapon 1: Magic Wand Auto-Firing
    const wand = p.weapons.wand;
    wand.cooldown -= 1;

    if (wand.cooldown <= 0 && state.enemies.length > 0) {
      // Target nearest enemy
      let nearest = null;
      let minDistSq = Infinity;

      for (let i = 0; i < state.enemies.length; i++) {
        const en = state.enemies[i];
        const dx = en.x - p.x;
        const dy = en.y - p.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDistSq) {
          minDistSq = distSq;
          nearest = en;
        }
      }

      if (nearest) {
        const dx = nearest.x - p.x;
        const dy = nearest.y - p.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const projSpeed = 12;

        state.projectiles.push({
          x: p.x,
          y: p.y,
          vx: (dx / len) * projSpeed,
          vy: (dy / len) * projSpeed,
          damage: wand.damage,
        });
        wand.cooldown = wand.maxCooldown;
      }
    }

    // 3. Weapon 2: Holy Aura Contact Damage
    const aura = p.weapons.aura;
    const auraRadSq = aura.radius * aura.radius;

    for (let i = 0; i < state.enemies.length; i++) {
      const en = state.enemies[i];
      const dx = en.x - p.x;
      const dy = en.y - p.y;
      if (dx * dx + dy * dy <= auraRadSq) {
        en.hp -= aura.damage;
      }
    }

    // 4. Update projectiles
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const proj = state.projectiles[i];
      proj.x += proj.vx;
      proj.y += proj.vy;

      // Check hit with enemies
      let hit = false;
      for (let j = 0; j < state.enemies.length; j++) {
        const en = state.enemies[j];
        const dx = en.x - proj.x;
        const dy = en.y - proj.y;
        if (dx * dx + dy * dy <= 16 * 16) {
          en.hp -= proj.damage;
          hit = true;
          break;
        }
      }

      if (hit || proj.x < -20 || proj.x > W + 20 || proj.y < -20 || proj.y > H + 20) {
        state.projectiles.splice(i, 1);
      }
    }

    // 5. Update enemies & check player damage
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const en = state.enemies[i];

      // Check if dead
      if (en.hp <= 0) {
        state.gems.push({ x: en.x, y: en.y, value: en.xpValue });
        state.enemies.splice(i, 1);
        state.kills += 1;
        reward += 15;
        continue;
      }

      // Move toward player
      const dx = p.x - en.x;
      const dy = p.y - en.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      en.x += (dx / len) * en.speed;
      en.y += (dy / len) * en.speed;

      // Contact player damage
      if (len <= 16) {
        p.hp -= en.damage;
        reward -= en.damage;
      }
    }

    // 6. Gem Collection & Magnet
    const pickupRadiusSq = 45 * 45;
    for (let i = state.gems.length - 1; i >= 0; i--) {
      const gem = state.gems[i];
      const dx = p.x - gem.x;
      const dy = p.y - gem.y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= pickupRadiusSq) {
        p.xp += gem.value;
        reward += 5;
        state.gems.splice(i, 1);

        // Check Level Up
        while (p.xp >= p.nextXp) {
          p.xp -= p.nextXp;
          p.level += 1;
          p.nextXp = Math.floor(p.nextXp * 1.4) + 4;
          p.hp = Math.min(p.maxHp, p.hp + 20);

          if (p.level % 2 === 0) {
            wand.damage += 3;
            wand.maxCooldown = Math.max(2, wand.maxCooldown - 1);
          } else {
            aura.radius += 6;
            aura.damage += 1;
          }
          reward += 40;
        }
      }
    }

    // 7. Enemy Horde Spawning
    state.spawnTimer -= 1;
    if (state.spawnTimer <= 0) {
      const count = 2 + Math.floor(state.stepCount / 80);
      for (let c = 0; c < count; c++) {
        // Spawn from random edge
        const edge = Math.floor(nextRandom(state) * 4);
        let ex = 0, ey = 0;
        if (edge === 0) { ex = Math.floor(nextRandom(state) * W); ey = -15; }
        else if (edge === 1) { ex = W + 15; ey = Math.floor(nextRandom(state) * H); }
        else if (edge === 2) { ex = Math.floor(nextRandom(state) * W); ey = H + 15; }
        else { ex = -15; ey = Math.floor(nextRandom(state) * H); }

        const roll = nextRandom(state);
        let type = 'bat';
        let hp = 6, spd = 2.8, dmg = 4, xpVal = 2;

        if (state.stepCount > 150 && roll < 0.35) {
          type = 'zombie';
          hp = 22; spd = 1.3; dmg = 10; xpVal = 5;
        } else if (state.stepCount > 60 && roll < 0.65) {
          type = 'skeleton';
          hp = 12; spd = 2.0; dmg = 6; xpVal = 3;
        }

        state.enemies.push({
          id: state.enemyId++,
          type,
          x: ex,
          y: ey,
          hp,
          maxHp: hp,
          speed: spd,
          damage: dmg,
          xpValue: xpVal,
        });
      }
      state.spawnTimer = Math.max(6, 16 - Math.floor(state.stepCount / 100));
    }

    state.stepCount += 1;
    if (state.stepCount >= MAX_STEPS && p.hp > 0) {
      state.won = true;
      reward += 250;
    }

    if (p.hp <= 0) {
      p.hp = 0;
      reward -= 50;
    }

    return { reward, done: isOver(state) };
  }

  function score(state) {
    return (
      (state.won ? 1000 : 0) +
      state.kills * 25 +
      state.player.level * 80 +
      state.player.xp * 5 +
      state.stepCount * 2
    );
  }

  const api = {
    W,
    H,
    MAX_STEPS,
    createState,
    legalActions,
    step,
    isOver,
    score,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.GameLogic = api;
  }
})(typeof self !== 'undefined' ? self : globalThis);
