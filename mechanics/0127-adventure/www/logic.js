(function (root) {
  'use strict';

  const MAX_STEPS = 150;

  const ROOM_DATA = {
    shore: {
      name: 'Shipwreck Shore',
      exits: ['jungle', 'cliff'],
      fixtures: ['shipwreck_chest', 'stranded_sailor'],
      initialItems: ['rusty_key'],
    },
    jungle: {
      name: 'Emerald Jungle',
      exits: ['shore', 'ruins'],
      fixtures: ['monkey', 'fruit_tree'],
      initialItems: ['tropical_fruit'],
    },
    ruins: {
      name: 'Sun Temple Ruins',
      exits: ['jungle', 'caves'],
      fixtures: ['temple_altar', 'ancient_inscription'],
      initialItems: ['flint'],
    },
    caves: {
      name: 'Crystal Grotto',
      exits: ['ruins'],
      fixtures: ['glowing_moss', 'underground_stream'],
      initialItems: ['dry_kindling'],
    },
    cliff: {
      name: 'Lighthouse Cliff',
      exits: ['shore'],
      fixtures: ['lighthouse_beacon', 'signal_pyre'],
      initialItems: [],
    },
  };

  function createState(seed = 12345) {
    const curRng = (seed >>> 0) || 1;

    const roomItems = {};
    for (const r in ROOM_DATA) {
      roomItems[r] = [...ROOM_DATA[r].initialItems];
    }

    return {
      currentRoom: 'shore',
      stepCount: 0,
      inventory: [],
      roomItems,
      flags: {
        talkedSailor: false,
        monkeyFed: false,
        chestUnlocked: false,
        templeOpened: false,
        beaconFixed: false,
        beaconLit: false,
      },
      questsCompleted: 0,
      won: false,
      lastMessage: 'You awaken on the sandy shore beside a battered shipwreck.',
      rng: curRng,
    };
  }

  function isOver(state) {
    return state.won || state.stepCount >= MAX_STEPS;
  }

  function legalActions(state) {
    if (isOver(state)) return [];

    const actions = [];
    const room = state.currentRoom;
    const rdata = ROOM_DATA[room];

    // Navigation
    for (let i = 0; i < rdata.exits.length; i++) {
      actions.push({ type: 'go', room: rdata.exits[i] });
    }

    // Take items on the ground
    const items = state.roomItems[room] || [];
    for (let i = 0; i < items.length; i++) {
      actions.push({ type: 'take', item: items[i] });
    }

    // Inspect fixtures
    for (let i = 0; i < rdata.fixtures.length; i++) {
      actions.push({ type: 'inspect', target: rdata.fixtures[i] });
    }

    // Talk to NPCs
    if (room === 'shore') {
      actions.push({ type: 'talk', npc: 'stranded_sailor' });
    }

    // Item uses on room fixtures
    for (let i = 0; i < state.inventory.length; i++) {
      const item = state.inventory[i];
      if (room === 'shore' && item === 'rusty_key' && !state.flags.chestUnlocked) {
        actions.push({ type: 'use', item: 'rusty_key', target: 'shipwreck_chest' });
      } else if (room === 'jungle' && item === 'tropical_fruit' && !state.flags.monkeyFed) {
        actions.push({ type: 'use', item: 'tropical_fruit', target: 'monkey' });
      } else if (room === 'ruins' && item === 'sun_stone' && !state.flags.templeOpened) {
        actions.push({ type: 'use', item: 'sun_stone', target: 'temple_altar' });
      } else if (room === 'cliff' && item === 'moon_lens' && !state.flags.beaconFixed) {
        actions.push({ type: 'use', item: 'moon_lens', target: 'lighthouse_beacon' });
      } else if (room === 'cliff' && item === 'flint' && state.flags.beaconFixed && !state.flags.beaconLit) {
        actions.push({ type: 'use', item: 'flint', target: 'lighthouse_beacon' });
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
    const rdata = ROOM_DATA[state.currentRoom];

    switch (action.type) {
      case 'go': {
        const dest = action.room;
        if (!dest || !rdata.exits.includes(dest)) {
          throw new Error('Cannot travel to ' + dest);
        }
        state.currentRoom = dest;
        state.lastMessage = 'You arrive at ' + ROOM_DATA[dest].name + '.';
        reward = 2;
        break;
      }

      case 'take': {
        const it = action.item;
        const ground = state.roomItems[state.currentRoom] || [];
        const idx = ground.indexOf(it);
        if (idx === -1) {
          throw new Error('Item not present to take: ' + it);
        }
        ground.splice(idx, 1);
        state.inventory.push(it);
        state.lastMessage = 'Picked up ' + it.replace('_', ' ') + '.';
        reward = 10;
        break;
      }

      case 'inspect': {
        const target = action.target;
        if (!rdata.fixtures.includes(target)) {
          throw new Error('Target not in room: ' + target);
        }
        if (target === 'shipwreck_chest') {
          state.lastMessage = state.flags.chestUnlocked
            ? 'The brass chest lies open and empty.'
            : 'A sturdy iron chest encrusted with barnacles. It has a keyhole.';
        } else if (target === 'monkey') {
          state.lastMessage = state.flags.monkeyFed
            ? 'The monkey munches happily on fruit.'
            : 'A mischievous capuchin monkey clutching a glowing crystalline stone.';
        } else if (target === 'temple_altar') {
          state.lastMessage = state.flags.templeOpened
            ? 'The altar glows with divine solar energy.'
            : 'An ancient obsidian altar carved with solar petroglyphs.';
        } else if (target === 'lighthouse_beacon') {
          state.lastMessage = state.flags.beaconLit
            ? 'The beacon flame roars brightly across the ocean!'
            : state.flags.beaconFixed
            ? 'The glass lens is fitted. You need a spark and dry kindling to light it.'
            : 'A towering lighthouse beacon missing its focused focusing lens.';
        } else {
          state.lastMessage = 'You examine ' + target.replace('_', ' ') + ' closely.';
        }
        reward = 1;
        break;
      }

      case 'talk': {
        if (state.currentRoom !== 'shore' || action.npc !== 'stranded_sailor') {
          throw new Error('Cannot talk to NPC here');
        }
        state.flags.talkedSailor = true;
        if (!state.flags.beaconFixed) {
          state.lastMessage = 'Sailor: "If you fix the cliff beacon lens, a rescue schooner will see us!"';
        } else if (!state.flags.beaconLit) {
          state.lastMessage = 'Sailor: "The lens is set! Spark a fire with flint and dry kindling from the grotto!"';
        } else {
          state.lastMessage = 'Sailor: "The beacon is ablaze! The ship is sailing into the bay!"';
        }
        reward = 5;
        break;
      }

      case 'use': {
        const item = action.item;
        const target = action.target;
        if (!state.inventory.includes(item)) {
          throw new Error('Item not in inventory: ' + item);
        }
        if (!rdata.fixtures.includes(target)) {
          throw new Error('Target fixture not in room: ' + target);
        }

        if (state.currentRoom === 'shore' && item === 'rusty_key' && target === 'shipwreck_chest') {
          if (state.flags.chestUnlocked) throw new Error('Chest already unlocked');
          state.flags.chestUnlocked = true;
          state.questsCompleted += 1;
          state.roomItems.shore.push('moon_lens');
          state.lastMessage = 'The key turns with a click! Inside you find a pristine moon lens!';
          reward = 35;
        } else if (state.currentRoom === 'jungle' && item === 'tropical_fruit' && target === 'monkey') {
          if (state.flags.monkeyFed) throw new Error('Monkey already fed');
          state.flags.monkeyFed = true;
          state.questsCompleted += 1;
          const fIdx = state.inventory.indexOf('tropical_fruit');
          state.inventory.splice(fIdx, 1);
          state.inventory.push('sun_stone');
          state.lastMessage = 'The monkey happily trades the glowing sun stone for your fresh fruit!';
          reward = 35;
        } else if (state.currentRoom === 'ruins' && item === 'sun_stone' && target === 'temple_altar') {
          if (state.flags.templeOpened) throw new Error('Temple already opened');
          state.flags.templeOpened = true;
          state.questsCompleted += 1;
          const sIdx = state.inventory.indexOf('sun_stone');
          state.inventory.splice(sIdx, 1);
          state.inventory.push('golden_idol');
          state.lastMessage = 'The sun stone activates the altar! A sacred golden idol rises into your hands!';
          reward = 50;
        } else if (state.currentRoom === 'cliff' && item === 'moon_lens' && target === 'lighthouse_beacon') {
          if (state.flags.beaconFixed) throw new Error('Beacon already has lens');
          state.flags.beaconFixed = true;
          state.questsCompleted += 1;
          const lIdx = state.inventory.indexOf('moon_lens');
          state.inventory.splice(lIdx, 1);
          state.lastMessage = 'You secure the moon lens onto the lighthouse projector!';
          reward = 40;
        } else if (state.currentRoom === 'cliff' && item === 'flint' && target === 'lighthouse_beacon') {
          if (!state.flags.beaconFixed) throw new Error('Beacon lens not installed yet');
          if (state.flags.beaconLit) throw new Error('Beacon already lit');
          if (!state.inventory.includes('dry_kindling')) {
            state.lastMessage = 'You strike flint, but need dry kindling from the grotto to catch the flame!';
            reward = 0;
            break;
          }
          state.flags.beaconLit = true;
          state.won = true;
          state.questsCompleted += 1;
          state.lastMessage = 'The flame roars to life! A rescue frigate horns in the distance—you are saved!';
          reward = 200;
        } else {
          throw new Error('Cannot use ' + item + ' on ' + target);
        }
        break;
      }

      default:
        throw new Error('Unknown action type: ' + action.type);
    }

    state.stepCount += 1;
    return { reward, done: isOver(state) };
  }

  function score(state) {
    const timeBonus = Math.max(0, MAX_STEPS - state.stepCount) * 5;
    return (state.won ? 1000 : 0) + state.questsCompleted * 200 + state.inventory.length * 50 + timeBonus;
  }

  const api = {
    MAX_STEPS,
    ROOM_DATA,
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
