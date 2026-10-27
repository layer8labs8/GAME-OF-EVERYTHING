// Shadow Breach - Top-down Shooter deterministic logic
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ShadowBreach = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ARENA_MIN = 20;
  const ARENA_MAX = 380;
  const MAX_STEPS = 160;
  const MAX_AMMO = 12;

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Sectors configuration
  // Sector 1: Reception [Y: 260..380]
  // Blast Door 1: Y: 260, X: 170..230
  // Sector 2: Laboratory [Y: 140..260]
  // Blast Door 2: Y: 140, X: 170..230
  // Sector 3: Vault & Extraction [Y: 20..140]
  // Extraction Pad: X: 180..220, Y: 30..60

  function createState(seed = 12345) {
    const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
    const state = {
      rng: s,
      stepCount: 0,
      scoreVal: 0,
      won: false,
      lost: false,
      hasCore: false,
      player: {
        x: 200,
        y: 350,
        facingX: 0,
        facingY: -1,
        hp: 100,
        maxHp: 100,
        ammo: MAX_AMMO,
        flashbangs: 2,
        breachCharges: 2
      },
      doors: [
        { id: 'door1', x: 200, y: 260, w: 60, h: 14, breached: false, sectorTarget: 2 },
        { id: 'door2', x: 200, y: 140, w: 60, h: 14, breached: false, sectorTarget: 3 }
      ],
      walls: [
        // Dividing wall 1 (between S1 and S2) with door opening
        { x: 20, y: 260, w: 150, h: 14 },
        { x: 230, y: 260, w: 150, h: 14 },
        // Dividing wall 2 (between S2 and S3) with door opening
        { x: 20, y: 140, w: 150, h: 14 },
        { x: 230, y: 140, w: 150, h: 14 },
        // Internal cover pillars
        { x: 100, y: 310, w: 24, h: 24 },
        { x: 300, y: 310, w: 24, h: 24 },
        { x: 90, y: 200, w: 30, h: 20 },
        { x: 280, y: 200, w: 30, h: 20 }
      ],
      enemies: [
        // Sector 1 hostiles
        { id: 'g1', type: 'guard', x: 130, y: 290, hp: 20, maxHp: 20, speed: 12, damage: 8, stunned: 0, facing: -1 },
        { id: 'g2', type: 'guard', x: 270, y: 290, hp: 20, maxHp: 20, speed: 12, damage: 8, stunned: 0, facing: 1 },
        // Sector 2 hostiles
        { id: 'e1', type: 'enforcer', x: 200, y: 190, hp: 60, maxHp: 60, speed: 8, damage: 16, stunned: 0, facing: 0, shield: true },
        { id: 'g3', type: 'guard', x: 120, y: 170, hp: 20, maxHp: 20, speed: 12, damage: 8, stunned: 0, facing: -1 },
        { id: 'g4', type: 'guard', x: 280, y: 170, hp: 20, maxHp: 20, speed: 12, damage: 8, stunned: 0, facing: 1 },
        // Sector 3 hostiles
        { id: 's1', type: 'sentry', x: 200, y: 80, hp: 35, maxHp: 35, speed: 0, damage: 20, stunned: 0, cooldown: 1 },
        { id: 'e2', type: 'enforcer', x: 120, y: 90, hp: 60, maxHp: 60, speed: 8, damage: 16, stunned: 0, facing: 1, shield: true },
        { id: 'e3', type: 'enforcer', x: 280, y: 90, hp: 60, maxHp: 60, speed: 8, damage: 16, stunned: 0, facing: -1, shield: true }
      ],
      vaultCore: { x: 200, y: 55, collected: false }
    };

    return state;
  }

  function isOver(state) {
    return state.lost || state.won || state.player.hp <= 0 || state.stepCount >= MAX_STEPS;
  }

  function isNearUnbreachedDoor(state) {
    const p = state.player;
    for (const d of state.doors) {
      if (!d.breached) {
        const dx = Math.abs(p.x - d.x);
        const dy = Math.abs(p.y - d.y);
        if (dx <= 45 && dy <= 30) {
          return d;
        }
      }
    }
    return null;
  }

  function legalActions(state) {
    if (isOver(state)) return [];

    const actions = ['move_n', 'move_s', 'move_e', 'move_w'];
    const p = state.player;

    if (p.ammo > 0) {
      actions.push('fire');
    }
    if (p.ammo < MAX_AMMO) {
      actions.push('reload');
    }
    if (p.flashbangs > 0) {
      actions.push('flashbang');
    }
    if (p.breachCharges > 0 && isNearUnbreachedDoor(state)) {
      actions.push('breach_charge');
    }

    return actions;
  }

  function score(state) {
    return state.scoreVal;
  }

  function collidesWithWalls(state, x, y, radius = 10) {
    // Check arena outer borders
    if (x - radius < ARENA_MIN || x + radius > ARENA_MAX || y - radius < ARENA_MIN || y + radius > ARENA_MAX) {
      return true;
    }

    // Check permanent walls
    for (const w of state.walls) {
      if (
        x + radius >= w.x &&
        x - radius <= w.x + w.w &&
        y + radius >= w.y &&
        y - radius <= w.y + w.h
      ) {
        return true;
      }
    }

    // Check unbreached blast doors
    for (const d of state.doors) {
      if (!d.breached) {
        if (
          x + radius >= d.x - d.w / 2 &&
          x - radius <= d.x + d.w / 2 &&
          y + radius >= d.y - d.h / 2 &&
          y - radius <= d.y + d.h / 2
        ) {
          return true;
        }
      }
    }

    return false;
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

    // 1. Resolve Operative Action
    if (action.startsWith('move_')) {
      let targetX = p.x;
      let targetY = p.y;
      const stepDist = 24;

      if (action === 'move_n') {
        targetY -= stepDist;
        p.facingX = 0; p.facingY = -1;
      } else if (action === 'move_s') {
        targetY += stepDist;
        p.facingX = 0; p.facingY = 1;
      } else if (action === 'move_w') {
        targetX -= stepDist;
        p.facingX = -1; p.facingY = 0;
      } else if (action === 'move_e') {
        targetX += stepDist;
        p.facingX = 1; p.facingY = 0;
      }

      if (!collidesWithWalls(state, targetX, targetY, 10)) {
        p.x = targetX;
        p.y = targetY;
      }
    } else if (action === 'fire') {
      p.ammo--;
      // Trace line of fire in facing direction
      const bulletRange = 180;
      let closestHit = null;
      let closestDist = Infinity;

      for (const e of state.enemies) {
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= bulletRange) {
          // Check if enemy aligns with player facing vector
          let isAligned = false;
          if (p.facingX !== 0 && Math.sign(dx) === p.facingX && Math.abs(dy) <= 18) {
            isAligned = true;
          } else if (p.facingY !== 0 && Math.sign(dy) === p.facingY && Math.abs(dx) <= 18) {
            isAligned = true;
          }

          if (isAligned && dist < closestDist) {
            // Check wall occlusion between player and enemy
            let occluded = false;
            for (const w of state.walls) {
              if (p.facingY === -1 && w.y < p.y && w.y > e.y && Math.abs(p.x - (w.x + w.w / 2)) <= w.w / 2) {
                occluded = true; break;
              } else if (p.facingY === 1 && w.y > p.y && w.y < e.y && Math.abs(p.x - (w.x + w.w / 2)) <= w.w / 2) {
                occluded = true; break;
              }
            }
            if (!occluded) {
              closestDist = dist;
              closestHit = e;
            }
          }
        }
      }

      if (closestHit) {
        // Enforcer shield check
        let damage = 25;
        if (closestHit.type === 'enforcer' && closestHit.stunned <= 0) {
          // Shield blocks if frontal (e.g. operative facing enforcer front)
          if (p.facingY === -1 && closestHit.facing === 0) {
            // Half damage absorbed by shield
            damage = 10;
          }
        }
        closestHit.hp -= damage;
        state.scoreVal += damage * 3;
      }
    } else if (action === 'reload') {
      p.ammo = MAX_AMMO;
    } else if (action === 'flashbang') {
      p.flashbangs--;
      const fxX = p.x + p.facingX * 60;
      const fxY = p.y + p.facingY * 60;
      let stunnedCount = 0;

      for (const e of state.enemies) {
        const dist = Math.hypot(e.x - fxX, e.y - fxY);
        if (dist <= 95) {
          e.stunned = 3;
          stunnedCount++;
        }
      }
      state.scoreVal += stunnedCount * 50;
    } else if (action === 'breach_charge') {
      const door = isNearUnbreachedDoor(state);
      if (door) {
        p.breachCharges--;
        door.breached = true;
        state.scoreVal += 250;

        // Blast radius stuns & damages hostiles behind door
        for (const e of state.enemies) {
          const dist = Math.hypot(e.x - door.x, e.y - door.y);
          if (dist <= 85) {
            e.hp -= 50;
            e.stunned = 3;
            state.scoreVal += 100;
          }
        }
      }
    }

    // 2. Vault Core Collection Check
    if (!state.hasCore) {
      const coreDist = Math.hypot(p.x - state.vaultCore.x, p.y - state.vaultCore.y);
      if (coreDist <= 24) {
        state.hasCore = true;
        state.scoreVal += 1000;
      }
    }

    // 3. Enemy Cleanup
    const aliveEnemies = [];
    for (const e of state.enemies) {
      if (e.hp <= 0) {
        state.scoreVal += e.type === 'sentry' ? 200 : e.type === 'enforcer' ? 150 : 80;
      } else {
        aliveEnemies.push(e);
      }
    }
    state.enemies = aliveEnemies;

    // 4. Enemy AI & Retaliation
    for (const e of state.enemies) {
      if (e.stunned > 0) {
        e.stunned--;
        continue;
      }

      const dist = Math.hypot(p.x - e.x, p.y - e.y);

      if (e.type === 'sentry') {
        if (dist <= 150) {
          // Line of sight lock
          if (e.cooldown <= 0) {
            p.hp = Math.max(0, p.hp - e.damage);
            e.cooldown = 1;
          } else {
            e.cooldown--;
          }
        }
      } else {
        // Enforcer or Guard: Advance if operative is in same or breached sector
        let canEngage = false;
        if (e.y >= 260 && p.y >= 260) canEngage = true; // Both in Sector 1
        else if (e.y < 260 && e.y >= 140 && p.y < 260 && p.y >= 140) canEngage = true; // Both in Sector 2
        else if (e.y < 140 && p.y < 140) canEngage = true; // Both in Sector 3
        else if (dist <= 100) canEngage = true; // Within breach threshold

        if (canEngage) {
          if (dist <= 26) {
            // Close range strike
            p.hp = Math.max(0, p.hp - e.damage);
          } else {
            // Advance along cardinal axes toward player
            let nextX = e.x;
            let nextY = e.y;
            if (Math.abs(p.x - e.x) > Math.abs(p.y - e.y)) {
              nextX += Math.sign(p.x - e.x) * e.speed;
            } else {
              nextY += Math.sign(p.y - e.y) * e.speed;
            }

            if (!collidesWithWalls(state, nextX, nextY, 10)) {
              e.x = nextX;
              e.y = nextY;
            }
          }
        }
      }
    }

    // 5. Extraction & Victory Check
    // If core collected and operative reaches extraction pad (X: 180..220, Y: 30..60)
    if (state.hasCore && p.x >= 180 && p.x <= 220 && p.y >= 30 && p.y <= 65) {
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
