// Level contract for 0067-pipe-connect (see docs/LEVELS.md):
//   validateLevel(data) -> string[]
//   solve(data, { maxStates }) -> { solvable, moves, states }
//   replay(data, moves) -> boolean
const { rotCW, computeWet, play, isSolved } = require('./www/logic.js');

function validateLevel(data) {
  const errors = [];
  if (!data || !Array.isArray(data.pipes)) {
    return ['pipes must be an array of 25 integers'];
  }
  const pipes = data.pipes;
  if (pipes.length !== 25) errors.push(`pipes array must have length 25, found ${pipes.length}`);
  const validInts = pipes.every((v) => Number.isInteger(v) && v >= 0 && v <= 15);
  if (!validInts) errors.push('all pipe masks must be integers between 0 and 15');
  if (pipes[0] === 0) errors.push('source pipe at index 0 must have at least one open connection');
  if (pipes[24] === 0) errors.push('sink pipe at index 24 must have at least one open connection');
  return errors;
}

function solve(data, options = {}) {
  const maxStates = options.maxStates || 200000;
  const pipes = data.pipes;
  if (isSolved(pipes)) return { solvable: true, moves: '', states: 1 };

  const rotatables = [];
  for (let i = 0; i < 25; i++) {
    if (pipes[i] !== 0 && pipes[i] !== 15) rotatables.push(i);
  }

  const startKey = pipes.join(',');
  const parent = new Map([[startKey, null]]);
  let frontier = [pipes];
  let states = 1;

  while (frontier.length) {
    const nextFrontier = [];
    for (const cur of frontier) {
      const curKey = cur.join(',');
      for (const idx of rotatables) {
        const next = cur.slice();
        next[idx] = rotCW(next[idx]);
        const nk = next.join(',');
        if (parent.has(nk)) continue;
        const char = String.fromCharCode(97 + idx);
        parent.set(nk, { from: curKey, move: char });
        states += 1;
        if (isSolved(next)) {
          const moves = [];
          for (let step = parent.get(nk); step; step = parent.get(step.from)) {
            moves.push(step.move);
          }
          return { solvable: true, moves: moves.reverse().join(''), states };
        }
        if (states >= maxStates) return { solvable: null, moves: null, states };
        nextFrontier.push(next);
      }
    }
    frontier = nextFrontier;
  }
  return { solvable: false, moves: null, states };
}

function replay(data, moves) {
  if (typeof moves !== 'string') return false;
  const finalPipes = play(data.pipes, moves);
  return isSolved(finalPipes);
}

module.exports = { validateLevel, solve, replay };
