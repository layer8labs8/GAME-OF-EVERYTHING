// Pure deterministic logic for 0078: Board Game (Royal Ludo)

const TOKENS_PER_PLAYER = 3;
const TRACK_LENGTH = 40;
const HOME_CORRIDOR_STEPS = 5;
const GOAL_STEP = 45; // 0 to 39 track, 40 to 44 corridor, 45 is Home Goal
const MAX_TURNS = 120;
const MAX_TOTAL_ACTIONS = 250;
const SAFE_SPACES = [0, 8, 20, 28];

function getNextRng(state) {
  let s = (state.rngState + 0x6d2b79f5) >>> 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  state.rngState = s;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function createState(seed = 1) {
  const safeSeed = typeof seed === 'number' ? (seed >>> 0) : 1;
  const rngInitial = (Math.imul(safeSeed ^ 0x6d2b79f5, 1) + 1) >>> 0;

  const playerTokens = [];
  const oppTokens = [];
  for (let i = 0; i < TOKENS_PER_PLAYER; i++) {
    playerTokens.push({ id: `p${i}`, owner: 'player', state: 'yard', progress: 0 });
    oppTokens.push({ id: `o${i}`, owner: 'opp', state: 'yard', progress: 0 });
  }

  const state = {
    seed: safeSeed,
    rngState: rngInitial,
    turn: 1,
    maxTurns: MAX_TURNS,
    totalActions: 0,
    currentRoll: null,
    phase: 'roll', // 'roll' or 'move'
    playerTokens,
    oppTokens,
    playerHomeCount: 0,
    oppHomeCount: 0,
    playerCaptures: 0,
    oppCaptures: 0,
    totalStepsTaken: 0,
    done: false,
    won: false,
    message: 'Welcome to Royal Ludo. Roll the die to begin!'
  };

  return state;
}

function getTokenTrackSpace(token) {
  if (token.state !== 'active' || token.progress >= TRACK_LENGTH) return null;
  const offset = token.owner === 'player' ? 0 : 20;
  return (offset + token.progress) % TRACK_LENGTH;
}

function getLegalMovesForRoll(tokens, roll) {
  const moves = [];
  for (const t of tokens) {
    if (t.state === 'home') continue;

    if (t.state === 'yard') {
      if (roll === 6) {
        moves.push(`move:${t.id}`);
      }
    } else if (t.state === 'active') {
      if (t.progress + roll <= GOAL_STEP) {
        moves.push(`move:${t.id}`);
      }
    }
  }
  return moves;
}

function legalActions(state) {
  if (state.done) return [];

  if (state.phase === 'roll') {
    return ['roll'];
  } else if (state.phase === 'move') {
    return getLegalMovesForRoll(state.playerTokens, state.currentRoll);
  }

  return [];
}

function applyMove(tokens, oppTokens, tokenId, roll, state) {
  const t = tokens.find(item => item.id === tokenId);
  if (!t) return { captured: false, reachedHome: false };

  let captured = false;
  let reachedHome = false;

  if (t.state === 'yard') {
    t.state = 'active';
    t.progress = 0;
  } else if (t.state === 'active') {
    t.progress += roll;
    state.totalStepsTaken += roll;

    if (t.progress === GOAL_STEP) {
      t.state = 'home';
      reachedHome = true;
      if (t.owner === 'player') state.playerHomeCount++;
      else state.oppHomeCount++;
    } else if (t.progress < TRACK_LENGTH) {
      // Check capture
      const trackSpace = getTokenTrackSpace(t);
      if (!SAFE_SPACES.includes(trackSpace)) {
        for (const ot of oppTokens) {
          if (ot.state === 'active' && ot.progress < TRACK_LENGTH) {
            const otSpace = getTokenTrackSpace(ot);
            if (trackSpace === otSpace) {
              // Knock back to yard
              ot.state = 'yard';
              ot.progress = 0;
              captured = true;
              if (t.owner === 'player') state.playerCaptures++;
              else state.oppCaptures++;
            }
          }
        }
      }
    }
  }

  return { captured, reachedHome };
}

function runOpponentTurn(state) {
  if (state.done) return;

  // Opponent rolls die
  const roll = Math.floor(getNextRng(state) * 6) + 1;
  const legalMoves = getLegalMovesForRoll(state.oppTokens, roll);

  if (legalMoves.length === 0) {
    state.message = `Opponent rolled a ${roll} but has no legal moves. Your turn!`;
    state.phase = 'roll';
    state.turn++;
    return;
  }

  // Choose best move:
  // 1. Capture player token
  // 2. Reach home
  // 3. Deploy from yard on 6
  // 4. Move token closest to home
  let bestMove = legalMoves[0];
  let bestScore = -100;

  for (const m of legalMoves) {
    const tid = m.slice(5);
    const t = state.oppTokens.find(item => item.id === tid);
    let s = 0;

    if (t.state === 'yard') {
      s = 50;
    } else {
      const nextProg = t.progress + roll;
      if (nextProg === GOAL_STEP) {
        s = 100; // Reach home
      } else if (nextProg < TRACK_LENGTH) {
        const nextSpace = (20 + nextProg) % TRACK_LENGTH;
        // Check capture
        const canCapture = state.playerTokens.some(pt => {
          return pt.state === 'active' && pt.progress < TRACK_LENGTH && getTokenTrackSpace(pt) === nextSpace && !SAFE_SPACES.includes(nextSpace);
        });
        if (canCapture) s = 80;
        else s = nextProg;
      } else {
        s = nextProg;
      }
    }

    if (s > bestScore) {
      bestScore = s;
      bestMove = m;
    }
  }

  // Execute opponent move
  const tid = bestMove.slice(5);
  const res = applyMove(state.oppTokens, state.playerTokens, tid, roll, state);

  if (state.oppHomeCount >= TOKENS_PER_PLAYER) {
    state.done = true;
    state.won = false;
    state.message = 'Defeat! Opponent guided all tokens home first.';
    return;
  }

  if (roll === 6) {
    state.message = `Opponent rolled a 6 and moved! Rolling bonus turn...`;
    runOpponentTurn(state);
    return;
  }

  state.message = `Opponent rolled ${roll} and moved ${tid}${res.captured ? ' (Captured your token!)' : ''}. Your turn!`;
  state.phase = 'roll';
  state.turn++;
}

function step(state, action) {
  if (state.done) {
    return { reward: 0, done: true };
  }

  const legal = legalActions(state);
  if (!legal.includes(action)) {
    throw new Error(`Illegal action: ${action}`);
  }

  let reward = 0;
  state.totalActions++;

  if (action === 'roll') {
    const roll = Math.floor(getNextRng(state) * 6) + 1;
    state.currentRoll = roll;

    const moves = getLegalMovesForRoll(state.playerTokens, roll);
    if (moves.length === 0) {
      state.message = `You rolled a ${roll} with no legal moves. Passing to opponent.`;
      state.phase = 'roll';
      runOpponentTurn(state);
    } else {
      state.phase = 'move';
      state.message = `You rolled a ${roll}! Select a highlighted token to move.`;
      reward += 2;
    }
  } else if (action.startsWith('move:')) {
    const tid = action.slice(5);
    const res = applyMove(state.playerTokens, state.oppTokens, tid, state.currentRoll, state);

    reward += state.currentRoll;
    if (res.captured) reward += 100;
    if (res.reachedHome) reward += 150;

    if (state.playerHomeCount >= TOKENS_PER_PLAYER) {
      state.done = true;
      state.won = true;
      reward += 1500;
      state.message = 'Royal Triumph! All tokens guided to the Home Goal!';
      return { reward, done: true };
    }

    if (state.currentRoll === 6) {
      // Bonus roll for rolling a 6!
      state.phase = 'roll';
      state.message = `Deployed/Moved on a 6! Bonus roll awarded!`;
      reward += 20;
    } else {
      // Pass turn to opponent
      state.phase = 'roll';
      runOpponentTurn(state);
    }
  }

  if (!state.done && (state.turn >= state.maxTurns || state.totalActions >= MAX_TOTAL_ACTIONS)) {
    state.done = true;
    state.won = (state.playerHomeCount > state.oppHomeCount);
    state.message = 'Turn limit reached. Match concluded.';
  }

  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  return (
    state.playerHomeCount * 500 +
    state.totalStepsTaken * 10 +
    state.playerCaptures * 100 +
    (state.won ? 1500 : 0) -
    state.turn * 5
  );
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TOKENS_PER_PLAYER,
    TRACK_LENGTH,
    GOAL_STEP,
    SAFE_SPACES,
    MAX_TURNS,
    createState,
    legalActions,
    step,
    isOver,
    score,
    getTokenTrackSpace,
    getLegalMovesForRoll
  };
}
