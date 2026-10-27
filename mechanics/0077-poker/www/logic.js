// Pure deterministic logic for 0077: Poker (Royal Hold'em - Texas Poker)

const STARTING_STACK = 500;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;
const BET_SIZE = 20;
const MAX_TOTAL_ACTIONS = 120;
const MAX_CHIPS_TARGET = 1000;

const SUITS = ['S', 'H', 'D', 'C'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const RANK_VALUES = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

function getNextRng(state) {
  let s = (state.rngState + 0x6d2b79f5) >>> 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  state.rngState = s;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function shuffleList(list, state) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(getNextRng(state) * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
}

function createDeck() {
  const deck = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push({ id: r + s, rank: r, suit: s, val: RANK_VALUES[r] });
    }
  }
  return deck;
}

// 5-Card Poker Evaluator
function evaluate5Cards(cards) {
  const vals = cards.map(c => c.val).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);

  // Check straight
  let isStraight = false;
  let straightHigh = 0;
  const uniqueVals = Array.from(new Set(vals));
  if (uniqueVals.length === 5) {
    if (uniqueVals[0] - uniqueVals[4] === 4) {
      isStraight = true;
      straightHigh = uniqueVals[0];
    } else if (uniqueVals[0] === 14 && uniqueVals[1] === 5 && uniqueVals[2] === 4 && uniqueVals[3] === 3 && uniqueVals[4] === 2) {
      // Ace-low straight (A-2-3-4-5)
      isStraight = true;
      straightHigh = 5;
    }
  }

  // Value frequencies
  const counts = {};
  for (const v of vals) counts[v] = (counts[v] || 0) + 1;
  const groups = Object.keys(counts).map(v => ({ val: parseInt(v, 10), count: counts[v] }));
  groups.sort((a, b) => b.count - a.count || b.val - a.val);

  // 1. Straight Flush / Royal Flush
  if (isFlush && isStraight) {
    return [9, straightHigh];
  }
  // 2. Four of a Kind
  if (groups[0].count === 4) {
    return [8, groups[0].val, groups[1].val];
  }
  // 3. Full House
  if (groups[0].count === 3 && groups[1].count === 2) {
    return [7, groups[0].val, groups[1].val];
  }
  // 4. Flush
  if (isFlush) {
    return [6, ...vals];
  }
  // 5. Straight
  if (isStraight) {
    return [5, straightHigh];
  }
  // 6. Three of a Kind
  if (groups[0].count === 3) {
    return [4, groups[0].val, groups[1].val, groups[2].val];
  }
  // 7. Two Pair
  if (groups[0].count === 2 && groups[1].count === 2) {
    return [3, groups[0].val, groups[1].val, groups[2].val];
  }
  // 8. One Pair
  if (groups[0].count === 2) {
    return [2, groups[0].val, groups[1].val, groups[2].val, groups[3].val];
  }
  // 9. High Card
  return [1, ...vals];
}

function compareHandScores(scoreA, scoreB) {
  for (let i = 0; i < Math.max(scoreA.length, scoreB.length); i++) {
    const a = scoreA[i] || 0;
    const b = scoreB[i] || 0;
    if (a !== b) return a - b;
  }
  return 0;
}

function evaluateBest5Of7(sevenCards) {
  let bestScore = null;
  // Generate all 21 5-card combinations
  const n = sevenCards.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        for (let l = k + 1; l < n; l++) {
          for (let m = l + 1; m < n; m++) {
            const five = [sevenCards[i], sevenCards[j], sevenCards[k], sevenCards[l], sevenCards[m]];
            const s = evaluate5Cards(five);
            if (!bestScore || compareHandScores(s, bestScore) > 0) {
              bestScore = s;
            }
          }
        }
      }
    }
  }
  return bestScore;
}

function getHandCategoryName(score) {
  const cats = {
    9: 'Straight Flush',
    8: 'Four of a Kind',
    7: 'Full House',
    6: 'Flush',
    5: 'Straight',
    4: 'Three of a Kind',
    3: 'Two Pair',
    2: 'One Pair',
    1: 'High Card'
  };
  return cats[score[0]] || 'High Card';
}

function startNewHand(state) {
  state.handNumber++;
  state.deck = createDeck();
  shuffleList(state.deck, state);

  state.playerHole = [state.deck.pop(), state.deck.pop()];
  state.oppHole = [state.deck.pop(), state.deck.pop()];
  state.community = [];

  state.pot = 0;
  state.street = 'preflop'; // preflop, flop, turn, river, showdown
  state.playerButton = !state.playerButton;

  // Post Blinds
  const sbPayer = state.playerButton ? 'player' : 'opp';
  const bbPayer = state.playerButton ? 'opp' : 'player';

  const sbAmt = Math.min(SMALL_BLIND, state[sbPayer + 'Chips']);
  state[sbPayer + 'Chips'] -= sbAmt;
  state[sbPayer + 'Bet'] = sbAmt;

  const bbAmt = Math.min(BIG_BLIND, state[bbPayer + 'Chips']);
  state[bbPayer + 'Chips'] -= bbAmt;
  state[bbPayer + 'Bet'] = bbAmt;

  state.pot = sbAmt + bbAmt;
  state.currentBet = Math.max(sbAmt, bbAmt);
  state.actionOn = 'player';
  state.streetBetsCount = 0;

  state.message = `Hand #${state.handNumber}: Dealt hole cards. Blinds posted (Pot: ${state.pot}).`;
}

function createState(seed = 1) {
  const safeSeed = typeof seed === 'number' ? (seed >>> 0) : 1;
  const rngInitial = (Math.imul(safeSeed ^ 0x6d2b79f5, 1) + 1) >>> 0;

  const state = {
    seed: safeSeed,
    rngState: rngInitial,
    handNumber: 0,
    handsWon: 0,
    totalActions: 0,
    playerChips: STARTING_STACK,
    oppChips: STARTING_STACK,
    playerBet: 0,
    oppBet: 0,
    currentBet: 0,
    pot: 0,
    playerButton: false,
    street: 'preflop',
    actionOn: 'player',
    streetBetsCount: 0,
    deck: [],
    playerHole: [],
    oppHole: [],
    community: [],
    done: false,
    won: false,
    message: 'Welcome to Royal Hold\'em.'
  };

  startNewHand(state);
  return state;
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];
  const callAmount = Math.max(0, state.oppBet - state.playerBet);

  if (callAmount === 0) {
    actions.push('check');
    if (state.playerChips >= BET_SIZE) {
      actions.push('bet');
    }
  } else {
    if (state.playerChips >= callAmount) {
      actions.push('call');
    }
    actions.push('fold');
    if (state.playerChips >= callAmount + BET_SIZE) {
      actions.push('raise');
    }
  }

  if (state.playerChips > 0) {
    actions.push('all_in');
  }

  return actions;
}

function advanceStreet(state) {
  state.playerBet = 0;
  state.oppBet = 0;
  state.currentBet = 0;
  state.streetBetsCount = 0;

  if (state.street === 'preflop') {
    state.street = 'flop';
    state.community.push(state.deck.pop(), state.deck.pop(), state.deck.pop());
    state.message = 'Flop dealt: ' + state.community.map(c => c.id).join(' ');
  } else if (state.street === 'flop') {
    state.street = 'turn';
    state.community.push(state.deck.pop());
    state.message = 'Turn dealt: ' + state.community[3].id;
  } else if (state.street === 'turn') {
    state.street = 'river';
    state.community.push(state.deck.pop());
    state.message = 'River dealt: ' + state.community[4].id;
  } else if (state.street === 'river') {
    state.street = 'showdown';
    resolveShowdown(state);
  }
}

function resolveShowdown(state) {
  const p7 = [...state.playerHole, ...state.community];
  const o7 = [...state.oppHole, ...state.community];

  const pScore = evaluateBest5Of7(p7);
  const oScore = evaluateBest5Of7(o7);

  const cmp = compareHandScores(pScore, oScore);
  const pCat = getHandCategoryName(pScore);
  const oCat = getHandCategoryName(oScore);

  if (cmp > 0) {
    // Player wins
    state.playerChips += state.pot;
    state.handsWon++;
    state.message = `Showdown! You win ${state.pot} with ${pCat} vs Opponent's ${oCat}!`;
  } else if (cmp < 0) {
    // Opponent wins
    state.oppChips += state.pot;
    state.message = `Showdown! Opponent wins ${state.pot} with ${oCat} vs your ${pCat}.`;
  } else {
    // Split pot
    const half = Math.floor(state.pot / 2);
    state.playerChips += half;
    state.oppChips += (state.pot - half);
    state.message = `Showdown! Split pot (${pCat}).`;
  }

  checkMatchEnd(state);
}

function checkMatchEnd(state) {
  if (state.playerChips <= 0) {
    state.done = true;
    state.won = false;
    state.message = 'Busted! You ran out of chips.';
  } else if (state.oppChips <= 0 || state.playerChips >= MAX_CHIPS_TARGET) {
    state.done = true;
    state.won = true;
    state.message = 'Champion! You busted the opponent and claimed the crown!';
  } else if (state.totalActions >= MAX_TOTAL_ACTIONS) {
    state.done = true;
    state.won = (state.playerChips > state.oppChips);
    state.message = 'Action limit reached. Duel ended.';
  } else {
    // Continue to next hand
    startNewHand(state);
  }
}

function runOpponentAI(state) {
  const callAmount = Math.max(0, state.playerBet - state.oppBet);
  const oCards = [...state.oppHole, ...state.community];
  let strength = 1;
  if (oCards.length >= 5) {
    const s = evaluateBest5Of7(oCards);
    strength = s[0]; // category 1-9
  } else {
    // Pre-flop strength evaluation
    const [c1, c2] = state.oppHole;
    const isPair = (c1.val === c2.val);
    const highVal = Math.max(c1.val, c2.val);
    if (isPair && highVal >= 10) strength = 5;
    else if (isPair) strength = 3;
    else if (highVal >= 12) strength = 2;
    else strength = 1;
  }

  if (callAmount === 0) {
    // Opponent can check or bet
    if (strength >= 3 && state.oppChips >= BET_SIZE && state.streetBetsCount < 2) {
      // Opponent bets
      const betAmt = Math.min(BET_SIZE, state.oppChips);
      state.oppChips -= betAmt;
      state.oppBet += betAmt;
      state.pot += betAmt;
      state.currentBet = state.oppBet;
      state.streetBetsCount++;
      state.message = `Opponent bets ${betAmt} chips.`;
    } else {
      // Opponent checks -> street complete!
      advanceStreet(state);
    }
  } else {
    // Opponent facing bet: call, raise, or fold
    if (strength >= 4 && state.oppChips >= callAmount + BET_SIZE && state.streetBetsCount < 2) {
      // Raise
      const raiseAmt = callAmount + BET_SIZE;
      state.oppChips -= raiseAmt;
      state.oppBet += raiseAmt;
      state.pot += raiseAmt;
      state.currentBet = state.oppBet;
      state.streetBetsCount++;
      state.message = `Opponent calls ${callAmount} and raises by ${BET_SIZE}!`;
    } else if (strength >= 2 || callAmount <= 20) {
      // Call
      const amt = Math.min(callAmount, state.oppChips);
      state.oppChips -= amt;
      state.oppBet += amt;
      state.pot += amt;
      state.message = `Opponent calls ${amt}.`;
      advanceStreet(state);
    } else {
      // Fold
      state.playerChips += state.pot;
      state.handsWon++;
      state.message = 'Opponent folded! You collect the pot of ' + state.pot + ' chips.';
      checkMatchEnd(state);
    }
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
  state.totalActions++;

  const callAmount = Math.max(0, state.oppBet - state.playerBet);

  if (action === 'fold') {
    state.oppChips += state.pot;
    reward -= 20;
    state.message = 'You folded. Opponent takes the pot.';
    checkMatchEnd(state);
    return { reward, done: state.done };
  } else if (action === 'check') {
    state.message = 'You checked.';
    runOpponentAI(state);
  } else if (action === 'call') {
    const amt = Math.min(callAmount, state.playerChips);
    state.playerChips -= amt;
    state.playerBet += amt;
    state.pot += amt;
    reward += 5;
    state.message = `You called ${amt}.`;
    advanceStreet(state);
  } else if (action === 'bet') {
    const amt = Math.min(BET_SIZE, state.playerChips);
    state.playerChips -= amt;
    state.playerBet += amt;
    state.pot += amt;
    state.currentBet = state.playerBet;
    state.streetBetsCount++;
    reward += 10;
    state.message = `You bet ${amt}.`;
    runOpponentAI(state);
  } else if (action === 'raise') {
    const amt = callAmount + BET_SIZE;
    state.playerChips -= amt;
    state.playerBet += amt;
    state.pot += amt;
    state.currentBet = state.playerBet;
    state.streetBetsCount++;
    reward += 15;
    state.message = `You raised by ${BET_SIZE}.`;
    runOpponentAI(state);
  } else if (action === 'all_in') {
    const amt = state.playerChips;
    state.playerChips = 0;
    state.playerBet += amt;
    state.pot += amt;
    reward += 20;
    state.message = 'You went ALL-IN!';

    // Opponent decides call or fold
    const oCall = Math.max(0, state.playerBet - state.oppBet);
    const oCards = [...state.oppHole, ...state.community];
    let strength = 1;
    if (oCards.length >= 5) strength = evaluateBest5Of7(oCards)[0];

    if (strength >= 3 || state.oppChips <= oCall) {
      const oAmt = Math.min(oCall, state.oppChips);
      state.oppChips -= oAmt;
      state.oppBet += oAmt;
      state.pot += oAmt;
      state.message += ` Opponent calls your all-in!`;
      // Deal remaining community cards immediately and showdown
      while (state.community.length < 5) {
        state.community.push(state.deck.pop());
      }
      resolveShowdown(state);
    } else {
      state.playerChips += state.pot;
      state.handsWon++;
      state.message += ' Opponent folds to your all-in!';
      checkMatchEnd(state);
    }
  }

  if (state.won) reward += 500;
  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  return (
    state.playerChips * 10 +
    state.handsWon * 100 +
    (state.won ? 2000 : 0) -
    state.totalActions
  );
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    STARTING_STACK,
    SMALL_BLIND,
    BIG_BLIND,
    BET_SIZE,
    MAX_TOTAL_ACTIONS,
    MAX_CHIPS_TARGET,
    createState,
    legalActions,
    step,
    isOver,
    score,
    evaluate5Cards,
    evaluateBest5Of7
  };
}
