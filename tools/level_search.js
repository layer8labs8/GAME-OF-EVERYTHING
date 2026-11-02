// Shared helpers for level solvers. Every search here plays through the real game rules.
// A solution is a string with one character per move: the index of the move in legalActions.

const encode = (index) => String.fromCharCode(0x30 + index);
const decode = (ch) => ch.charCodeAt(0) - 0x30;
const clone = (state) => JSON.parse(JSON.stringify(state));

// Plays a move string from a fresh state. True when it reaches a win.
function replayMoves(L, start, moves) {
  if (typeof moves !== 'string') return false;
  const state = start();
  for (const ch of moves) {
    const actions = L.legalActions(state);
    const action = actions[decode(ch)];
    if (action === undefined) return false;
    L.step(state, action);
  }
  return Boolean(L.isWon(state));
}

// Plays actions chosen by pick(state, actions) until the game ends. Returns the moves, or null without a win.
function playPolicy(L, start, pick) {
  const state = start();
  let moves = '';
  while (!L.isOver(state)) {
    const actions = L.legalActions(state);
    const index = pick(state, actions);
    L.step(state, actions[index]);
    moves += encode(index);
  }
  return L.isWon(state) ? moves : null;
}

// Keeps the `width` best states at each depth. Finds a win if one is on the way, not always the shortest.
function beamSearch(L, start, { width, depth, value }) {
  let frontier = [{ state: start(), moves: '' }];
  let best = null;
  for (let d = 0; d < depth && frontier.length; d++) {
    const next = [];
    for (const { state, moves } of frontier) {
      L.legalActions(state).forEach((action, i) => {
        const child = clone(state);
        L.step(child, action);
        const path = moves + encode(i);
        const rank = value(child);
        if (!best || rank > best.rank) best = { rank, moves: path };
        if (L.isWon(child)) {
          if (!best.won) best = { rank, moves: path, won: true };
        } else if (!L.isOver(child)) {
          next.push({ state: child, moves: path, rank });
        }
      });
      if (best && best.won) return best;
    }
    next.sort((a, b) => b.rank - a.rank);
    frontier = next.slice(0, width);
  }
  return best;
}

module.exports = { encode, decode, clone, replayMoves, playPolicy, beamSearch };
