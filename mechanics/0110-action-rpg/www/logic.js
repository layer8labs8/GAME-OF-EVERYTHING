// Pure deterministic simulation logic for 0110-action-rpg (Blade & Spell)

const ARENA_SIZE = 8;
const MAX_STEPS = 60;
const DIRS = ['N', 'E', 'S', 'W'];

const VECTORS = {
  N: { dx: 0, dy: -1 },
  E: { dx: 1, dy: 0 },
  S: { dx: 0, dy: 1 },
  W: { dx: -1, dy: 0 }
};

function createRng(seed) {
  let s = (Math.imul(seed ^ 0x517cc1b7, 1) + 1) >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function spawnWave(waveNum) {
  if (waveNum === 1) {
    return [
      { id: 'g1', name: 'Skeleton Grunt', x: 2, y: 1, hp: 30, maxHp: 30, atk: 14, windup: false, frozen: false },
      { id: 'g2', name: 'Skeleton Grunt', x: 5, y: 1, hp: 30, maxHp: 30, atk: 14, windup: false, frozen: false },
      { id: 'g3', name: 'Skeleton Grunt', x: 4, y: 2, hp: 30, maxHp: 30, atk: 14, windup: false, frozen: false }
    ];
  } else if (waveNum === 2) {
    return [
      { id: 'c1', name: 'Shadow Cultist', x: 1, y: 1, hp: 40, maxHp: 40, atk: 18, windup: false, frozen: false },
      { id: 'c2', name: 'Shadow Cultist', x: 6, y: 1, hp: 40, maxHp: 40, atk: 18, windup: false, frozen: false },
      { id: 'g4', name: 'Armored Grunt', x: 3, y: 2, hp: 45, maxHp: 45, atk: 16, windup: false, frozen: false },
      { id: 'g5', name: 'Armored Grunt', x: 4, y: 2, hp: 45, maxHp: 45, atk: 16, windup: false, frozen: false }
    ];
  } else {
    // Wave 3 Boss
    return [
      { id: 'boss', name: 'Cryptlord Minotaur', x: 3, y: 1, hp: 140, maxHp: 140, atk: 28, isBoss: true, windup: false, frozen: false }
    ];
  }
}

function createState(seed = 110110) {
  const numSeed = typeof seed === 'number' ? seed : 110110;

  return {
    seed: numSeed,
    rngStep: 0,
    stepCount: 1,
    maxSteps: MAX_STEPS,
    wave: 1,
    maxWaves: 3,
    hero: {
      x: 3,
      y: 6,
      heading: 'N',
      hp: 100,
      maxHp: 100,
      stamina: 100,
      maxStamina: 100,
      mana: 50,
      maxMana: 50,
      flasks: 2,
      isInvulnerable: false,
      combo: 0
    },
    enemies: spawnWave(1),
    history: ['Hero enters the Crypt Dungeon. Wave 1 skeletons emerge!'],
    winner: null,
    done: false
  };
}

function legalActions(state) {
  if (state.done) return [];
  const actions = [];
  const h = state.hero;

  // 1. Cardinal movement (free stamina)
  DIRS.forEach(d => {
    const vec = VECTORS[d];
    const nx = h.x + vec.dx;
    const ny = h.y + vec.dy;
    if (nx >= 0 && nx < ARENA_SIZE && ny >= 0 && ny < ARENA_SIZE) {
      actions.push(`move:${d}`);
    }
  });

  // 2. Dodge roll (costs 20 stamina)
  if (h.stamina >= 20) {
    DIRS.forEach(d => {
      const vec = VECTORS[d];
      const nx = h.x + vec.dx * 2;
      const ny = h.y + vec.dy * 2;
      if (nx >= 0 && nx < ARENA_SIZE && ny >= 0 && ny < ARENA_SIZE) {
        actions.push(`dodge_roll:${d}`);
      }
    });
  }

  // 3. Melee attacks
  if (h.stamina >= 15) {
    actions.push('slash');
  }
  if (h.stamina >= 35) {
    actions.push('spin_cleave');
  }

  // 4. Arcane magic
  if (h.mana >= 20) {
    actions.push('cast_frost_nova');
  }

  // 5. Restorative flask
  if (h.flasks > 0 && h.hp < h.maxHp) {
    actions.push('heal_flask');
  }

  return actions;
}

function getForwardTiles(hero) {
  const vec = VECTORS[hero.heading];
  const fx = hero.x + vec.dx;
  const fy = hero.y + vec.dy;

  const tiles = [{ x: fx, y: fy }];

  // Also include flank tiles in 90 degree forward cone
  if (hero.heading === 'N' || hero.heading === 'S') {
    tiles.push({ x: fx - 1, y: fy });
    tiles.push({ x: fx + 1, y: fy });
  } else {
    tiles.push({ x: fx, y: fy - 1 });
    tiles.push({ x: fx, y: fy + 1 });
  }

  return tiles.filter(t => t.x >= 0 && t.x < ARENA_SIZE && t.y >= 0 && t.y < ARENA_SIZE);
}

function step(state, action) {
  if (state.done) {
    throw new Error('Game is already over');
  }

  const valid = legalActions(state);
  if (!valid.includes(action)) {
    throw new Error(`Illegal action: ${action}`);
  }

  let reward = 0;
  const h = state.hero;
  h.isInvulnerable = false;

  // Passive stamina recovery (+15 up to 100)
  h.stamina = Math.min(h.maxStamina, h.stamina + 15);

  // Execute Hero Action
  if (action.startsWith('move:')) {
    const dir = action.split(':')[1];
    const vec = VECTORS[dir];
    h.heading = dir;
    h.x += vec.dx;
    h.y += vec.dy;
    reward += 1;
    state.history.push(`Hero maneuvered ${dir} to (${h.x}, ${h.y}).`);
  } else if (action.startsWith('dodge_roll:')) {
    const dir = action.split(':')[1];
    const vec = VECTORS[dir];
    h.heading = dir;
    h.stamina -= 20;
    h.x += vec.dx * 2;
    h.y += vec.dy * 2;
    h.isInvulnerable = true;
    reward += 4;
    state.history.push(`DODGE ROLL! Evaded 2 paces ${dir} with invulnerability frames.`);
  } else if (action === 'slash') {
    h.stamina -= 15;
    const forwardCone = getForwardTiles(h);
    let hitCount = 0;

    state.enemies.forEach(e => {
      if (forwardCone.some(t => t.x === e.x && t.y === e.y)) {
        const dmg = 18 + h.combo * 2;
        e.hp = Math.max(0, e.hp - dmg);
        hitCount++;
        reward += 8;
        state.history.push(`Blade slash cleaved ${e.name} for ${dmg} damage!`);
      }
    });

    if (hitCount > 0) {
      h.combo = Math.min(5, h.combo + 1);
    } else {
      h.combo = 0;
      state.history.push('Blade slash cleaved empty air.');
    }
  } else if (action === 'spin_cleave') {
    h.stamina -= 35;
    let hitCount = 0;

    state.enemies.forEach(e => {
      const dx = Math.abs(e.x - h.x);
      const dy = Math.abs(e.y - h.y);
      if (dx <= 1 && dy <= 1) {
        const dmg = 28 + h.combo * 3;
        e.hp = Math.max(0, e.hp - dmg);
        hitCount++;
        reward += 12;
        state.history.push(`WHIRLWIND CLEAVE struck ${e.name} for ${dmg} damage!`);
      }
    });

    if (hitCount > 0) h.combo = Math.min(5, h.combo + 2);
  } else if (action === 'cast_frost_nova') {
    h.mana -= 20;
    state.enemies.forEach(e => {
      const dist = Math.max(Math.abs(e.x - h.x), Math.abs(e.y - h.y));
      if (dist <= 2) {
        e.hp = Math.max(0, e.hp - 22);
        e.frozen = true;
        reward += 10;
        state.history.push(`FROST NOVA chilled ${e.name} for 22 frost damage (Frozen 1 turn)!`);
      }
    });
  } else if (action === 'heal_flask') {
    h.flasks--;
    const heal = Math.min(40, h.maxHp - h.hp);
    h.hp += heal;
    reward += 6;
    state.history.push(`Drank Estus Flask: Restored +${heal} HP.`);
  }

  // Check slain enemies
  const living = [];
  state.enemies.forEach(e => {
    if (e.hp <= 0) {
      reward += e.isBoss ? 80 : 15;
      state.history.push(`${e.name} was vanquished and shattered!`);
    } else {
      living.push(e);
    }
  });
  state.enemies = living;

  // Check wave transition
  if (state.enemies.length === 0) {
    if (state.wave < state.maxWaves) {
      state.wave++;
      state.enemies = spawnWave(state.wave);
      h.flasks = Math.min(2, h.flasks + 1); // Restock 1 flask between waves
      reward += 40;
      state.history.push(`WAVE ${state.wave} ARRIVES! New threats step into the arena!`);
    } else {
      // Victory: all 3 waves slain
      state.done = true;
      state.winner = 'player';
      state.history.push('DUNGEON CONQUERED! The Cryptlord was slain by blade and spell!');
      reward += 150;
      return { reward, done: true };
    }
  }

  // Enemy Action Phase
  state.enemies.forEach(e => {
    if (e.frozen) {
      e.frozen = false;
      state.history.push(`${e.name} is encased in ice and cannot act.`);
      return;
    }

    const dist = Math.max(Math.abs(e.x - h.x), Math.abs(e.y - h.y));

    if (e.windup) {
      // Execute telegraphed attack
      e.windup = false;
      if (dist <= 1 && !h.isInvulnerable) {
        h.hp = Math.max(0, h.hp - e.atk);
        h.combo = 0;
        state.history.push(`TELEGRAPHED STRIKE LANDED: ${e.name} hammered Hero for ${e.atk} damage!`);
      } else if (h.isInvulnerable) {
        state.history.push(`PERFECT DODGE! Hero rolled through ${e.name}'s heavy strike!`);
        reward += 10;
      } else {
        state.history.push(`${e.name}'s heavy strike struck empty ground.`);
      }
    } else if (dist <= 1) {
      // Enter telegraph windup state
      e.windup = true;
      state.history.push(`WARNING: ${e.name} is winding up a devastating attack!`);
    } else {
      // Step towards hero
      const dx = h.x - e.x;
      const dy = h.y - e.y;
      const stepX = dx !== 0 ? (dx > 0 ? 1 : -1) : 0;
      const stepY = dy !== 0 ? (dy > 0 ? 1 : -1) : 0;

      // Prefer moving along largest delta
      if (Math.abs(dx) >= Math.abs(dy) && stepX !== 0) {
        e.x += stepX;
      } else if (stepY !== 0) {
        e.y += stepY;
      }
    }
  });

  // Check hero defeat
  if (h.hp <= 0) {
    state.done = true;
    state.winner = 'enemy';
    state.history.push('HERO SLAIN: Succumbed to wounds in the crypt.');
    reward -= 60;
    return { reward, done: true };
  }

  state.stepCount++;
  if (state.stepCount >= state.maxSteps) {
    state.done = true;
    state.winner = 'enemy';
    state.history.push('EXHAUSTION: Dungeon collapse sealed the chamber.');
  }

  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  const h = state.hero;
  const waveBonus = state.wave * 80;
  const hpBonus = h.hp * 2;
  const flaskBonus = h.flasks * 25;
  const staminaBonus = Math.floor(h.stamina * 0.5);

  let total = waveBonus + hpBonus + flaskBonus + staminaBonus + h.combo * 15;
  if (state.winner === 'player') total += 200;
  return Math.max(0, total);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    ARENA_SIZE,
    DIRS,
    VECTORS
  };
}