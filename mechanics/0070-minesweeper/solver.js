// Level solver for 0070-minesweeper (see docs/LEVELS.md). It plays the real rules from www/logic.js.
const L = require('./www/logic.js');
const { encode, replayMoves } = require('../../tools/level_search.js');

const start = (data) => () => L.createState(1, data);

function validateLevel(data) {
  if (!data || !Array.isArray(data.mines) || !Number.isInteger(data.first)) return ['mines and first are required'];
  const problems = [];
  if (new Set(data.mines).size !== data.mines.length || data.mines.some((m) => m < 0 || m >= L.CELLS)) problems.push('mines must be distinct cells');
  if (data.mines.includes(data.first)) problems.push('the first cell must be safe');
  return problems;
}

// Deduction only, so a level that passes never needs a guess. It reads only what the player can see.
function deduce(state) {
  const facts = [];
  for (let i = 0; i < L.CELLS; i++) {
    if (!state.revealed[i] || state.counts[i] === 0) continue;
    const hidden = L.neighbors(i).filter((n) => !state.revealed[n]);
    facts.push({ hidden, mines: state.counts[i] });
  }
  const mines = new Set();
  const safe = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    const known = facts.map((f) => {
      const open = f.hidden.filter((c) => !mines.has(c) && !safe.has(c));
      return { open, left: f.mines - f.hidden.filter((c) => mines.has(c)).length };
    });
    for (const f of known) {
      if (f.open.length && f.left === 0) { f.open.forEach((c) => safe.add(c)); changed = true; }
      if (f.open.length && f.left === f.open.length) { f.open.forEach((c) => mines.add(c)); changed = true; }
    }
    for (const a of known) {
      for (const b of known) {
        if (a === b || !a.open.length || a.open.length >= b.open.length || !a.open.every((c) => b.open.includes(c))) continue;
        const rest = b.open.filter((c) => !a.open.includes(c));
        const left = b.left - a.left;
        if (left === 0) { rest.forEach((c) => safe.add(c)); changed = true; }
        if (left === rest.length) { rest.forEach((c) => mines.add(c)); changed = true; }
      }
    }
  }
  return [...safe];
}

function solve(data) {
  const state = start(data)();
  let moves = '';
  while (!L.isOver(state)) {
    const safe = deduce(state).filter((c) => !state.revealed[c]);
    if (!safe.length) return { solvable: false, moves: null, states: moves.length };
    const actions = L.legalActions(state);
    moves += encode(actions.indexOf(safe[0]));
    L.step(state, safe[0]);
  }
  return L.isWon(state) ? { solvable: true, moves, states: moves.length } : { solvable: false, moves: null, states: moves.length };
}

function replay(data, moves) {
  return replayMoves(L, start(data), moves);
}

module.exports = { validateLevel, solve, replay };
