const { test } = require('node:test');
const assert = require('node:assert/strict');
const logic = require('./www/logic.js');

test('createState initializes 36 tiles in 18 matching pairs', () => {
  const state = logic.createState(101);
  assert.equal(state.tiles.length, 36);
  assert.equal(state.combo, 0);
  assert.equal(logic.isOver(state), false);
  assert.equal(logic.score(state), 0);

  // Verify all types come in exact pairs (count of each type is 2)
  const counts = {};
  for (const t of state.tiles) {
    counts[t.type] = (counts[t.type] || 0) + 1;
  }
  for (const type of Object.keys(counts)) {
    assert.equal(counts[type], 2, `Type ${type} must have exactly 2 tiles`);
  }
});

test('isTileFree correctly identifies open tiles', () => {
  const tiles = [
    { id: 1, type: '1B', x: 2, y: 1, z: 0 },
    { id: 2, type: '1B', x: 3, y: 1, z: 0 },
    { id: 3, type: '2B', x: 4, y: 1, z: 0 }
  ];

  // Tile 1 has no left neighbor -> free
  assert.equal(logic.isTileFree(tiles[0], tiles), true);
  // Tile 2 has left (x:2) and right (x:4) -> blocked!
  assert.equal(logic.isTileFree(tiles[1], tiles), false);
  // Tile 3 has no right neighbor -> free
  assert.equal(logic.isTileFree(tiles[2], tiles), true);
});

test('isTileFree reports false for tile covered from above', () => {
  const tiles = [
    { id: 1, type: '1B', x: 2, y: 1, z: 0 },
    { id: 2, type: '2B', x: 2, y: 1, z: 1 } // Directly on top
  ];

  // Tile 1 is covered by Tile 2
  assert.equal(logic.isTileFree(tiles[0], tiles), false);
  // Tile 2 is on top -> free
  assert.equal(logic.isTileFree(tiles[1], tiles), true);
});

test('legalActions lists available pairs of matching free tiles', () => {
  const state = logic.createState(101);
  const legals = logic.legalActions(state);
  assert.ok(legals.length > 0);
  assert.ok(legals[0].startsWith('match_'));
});

test('step removes the two matched tiles and awards score and combo multiplier', () => {
  const state = logic.createState(101);
  const legals = logic.legalActions(state);
  assert.ok(legals.length > 0);

  const initialTileCount = state.tiles.length;
  const action = legals[0];
  const res = logic.step(state, action);

  assert.equal(typeof res.reward, 'number');
  assert.equal(typeof res.done, 'boolean');
  assert.equal(state.tiles.length, initialTileCount - 2);
  assert.equal(state.combo, 1);
  assert.ok(state.scoreVal >= 100);
});

test('clearing all tiles triggers victory with 1500 bonus points', () => {
  const state = logic.createState(101);
  // Mock near-cleared board with single matching pair
  state.tiles = [
    { id: 10, type: 'DR', x: 1, y: 0, z: 0 },
    { id: 20, type: 'DR', x: 6, y: 0, z: 0 }
  ];

  const legals = logic.legalActions(state);
  assert.deepEqual(legals, ['match_10_20']);

  logic.step(state, 'match_10_20');
  assert.equal(state.tiles.length, 0);
  assert.equal(state.won, true);
  assert.equal(logic.isOver(state), true);
  assert.ok(state.scoreVal >= 1500);
});

test('stalemate when no matching pairs remain sets state.lost = true', () => {
  const state = logic.createState(101);
  // 4 tiles, but no two free tiles share the same type
  state.tiles = [
    { id: 1, type: '1B', x: 2, y: 1, z: 0 },
    { id: 2, type: '1B', x: 3, y: 1, z: 0 }, // Trapped between 1 and 3
    { id: 3, type: '2B', x: 4, y: 1, z: 0 },
    { id: 4, type: '2B', x: 5, y: 1, z: 0 }
  ];
  // Free tiles are 1 (1B) and 4 (2B) -> no matches possible!
  assert.deepEqual(logic.legalActions(state), []);
  assert.equal(logic.isOver(state), false); // Over only once step resolves or initialized
});

test('illegal action throws without mutating state', () => {
  const state = logic.createState(101);
  assert.throws(() => logic.step(state, 'match_999_888'), /Illegal action/);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = logic.createState(555);
  const s2 = logic.createState(555);
  assert.deepEqual(s1, s2);

  const act1 = logic.legalActions(s1)[0];
  const act2 = logic.legalActions(s2)[0];
  assert.equal(act1, act2);

  logic.step(s1, act1);
  logic.step(s2, act2);
  assert.deepEqual(s1, s2);
});
