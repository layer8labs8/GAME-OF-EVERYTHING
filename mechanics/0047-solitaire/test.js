const test = require('node:test');
const assert = require('node:assert/strict');
const { createState, legalActions, step, isOver, score, SUITS, getColor } = require('./www/logic.js');

test('createState initializes 7 tableau columns with 28 cards and 24 in stock', () => {
  const s = createState(111);
  assert.equal(s.tableau.length, 7);
  let tableauCards = 0;
  for (let c = 0; c < 7; c++) {
    tableauCards += s.tableau[c].length;
    assert.equal(s.tableau[c][c].faceUp, true); // Top card face-up
  }
  assert.equal(tableauCards, 28);
  assert.equal(s.stock.length, 24);
  assert.equal(s.waste.length, 0);
  assert.equal(s.cardsInFoundation, 0);
  assert.equal(isOver(s), false);
});

test('draw moves top card from stock to waste and marks faceUp', () => {
  const s = createState(111);
  const prevStock = s.stock.length;

  const res = step(s, { type: 'draw' });
  assert.equal(res.reward, 1);
  assert.equal(s.stock.length, prevStock - 1);
  assert.equal(s.waste.length, 1);
  assert.equal(s.waste[0].faceUp, true);
});

test('drawing when stock is empty recycles waste cards into stock', () => {
  const s = createState(111);
  s.stock = [];
  s.waste = [{ suit: 'H', value: 5, faceUp: true }, { suit: 'S', value: 9, faceUp: true }];

  step(s, { type: 'draw' });
  assert.equal(s.waste.length, 0);
  assert.equal(s.stock.length, 2);
  assert.equal(s.stock[0].faceUp, false);
});

test('moving Ace to foundation succeeds and increments foundation count', () => {
  const s = createState(111);
  s.waste = [{ suit: 'S', value: 1, faceUp: true }]; // Ace of Spades

  const res = step(s, { type: 'waste_to_foundation' });
  assert.equal(res.reward, 20);
  assert.equal(s.foundations.S, 1);
  assert.equal(s.cardsInFoundation, 1);
  assert.equal(s.waste.length, 0);
});

test('waste to tableau validates descending rank and alternating color', () => {
  const s = createState(111);
  s.tableau[0] = [{ suit: 'S', value: 8, faceUp: true }]; // Black 8
  s.waste = [{ suit: 'H', value: 7, faceUp: true }]; // Red 7

  const res = step(s, { type: 'waste_to_tableau', col: 0 });
  assert.equal(res.reward, 8);
  assert.equal(s.tableau[0].length, 2);
  assert.equal(s.tableau[0][1].value, 7);
  assert.equal(s.waste.length, 0);
});

test('king can be placed onto empty tableau column', () => {
  const s = createState(111);
  s.tableau[0] = []; // Empty
  s.waste = [{ suit: 'D', value: 13, faceUp: true }]; // King of Diamonds

  step(s, { type: 'waste_to_tableau', col: 0 });
  assert.equal(s.tableau[0].length, 1);
  assert.equal(s.tableau[0][0].value, 13);
});

test('tableau to tableau transfers card stack and flips newly exposed card', () => {
  const s = createState(111);
  s.tableau[0] = [
    { suit: 'C', value: 10, faceUp: false },
    { suit: 'H', value: 4, faceUp: true },
  ];
  s.tableau[1] = [
    { suit: 'S', value: 5, faceUp: true },
  ];

  step(s, { type: 'tableau_to_tableau', fromCol: 0, cardIndex: 1, toCol: 1 });
  assert.equal(s.tableau[1].length, 2);
  assert.equal(s.tableau[1][1].value, 4);
  assert.equal(s.tableau[0].length, 1);
  assert.equal(s.tableau[0][0].faceUp, true); // Newly exposed card flipped!
});

test('placing all 52 cards in foundations triggers victory', () => {
  const s = createState(111);
  s.foundations = { S: 13, H: 13, D: 13, C: 12 };
  s.cardsInFoundation = 51;
  s.waste = [{ suit: 'C', value: 13, faceUp: true }];

  const res = step(s, { type: 'waste_to_foundation' });
  assert.equal(res.done, true);
  assert.equal(s.won, true);
  assert.equal(s.cardsInFoundation, 52);
  assert.ok(score(s) >= 1000);
});

test('illegal move throws without mutating state', () => {
  const s = createState(111);
  s.waste = [{ suit: 'S', value: 5, faceUp: true }];
  const snapshot = JSON.stringify(s);

  assert.throws(() => {
    step(s, { type: 'waste_to_foundation' }); // Cannot put 5 on empty foundation (needs Ace)
  });

  assert.equal(JSON.stringify(s), snapshot);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(8421);
  const s2 = createState(8421);

  for (let i = 0; i < 20; i++) {
    const a1 = legalActions(s1);
    const a2 = legalActions(s2);
    assert.deepEqual(a1, a2);
    if (a1.length === 0) break;

    const chosen = a1[i % a1.length];
    step(s1, chosen);
    step(s2, chosen);
    assert.deepEqual(s1, s2);
  }
});
