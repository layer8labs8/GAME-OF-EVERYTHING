// Logic module for 0045-hidden-object (Relic Seeker)
// Pure deterministic Victorian study hidden-object puzzle game

const GRID_SIZE = 8;
const MAX_TURNS = 30;
const MAX_HINTS = 3;
const TARGET_COUNT = 5;

const ALL_ARTIFACTS = [
  // 5 Target relics
  { name: "Golden Scarab", icon: "🪲", isTarget: true },
  { name: "Brass Compass", icon: "🧭", isTarget: true },
  { name: "Crystal Prism", icon: "💎", isTarget: true },
  { name: "Ancient Key", icon: "🗝️", isTarget: true },
  { name: "Feather Quill", icon: "🪶", isTarget: true },

  // Distraction antiquities
  { name: "Hourglass", icon: "⏳", isTarget: false },
  { name: "Silver Dagger", icon: "🗡️", isTarget: false },
  { name: "Pocket Watch", icon: "⏱️", isTarget: false },
  { name: "Emerald Ring", icon: "💍", isTarget: false },
  { name: "Wax Seal", icon: "📜", isTarget: false },
  { name: "Telescope", icon: "🔭", isTarget: false },
  { name: "Marble Bust", icon: "🗿", isTarget: false },
  { name: "Velvet Box", icon: "📦", isTarget: false },
  { name: "Ancient Coin", icon: "🪙", isTarget: false },
  { name: "Oil Lantern", icon: "🏮", isTarget: false },
  { name: "Magnifying Glass", icon: "🔍", isTarget: false }
];

function createRng(seed) {
  let s = (Math.imul(seed || 1, 1103515245) + 12345) & 0x7fffffff;
  return function() {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    return s / 0x80000000;
  };
}

function createState(seed = 1) {
  const rng = createRng(seed);

  // Pick containers
  const containers = [
    { id: "mahogany_cabinet", name: "Mahogany Cabinet", x: 1, y: 1, opened: false },
    { id: "velvet_curtain", name: "Velvet Curtain", x: 4, y: 2, opened: false },
    { id: "brass_chest", name: "Brass Chest", x: 6, y: 5, opened: false }
  ];

  // Distribute 16 items across 8x8 cells without collision
  const allCoords = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      allCoords.push({ x, y });
    }
  }

  // Shuffle coords deterministically (Fisher-Yates)
  for (let i = allCoords.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = allCoords[i];
    allCoords[i] = allCoords[j];
    allCoords[j] = tmp;
  }

  // Assign items
  const items = [];
  for (let i = 0; i < ALL_ARTIFACTS.length; i++) {
    const proto = ALL_ARTIFACTS[i];
    let coord = allCoords[i];
    let containerId = null;

    // Put item 0 inside cabinet, item 1 behind curtain, item 2 inside chest
    if (i === 0) {
      coord = { x: containers[0].x, y: containers[0].y };
      containerId = containers[0].id;
    } else if (i === 1) {
      coord = { x: containers[1].x, y: containers[1].y };
      containerId = containers[1].id;
    } else if (i === 2) {
      coord = { x: containers[2].x, y: containers[2].y };
      containerId = containers[2].id;
    }

    items.push({
      id: i,
      name: proto.name,
      icon: proto.icon,
      isTarget: proto.isTarget,
      found: false,
      x: coord.x,
      y: coord.y,
      containerId
    });
  }

  const targetRelics = items.filter(it => it.isTarget);

  return {
    seed,
    turn: 0,
    turnsLeft: MAX_TURNS,
    hintsLeft: MAX_HINTS,
    misclicks: 0,
    foundCount: 0,
    gridSize: GRID_SIZE,
    items,
    containers,
    targetRelics: targetRelics.map(t => t.name),
    lastHint: null,
    won: false,
    lost: false,
    done: false
  };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  const base = state.foundCount * 200 + state.hintsLeft * 50 + state.turnsLeft * 15 - state.misclicks * 20;
  return base + (state.won ? 500 : 0);
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];

  // 1. Hint action
  if (state.hintsLeft > 0) {
    const hasUnfound = state.items.some(it => it.isTarget && !it.found);
    if (hasUnfound) {
      actions.push("use_hint");
    }
  }

  // 2. Uncover closed containers
  for (let i = 0; i < state.containers.length; i++) {
    const c = state.containers[i];
    if (!c.opened) {
      actions.push(`uncover:${c.id}`);
    }
  }

  // 3. Inspect cells
  for (let y = 0; y < state.gridSize; y++) {
    for (let x = 0; x < state.gridSize; x++) {
      // Check if this cell already has a found item
      const item = state.items.find(it => it.x === x && it.y === y);
      if (item && item.found) continue;
      actions.push(`inspect:${x}:${y}`);
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

  if (action === "use_hint") {
    state.hintsLeft--;
    // Find first unfound target item
    const target = state.items.find(it => it.isTarget && !it.found);
    if (target) {
      state.lastHint = {
        name: target.name,
        x: target.x,
        y: target.y,
        containerId: target.containerId
      };
      reward += 15;
    }
  } else if (action.startsWith("uncover:")) {
    const containerId = action.slice(8);
    const container = state.containers.find(c => c.id === containerId);
    if (!container || container.opened) {
      throw new Error(`Invalid container to uncover: ${containerId}`);
    }
    container.opened = true;
    reward += 25;
    state.turnsLeft--;
    state.turn++;
  } else if (action.startsWith("inspect:")) {
    const parts = action.split(":");
    const x = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);

    state.turnsLeft--;
    state.turn++;

    // Check if cell is an unopened container
    const container = state.containers.find(c => c.x === x && c.y === y && !c.opened);
    if (container) {
      container.opened = true;
      reward += 25;
    } else {
      // Check if there is an item at (x, y)
      const item = state.items.find(it => it.x === x && it.y === y);

      if (item && !item.found) {
        // Is it inside a closed container?
        if (item.containerId) {
          const parent = state.containers.find(c => c.id === item.containerId);
          if (parent && !parent.opened) {
            // Container was closed, but inspecting opens it!
            parent.opened = true;
            reward += 20;
          } else {
            // Container is open, we can collect the item!
            if (item.isTarget) {
              item.found = true;
              state.foundCount++;
              reward += 100;
            } else {
              item.found = true;
              state.misclicks++;
              reward -= 5;
            }
          }
        } else {
          // Open item
          if (item.isTarget) {
            item.found = true;
            state.foundCount++;
            reward += 100;
          } else {
            item.found = true;
            state.misclicks++;
            reward -= 5;
          }
        }
      } else {
        // Empty space or already found
        state.misclicks++;
        reward -= 5;
      }
    }
  }

  // Check end conditions
  if (state.foundCount >= TARGET_COUNT) {
    state.won = true;
    state.done = true;
    reward += 500;
  } else if (state.turnsLeft <= 0) {
    state.lost = true;
    state.done = true;
    reward -= 200;
  }

  return { reward, done: state.done };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    GRID_SIZE,
    MAX_TURNS,
    MAX_HINTS,
    TARGET_COUNT,
    ALL_ARTIFACTS,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
}
