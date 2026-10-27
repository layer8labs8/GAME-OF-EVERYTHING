// Level solver contract for 0044-logic-puzzle (see docs/LEVELS.md):
//   validateLevel(data) -> array of problems, empty when well-formed
//   solve(data, { maxStates }) -> { solvable: true | false | null, moves, statesVisited }
//   replay(data, moves) -> true when moves solve the level

const { toggleCell, isAllPowered } = require('./www/logic.js');

function validateLevel(data) {
  const problems = [];
  if (!data || typeof data !== 'object') {
    return ['data must be an object'];
  }
  const size = data.size;
  if (!Number.isInteger(size) || size < 2 || size > 5) {
    problems.push('size must be an integer between 2 and 5');
  }
  if (!Array.isArray(data.grid)) {
    problems.push('grid must be an array');
    return problems;
  }
  const expectedLen = (size || 0) * (size || 0);
  if (data.grid.length !== expectedLen) {
    problems.push(`grid length must be ${expectedLen}, found ${data.grid.length}`);
  }
  for (let i = 0; i < data.grid.length; i++) {
    const val = data.grid[i];
    if (val !== 0 && val !== 1) {
      problems.push(`cell at index ${i} must be 0 or 1, found ${val}`);
      break;
    }
  }
  return problems;
}

function gridToMask(grid) {
  let mask = 0;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] === 1) {
      mask |= (1 << i);
    }
  }
  return mask;
}

function solve(data, options = {}) {
  const maxStates = options.maxStates || 100000;
  const size = data.size;
  const totalCells = size * size;
  const targetMask = (1 << totalCells) - 1;

  const startMask = gridToMask(data.grid);
  if (startMask === targetMask) {
    return { solvable: true, moves: '', statesVisited: 1 };
  }

  // Precompute toggle mask for each cell
  const toggleMasks = new Int32Array(totalCells);
  for (let i = 0; i < totalCells; i++) {
    const testGrid = new Array(totalCells).fill(0);
    toggleCell(testGrid, size, i);
    toggleMasks[i] = gridToMask(testGrid);
  }

  // BFS
  // parentMap: mask -> { from, moveChar }
  const visited = new Set([startMask]);
  const parent = new Map([[startMask, null]]);
  let queue = [startMask];
  let statesVisited = 1;

  while (queue.length > 0) {
    const nextQueue = [];

    for (const cur of queue) {
      for (let i = 0; i < totalCells; i++) {
        const nextMask = cur ^ toggleMasks[i];

        if (!visited.has(nextMask)) {
          visited.add(nextMask);
          statesVisited++;
          const moveChar = String.fromCharCode(97 + i);
          parent.set(nextMask, { from: cur, move: moveChar });

          if (nextMask === targetMask) {
            // Reconstruct path
            const moves = [];
            let curr = nextMask;
            while (curr !== startMask) {
              const info = parent.get(curr);
              moves.push(info.move);
              curr = info.from;
            }
            moves.reverse();
            return {
              solvable: true,
              moves: moves.join(''),
              statesVisited
            };
          }

          if (statesVisited >= maxStates) {
            return { solvable: null, moves: null, statesVisited };
          }

          nextQueue.push(nextMask);
        }
      }
    }
    queue = nextQueue;
  }

  return { solvable: false, moves: null, statesVisited };
}

function replay(data, moves) {
  if (typeof moves !== 'string') return false;
  const size = data.size;
  const totalCells = size * size;
  const grid = data.grid.slice();

  for (let i = 0; i < moves.length; i++) {
    const idx = moves.charCodeAt(i) - 97;
    if (idx < 0 || idx >= totalCells) return false;
    toggleCell(grid, size, idx);
  }

  return isAllPowered(grid);
}

module.exports = {
  validateLevel,
  solve,
  replay
};
