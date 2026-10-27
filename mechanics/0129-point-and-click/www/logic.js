// Logic for 0129-point-and-click: Blackwood Manor
// Pure Bot Contract implementation. Zero UI or platform dependencies.

const MAX_TURNS = 150;

function nextRng(state) {
  state.rngState = (Math.imul(state.rngState, 1664525) + 1013904223) >>> 0;
  return state.rngState / 4294967296;
}

function createState(seed = 1) {
  let rngVal = (Math.floor(seed) >>> 0) || 4829104;

  return {
    seed,
    rngState: rngVal,
    currentRoom: 'foyer',
    turns: 0,
    maxTurns: MAX_TURNS,
    score: 0,
    done: false,
    victory: false,
    inventory: [], // e.g. 'brass_key', 'clock_crank', 'empty_flask', 'acid_flask', 'golden_astrolabe'
    world: {
      coat_inspected: false,
      key_taken: false,
      study_unlocked: false,
      butler_questioned: false,
      desk_inspected: false,
      crank_taken: false,
      shelf_inspected: false,
      flask_taken: false,
      safe_inspected: false,
      safe_opened: false,
      astrolabe_taken: false,
      clock_wound: false,
      astrolabe_placed: false
    },
    combatLog: ['You cross the threshold into Blackwood Manor. Rain lashes the glass.']
  };
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];
  const room = state.currentRoom;
  const w = state.world;
  const inv = state.inventory;

  if (room === 'foyer') {
    actions.push('look:grandfather_clock');
    actions.push('look:coat_rack');
    actions.push('look:study_door');

    if (w.coat_inspected && !w.key_taken && !inv.includes('brass_key')) {
      actions.push('pickup:brass_key');
    }

    if (inv.includes('brass_key') && !w.study_unlocked) {
      actions.push('use_item:brass_key:study_door');
    }

    if (inv.includes('clock_crank') && !w.clock_wound) {
      actions.push('use_item:clock_crank:grandfather_clock');
    }

    if (w.study_unlocked) {
      actions.push('go:study');
    }

    if (w.clock_wound) {
      actions.push('go:observatory');
    }
  } else if (room === 'study') {
    actions.push('look:butler');
    actions.push('look:desk');
    actions.push('look:bookshelf');
    actions.push('talk:butler');

    if (w.desk_inspected && !w.crank_taken && !inv.includes('clock_crank')) {
      actions.push('pickup:clock_crank');
    }

    if (w.shelf_inspected && !w.flask_taken && !inv.includes('empty_flask') && !inv.includes('acid_flask')) {
      actions.push('pickup:empty_flask');
    }

    actions.push('go:foyer');

    if (w.butler_questioned) {
      actions.push('go:laboratory');
    }
  } else if (room === 'laboratory') {
    actions.push('look:alchemy_still');
    actions.push('look:acid_vat');
    actions.push('look:iron_safe');

    if (inv.includes('empty_flask')) {
      actions.push('use_item:empty_flask:acid_vat');
    }

    if (inv.includes('acid_flask') && !w.safe_opened) {
      actions.push('use_item:acid_flask:iron_safe');
    }

    if (w.safe_opened && !w.astrolabe_taken && !inv.includes('golden_astrolabe')) {
      actions.push('pickup:golden_astrolabe');
    }

    actions.push('go:study');
  } else if (room === 'observatory') {
    actions.push('look:celestial_oculus');
    actions.push('look:telescope');

    if (inv.includes('golden_astrolabe') && !w.astrolabe_placed) {
      actions.push('use_item:golden_astrolabe:celestial_oculus');
    }

    actions.push('go:foyer');
  }

  return actions;
}

function resolveAction(state, action) {
  const w = state.world;
  const inv = state.inventory;

  if (action.startsWith('look:')) {
    const target = action.split(':')[1];
    state.score += 10;

    if (target === 'coat_rack') {
      w.coat_inspected = true;
      state.combatLog.push('You search the drenched trenchcoat and feel a heavy brass key in the pocket.');
    } else if (target === 'grandfather_clock') {
      state.combatLog.push('An ominous pendulum clock. The winding crank mechanism is missing.');
    } else if (target === 'study_door') {
      state.combatLog.push(w.study_unlocked ? 'The study door stands ajar.' : 'A solid mahogany door with a sturdy brass keyhole.');
    } else if (target === 'butler') {
      state.combatLog.push('The elderly butler slumbers deeply in the armchair, clutching a pocket watch.');
    } else if (target === 'desk') {
      w.desk_inspected = true;
      state.combatLog.push('A roll-top desk littered with celestial charts. A brass clock crank rests in the tray.');
    } else if (target === 'bookshelf') {
      w.shelf_inspected = true;
      state.combatLog.push('Rows of ancient leather-bound grimoires. An empty chemical flask sits on the middle shelf.');
    } else if (target === 'alchemy_still') {
      state.combatLog.push('Glass tubing and condensers used to distill volatile reagents.');
    } else if (target === 'acid_vat') {
      state.combatLog.push('A heavy lead vat containing highly concentrated aqua regia acid.');
    } else if (target === 'iron_safe') {
      w.safe_inspected = true;
      state.combatLog.push(w.safe_opened ? 'The safe door hangs dissolved on melted hinges.' : 'A reinforced steel safe. The mechanical dial is completely rusted shut.');
    } else if (target === 'celestial_oculus') {
      state.combatLog.push('A colossal brass apparatus aligned with the heavens. A central astrolabe socket is vacant.');
    } else if (target === 'telescope') {
      state.combatLog.push('A Victorian brass telescope pointing toward the Constellation of Orion.');
    } else {
      state.combatLog.push(`You examine ${target}. Nothing unusual.`);
    }
  } else if (action.startsWith('pickup:')) {
    const item = action.split(':')[1];

    if (item === 'brass_key' && w.coat_inspected && !w.key_taken) {
      w.key_taken = true;
      inv.push('brass_key');
      state.score += 100;
      state.combatLog.push('Acquired Brass Key.');
    } else if (item === 'clock_crank' && w.desk_inspected && !w.crank_taken) {
      w.crank_taken = true;
      inv.push('clock_crank');
      state.score += 100;
      state.combatLog.push('Acquired Clock Crank.');
    } else if (item === 'empty_flask' && w.shelf_inspected && !w.flask_taken) {
      w.flask_taken = true;
      inv.push('empty_flask');
      state.score += 100;
      state.combatLog.push('Acquired Empty Glass Flask.');
    } else if (item === 'golden_astrolabe' && w.safe_opened && !w.astrolabe_taken) {
      w.astrolabe_taken = true;
      inv.push('golden_astrolabe');
      state.score += 300;
      state.combatLog.push('Acquired the fabled Golden Astrolabe!');
    } else {
      throw new Error(`Cannot pickup: ${action}`);
    }
  } else if (action === 'talk:butler') {
    w.butler_questioned = true;
    state.score += 150;
    state.combatLog.push('The butler stirs: "Master hid the laboratory beneath the rug... wind the clock at midnight..."');
  } else if (action.startsWith('use_item:')) {
    const parts = action.split(':');
    const item = parts[1];
    const target = parts[2];

    if (item === 'brass_key' && target === 'study_door') {
      w.study_unlocked = true;
      state.score += 200;
      state.combatLog.push('You turn the Brass Key. The heavy study door clicks open!');
    } else if (item === 'empty_flask' && target === 'acid_vat') {
      const idx = inv.indexOf('empty_flask');
      if (idx !== -1) inv.splice(idx, 1);
      inv.push('acid_flask');
      state.score += 200;
      state.combatLog.push('You siphon aqua regia into the flask, creating a Vial of Acid.');
    } else if (item === 'acid_flask' && target === 'iron_safe') {
      const idx = inv.indexOf('acid_flask');
      if (idx !== -1) inv.splice(idx, 1);
      w.safe_opened = true;
      state.score += 250;
      state.combatLog.push('The acid hisses and dissolves the rusted lock! The safe creaks open, revealing the Golden Astrolabe.');
    } else if (item === 'clock_crank' && target === 'grandfather_clock') {
      w.clock_wound = true;
      state.score += 250;
      state.combatLog.push('You wind the crank three times. The grandfather clock swings outward, revealing a spiral staircase!');
    } else if (item === 'golden_astrolabe' && target === 'celestial_oculus') {
      w.astrolabe_placed = true;
      state.done = true;
      state.victory = true;
      state.score += 3000 + Math.max(0, 150 - state.turns) * 10;
      state.combatLog.push('VICTORY! The Golden Astrolabe locks into place. Celestial starlight illuminates the manor, lifting the curse!');
    } else {
      throw new Error(`Invalid use_item: ${action}`);
    }
  } else if (action.startsWith('go:')) {
    const dest = action.split(':')[1];
    state.currentRoom = dest;
    state.combatLog.push(`Moved to the ${dest.toUpperCase()}.`);
  } else {
    throw new Error(`Unknown action: ${action}`);
  }
}

function checkOutcome(state) {
  if (state.turns >= state.maxTurns && !state.done) {
    state.done = true;
    state.victory = false;
    state.combatLog.push('DEFEAT! Dawn breaks without the astrolabe. The spectral fog engulfs you forever.');
  }
}

function step(state, action) {
  const legals = legalActions(state);
  if (!legals.includes(action)) {
    throw new Error(`Illegal action: ${action}`);
  }

  state.turns += 1;
  resolveAction(state, action);
  checkOutcome(state);

  const reward = state.done ? (state.victory ? 1.0 : 0.0) : 0.0;
  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  return state.score;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score
  };
}
