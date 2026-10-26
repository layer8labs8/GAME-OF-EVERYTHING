// Chrono Matrix - Time Slowdown deterministic logic
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ChronoMatrix = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const GRID_SIZE = 10;
  const MAX_ROOMS = 3;
  const MAX_STEPS = 180;

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

  function getPillarsForRoom(room) {
    if (room === 1) {
      return [
        { x: 3, y: 3 }, { x: 6, y: 3 },
        { x: 3, y: 6 }, { x: 6, y: 6 }
      ];
    } else if (room === 2) {
      return [
        { x: 2, y: 4 }, { x: 3, y: 4 },
        { x: 6, y: 5 }, { x: 7, y: 5 },
        { x: 4, y: 2 }, { x: 5, y: 7 }
      ];
    } else {
      return [
        { x: 3, y: 2 }, { x: 6, y: 2 },
        { x: 4, y: 4 }, { x: 5, y: 4 },
        { x: 4, y: 5 }, { x: 5, y: 5 },
        { x: 3, y: 7 }, { x: 6, y: 7 }
      ];
    }
  }

  function spawnRoom(state, room) {
    state.room = room;
    state.pillars = getPillarsForRoom(room);
    state.bullets = [];
    state.pickups = [];

    // Player position
    state.player.x = 1;
    state.player.y = 8;

    // Spawn enemies
    const enemies = [];
    let idGen = 1;

    function addEnemy(type, x, y, hp) {
      enemies.push({
        id: `r${room}_e${idGen++}`,
        type,
        x,
        y,
        hp,
        maxHp: hp,
        cooldown: 1
      });
    }

    if (room === 1) {
      addEnemy('agent', 8, 2, 1);
      addEnemy('agent', 2, 2, 1);
      addEnemy('agent', 8, 7, 1);
    } else if (room === 2) {
      addEnemy('agent', 8, 1, 1);
      addEnemy('brawler', 4, 3, 2);
      addEnemy('agent', 1, 1, 1);
      addEnemy('brawler', 8, 8, 2);
    } else {
      addEnemy('agent', 8, 1, 1);
      addEnemy('agent', 1, 1, 1);
      addEnemy('brawler', 5, 2, 2);
      addEnemy('agent', 8, 8, 1);
      addEnemy('brawler', 2, 4, 2);
    }

    state.enemies = enemies;
  }

  function createState(seed = 12345) {
    const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
    const state = {
      rng: s,
      stepCount: 0,
      room: 1,
      scoreVal: 0,
      kills: 0,
      won: false,
      lost: false,
      player: {
        x: 1,
        y: 8,
        hp: 3,
        maxHp: 3,
        ammo: 4
      },
      pillars: [],
      enemies: [],
      bullets: [],
      pickups: []
    };

    spawnRoom(state, 1);
    return state;
  }

  function isWall(state, x, y) {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return true;
    return state.pillars.some(p => p.x === x && p.y === y);
  }

  function isOver(state) {
    return state.lost || state.won || state.player.hp <= 0 || state.stepCount >= MAX_STEPS;
  }

  function legalActions(state) {
    if (isOver(state)) return [];

    const actions = ['wait'];
    const p = state.player;

    // Movement actions
    for (const [key, d] of Object.entries(DIRS)) {
      const tx = p.x + d.dx;
      const ty = p.y + d.dy;
      if (!isWall(state, tx, ty) && !state.enemies.some(e => e.x === tx && e.y === ty)) {
        actions.push(`move_${key}`);
      }
    }

    // Shooting actions (requires ammo)
    if (p.ammo > 0) {
      actions.push('shoot_n', 'shoot_s', 'shoot_e', 'shoot_w');
    }

    // Punch actions (adjacent enemy)
    for (const [key, d] of Object.entries(DIRS)) {
      const tx = p.x + d.dx;
      const ty = p.y + d.dy;
      if (state.enemies.some(e => e.x === tx && e.y === ty)) {
        actions.push(`punch_${key}`);
      }
    }

    return actions;
  }

  function score(state) {
    return state.scoreVal;
  }

  function hasLineOfSight(state, x1, y1, x2, y2) {
    if (x1 !== x2 && y1 !== y2) return false;
    const dx = Math.sign(x2 - x1);
    const dy = Math.sign(y2 - y1);
    let cx = x1 + dx;
    let cy = y1 + dy;
    while (cx !== x2 || cy !== y2) {
      if (isWall(state, cx, cy)) return false;
      cx += dx;
      cy += dy;
    }
    return true;
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

    // 1. Execute Player Action
    if (action.startsWith('move_')) {
      const dir = action.slice(5);
      p.x += DIRS[dir].dx;
      p.y += DIRS[dir].dy;

      // Collect ammo pickups if any
      const pickupIdx = state.pickups.findIndex(pk => pk.x === p.x && pk.y === p.y);
      if (pickupIdx >= 0) {
        state.pickups.splice(pickupIdx, 1);
        p.ammo = Math.min(8, p.ammo + 2);
        state.scoreVal += 25;
      }
    } else if (action.startsWith('shoot_')) {
      const dir = action.slice(6);
      p.ammo--;
      state.bullets.push({
        id: `pb_${state.stepCount}`,
        x: p.x + DIRS[dir].dx,
        y: p.y + DIRS[dir].dy,
        dx: DIRS[dir].dx,
        dy: DIRS[dir].dy,
        owner: 'player'
      });
    } else if (action.startsWith('punch_')) {
      const dir = action.slice(6);
      const tx = p.x + DIRS[dir].dx;
      const ty = p.y + DIRS[dir].dy;
      const target = state.enemies.find(e => e.x === tx && e.y === ty);
      if (target) {
        target.hp -= 2;
        p.ammo = Math.min(8, p.ammo + 1); // Disarm weapon recovery
        state.scoreVal += 150;
      }
    }

    // 2. Advance Bullets
    const remainingBullets = [];
    for (const b of state.bullets) {
      // Check collision at start of step
      let hit = false;

      // Check wall impact
      if (isWall(state, b.x, b.y)) {
        continue;
      }

      // Check player impact
      if (b.owner === 'enemy' && b.x === p.x && b.y === p.y) {
        p.hp--;
        hit = true;
      }

      // Check enemy impact
      if (b.owner === 'player') {
        const hitEnemy = state.enemies.find(e => e.x === b.x && e.y === b.y);
        if (hitEnemy) {
          hitEnemy.hp--;
          state.scoreVal += 100;
          hit = true;
        }
      }

      if (!hit) {
        // Move bullet forward
        b.x += b.dx;
        b.y += b.dy;

        // Check impact at new position
        if (isWall(state, b.x, b.y)) {
          continue;
        }
        if (b.owner === 'enemy' && b.x === p.x && b.y === p.y) {
          p.hp--;
          continue;
        }
        if (b.owner === 'player') {
          const hitEnemy = state.enemies.find(e => e.x === b.x && e.y === b.y);
          if (hitEnemy) {
            hitEnemy.hp--;
            state.scoreVal += 100;
            continue;
          }
        }
        remainingBullets.push(b);
      }
    }
    state.bullets = remainingBullets;

    // 3. Clean up dead enemies and spawn ammo drops
    const aliveEnemies = [];
    for (const e of state.enemies) {
      if (e.hp <= 0) {
        state.kills++;
        state.scoreVal += 200;
        state.pickups.push({ x: e.x, y: e.y });
      } else {
        aliveEnemies.push(e);
      }
    }
    state.enemies = aliveEnemies;

    // 4. Enemy AI Turn
    for (const e of state.enemies) {
      const dist = Math.abs(e.x - p.x) + Math.abs(e.y - p.y);

      if (e.type === 'brawler') {
        if (dist === 1) {
          // Adjacent melee punch
          p.hp--;
        } else {
          // Pathfind 1 tile closer
          const dx = p.x - e.x;
          const dy = p.y - e.y;
          let stepX = 0;
          let stepY = 0;
          if (Math.abs(dx) >= Math.abs(dy)) {
            stepX = Math.sign(dx);
          } else {
            stepY = Math.sign(dy);
          }
          const targetX = e.x + stepX;
          const targetY = e.y + stepY;
          if (!isWall(state, targetX, targetY) && !(targetX === p.x && targetY === p.y) && !state.enemies.some(o => o.x === targetX && o.y === targetY)) {
            e.x = targetX;
            e.y = targetY;
          }
        }
      } else if (e.type === 'agent') {
        // Red Agent with Pistol
        if (hasLineOfSight(state, e.x, e.y, p.x, p.y) && dist <= 6) {
          if (e.cooldown <= 0) {
            // Fire bullet toward player
            const bdx = Math.sign(p.x - e.x);
            const bdy = Math.sign(p.y - e.y);
            state.bullets.push({
              id: `eb_${state.stepCount}_${e.id}`,
              x: e.x + bdx,
              y: e.y + bdy,
              dx: bdx,
              dy: bdy,
              owner: 'enemy'
            });
            e.cooldown = 2;
          } else {
            e.cooldown--;
          }
        } else {
          if (e.cooldown > 0) e.cooldown--;
          // Step toward player
          const dx = p.x - e.x;
          const dy = p.y - e.y;
          let stepX = 0;
          let stepY = 0;
          if (Math.abs(dx) >= Math.abs(dy)) stepX = Math.sign(dx);
          else stepY = Math.sign(dy);

          const targetX = e.x + stepX;
          const targetY = e.y + stepY;
          if (!isWall(state, targetX, targetY) && !(targetX === p.x && targetY === p.y) && !state.enemies.some(o => o.x === targetX && o.y === targetY)) {
            e.x = targetX;
            e.y = targetY;
          }
        }
      }
    }

    // 5. Room Completion & Progression
    if (state.enemies.length === 0) {
      if (state.room < MAX_ROOMS) {
        state.room++;
        p.hp = Math.min(p.maxHp, p.hp + 1);
        p.ammo = Math.min(8, p.ammo + 2);
        state.scoreVal += 500;
        spawnRoom(state, state.room);
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
    GRID_SIZE,
    MAX_ROOMS,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
});
