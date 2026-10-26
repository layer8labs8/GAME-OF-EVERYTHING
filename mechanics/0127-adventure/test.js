const test = require('node:test');
const assert = require('node:assert/strict');
const { createState, legalActions, step, isOver, score } = require('./www/logic.js');

test('createState initializes player on Shore with empty inventory', () => {
  const s = createState(1234);
  assert.equal(s.currentRoom, 'shore');
  assert.equal(s.inventory.length, 0);
  assert.ok(s.roomItems.shore.includes('rusty_key'));
  assert.equal(isOver(s), false);
});

test('go action transitions player to adjacent room', () => {
  const s = createState(1234);
  const res = step(s, { type: 'go', room: 'jungle' });
  assert.equal(res.reward, 2);
  assert.equal(s.currentRoom, 'jungle');
});

test('take action collects item into inventory', () => {
  const s = createState(1234);
  const res = step(s, { type: 'take', item: 'rusty_key' });
  assert.equal(res.reward, 10);
  assert.ok(s.inventory.includes('rusty_key'));
  assert.equal(s.roomItems.shore.includes('rusty_key'), false);
});

test('inspecting fixture returns lore description', () => {
  const s = createState(1234);
  const res = step(s, { type: 'inspect', target: 'shipwreck_chest' });
  assert.equal(res.reward, 1);
  assert.ok(s.lastMessage.includes('keyhole'));
});

test('talking to sailor gives quest advice', () => {
  const s = createState(1234);
  const res = step(s, { type: 'talk', npc: 'stranded_sailor' });
  assert.equal(res.reward, 5);
  assert.equal(s.flags.talkedSailor, true);
});

test('using rusty_key on chest spawns moon_lens', () => {
  const s = createState(1234);
  step(s, { type: 'take', item: 'rusty_key' });

  const res = step(s, { type: 'use', item: 'rusty_key', target: 'shipwreck_chest' });
  assert.equal(res.reward, 35);
  assert.equal(s.flags.chestUnlocked, true);
  assert.ok(s.roomItems.shore.includes('moon_lens'));
});

test('feeding monkey in jungle grants sun_stone', () => {
  const s = createState(1234);
  step(s, { type: 'go', room: 'jungle' });
  step(s, { type: 'take', item: 'tropical_fruit' });

  const res = step(s, { type: 'use', item: 'tropical_fruit', target: 'monkey' });
  assert.equal(res.reward, 35);
  assert.equal(s.flags.monkeyFed, true);
  assert.ok(s.inventory.includes('sun_stone'));
});

test('full quest sequence leads to beacon lighting and victory', () => {
  const s = createState(1234);

  // 1. Shore: key & unlock chest
  step(s, { type: 'take', item: 'rusty_key' });
  step(s, { type: 'use', item: 'rusty_key', target: 'shipwreck_chest' });
  step(s, { type: 'take', item: 'moon_lens' });

  // 2. Jungle: fruit & feed monkey
  step(s, { type: 'go', room: 'jungle' });
  step(s, { type: 'take', item: 'tropical_fruit' });
  step(s, { type: 'use', item: 'tropical_fruit', target: 'monkey' });

  // 3. Ruins: flint & activate altar
  step(s, { type: 'go', room: 'ruins' });
  step(s, { type: 'take', item: 'flint' });
  step(s, { type: 'use', item: 'sun_stone', target: 'temple_altar' });

  // 4. Caves: get kindling
  step(s, { type: 'go', room: 'caves' });
  step(s, { type: 'take', item: 'dry_kindling' });

  // 5. Cliff: install lens & light beacon
  step(s, { type: 'go', room: 'ruins' });
  step(s, { type: 'go', room: 'jungle' });
  step(s, { type: 'go', room: 'shore' });
  step(s, { type: 'go', room: 'cliff' });

  step(s, { type: 'use', item: 'moon_lens', target: 'lighthouse_beacon' });
  const res = step(s, { type: 'use', item: 'flint', target: 'lighthouse_beacon' });

  assert.equal(res.done, true);
  assert.equal(s.won, true);
  assert.ok(score(s) > 1000);
});

test('illegal action throws without mutating state', () => {
  const s = createState(1234);
  const snapshot = JSON.stringify(s);

  assert.throws(() => {
    step(s, { type: 'go', room: 'caves' }); // not adjacent from shore
  });

  assert.equal(JSON.stringify(s), snapshot);
});

test('same seed and actions produce strictly deterministic state', () => {
  const s1 = createState(9999);
  const s2 = createState(9999);

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
