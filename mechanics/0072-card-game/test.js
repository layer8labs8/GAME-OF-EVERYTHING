const test = require('node:test');
const assert = require('node:assert/strict');
const {
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
} = require('./www/logic.js');

test('createState initializes round 1 with 5 cards each and starter card', () => {
  const s = createState(42);
  assert.equal(s.round, 1);
  assert.equal(s.playerHand.length, 5);
  assert.equal(s.opponentHand.length, 5);
  assert.ok(s.topCard);
  assert.equal(s.activeSuit, s.topCard.suit);
  assert.equal(s.done, false);
  assert.equal(s.won, false);
});

test('legalActions includes matching cards and wild 8s', () => {
  const s = createState(100);
  const actions = legalActions(s);
  assert.ok(actions.length > 0);

  // If hand has an 8, it must offer 4 suit declarations
  const hasEight = s.playerHand.some(c => c.rank === '8');
  if (hasEight) {
    const eightCard = s.playerHand.find(c => c.rank === '8');
    assert.ok(actions.includes(`play:${eightCard.id},S`));
    assert.ok(actions.includes(`play:${eightCard.id},H`));
  }
});

test('playing a valid card removes it from hand and updates discard', () => {
  const s = createState(42);
  const playAction = legalActions(s).find(a => a.startsWith('play:'));
  assert.ok(playAction, 'Should have at least one playable action or draw');

  const cardId = playAction.slice(5).split(',')[0];
  const initialHandLen = s.playerHand.length;

  step(s, playAction);

  assert.ok(!s.playerHand.some(c => c.id === cardId));
  assert.equal(s.turnCount, 1);
});

test('playing wild 8 sets declared active suit', () => {
  const s = createState(42);
  // Inject an 8 into player hand to test
  s.playerHand.push({ id: '8H', rank: '8', suit: 'H' });
  const act = 'play:8H,S';
  assert.ok(legalActions(s).includes(act));

  step(s, act);
  assert.equal(s.activeSuit, 'S');
});

test('playing a 2 forces opponent to draw 2 cards', () => {
  const s = createState(42);
  // Give player a 2 and another card so round does not end immediately
  s.playerHand = [
    { id: '2' + s.activeSuit, rank: '2', suit: s.activeSuit },
    { id: '9' + s.activeSuit, rank: '9', suit: s.activeSuit }
  ];
  const oppInitialLen = s.opponentHand.length;

  step(s, 'play:2' + s.activeSuit);
  // Opponent drew 2 penalty cards, then may have played 1 or passed
  // Net opponent cards should be at least initial + 1
  assert.ok(s.opponentHand.length >= oppInitialLen + 1);
});

test('playing Queen skips opponent and lets player go again', () => {
  const s = createState(42);
  // Give player Queen and another matching card
  s.playerHand = [
    { id: 'Q' + s.activeSuit, rank: 'Q', suit: s.activeSuit },
    { id: '7' + s.activeSuit, rank: '7', suit: s.activeSuit }
  ];
  const oppHandLen = s.opponentHand.length;

  step(s, 'play:Q' + s.activeSuit);
  // Opponent turn was skipped entirely
  assert.equal(s.opponentHand.length, oppHandLen);
  assert.equal(s.playerHand.length, 1);
  assert.equal(s.playerHand[0].id, '7' + s.activeSuit);
});

test('draw adds card to player hand and enables pass', () => {
  const s = createState(999);
  // Ensure no playable cards
  s.playerHand = [{ id: '2S', rank: '2', suit: 'S' }];
  s.topCard = { id: 'KH', rank: 'K', suit: 'H' };
  s.activeSuit = 'H';

  assert.ok(legalActions(s).includes('draw'));
  step(s, 'draw');

  assert.equal(s.playerHand.length, 2);
  assert.equal(s.playerDrawnThisTurn, true);
  assert.ok(legalActions(s).includes('pass'));
});

test('illegal action throws error', () => {
  const s = createState(42);
  assert.throws(() => {
    step(s, 'play:INVALID_CARD');
  }, /Illegal action/);
});

test('shedding all cards wins round and awards points', () => {
  const s = createState(42);
  // Set player hand to 1 winning card
  const winningCard = { id: '9' + s.activeSuit, rank: '9', suit: s.activeSuit };
  s.playerHand = [winningCard];

  step(s, 'play:' + winningCard.id);

  assert.equal(s.playerRoundsWon, 1);
  assert.ok(s.playerScore > 0);
});

test('reaching turn limit ends match', () => {
  const s = createState(123);
  s.turnCount = MAX_TURNS - 1;
  const act = legalActions(s)[0];
  step(s, act);

  assert.equal(s.done, true);
  assert.ok(isOver(s));
});

test('state is deterministic across same seed', () => {
  const s1 = createState(888);
  const s2 = createState(888);
  assert.deepEqual(s1, s2);

  const a1 = legalActions(s1)[0];
  step(s1, a1);
  step(s2, a1);
  assert.deepEqual(s1, s2);
});
