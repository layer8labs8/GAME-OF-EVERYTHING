// Logic module for 0039-lemmings-style (Lemming Brigade)
// Pure deterministic turn-based puzzle strategy platformer

const MAP_WIDTH = 20;
const MAP_HEIGHT = 12;
const MAX_TURNS = 100;
const TOTAL_MINIONS = 6;
const RESCUE_QUOTA = 4;
const SPAWN_INTERVAL = 3;

function createRng(seed) {
  let s = (Math.imul(seed || 1, 1103515245) + 12345) & 0x7fffffff;
  return function() {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    return s / 0x80000000;
  };
}

const LEVEL_TEMPLATES = [
  // Level 0: The Gentle Descent (Floaters and Diggers)
  {
    name: "The Gentle Descent",
    map: [
      "BBBBBBBBBBBBBBBBBBBB",
      "B.S................B",
      "BBBBBBB............B",
      "B.....B............B",
      "B.....B.....#######B",
      "B.....BBBBBB#######B",
      "B...........#######B",
      "B...........#######B",
      "B...........#######B",
      "BBBBBBBBBBBBBBBBBEBB",
      "BXXXXXXXXXXXXXXXXXXB",
      "BBBBBBBBBBBBBBBBBBBB"
    ],
    inventory: { floater: 2, blocker: 2, builder: 4, digger: 3, miner: 2, bomber: 2 }
  },
  // Level 1: Chasm Crossing (Bridge Building)
  {
    name: "Chasm Crossing",
    map: [
      "BBBBBBBBBBBBBBBBBBBB",
      "B..................B",
      "B..................B",
      "B..................B",
      "B.S................B",
      "BBBBBB.......BBBBBBB",
      "B....B.......BE....B",
      "B....B.......BBBBBBB",
      "B....B.............B",
      "B....B.............B",
      "BXXXXBXXXXXXXXXXXXXB",
      "BBBBBBBBBBBBBBBBBBBB"
    ],
    inventory: { floater: 2, blocker: 2, builder: 5, digger: 2, miner: 2, bomber: 2 }
  },
  // Level 2: Reverse Switchback (Blockers and Pathing)
  {
    name: "Reverse Switchback",
    map: [
      "BBBBBBBBBBBBBBBBBBBB",
      "B..................B",
      "B.........S........B",
      "BBBBBBBBBBBBBB.....B",
      "B..................B",
      "B.....BBBBBBBBBBBBBB",
      "B..................B",
      "BBBBBBBBBBBB.......B",
      "B.E........BXXXXXXXB",
      "BBBBBBBBBBBBXXXXXXXB",
      "BXXXXXXXXXXXXXXXXXXB",
      "BBBBBBBBBBBBBBBBBBBB"
    ],
    inventory: { floater: 2, blocker: 3, builder: 3, digger: 2, miner: 2, bomber: 2 }
  },
  // Level 3: Blast Cavern (Bombers and Miners)
  {
    name: "Blast Cavern",
    map: [
      "BBBBBBBBBBBBBBBBBBBB",
      "B..................B",
      "B.S................B",
      "BBBBBB#############B",
      "B....B#############B",
      "B....B#############B",
      "B....B#############B",
      "B....B#############B",
      "B....B...........E.B",
      "BBBBBBBBBBBBBBBBBBBB",
      "BXXXXXXXXXXXXXXXXXXB",
      "BBBBBBBBBBBBBBBBBBBB"
    ],
    inventory: { floater: 3, blocker: 2, builder: 3, digger: 2, miner: 3, bomber: 3 }
  }
];

function isSolidTile(tile) {
  return tile === '#' || tile === 'B' || tile === '_';
}

function createState(seed = 1) {
  const rng = createRng(seed);
  const levelIdx = Math.floor(rng() * LEVEL_TEMPLATES.length) % LEVEL_TEMPLATES.length;
  const tmpl = LEVEL_TEMPLATES[levelIdx];

  let spawnX = 2;
  let spawnY = 1;
  let exitX = 17;
  let exitY = 9;

  const grid = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row = [];
    const line = tmpl.map[y] || "BBBBBBBBBBBBBBBBBBBB";
    for (let x = 0; x < MAP_WIDTH; x++) {
      const ch = line[x] || 'B';
      if (ch === 'S') {
        spawnX = x;
        spawnY = y;
        row.push('.');
      } else if (ch === 'E') {
        exitX = x;
        exitY = y;
        row.push('E');
      } else {
        row.push(ch);
      }
    }
    grid.push(row);
  }

  return {
    seed,
    turn: 0,
    maxTurns: MAX_TURNS,
    levelName: tmpl.name,
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    spawnX,
    spawnY,
    exitX,
    exitY,
    grid,
    inventory: { ...tmpl.inventory },
    minions: [],
    spawnedCount: 0,
    totalMinions: TOTAL_MINIONS,
    savedCount: 0,
    deadCount: 0,
    quota: RESCUE_QUOTA,
    nextSpawnTurn: 0,
    won: false,
    lost: false,
    done: false
  };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  const turnsBonus = Math.max(0, state.maxTurns - state.turn) * 2;
  return state.savedCount * 150 - state.deadCount * 30 + turnsBonus + (state.won ? 300 : 0);
}

function legalActions(state) {
  if (state.done) return [];

  const actions = ["wait"];

  for (let i = 0; i < state.minions.length; i++) {
    const m = state.minions[i];
    if (m.status !== "active") continue;

    if (state.inventory.floater > 0 && !m.isFloater) {
      actions.push(`floater:${m.id}`);
    }
    if (state.inventory.blocker > 0 && m.role !== "blocker") {
      actions.push(`blocker:${m.id}`);
    }
    if (state.inventory.builder > 0 && m.role !== "builder") {
      actions.push(`builder:${m.id}`);
    }
    if (state.inventory.digger > 0 && m.role !== "digger") {
      actions.push(`digger:${m.id}`);
    }
    if (state.inventory.miner > 0 && m.role !== "miner") {
      actions.push(`miner:${m.id}`);
    }
    if (state.inventory.bomber > 0 && m.bombCountdown === 0) {
      actions.push(`bomber:${m.id}`);
    }
  }

  return actions;
}

function step(state, action) {
  if (state.done) {
    throw new Error("Game is already over");
  }

  const legal = legalActions(state);
  if (!legal.includes(action)) {
    throw new Error(`Illegal action: ${action}`);
  }

  let reward = 0;

  // 1. Process role assignment if any
  if (action !== "wait") {
    const [role, idStr] = action.split(":");
    const minionId = parseInt(idStr, 10);
    const m = state.minions.find(min => min.id === minionId);
    if (!m || m.status !== "active") {
      throw new Error(`Invalid minion target for action: ${action}`);
    }

    if (role === "floater") {
      state.inventory.floater--;
      m.isFloater = true;
      reward += 5;
    } else if (role === "blocker") {
      state.inventory.blocker--;
      m.role = "blocker";
      reward += 5;
    } else if (role === "builder") {
      state.inventory.builder--;
      m.role = "builder";
      m.buildStepsLeft = 3;
      reward += 5;
    } else if (role === "digger") {
      state.inventory.digger--;
      m.role = "digger";
      reward += 5;
    } else if (role === "miner") {
      state.inventory.miner--;
      m.role = "miner";
      reward += 5;
    } else if (role === "bomber") {
      state.inventory.bomber--;
      m.role = "bomber";
      m.bombCountdown = 3;
      reward += 5;
    }
  }

  // 2. Spawn new minions if due
  if (state.spawnedCount < state.totalMinions && state.turn >= state.nextSpawnTurn) {
    state.minions.push({
      id: state.spawnedCount,
      x: state.spawnX,
      y: state.spawnY,
      vx: 1,
      role: "walker",
      isFloater: false,
      fallDistance: 0,
      buildStepsLeft: 0,
      bombCountdown: 0,
      status: "active"
    });
    state.spawnedCount++;
    state.nextSpawnTurn = state.turn + SPAWN_INTERVAL;
  }

  // 3. Process Bombers countdown & detonation
  for (let i = 0; i < state.minions.length; i++) {
    const m = state.minions[i];
    if (m.status !== "active") continue;

    if (m.bombCountdown > 0) {
      m.bombCountdown--;
      if (m.bombCountdown === 0) {
        // Detonate!
        m.status = "dead";
        m.role = "exploded";
        state.deadCount++;
        reward -= 20;

        // Blast radius 1 around (m.x, m.y)
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const bx = m.x + dx;
            const by = m.y + dy;
            if (by >= 0 && by < state.height && bx >= 0 && bx < state.width) {
              if (state.grid[by][bx] === '#') {
                state.grid[by][bx] = '.';
              }
            }
          }
        }
      }
    }
  }

  // 4. Update each active minion's physics and movement
  for (let i = 0; i < state.minions.length; i++) {
    const m = state.minions[i];
    if (m.status !== "active") continue;

    // Check exit immediately
    if (m.x === state.exitX && m.y === state.exitY) {
      m.status = "saved";
      state.savedCount++;
      reward += 150;
      continue;
    }

    // A. Check tile directly underneath
    const belowY = m.y + 1;
    const isBelowSolid = belowY < state.height && isSolidTile(state.grid[belowY][m.x]);

    if (!isBelowSolid) {
      // In the air: drop down 1 tile
      m.y++;
      m.fallDistance++;

      // Check if dropped into exit
      if (m.x === state.exitX && m.y === state.exitY) {
        m.status = "saved";
        state.savedCount++;
        reward += 150;
        continue;
      }

      // Check if dropped into void or hazard
      if (m.y >= state.height || state.grid[m.y][m.x] === 'X') {
        m.status = "dead";
        state.deadCount++;
        reward -= 30;
        continue;
      }

      // Check if landing on a solid tile
      const nextBelowY = m.y + 1;
      const willLandNext = nextBelowY < state.height && isSolidTile(state.grid[nextBelowY][m.x]);
      if (willLandNext) {
        if (m.fallDistance > 3 && !m.isFloater) {
          // Splat on high impact
          m.status = "dead";
          state.deadCount++;
          reward -= 30;
          continue;
        } else {
          m.fallDistance = 0;
        }
      }
    } else {
      // On solid ground
      m.fallDistance = 0;

      // Execute behavior by role
      if (m.role === "blocker") {
        // Remains stationary
      } else if (m.role === "digger") {
        // Digs through earth below
        if (belowY < state.height && state.grid[belowY][m.x] === '#') {
          state.grid[belowY][m.x] = '.';
          m.y++;
        } else {
          // Revert to walker on steel or empty
          m.role = "walker";
        }
      } else if (m.role === "miner") {
        // Mines diagonally down-forward
        const targetX = m.x + m.vx;
        const targetY = m.y + 1;
        if (targetX >= 0 && targetX < state.width && targetY < state.height && state.grid[targetY][targetX] === '#') {
          state.grid[targetY][targetX] = '.';
          m.x = targetX;
          m.y = targetY;
        } else {
          m.role = "walker";
        }
      } else if (m.role === "builder") {
        if (m.buildStepsLeft > 0) {
          const stepX = m.x + m.vx;
          const stepY = m.y;
          if (stepX < 0 || stepX >= state.width) {
            m.vx = -m.vx;
            m.role = "walker";
          } else if (state.grid[stepY][stepX] === '.' || state.grid[stepY][stepX] === 'X') {
            state.grid[stepY][stepX] = '_';
            m.x = stepX;
            m.buildStepsLeft--;
            if (m.buildStepsLeft === 0) {
              m.role = "walker";
            }
          } else {
            // Bumped wall while building
            m.vx = -m.vx;
            m.role = "walker";
          }
        } else {
          m.role = "walker";
        }
      } else {
        // Walker (or floater walking)
        const nextX = m.x + m.vx;
        if (nextX < 0 || nextX >= state.width) {
          m.vx = -m.vx;
        } else {
          let blocked = false;
          // Wall check
          if (isSolidTile(state.grid[m.y][nextX])) {
            blocked = true;
          }

          // Blocker minion check
          for (let j = 0; j < state.minions.length; j++) {
            const other = state.minions[j];
            if (other.id !== m.id && other.status === "active" && other.role === "blocker") {
              if (other.x === nextX && other.y === m.y) {
                blocked = true;
                break;
              }
            }
          }

          if (blocked) {
            // Step-up check (1-tile ledge)
            if (m.y > 0 && state.grid[m.y - 1][nextX] === '.' && state.grid[m.y - 1][m.x] === '.') {
              m.x = nextX;
              m.y = m.y - 1;
            } else {
              m.vx = -m.vx;
            }
          } else {
            m.x = nextX;
          }
        }
      }

      // Check exit again in case movement landed on it
      if (m.status === "active" && m.x === state.exitX && m.y === state.exitY) {
        m.status = "saved";
        state.savedCount++;
        reward += 150;
      }
    }
  }

  // 5. Advance turn counter
  state.turn++;

  // 6. Check end conditions
  if (state.savedCount >= state.quota) {
    state.won = true;
    state.done = true;
    reward += 300;
  } else if ((state.totalMinions - state.deadCount) < state.quota) {
    state.lost = true;
    state.done = true;
    reward -= 150;
  } else if (state.turn >= state.maxTurns) {
    state.done = true;
    if (state.savedCount >= state.quota) {
      state.won = true;
      reward += 300;
    } else {
      state.lost = true;
      reward -= 150;
    }
  } else {
    // If all minions spawned and none are active anymore
    const activeCount = state.minions.filter(min => min.status === "active").length;
    if (activeCount === 0 && state.spawnedCount >= state.totalMinions) {
      state.done = true;
      if (state.savedCount >= state.quota) {
        state.won = true;
        reward += 300;
      } else {
        state.lost = true;
        reward -= 150;
      }
    }
  }

  return { reward, done: state.done };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    MAP_WIDTH,
    MAP_HEIGHT,
    MAX_TURNS,
    TOTAL_MINIONS,
    RESCUE_QUOTA,
    LEVEL_TEMPLATES,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
}
