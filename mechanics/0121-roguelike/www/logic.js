(function (root) {
  'use strict';

  const GRID_SIZE = 8;
  const MAX_FLOORS = 5;
  const MAX_STEPS = 250;

  const ALL_RELICS = ['vampiric_fang', 'spiked_shield', 'firebrand', 'swift_boots'];

  function nextRandom(state) {
    state.rng = ((state.rng * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    return state.rng / 0x7fffffff;
  }

  function randInt(state, min, max) {
    return min + Math.floor(nextRandom(state) * (max - min + 1));
  }

  function createFloor(state, floorNum) {
    const map = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      const row = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        if (x === 0 || x === GRID_SIZE - 1 || y === 0 || y === GRID_SIZE - 1) {
          row.push('#');
        } else {
          row.push('.');
        }
      }
      map.push(row);
    }

    // Interior obstacles (2 to 4 pillars)
    const pillarCount = randInt(state, 2, 4);
    for (let p = 0; p < pillarCount; p++) {
      const px = randInt(state, 2, 5);
      const py = randInt(state, 2, 5);
      map[py][px] = '#';
    }

    // Hero start position
    state.hero.x = 1;
    state.hero.y = 1;
    map[1][1] = '.';

    // Stairs destination
    let sx = randInt(state, 4, 6);
    let sy = randInt(state, 4, 6);
    map[sy][sx] = '>';

    // Altar placement (optional)
    if (nextRandom(state) < 0.65) {
      let ax = randInt(state, 2, 5);
      let ay = randInt(state, 2, 5);
      if (map[ay][ax] === '.') {
        map[ay][ax] = 'A';
      }
    }

    state.map = map;
    state.enemies = [];
    state.items = [];

    // Spawn enemies
    const enemyCount = floorNum === 5 ? 3 : randInt(state, 2, 4);
    for (let e = 0; e < enemyCount; e++) {
      let ex, ey;
      let attempts = 0;
      do {
        ex = randInt(state, 2, 6);
        ey = randInt(state, 2, 6);
        attempts++;
      } while (attempts < 20 && (map[ey][ex] !== '.' || (ex === 1 && ey === 1) || (ex === sx && ey === sy)));

      let type = 'goblin';
      let hp = 7, atk = 3, def = 0;

      if (floorNum === 5 && e === 0) {
        type = 'arch_lich';
        hp = 26;
        atk = 8;
        def = 2;
      } else if (floorNum >= 3) {
        if (nextRandom(state) < 0.5) {
          type = 'orc_berserker';
          hp = 14;
          atk = 6;
          def = 1;
        } else {
          type = 'wraith';
          hp = 11;
          atk = 5;
          def = 0;
        }
      } else if (nextRandom(state) < 0.4) {
        type = 'skeleton';
        hp = 10;
        atk = 4;
        def = 1;
      }

      state.enemies.push({ id: e + 1, type, x: ex, y: ey, hp, maxHp: hp, atk, def });
    }

    // Spawn items: gold, potion, or relic
    const itemCount = randInt(state, 1, 3);
    for (let it = 0; it < itemCount; it++) {
      let ix = randInt(state, 1, 6);
      let iy = randInt(state, 1, 6);
      if (map[iy][ix] === '.' && !(ix === 1 && iy === 1)) {
        const roll = nextRandom(state);
        if (roll < 0.4) {
          state.items.push({ id: it + 1, type: 'gold', x: ix, y: iy, value: randInt(state, 10, 25) });
        } else if (roll < 0.75) {
          state.items.push({ id: it + 1, type: 'potion', x: ix, y: iy });
        } else {
          const availableRelics = ALL_RELICS.filter((r) => !state.hero.relics.includes(r));
          if (availableRelics.length > 0) {
            const chosen = availableRelics[Math.floor(nextRandom(state) * availableRelics.length)];
            state.items.push({ id: it + 1, type: 'relic', x: ix, y: iy, relicName: chosen });
          } else {
            state.items.push({ id: it + 1, type: 'gold', x: ix, y: iy, value: 50 });
          }
        }
      }
    }

    revealFog(state);
  }

  function revealFog(state) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const tx = state.hero.x + dx;
        const ty = state.hero.y + dy;
        if (tx >= 0 && tx < GRID_SIZE && ty >= 0 && ty < GRID_SIZE) {
          state.fog[ty][tx] = true;
        }
      }
    }
  }

  function createState(seed = 12345) {
    let curRng = (seed >>> 0) || 1;

    const fog = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      fog.push(new Array(GRID_SIZE).fill(false));
    }

    const state = {
      floor: 1,
      stepCount: 0,
      hero: {
        x: 1,
        y: 1,
        hp: 35,
        maxHp: 35,
        atk: 6,
        def: 1,
        gold: 0,
        potions: 1,
        relics: [],
      },
      map: [],
      enemies: [],
      items: [],
      fog,
      stats: {
        kills: 0,
        damageDealt: 0,
      },
      won: false,
      rng: curRng,
    };

    createFloor(state, 1);
    return state;
  }

  function isOver(state) {
    return state.hero.hp <= 0 || state.won || state.stepCount >= MAX_STEPS;
  }

  function legalActions(state) {
    if (isOver(state)) return [];

    const actions = [];
    const dirs = [
      { name: 'move_up', dx: 0, dy: -1 },
      { name: 'move_down', dx: 0, dy: 1 },
      { name: 'move_left', dx: -1, dy: 0 },
      { name: 'move_right', dx: 1, dy: 0 },
    ];

    for (let i = 0; i < dirs.length; i++) {
      const d = dirs[i];
      const nx = state.hero.x + d.dx;
      const ny = state.hero.y + d.dy;
      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
        if (state.map[ny][nx] !== '#') {
          actions.push(d.name);
        }
      }
    }

    if (state.hero.potions > 0 && state.hero.hp < state.hero.maxHp) {
      actions.push('use_potion');
    }

    // Pray at altar
    const tile = state.map[state.hero.y][state.hero.x];
    let nearAltar = tile === 'A';
    if (!nearAltar) {
      for (let i = 0; i < dirs.length; i++) {
        const ax = state.hero.x + dirs[i].dx;
        const ay = state.hero.y + dirs[i].dy;
        if (state.map[ay] && state.map[ay][ax] === 'A') nearAltar = true;
      }
    }
    if (nearAltar && state.hero.hp > 6) {
      actions.push('pray_altar');
    }

    // Descend stairs
    if (tile === '>') {
      actions.push('descend');
    }

    actions.push('wait');
    return actions;
  }

  function step(state, action) {
    if (!action || typeof action !== 'string') {
      throw new Error('Invalid action');
    }
    if (isOver(state)) {
      throw new Error('Game is already over');
    }

    let reward = 0;
    const dirs = {
      move_up: { dx: 0, dy: -1 },
      move_down: { dx: 0, dy: 1 },
      move_left: { dx: -1, dy: 0 },
      move_right: { dx: 1, dy: 0 },
    };

    if (dirs[action]) {
      const { dx, dy } = dirs[action];
      const nx = state.hero.x + dx;
      const ny = state.hero.y + dy;

      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE || state.map[ny][nx] === '#') {
        throw new Error('Cannot move into wall or out of bounds');
      }

      // Check if enemy at target position -> attack!
      const targetEnemy = state.enemies.find((e) => e.x === nx && e.y === ny);
      if (targetEnemy) {
        let heroDamage = Math.max(1, state.hero.atk - targetEnemy.def);
        if (state.hero.relics.includes('firebrand')) {
          heroDamage += 2;
        }

        targetEnemy.hp -= heroDamage;
        state.stats.damageDealt += heroDamage;
        reward += 5;

        if (targetEnemy.hp <= 0) {
          state.enemies = state.enemies.filter((e) => e !== targetEnemy);
          state.stats.kills += 1;
          reward += 20;

          if (state.hero.relics.includes('vampiric_fang')) {
            state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + 3);
          }
        }
      } else {
        // Move hero
        state.hero.x = nx;
        state.hero.y = ny;
        revealFog(state);
        reward += 1;

        // Pickup items
        const itemIdx = state.items.findIndex((it) => it.x === nx && it.y === ny);
        if (itemIdx !== -1) {
          const it = state.items[itemIdx];
          state.items.splice(itemIdx, 1);
          if (it.type === 'gold') {
            state.hero.gold += it.value;
            reward += 10;
          } else if (it.type === 'potion') {
            state.hero.potions = Math.min(3, state.hero.potions + 1);
            reward += 15;
          } else if (it.type === 'relic') {
            if (!state.hero.relics.includes(it.relicName)) {
              state.hero.relics.push(it.relicName);
              reward += 30;
            }
          }
        }
      }
    } else if (action === 'use_potion') {
      if (state.hero.potions <= 0 || state.hero.hp >= state.hero.maxHp) {
        throw new Error('Cannot use potion');
      }
      state.hero.potions -= 1;
      state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + 20);
      reward += 10;
    } else if (action === 'pray_altar') {
      const tile = state.map[state.hero.y][state.hero.x];
      let nearAltar = tile === 'A';
      if (!nearAltar) {
        const deltas = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        for (let i = 0; i < deltas.length; i++) {
          const ax = state.hero.x + deltas[i][0];
          const ay = state.hero.y + deltas[i][1];
          if (state.map[ay] && state.map[ay][ax] === 'A') nearAltar = true;
        }
      }
      if (!nearAltar || state.hero.hp <= 6) {
        throw new Error('Cannot pray at altar');
      }

      state.hero.hp -= 6;
      if (nextRandom(state) < 0.5) {
        state.hero.atk += 2;
      } else {
        state.hero.def += 1;
        state.hero.maxHp += 4;
      }
      reward += 15;
    } else if (action === 'descend') {
      if (state.map[state.hero.y][state.hero.x] !== '>') {
        throw new Error('Not on stairs');
      }
      if (state.floor >= MAX_FLOORS) {
        state.won = true;
        reward += 200;
        state.stepCount += 1;
        return { reward, done: true };
      } else {
        state.floor += 1;
        reward += 50;
        createFloor(state, state.floor);
        state.stepCount += 1;
        return { reward, done: false };
      }
    } else if (action === 'wait') {
      reward = 0;
    } else {
      throw new Error('Unknown action: ' + action);
    }

    // Enemy turn simulation
    for (let i = 0; i < state.enemies.length; i++) {
      const enemy = state.enemies[i];
      const dist = Math.abs(enemy.x - state.hero.x) + Math.abs(enemy.y - state.hero.y);

      if (dist === 1) {
        // Adjacent -> attack hero!
        let dodged = false;
        if (state.hero.relics.includes('swift_boots') && nextRandom(state) < 0.25) {
          dodged = true;
        }

        if (!dodged) {
          const dmg = Math.max(1, enemy.atk - state.hero.def);
          state.hero.hp -= dmg;

          // Thorns reflection
          if (state.hero.relics.includes('spiked_shield')) {
            enemy.hp -= 2;
            if (enemy.hp <= 0) {
              state.stats.kills += 1;
              if (state.hero.relics.includes('vampiric_fang')) {
                state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + 3);
              }
            }
          }
        }
      } else if (dist <= 4) {
        // Step closer to hero along one axis
        const dx = Math.sign(state.hero.x - enemy.x);
        const dy = Math.sign(state.hero.y - enemy.y);

        let tx = enemy.x;
        let ty = enemy.y;

        if (dx !== 0 && state.map[enemy.y][enemy.x + dx] !== '#') {
          tx = enemy.x + dx;
        } else if (dy !== 0 && state.map[enemy.y + dy][enemy.x] !== '#') {
          ty = enemy.y + dy;
        }

        // Only move if cell not occupied by another enemy or hero
        const occupied = state.enemies.some((e) => e !== enemy && e.x === tx && e.y === ty) ||
                         (tx === state.hero.x && ty === state.hero.y);
        if (!occupied) {
          enemy.x = tx;
          enemy.y = ty;
        }
      }
    }

    // Clean up any enemies slain by thorns
    state.enemies = state.enemies.filter((e) => e.hp > 0);

    state.stepCount += 1;
    if (state.hero.hp <= 0) {
      state.hero.hp = 0;
      reward -= 50;
    }

    return { reward, done: isOver(state) };
  }

  function score(state) {
    return (
      (state.won ? 1000 : 0) +
      state.floor * 150 +
      state.stats.kills * 30 +
      state.hero.relics.length * 50 +
      state.hero.gold
    );
  }

  const api = {
    GRID_SIZE,
    MAX_FLOORS,
    MAX_STEPS,
    ALL_RELICS,
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
