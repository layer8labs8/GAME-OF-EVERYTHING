// Rogue Armory - Looter Shooter deterministic logic
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RogueArmory = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ARENA_MIN = 30;
  const ARENA_MAX = 370;
  const MAX_STEPS = 160;
  const MAX_ROOMS = 4;

  const WEAPONS = {
    common: { name: 'Pistol', rarity: 'common', damage: 12, clip: 10, range: 180 },
    rare: { name: 'Pulse Rifle', rarity: 'rare', damage: 22, clip: 14, range: 220 },
    epic: { name: 'Shotgun', rarity: 'epic', damage: 38, clip: 8, range: 140 },
    legendary: { name: 'Railgun', rarity: 'legendary', damage: 65, clip: 5, range: 260 }
  };

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function spawnRoom(state, room) {
    const enemies = [];
    let drop = null;

    if (room === 1) {
      enemies.push(
        { id: 'r1_s1', type: 'scavenger', x: 250, y: 160, hp: 20, maxHp: 20, speed: 10, damage: 8, facingX: -1, facingY: 0 },
        { id: 'r1_s2', type: 'scavenger', x: 280, y: 240, hp: 20, maxHp: 20, speed: 10, damage: 8, facingX: -1, facingY: 0 }
      );
      drop = { id: 'loot_rare', x: 200, y: 140, weapon: { ...WEAPONS.rare }, collected: false };
    } else if (room === 2) {
      enemies.push(
        { id: 'r2_d1', type: 'droid', x: 260, y: 150, hp: 40, maxHp: 40, speed: 8, damage: 14, facingX: -1, facingY: 0 },
        { id: 'r2_d2', type: 'droid', x: 260, y: 250, hp: 40, maxHp: 40, speed: 8, damage: 14, facingX: -1, facingY: 0 }
      );
      drop = { id: 'loot_epic', x: 200, y: 200, weapon: { ...WEAPONS.epic }, collected: false };
    } else if (room === 3) {
      enemies.push(
        { id: 'r3_sentry', type: 'sentry', x: 280, y: 200, hp: 60, maxHp: 60, speed: 0, damage: 18, facingX: -1, facingY: 0 },
        { id: 'r3_elite', type: 'droid', x: 240, y: 120, hp: 45, maxHp: 45, speed: 8, damage: 14, facingX: -1, facingY: 0 }
      );
      drop = { id: 'loot_legendary', x: 200, y: 280, weapon: { ...WEAPONS.legendary }, collected: false };
    } else {
      enemies.push(
        { id: 'warlord', type: 'warlord', x: 260, y: 200, hp: 100, maxHp: 100, speed: 6, damage: 22, facingX: -1, facingY: 0 }
      );
    }

    state.enemies = enemies;
    state.lootDrop = drop;
  }

  function createState(seed = 12345) {
    const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
    const state = {
      rng: s,
      stepCount: 0,
      room: 1,
      scoreVal: 0,
      won: false,
      lost: false,
      player: {
        x: 60,
        y: 200,
        facingX: 1,
        facingY: 0,
        hp: 100,
        maxHp: 100,
        shields: 50,
        maxShields: 50,
        medkits: 1,
        ammo: 10,
        weapon: { ...WEAPONS.common }
      },
      enemies: [],
      lootDrop: null
    };

    spawnRoom(state, 1);
    return state;
  }

  function isOver(state) {
    return state.lost || state.won || state.player.hp <= 0 || state.stepCount >= MAX_STEPS;
  }

  function isNearLoot(state) {
    if (!state.lootDrop || state.lootDrop.collected) return false;
    const p = state.player;
    return Math.hypot(p.x - state.lootDrop.x, p.y - state.lootDrop.y) <= 50;
  }

  function isNearExtraction(state) {
    if (state.room !== MAX_ROOMS || state.enemies.length > 0) return false;
    const p = state.player;
    return Math.hypot(p.x - 200, p.y - 200) <= 60;
  }

  function legalActions(state) {
    if (isOver(state)) return [];

    const actions = ['move_n', 'move_s', 'move_e', 'move_w'];
    const p = state.player;

    if (p.ammo > 0) {
      actions.push('fire');
    }
    if (p.ammo < p.weapon.clip) {
      actions.push('reload');
    }
    if (p.medkits > 0 && p.hp < p.maxHp) {
      actions.push('use_medkit');
    }
    if (isNearLoot(state)) {
      actions.push('equip_loot');
    }
    if (isNearExtraction(state)) {
      actions.push('extract');
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

    // 1. Resolve Operative Action
    if (action.startsWith('move_')) {
      const stepDist = 24;
      if (action === 'move_n') {
        p.y = Math.max(ARENA_MIN, p.y - stepDist);
        p.facingX = 0; p.facingY = -1;
      } else if (action === 'move_s') {
        p.y = Math.min(ARENA_MAX, p.y + stepDist);
        p.facingX = 0; p.facingY = 1;
      } else if (action === 'move_w') {
        p.x = Math.max(ARENA_MIN, p.x - stepDist);
        p.facingX = -1; p.facingY = 0;
      } else if (action === 'move_e') {
        p.x = Math.min(ARENA_MAX, p.x + stepDist);
        p.facingX = 1; p.facingY = 0;

        // Room Advance Doorway Check: at far right when enemies cleared
        if (p.x >= 350 && state.enemies.length === 0 && state.room < MAX_ROOMS) {
          state.room++;
          p.x = 60;
          p.shields = p.maxShields; // Shield regen
          p.medkits = Math.min(2, p.medkits + 1);
          state.scoreVal += state.room * 400;
          spawnRoom(state, state.room);
        }
      }
    } else if (action === 'fire') {
      p.ammo--;
      // Line of sight raycast
      let closestHit = null;
      let closestDist = Infinity;

      for (const e of state.enemies) {
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= p.weapon.range) {
          let aligned = false;
          if (p.facingX !== 0 && Math.sign(dx) === p.facingX && Math.abs(dy) <= 22) {
            aligned = true;
          } else if (p.facingY !== 0 && Math.sign(dy) === p.facingY && Math.abs(dx) <= 22) {
            aligned = true;
          }

          if (aligned && dist < closestDist) {
            closestDist = dist;
            closestHit = e;
          }
        }
      }

      if (closestHit) {
        closestHit.hp -= p.weapon.damage;
        state.scoreVal += p.weapon.damage * 2;
      }
    } else if (action === 'reload') {
      p.ammo = p.weapon.clip;
    } else if (action === 'use_medkit') {
      p.medkits--;
      p.hp = Math.min(p.maxHp, p.hp + 40);
    } else if (action === 'equip_loot') {
      if (state.lootDrop && !state.lootDrop.collected) {
        state.lootDrop.collected = true;
        p.weapon = { ...state.lootDrop.weapon };
        p.ammo = p.weapon.clip;
        state.scoreVal += p.weapon.damage * 10;
      }
    } else if (action === 'extract') {
      state.won = true;
      state.scoreVal += 3000;
    }

    // 2. Enemy Cleanup
    const remainingEnemies = [];
    for (const e of state.enemies) {
      if (e.hp <= 0) {
        state.scoreVal += e.type === 'warlord' ? 1500 : e.type === 'sentry' ? 300 : 150;
      } else {
        remainingEnemies.push(e);
      }
    }
    state.enemies = remainingEnemies;

    // 3. Enemy AI & Retaliation
    for (const e of state.enemies) {
      const dist = Math.hypot(p.x - e.x, p.y - e.y);

      if (dist <= 30) {
        // Melee / contact attack
        let damage = e.damage;
        if (p.shields > 0) {
          const absorbed = Math.min(p.shields, damage);
          p.shields -= absorbed;
          damage -= absorbed;
        }
        if (damage > 0) {
          p.hp = Math.max(0, p.hp - damage);
        }
      } else if (dist <= 160 && e.type !== 'sentry') {
        // Advance toward player
        if (Math.abs(p.x - e.x) > Math.abs(p.y - e.y)) {
          e.x += Math.sign(p.x - e.x) * e.speed;
        } else {
          e.y += Math.sign(p.y - e.y) * e.speed;
        }
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
