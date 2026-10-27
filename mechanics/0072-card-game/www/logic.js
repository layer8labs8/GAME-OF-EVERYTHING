// Pure deterministic logic for 0072: Card Game (Duel of Eights / Crazy Eights)

const SUITS = ['S', 'H', 'D', 'C'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const TARGET_POINTS = 100;
const MAX_ROUNDS = 3;
const MAX_TURNS = 120;
const INITIAL_HAND_SIZE = 5;

function createRng(seed) {
  let s = (Math.imul(seed ^ 0x6d2b79f5, 1) + 1) >>> 0;
  return function() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getCardPoints(card) {
  if (!card) return 0;
  if (card.rank === '8') return 50;
  if (['K', 'Q', 'J', '10'].includes(card.rank)) return 10;
  if (card.rank === 'A') return 1;
  return parseInt(card.rank, 10);
}

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: rank + suit,
        rank,
        suit
      });
    }
  }
  return deck;
}

function shuffleDeck(deck, rng) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
}

function initRound(state) {
  const rng = createRng(state.seed + state.round * 997);
  const deck = createDeck();
  shuffleDeck(deck, rng);

  state.playerHand = [];
  state.opponentHand = [];

  for (let i = 0; i < INITIAL_HAND_SIZE; i++) {
    state.playerHand.push(deck.pop());
    state.opponentHand.push(deck.pop());
  }

  // Find a starter card that is not an 8 for fair initial play
  let starter = deck.pop();
  while (starter.rank === '8' && deck.length > 0) {
    deck.unshift(starter);
    starter = deck.pop();
  }

  state.deck = deck;
  state.discardPile = [starter];
  state.topCard = starter;
  state.activeSuit = starter.suit;
  state.playerDrawnThisTurn = false;
  state.consecutivePasses = 0;
}

function createState(seed = 1) {
  const safeSeed = typeof seed === 'number' ? (seed >>> 0) : 1;
  const state = {
    seed: safeSeed,
    round: 1,
    maxRounds: MAX_ROUNDS,
    targetPoints: TARGET_POINTS,
    playerScore: 0,
    opponentScore: 0,
    playerRoundsWon: 0,
    opponentRoundsWon: 0,
    turnCount: 0,
    maxTurns: MAX_TURNS,
    done: false,
    won: false,
    message: 'Match suit or rank. Eights are wild!'
  };

  initRound(state);
  return state;
}

function isPlayable(card, topCard, activeSuit) {
  if (card.rank === '8') return true;
  return card.suit === activeSuit || card.rank === topCard.rank;
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];
  const playableCards = state.playerHand.filter(c => isPlayable(c, state.topCard, state.activeSuit));

  for (const card of playableCards) {
    if (card.rank === '8') {
      for (const suit of SUITS) {
        actions.push(`play:${card.id},${suit}`);
      }
    } else {
      actions.push(`play:${card.id}`);
    }
  }

  // If no playable cards and has not drawn yet, player must draw
  if (playableCards.length === 0 && !state.playerDrawnThisTurn && state.deck.length > 0) {
    actions.push('draw');
  }

  // If already drawn or deck is empty, and still has no playable cards (or chooses to pass)
  if (state.playerDrawnThisTurn || (playableCards.length === 0 && state.deck.length === 0)) {
    actions.push('pass');
  }

  return actions;
}

function evaluateRoundEnd(state) {
  let playerHandPoints = 0;
  for (const c of state.playerHand) playerHandPoints += getCardPoints(c);

  let oppHandPoints = 0;
  for (const c of state.opponentHand) oppHandPoints += getCardPoints(c);

  let roundWonByPlayer = false;

  if (state.playerHand.length === 0) {
    roundWonByPlayer = true;
    state.playerRoundsWon++;
    state.playerScore += oppHandPoints;
    state.message = `Round ${state.round} won! Scored ${oppHandPoints} points from opponent.`;
  } else if (state.opponentHand.length === 0) {
    state.opponentRoundsWon++;
    state.opponentScore += playerHandPoints;
    state.message = `Opponent shed all cards! Opponent gained ${playerHandPoints} points.`;
  } else {
    // Round locked (both passed)
    if (playerHandPoints < oppHandPoints) {
      roundWonByPlayer = true;
      const diff = oppHandPoints - playerHandPoints;
      state.playerScore += diff;
      state.message = `Round locked! Player held fewer points (+${diff} pts).`;
    } else {
      const diff = playerHandPoints - oppHandPoints;
      state.opponentScore += diff;
      state.message = `Round locked! Opponent held fewer points (+${diff} pts).`;
    }
  }

  // Check Match Victory
  if (
    state.playerScore >= state.targetPoints ||
    state.opponentScore >= state.targetPoints ||
    state.round >= state.maxRounds
  ) {
    state.done = true;
    state.won = (state.playerScore > state.opponentScore);
    if (state.won) {
      state.message = `Match Victory! Final Score: ${state.playerScore} to ${state.opponentScore}.`;
    } else {
      state.message = `Match Defeat. Opponent scored ${state.opponentScore} to ${state.playerScore}.`;
    }
  } else {
    state.round++;
    initRound(state);
  }

  return roundWonByPlayer;
}

function runOpponentTurn(state) {
  // Opponent AI logic: deterministic priority
  const playable = state.opponentHand.filter(c => isPlayable(c, state.topCard, state.activeSuit));

  if (playable.length > 0) {
    // Prefer special action cards (2, Q, A)
    let chosen = playable.find(c => ['2', 'Q', 'A'].includes(c.rank));
    if (!chosen) {
      // Prefer non-8 cards first
      const nonEights = playable.filter(c => c.rank !== '8');
      if (nonEights.length > 0) {
        // Play highest value non-8 card to shed points
        nonEights.sort((a, b) => getCardPoints(b) - getCardPoints(a));
        chosen = nonEights[0];
      } else {
        chosen = playable[0]; // Must play 8
      }
    }

    // Remove from opponent hand
    const idx = state.opponentHand.findIndex(c => c.id === chosen.id);
    state.opponentHand.splice(idx, 1);
    state.discardPile.push(chosen);
    state.topCard = chosen;
    state.consecutivePasses = 0;

    if (chosen.rank === '8') {
      // Pick suit opponent has most of
      const counts = { S: 0, H: 0, D: 0, C: 0 };
      for (const c of state.opponentHand) counts[c.suit]++;
      let bestSuit = 'S';
      let maxC = -1;
      for (const s of SUITS) {
        if (counts[s] > maxC) {
          maxC = counts[s];
          bestSuit = s;
        }
      }
      state.activeSuit = bestSuit;
      state.message = `Opponent played 8 and declared suit: ${bestSuit}.`;
    } else {
      state.activeSuit = chosen.suit;
      state.message = `Opponent played ${chosen.id}.`;
    }

    // Action card effects
    if (chosen.rank === '2') {
      // Player draws 2
      for (let i = 0; i < 2 && state.deck.length > 0; i++) {
        state.playerHand.push(state.deck.pop());
      }
      state.message += ' You must draw 2 penalty cards!';
    } else if (['Q', 'A'].includes(chosen.rank) && state.opponentHand.length > 0) {
      // Opponent skips player turn and takes another turn!
      state.message += ' Turn skipped!';
      runOpponentTurn(state);
      return;
    }
  } else {
    // Cannot play -> try to draw
    if (state.deck.length > 0) {
      const drawn = state.deck.pop();
      state.opponentHand.push(drawn);
      if (isPlayable(drawn, state.topCard, state.activeSuit)) {
        // Can immediately play drawn card
        const idx = state.opponentHand.length - 1;
        state.opponentHand.splice(idx, 1);
        state.discardPile.push(drawn);
        state.topCard = drawn;
        state.consecutivePasses = 0;
        if (drawn.rank === '8') {
          state.activeSuit = drawn.suit;
        } else {
          state.activeSuit = drawn.suit;
        }
        state.message = `Opponent drew and played ${drawn.id}.`;
      } else {
        state.message = 'Opponent drew a card and passed.';
      }
    } else {
      state.consecutivePasses++;
      state.message = 'Opponent passed (deck empty).';
    }
  }

  // Check if opponent round ended
  if (state.opponentHand.length === 0 || state.consecutivePasses >= 2) {
    evaluateRoundEnd(state);
  }
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
  state.turnCount++;

  let playerGoesAgain = false;

  if (action === 'draw') {
    if (state.deck.length > 0) {
      const card = state.deck.pop();
      state.playerHand.push(card);
      state.playerDrawnThisTurn = true;
      state.message = `Drew ${card.id}.`;
      reward += 1;
    }
    // Keep turn with player so they can play if valid or pass
    return { reward, done: state.done };
  } else if (action === 'pass') {
    state.consecutivePasses++;
    state.playerDrawnThisTurn = false;
    state.message = 'You passed your turn.';
  } else if (action.startsWith('play:')) {
    state.consecutivePasses = 0;
    state.playerDrawnThisTurn = false;

    const payload = action.slice(5);
    const [cardId, declaredSuit] = payload.split(',');
    const cardIdx = state.playerHand.findIndex(c => c.id === cardId);
    const card = state.playerHand[cardIdx];

    state.playerHand.splice(cardIdx, 1);
    state.discardPile.push(card);
    state.topCard = card;

    if (card.rank === '8') {
      state.activeSuit = declaredSuit || card.suit;
      reward += 30;
      state.message = `Played 8 and declared suit: ${state.activeSuit}.`;
    } else {
      state.activeSuit = card.suit;
      reward += 15;
      state.message = `Played ${card.id}.`;
    }

    // Action card effects
    if (card.rank === '2') {
      for (let i = 0; i < 2 && state.deck.length > 0; i++) {
        state.opponentHand.push(state.deck.pop());
      }
      reward += 20;
      state.message += ' Opponent drew 2 penalty cards!';
    } else if (['Q', 'A'].includes(card.rank) && state.playerHand.length > 0) {
      playerGoesAgain = true;
      reward += 20;
      state.message += ' Opponent skipped! Take another turn.';
    }
  }

  // Check if player shed all cards or round locked
  if (state.playerHand.length === 0 || state.consecutivePasses >= 2) {
    const playerWon = evaluateRoundEnd(state);
    if (playerWon) reward += 150;
    if (state.won) reward += 500;
    return { reward, done: state.done };
  }

  // If player doesn't go again, let Opponent AI take turn
  if (!playerGoesAgain) {
    runOpponentTurn(state);
  }

  if (!state.done && state.turnCount >= state.maxTurns) {
    state.done = true;
    state.won = (state.playerScore > state.opponentScore);
    reward -= 50;
    state.message = 'Match turn limit reached.';
  }

  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  return (
    state.playerScore * 10 +
    state.playerRoundsWon * 150 +
    (state.won ? 500 : 0) -
    state.turnCount
  );
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SUITS,
    RANKS,
    TARGET_POINTS,
    MAX_ROUNDS,
    MAX_TURNS,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
}
