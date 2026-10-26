(function (root) {
  'use strict';

  const MAX_STEPS = 500;
  const SUITS = ['S', 'H', 'D', 'C'];

  function nextRandom(state) {
    state.rng = ((state.rng * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    return state.rng / 0x7fffffff;
  }

  function getColor(suit) {
    return suit === 'H' || suit === 'D' ? 'red' : 'black';
  }

  function shuffle(arr, state) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(nextRandom(state) * (i + 1));
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
  }

  function createState(seed = 12345) {
    const curRng = (seed >>> 0) || 1;

    const deck = [];
    for (let s = 0; s < SUITS.length; s++) {
      for (let v = 1; v <= 13; v++) {
        deck.push({ suit: SUITS[s], value: v, faceUp: false });
      }
    }

    const state = {
      stock: [],
      waste: [],
      foundations: { S: 0, H: 0, D: 0, C: 0 },
      tableau: [[], [], [], [], [], [], []],
      cardsInFoundation: 0,
      stepCount: 0,
      points: 0,
      won: false,
      rng: curRng,
    };

    shuffle(deck, state);

    // Deal to 7 tableau columns
    for (let col = 0; col < 7; col++) {
      for (let i = 0; i <= col; i++) {
        const card = deck.pop();
        if (i === col) {
          card.faceUp = true;
        }
        state.tableau[col].push(card);
      }
    }

    state.stock = deck;
    return state;
  }

  function hasBasicTermination(state) {
    return state.cardsInFoundation === 52 || state.won || state.stepCount >= MAX_STEPS;
  }

  function isOver(state) {
    if (hasBasicTermination(state)) return true;
    return legalActions(state).length === 0;
  }

  function revealTopTableau(state, col) {
    const column = state.tableau[col];
    if (column.length > 0 && !column[column.length - 1].faceUp) {
      column[column.length - 1].faceUp = true;
      state.points += 25;
      return true;
    }
    return false;
  }

  function legalActions(state) {
    if (hasBasicTermination(state)) return [];

    const actions = [];

    // 1. Draw action
    if (state.stock.length > 0 || state.waste.length > 0) {
      actions.push({ type: 'draw' });
    }

    // 2. Waste to Foundation
    if (state.waste.length > 0) {
      const topWaste = state.waste[state.waste.length - 1];
      if (topWaste.value === state.foundations[topWaste.suit] + 1) {
        actions.push({ type: 'waste_to_foundation' });
      }

      // 3. Waste to Tableau
      for (let c = 0; c < 7; c++) {
        const col = state.tableau[c];
        if (col.length === 0) {
          if (topWaste.value === 13) {
            actions.push({ type: 'waste_to_tableau', col: c });
          }
        } else {
          const topCol = col[col.length - 1];
          if (
            topCol.faceUp &&
            getColor(topCol.suit) !== getColor(topWaste.suit) &&
            topCol.value === topWaste.value + 1
          ) {
            actions.push({ type: 'waste_to_tableau', col: c });
          }
        }
      }
    }

    // 4. Tableau to Foundation
    for (let c = 0; c < 7; c++) {
      const col = state.tableau[c];
      if (col.length > 0) {
        const topCard = col[col.length - 1];
        if (topCard.faceUp && topCard.value === state.foundations[topCard.suit] + 1) {
          actions.push({ type: 'tableau_to_foundation', col: c });
        }
      }
    }

    // 5. Tableau to Tableau
    for (let fromC = 0; fromC < 7; fromC++) {
      const fromCol = state.tableau[fromC];
      for (let i = 0; i < fromCol.length; i++) {
        const card = fromCol[i];
        if (!card.faceUp) continue;

        for (let toC = 0; toC < 7; toC++) {
          if (toC === fromC) continue;
          const toCol = state.tableau[toC];

          if (toCol.length === 0) {
            // Only King can move to empty column; avoid moving a King that is already alone
            if (card.value === 13 && i > 0) {
              actions.push({ type: 'tableau_to_tableau', fromCol: fromC, cardIndex: i, toCol: toC });
            }
          } else {
            const topTo = toCol[toCol.length - 1];
            if (
              topTo.faceUp &&
              getColor(topTo.suit) !== getColor(card.suit) &&
              topTo.value === card.value + 1
            ) {
              actions.push({ type: 'tableau_to_tableau', fromCol: fromC, cardIndex: i, toCol: toC });
            }
          }
        }
      }
    }

    return actions;
  }

  function step(state, action) {
    if (!action || typeof action.type !== 'string') {
      throw new Error('Invalid action');
    }
    if (isOver(state)) {
      throw new Error('Game is already over');
    }

    let reward = 0;

    switch (action.type) {
      case 'draw': {
        if (state.stock.length > 0) {
          const card = state.stock.pop();
          card.faceUp = true;
          state.waste.push(card);
          reward = 1;
        } else if (state.waste.length > 0) {
          // Recycle waste to stock
          while (state.waste.length > 0) {
            const card = state.waste.pop();
            card.faceUp = false;
            state.stock.push(card);
          }
          reward = 0;
        } else {
          throw new Error('No cards in stock or waste to draw');
        }
        break;
      }

      case 'waste_to_foundation': {
        if (state.waste.length === 0) throw new Error('Waste is empty');
        const card = state.waste[state.waste.length - 1];
        if (card.value !== state.foundations[card.suit] + 1) {
          throw new Error('Cannot place card onto foundation');
        }
        state.waste.pop();
        state.foundations[card.suit] += 1;
        state.cardsInFoundation += 1;
        state.points += 15;
        reward = 20;
        break;
      }

      case 'waste_to_tableau': {
        const toC = action.col;
        if (toC === undefined || toC < 0 || toC >= 7) throw new Error('Invalid tableau column');
        if (state.waste.length === 0) throw new Error('Waste is empty');

        const card = state.waste[state.waste.length - 1];
        const dest = state.tableau[toC];

        if (dest.length === 0) {
          if (card.value !== 13) throw new Error('Only Kings can be placed on empty tableau column');
        } else {
          const top = dest[dest.length - 1];
          if (!top.faceUp || getColor(top.suit) === getColor(card.suit) || top.value !== card.value + 1) {
            throw new Error('Illegal card placement on tableau');
          }
        }

        state.waste.pop();
        dest.push(card);
        state.points += 5;
        reward = 8;
        break;
      }

      case 'tableau_to_foundation': {
        const fromC = action.col;
        if (fromC === undefined || fromC < 0 || fromC >= 7) throw new Error('Invalid tableau column');
        const col = state.tableau[fromC];
        if (col.length === 0) throw new Error('Tableau column is empty');

        const card = col[col.length - 1];
        if (!card.faceUp || card.value !== state.foundations[card.suit] + 1) {
          throw new Error('Cannot place card onto foundation');
        }

        col.pop();
        state.foundations[card.suit] += 1;
        state.cardsInFoundation += 1;
        state.points += 15;
        revealTopTableau(state, fromC);
        reward = 20;
        break;
      }

      case 'tableau_to_tableau': {
        const fromC = action.fromCol;
        const toC = action.toCol;
        const idx = action.cardIndex;

        if (fromC === undefined || fromC < 0 || fromC >= 7) throw new Error('Invalid fromCol');
        if (toC === undefined || toC < 0 || toC >= 7 || toC === fromC) throw new Error('Invalid toCol');

        const src = state.tableau[fromC];
        if (idx === undefined || idx < 0 || idx >= src.length) throw new Error('Invalid cardIndex');

        const card = src[idx];
        if (!card.faceUp) throw new Error('Cannot move face-down card');

        const dest = state.tableau[toC];
        if (dest.length === 0) {
          if (card.value !== 13) throw new Error('Only King can be placed on empty column');
        } else {
          const top = dest[dest.length - 1];
          if (!top.faceUp || getColor(top.suit) === getColor(card.suit) || top.value !== card.value + 1) {
            throw new Error('Illegal card placement on tableau');
          }
        }

        const movingStack = src.splice(idx);
        dest.push(...movingStack);
        revealTopTableau(state, fromC);
        reward = 10;
        break;
      }

      default:
        throw new Error('Unknown action type: ' + action.type);
    }

    if (state.cardsInFoundation === 52) {
      state.won = true;
      reward += 500;
    }

    state.stepCount += 1;
    return { reward, done: isOver(state) };
  }

  function score(state) {
    const timeBonus = Math.max(0, MAX_STEPS - state.stepCount);
    return (state.won ? 1000 : 0) + state.cardsInFoundation * 20 + state.points + timeBonus;
  }

  const api = {
    MAX_STEPS,
    SUITS,
    getColor,
    createState,
    legalActions,
    step,
    isOver,
    score,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.GameLogic = api;
  }
})(typeof self !== 'undefined' ? self : globalThis);
