// Logic for 0123-action-roguelike: Void Breach: Action Roguelike
// Pure Bot Contract implementation. Zero UI or platform dependencies.

const ARENA_SIZE = 8;
const MAX_TURNS = 150;

function nextRng(state) {
  state.rngState = (Math.imul(state.rngState, 1664525) + 1013904223) >>> 0;
  return state.rngState / 4294967296;
}

const DIR_OFFSETS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 }
};

function createWaveEnemies(waveNumber) {
  if (waveNumber === 1) {
    return [
      { id: 's1', name: 'Void Spitter', hp: 25, maxHp: 25, atk: 8, x: 2, y: 1, type: 'spitter' },
      { id: 's2', name: 'Void Spitter', hp: 25, maxHp: 25, atk: 8, x: 5, y: 1, type: 'spitter' }
    ];
  } else if (waveNumber === 2) {
    return [
      { id: 'c1', name: 'Crimson Stalker', hp: 30, maxHp: 30, atk: 12, x: 1, y: 1, type: 'stalker' },
      { id: 'c2', name: 'Crimson Stalker', hp: 30, maxHp: 30, atk: 12, x: 6, y: 1, type: 'stalker' },
      { id: 'c3', name: 'Crimson Stalker', hp: 30, maxHp: 30, atk: 12, x: 3, y: 2, type: 'stalker' }
    ];
  } else if (waveNumber === 3) {
    return [
      { id: 'g1', name: 'Plasma Goliath', hp: 60, maxHp: 60, atk: 16, x: 2, y: 2, type: 'goliath' },
      { id: 'g2', name: 'Plasma Goliath', hp: 60, maxHp: 60, atk: 16, x: 5, y: 2, type: 'goliath' }
    ];
  } else {
    // Wave 4 Boss
    return [
      { id: 'boss', name: 'The Void Overlord', hp: 160, maxHp: 160, atk: 24, x: 3, y: 1, type: 'boss' }
    ];
  }
}

function createState(seed = 1) {
  let rngVal = (Math.floor(seed) >>> 0) || 333888123;

  const player = {
    x: 3,
    y: 6,
    hp: 100,
    maxHp: 100,
    ammo: 6,
    maxAmmo: 6,
    stamina: 30,
    maxStamina: 30,
    perks: [], // 'triple_shot', 'homing', 'explosive'
    isInvulnerable: false
  };

  const enemies = createWaveEnemies(1);

  return {
    seed,
    rngState: rngVal,
    wave: 1,
    maxWaves: 4,
    player,
    enemies,
    bullets: [], // { x, y, dx, dy, fromPlayer: bool, dmg: number }
    perkPending: false,
    turnCount: 0,
    score: 0,
    done: false,
    victory: false,
    combatLog: ['Quarantine breach initialized: Wave 1 hostile bio-forms active!']
  };
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];
  const p = state.player;

  if (state.perkPending) {
    if (!p.perks.includes('triple_shot')) actions.push('choose_perk:triple_shot');
    if (!p.perks.includes('homing')) actions.push('choose_perk:homing');
    if (!p.perks.includes('explosive')) actions.push('choose_perk:explosive');
    if (actions.length === 0) actions.push('choose_perk:triple_shot'); // fallback
    return actions;
  }

  // Tactical Movement
  const dirs = ['up', 'down', 'left', 'right'];
  for (let i = 0; i < dirs.length; i++) {
    const d = dirs[i];
    const off = DIR_OFFSETS[d];
    const nx = p.x + off.dx;
    const ny = p.y + off.dy;
    if (nx >= 0 && nx < ARENA_SIZE && ny >= 0 && ny < ARENA_SIZE) {
      actions.push(`move:${d}`);
    }
  }

  // Shooting
  if (p.ammo > 0) {
    for (let i = 0; i < dirs.length; i++) {
      actions.push(`shoot:${dirs[i]}`);
    }
  }

  // Dash (consumes 10 stamina, leaps 2 tiles)
  if (p.stamina >= 10) {
    for (let i = 0; i < dirs.length; i++) {
      const d = dirs[i];
      const off = DIR_OFFSETS[d];
      const nx = p.x + off.dx * 2;
      const ny = p.y + off.dy * 2;
      if (nx >= 0 && nx < ARENA_SIZE && ny >= 0 && ny < ARENA_SIZE) {
        actions.push(`dash:${d}`);
      }
    }
  }

  // Reload
  if (p.ammo < p.maxAmmo) {
    actions.push('reload');
  }

  actions.push('wait');

  return actions;
}

function checkOutcome(state) {
  if (state.player.hp <= 0) {
    state.done = true;
    state.victory = false;
    state.combatLog.push('DEFEAT! Biotic containment failure. Gunner KIA.');
    return;
  }

  // Check if wave enemies all cleared
  const allEnemiesDead = state.enemies.every(e => e.hp <= 0);
  if (allEnemiesDead && !state.perkPending) {
    state.score += 250;
    if (state.wave < state.maxWaves) {
      state.perkPending = true;
      state.combatLog.push(`Wave ${state.wave} cleared! Select an augmentation perk.`);
      return;
    } else {
      // Overlord Defeated!
      state.done = true;
      state.victory = true;
      state.score += 1500 + Math.max(0, 300 - state.turnCount * 4);
      state.combatLog.push('VICTORY! The Void Overlord has been eradicated. Breach closed!');
      return;
    }
  }

  if (state.turnCount >= MAX_TURNS) {
    state.done = true;
    state.victory = false;
    state.combatLog.push('DEFEAT! Tactical extraction timeframe expired.');
  }
}

function step(state, action) {
  if (state.done) {
    throw new Error('Game is already over');
  }

  const legal = legalActions(state);
  if (!legal.includes(action)) {
    throw new Error(`Illegal action: ${action}`);
  }

  state.turnCount++;
  let reward = 0.0;
  const p = state.player;

  p.isInvulnerable = false; // Reset i-frames at start of turn

  if (action.startsWith('choose_perk:')) {
    const perk = action.slice(12);
    p.perks.push(perk);
    state.perkPending = false;
    state.wave++;
    state.enemies = createWaveEnemies(state.wave);
    state.bullets = []; // Clear bullets on new wave
    p.ammo = p.maxAmmo;
    p.hp = Math.min(p.maxHp, p.hp + 25);
    state.score += 100;
    reward += 0.1;
    state.combatLog.push(`Perk acquired: ${perk.toUpperCase()}! Wave ${state.wave} initiated.`);
    checkOutcome(state);
    return { reward, done: state.done };
  }

  if (action.startsWith('move:')) {
    const d = action.slice(5);
    const off = DIR_OFFSETS[d];
    p.x += off.dx;
    p.y += off.dy;
    state.combatLog.push(`Maneuvered ${d}.`);
  } else if (action.startsWith('shoot:')) {
    const d = action.slice(6);
    const off = DIR_OFFSETS[d];
    p.ammo--;

    // Primary bullet
    state.bullets.push({ x: p.x, y: p.y, dx: off.dx, dy: off.dy, fromPlayer: true, dmg: 18 });

    // Triple shot perk: side angles
    if (p.perks.includes('triple_shot')) {
      if (off.dx === 0) {
        // Vertical shoot -> lateral spreads
        state.bullets.push({ x: p.x, y: p.y, dx: -1, dy: off.dy, fromPlayer: true, dmg: 14 });
        state.bullets.push({ x: p.x, y: p.y, dx: 1, dy: off.dy, fromPlayer: true, dmg: 14 });
      } else {
        // Horizontal shoot -> vertical spreads
        state.bullets.push({ x: p.x, y: p.y, dx: off.dx, dy: -1, fromPlayer: true, dmg: 14 });
        state.bullets.push({ x: p.x, y: p.y, dx: off.dx, dy: 1, fromPlayer: true, dmg: 14 });
      }
    }
    state.combatLog.push(`Fired plasma volley ${d}!`);
  } else if (action.startsWith('dash:')) {
    const d = action.slice(5);
    const off = DIR_OFFSETS[d];
    p.x += off.dx * 2;
    p.y += off.dy * 2;
    p.stamina -= 10;
    p.isInvulnerable = true; // i-frames
    reward += 0.02;
    state.combatLog.push(`DODGE DASH! Leaped through the void with i-frames.`);
  } else if (action === 'reload') {
    p.ammo = p.maxAmmo;
    state.combatLog.push('Reloaded plasma cell to full capacity.');
  } else if (action === 'wait') {
    state.combatLog.push('Held position.');
  }

  // Stamina regeneration
  p.stamina = Math.min(p.maxStamina, p.stamina + 4);

  // Update and Advance Bullets
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x += b.dx;
    b.y += b.dy;

    // Out of bounds check
    if (b.x < 0 || b.x >= ARENA_SIZE || b.y < 0 || b.y >= ARENA_SIZE) {
      state.bullets.splice(i, 1);
      continue;
    }

    if (b.fromPlayer) {
      // Check collision with enemies
      let hit = false;
      for (let j = 0; j < state.enemies.length; j++) {
        const e = state.enemies[j];
        if (e.hp > 0 && Math.abs(e.x - b.x) <= 0.6 && Math.abs(e.y - b.y) <= 0.6) {
          e.hp = Math.max(0, e.hp - b.dmg);
          state.score += b.dmg * 2;
          reward += 0.04;
          hit = true;
          state.combatLog.push(`Hit ${e.name} for ${b.dmg} DMG!`);

          // Explosive perk AOE
          if (p.perks.includes('explosive')) {
            for (let k = 0; k < state.enemies.length; k++) {
              const other = state.enemies[k];
              if (other.id !== e.id && other.hp > 0 && Math.abs(other.x - e.x) <= 1 && Math.abs(other.y - e.y) <= 1) {
                other.hp = Math.max(0, other.hp - 10);
                state.score += 20;
                state.combatLog.push(`Explosive blast hit ${other.name} for 10 splash DMG!`);
              }
            }
          }

          if (e.hp === 0) {
            state.score += 150;
            reward += 0.15;
            state.combatLog.push(`${e.name} annihilated!`);
          }
          break;
        }
      }
      if (hit) {
        state.bullets.splice(i, 1);
      }
    } else {
      // Enemy bullet hits player
      if (Math.abs(p.x - b.x) <= 0.6 && Math.abs(p.y - b.y) <= 0.6) {
        if (!p.isInvulnerable) {
          p.hp = Math.max(0, p.hp - b.dmg);
          state.combatLog.push(`Warning: Took ${b.dmg} DMG from projectile!`);
        } else {
          state.combatLog.push(`GRAZED! Evaded projectile with dash i-frames!`);
          reward += 0.02;
        }
        state.bullets.splice(i, 1);
      }
    }
  }

  // Enemy behaviors (Spitting bullets or advancing)
  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    if (e.hp <= 0) continue;

    if (e.type === 'spitter' || e.type === 'goliath' || e.type === 'boss') {
      // Fire toward player direction
      const dx = p.x > e.x ? 1 : (p.x < e.x ? -1 : 0);
      const dy = p.y > e.y ? 1 : (p.y < e.y ? -1 : 0);
      state.bullets.push({ x: e.x, y: e.y, dx, dy, fromPlayer: false, dmg: e.atk });
    } else if (e.type === 'stalker') {
      // Step closer to player
      if (Math.abs(p.x - e.x) > Math.abs(p.y - e.y)) {
        e.x += p.x > e.x ? 1 : -1;
      } else if (p.y !== e.y) {
        e.y += p.y > e.y ? 1 : -1;
      }
      // Melee attack if on same tile
      if (e.x === p.x && e.y === p.y && !p.isInvulnerable) {
        p.hp = Math.max(0, p.hp - e.atk);
        state.combatLog.push(`${e.name} slashed you in melee for ${e.atk} DMG!`);
      }
    }
  }

  // Outcome check
  checkOutcome(state);

  return { reward: state.victory ? 1.0 : (state.done ? 0.0 : reward), done: state.done };
}

function isOver(state) {
  return Boolean(state.done);
}

function score(state) {
  return state.score;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score
  };
}
