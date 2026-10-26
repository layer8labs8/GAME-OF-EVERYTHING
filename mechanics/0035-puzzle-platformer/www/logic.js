// Portal Shift - Puzzle Platformer deterministic logic
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PortalShift = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX_STEPS = 120;

  const DEFAULT_LEVELS = [
    {
      id: "001",
      name: "First Steps",
      difficulty: 1,
      par: 4,
      map: [
        "#######",
        "#@._.!#",
        "#######"
      ]
    },
    {
      id: "002",
      name: "The First Vault",
      difficulty: 1,
      par: 4,
      map: [
        "#######",
        "#.....#",
        "#@.#.!#",
        "#######"
      ]
    },
    {
      id: "003",
      name: "Box Push",
      difficulty: 1,
      par: 5,
      map: [
        "########",
        "#......#",
        "#@.$._!#",
        "########"
      ]
    },
    {
      id: "004",
      name: "Locked Gate",
      difficulty: 2,
      par: 6,
      map: [
        "#########",
        "#.......#",
        "#@.$._D!#",
        "#########"
      ]
    },
    {
      id: "005",
      name: "The Stepping Stone",
      difficulty: 2,
      par: 6,
      map: [
        "#########",
        "#......!#",
        "#@.$...##",
        "#####_###",
        "#########"
      ]
    },
    {
      id: "006",
      name: "Pit Bridge",
      difficulty: 2,
      par: 8,
      map: [
        "###########",
        "#.........#",
        "#@.$..#.D!#",
        "####_######",
        "###########"
      ]
    },
    {
      id: "007",
      name: "Double Hurdle",
      difficulty: 3,
      par: 8,
      map: [
        "###########",
        "#.........#",
        "#@.#..#_D!#",
        "###########"
      ]
    },
    {
      id: "008",
      name: "High Platform",
      difficulty: 3,
      par: 8,
      map: [
        "###########",
        "#.......D!#",
        "#@.$_#..###",
        "###########"
      ]
    },
    {
      id: "009",
      name: "Dual Crates",
      difficulty: 4,
      par: 10,
      map: [
        "#############",
        "#...........#",
        "#@.$.$._..D!#",
        "#############"
      ]
    },
    {
      id: "010",
      name: "Master Breach",
      difficulty: 5,
      par: 10,
      map: [
        "#############",
        "#..........!#",
        "#@.$.#..$.#D#",
        "#####_#####_#",
        "#############"
      ]
    }
  ];

  function parseMap(map) {
    let player = null;
    let exit = null;
    const crates = [];
    const switches = [];
    const doors = [];
    const walls = [];

    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        const ch = map[y][x];
        if (ch === '#') walls.push({ x, y });
        else if (ch === '@') player = { x, y };
        else if (ch === '$') crates.push({ x, y });
        else if (ch === '_') switches.push({ x, y });
        else if (ch === 'D') doors.push({ x, y });
        else if (ch === '!') exit = { x, y };
      }
    }
    return { width: map[0].length, height: map.length, walls, player, crates, switches, doors, exit };
  }

  function simulateStep(level, px, py, cratesList, action) {
    const width = level.width;
    const height = level.height;

    function isWall(x, y) {
      return level.walls.some(w => w.x === x && w.y === y);
    }

    function isBlocked(x, y, cl) {
      if (x < 0 || x >= width || y < 0 || y >= height) return true;
      if (isWall(x, y)) return true;
      if (level.doors.some(d => d.x === x && d.y === y)) {
        const allSwitchesPressed = level.switches.length === 0 || level.switches.every(s => 
          cl.some(c => c.x === s.x && c.y === s.y) || (px === s.x && py === s.y)
        );
        if (!allSwitchesPressed) return true;
      }
      return false;
    }

    function applyGravity(curPx, curPy, cl) {
      let changed = true;
      while (changed) {
        changed = false;
        for (const c of cl) {
          const belowY = c.y + 1;
          if (!isBlocked(c.x, belowY, cl) && !cl.some(o => o !== c && o.x === c.x && o.y === belowY)) {
            c.y++;
            changed = true;
          }
        }
      }
      while (true) {
        const belowY = curPy + 1;
        if (!isBlocked(curPx, belowY, cl) && !cl.some(c => c.x === curPx && c.y === belowY)) {
          curPy++;
        } else {
          break;
        }
      }
      return { px: curPx, py: curPy, crates: cl };
    }

    const onGround = isBlocked(px, py + 1, cratesList) || cratesList.some(c => c.x === px && c.y === py + 1);
    let nextPx = px;
    let nextPy = py;
    const nextCrates = cratesList.map(c => ({ ...c }));

    if (action === 'L') {
      const tx = px - 1;
      const ty = py;
      const crateAtT = nextCrates.find(c => c.x === tx && c.y === ty);
      if (crateAtT) {
        const pushX = tx - 1;
        const pushY = ty;
        if (!isBlocked(pushX, pushY, nextCrates) && !nextCrates.some(c => c.x === pushX && c.y === pushY)) {
          crateAtT.x = pushX;
          nextPx = tx;
        } else {
          return null;
        }
      } else if (!isBlocked(tx, ty, nextCrates)) {
        nextPx = tx;
      } else {
        return null;
      }
    } else if (action === 'R') {
      const tx = px + 1;
      const ty = py;
      const crateAtT = nextCrates.find(c => c.x === tx && c.y === ty);
      if (crateAtT) {
        const pushX = tx + 1;
        const pushY = ty;
        if (!isBlocked(pushX, pushY, nextCrates) && !nextCrates.some(c => c.x === pushX && c.y === pushY)) {
          crateAtT.x = pushX;
          nextPx = tx;
        } else {
          return null;
        }
      } else if (!isBlocked(tx, ty, nextCrates)) {
        nextPx = tx;
      } else {
        return null;
      }
    } else if (action === 'K') { // Jump Right
      if (!onGround) return null;
      if (isBlocked(px, py - 1, nextCrates) || nextCrates.some(c => c.x === px && c.y === py - 1)) return null;
      const tx = px + 1;
      const ty = py - 1;
      if (isBlocked(tx, ty, nextCrates) || nextCrates.some(c => c.x === tx && c.y === ty)) return null;
      nextPx = tx;
      nextPy = ty;
    } else if (action === 'J') { // Jump Left
      if (!onGround) return null;
      if (isBlocked(px, py - 1, nextCrates) || nextCrates.some(c => c.x === px && c.y === py - 1)) return null;
      const tx = px - 1;
      const ty = py - 1;
      if (isBlocked(tx, ty, nextCrates) || nextCrates.some(c => c.x === tx && c.y === ty)) return null;
      nextPx = tx;
      nextPy = ty;
    } else {
      return null;
    }

    return applyGravity(nextPx, nextPy, nextCrates);
  }

  function createState(seed = 12345, options = {}) {
    const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
    let levelIdx = 0;
    if (options && typeof options.levelIndex === 'number') {
      levelIdx = Math.max(0, Math.min(DEFAULT_LEVELS.length - 1, options.levelIndex));
    } else {
      levelIdx = s % DEFAULT_LEVELS.length;
    }

    const lvlData = (options && options.levelData) || DEFAULT_LEVELS[levelIdx];
    const parsed = parseMap(lvlData.map);

    const state = {
      seed: s,
      stepCount: 0,
      movesCount: 0,
      levelIndex: levelIdx,
      levelName: lvlData.name,
      par: lvlData.par || 10,
      width: parsed.width,
      height: parsed.height,
      walls: parsed.walls,
      player: { x: parsed.player.x, y: parsed.player.y },
      crates: parsed.crates,
      switches: parsed.switches,
      doors: parsed.doors,
      exit: parsed.exit,
      scoreVal: 0,
      won: false,
      lost: false
    };

    return state;
  }

  function isOver(state) {
    return state.won || state.lost || state.stepCount >= MAX_STEPS;
  }

  function legalActions(state) {
    if (isOver(state)) return [];

    const actions = [];
    const level = {
      width: state.width,
      height: state.height,
      walls: state.walls,
      doors: state.doors,
      switches: state.switches
    };

    for (const a of ['L', 'R', 'J', 'K']) {
      const res = simulateStep(level, state.player.x, state.player.y, state.crates, a);
      if (res !== null) {
        actions.push(a);
      }
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
    state.movesCount++;

    const level = {
      width: state.width,
      height: state.height,
      walls: state.walls,
      doors: state.doors,
      switches: state.switches
    };

    const next = simulateStep(level, state.player.x, state.player.y, state.crates, action);
    if (next) {
      state.player.x = next.px;
      state.player.y = next.py;
      state.crates = next.crates;

      // Check win condition
      if (state.player.x === state.exit.x && state.player.y === state.exit.y) {
        state.won = true;
        const parBonus = Math.max(0, (state.par - state.movesCount) * 100);
        state.scoreVal += 500 + parBonus;
      }
    }

    if (state.stepCount >= MAX_STEPS && !state.won) {
      state.lost = true;
    }

    const reward = state.scoreVal - prevScore;
    const done = isOver(state);
    return { reward, done };
  }

  return {
    DEFAULT_LEVELS,
    parseMap,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
});
