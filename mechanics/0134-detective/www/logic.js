/**
 * 0134-detective: Murder at Midnight
 * Pure detective deduction game logic conforming strictly to the Bot Contract.
 * No browser globals, seedable PRNG, fully deterministic and serializable.
 */

const MAX_TURNS = 150;

const SUSPECTS = ['lady_sterling', 'prof_hawthorne', 'butler_graves'];

const SUSPECT_NAMES = {
  lady_sterling: 'Lady Evelyn Sterling',
  prof_hawthorne: 'Professor Arthur Hawthorne',
  butler_graves: 'Butler Thomas Graves'
};

const ROOM_TARGETS = {
  study: ['body', 'goblet', 'desk', 'handkerchief'],
  library: ['encyclopedia', 'ledger'],
  conservatory: ['footprints', 'nightshade', 'cellar_key']
};

const ROOM_SUSPECTS = {
  study: [],
  library: ['prof_hawthorne'],
  conservatory: ['lady_sterling', 'butler_graves']
};

function createPrng(seed) {
  let s = (seed >>> 0) || 123456789;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createState(seed = 1) {
  const culpritIndex = (seed >>> 0) % SUSPECTS.length;
  const culprit = SUSPECTS[culpritIndex];

  return {
    seed: seed >>> 0,
    prngState: seed >>> 0,
    turns: 0,
    maxTurns: MAX_TURNS,
    room: 'study',
    culprit: culprit,
    evidence: [],
    examinedTargets: {},
    questionedSuspects: {},
    confrontations: {},
    contradictionsFound: 0,
    score: 0,
    done: false,
    victory: false,
    caseNotes: [
      'Midnight strikes over Sterling Manor.',
      'Lord Reginald Sterling lies slain in his private study.',
      'Gather physical clues, interrogate suspects, and unmask the killer.'
    ]
  };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  return state.score;
}

function addLog(state, note) {
  state.caseNotes.push(note);
  if (state.caseNotes.length > 20) {
    state.caseNotes.shift();
  }
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];

  // Movement between manor rooms
  const rooms = ['study', 'library', 'conservatory'];
  for (let i = 0; i < rooms.length; i++) {
    if (rooms[i] !== state.room) {
      actions.push('move:' + rooms[i]);
    }
  }

  // Examine uninspected clues in current room
  const targets = ROOM_TARGETS[state.room] || [];
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    if (!state.examinedTargets[t]) {
      actions.push('examine:' + t);
    }
  }

  // Question suspects in current room
  const presentSuspects = ROOM_SUSPECTS[state.room] || [];
  for (let i = 0; i < presentSuspects.length; i++) {
    const s = presentSuspects[i];
    actions.push('question:' + s);

    // Confront suspects with discovered evidence
    for (let e = 0; e < state.evidence.length; e++) {
      const evid = state.evidence[e];
      const key = s + ':' + evid;
      if (!state.confrontations[key]) {
        actions.push('confront:' + key);
      }
    }
  }

  // Final Accusation actions
  for (let i = 0; i < SUSPECTS.length; i++) {
    actions.push('accuse:' + SUSPECTS[i]);
  }

  return actions;
}

function step(state, action) {
  if (state.done) {
    throw new Error('Game is already over.');
  }

  const legal = legalActions(state);
  if (!legal.includes(action)) {
    throw new Error(`Illegal action "${action}".`);
  }

  state.turns += 1;
  let reward = 0;

  // Move
  if (action.startsWith('move:')) {
    const targetRoom = action.split(':')[1];
    state.room = targetRoom;
    reward += 1;
    addLog(state, `Moved into the ${targetRoom.toUpperCase()}.`);
  }

  // Examine
  else if (action.startsWith('examine:')) {
    const target = action.split(':')[1];
    state.examinedTargets[target] = true;
    reward += 5;
    state.score += 10;

    if (target === 'body') {
      state.evidence.push('autopsy_notes');
      addLog(state, 'Forensic examination: Victim died of virulent belladonna poisoning at approximately 11:45 PM.');
    } else if (target === 'goblet') {
      state.evidence.push('cyanide_goblet');
      addLog(state, 'Examined crystal goblet: Residue of dried nightshade alkaloid coats the rim.');
    } else if (target === 'desk') {
      state.evidence.push('debt_letter');
      state.evidence.push('torn_will');
      addLog(state, 'Examined desk: Found a threatening debt demand and a will bequeathing the estate elsewhere.');
    } else if (target === 'handkerchief') {
      state.evidence.push('silk_handkerchief');
      addLog(state, 'Found dropped silk handkerchief: Perfumed with distinctive lavender oil.');
    } else if (target === 'encyclopedia') {
      state.evidence.push('hollow_book');
      addLog(state, 'Examined bookshelves: Found hollowed treatise containing an empty botanical poison vial.');
    } else if (target === 'ledger') {
      state.evidence.push('tampered_ledger');
      addLog(state, 'Examined ledger: Embezzlement entries erased within the last 48 hours.');
    } else if (target === 'footprints') {
      state.evidence.push('muddy_footprints');
      addLog(state, 'Examined soil: Size 11 work boots tracked red greenhouse loam directly from the garden.');
    } else if (target === 'nightshade') {
      state.evidence.push('cut_nightshade');
      addLog(state, 'Examined conservatory planters: Fresh clippings taken from the rare Atropa belladonna plant.');
    } else if (target === 'cellar_key') {
      state.evidence.push('butler_cellar_key');
      addLog(state, 'Found iron cellar key hidden beneath a terracotta saucer.');
    }
  }

  // Question
  else if (action.startsWith('question:')) {
    const suspect = action.split(':')[1];
    state.questionedSuspects[suspect] = true;
    reward += 3;
    state.score += 5;

    if (suspect === 'lady_sterling') {
      addLog(state, 'Lady Sterling: "I was asleep in the master suite all evening! I know nothing of poison."');
    } else if (suspect === 'prof_hawthorne') {
      addLog(state, 'Prof. Hawthorne: "My uncle and I were on splendid terms! I was studying astronomy all night."');
    } else if (suspect === 'butler_graves') {
      addLog(state, 'Butler Graves: "I was down in the wine cellar decanting vintage port from ten until midnight, Sir."');
    }
  }

  // Confront
  else if (action.startsWith('confront:')) {
    const parts = action.split(':');
    const suspect = parts[1];
    const evidenceItem = parts[2];
    const key = suspect + ':' + evidenceItem;
    state.confrontations[key] = true;

    let isContradiction = false;

    // Evaluate logical contradictions
    if (suspect === 'lady_sterling' && (evidenceItem === 'silk_handkerchief' || evidenceItem === 'torn_will')) {
      isContradiction = true;
      addLog(state, 'CONTRADICTION EXPOSED! Lady Sterling pales: "That monogrammed handkerchief... how did you...?"');
    } else if (suspect === 'prof_hawthorne' && (evidenceItem === 'debt_letter' || evidenceItem === 'hollow_book')) {
      isContradiction = true;
      addLog(state, 'CONTRADICTION EXPOSED! Hawthorne stammers: "The university loans... uncle refused to save me!"');
    } else if (suspect === 'butler_graves' && (evidenceItem === 'muddy_footprints' || evidenceItem === 'butler_cellar_key')) {
      isContradiction = true;
      addLog(state, 'CONTRADICTION EXPOSED! Butler Graves sweats: "The mud? I... I only stepped outside for fresh air!"');
    } else {
      addLog(state, `${SUSPECT_NAMES[suspect]} inspects the ${evidenceItem.replace(/_/g, ' ')}: "This proves nothing against me."`);
    }

    if (isContradiction) {
      state.contradictionsFound += 1;
      reward += 15;
      state.score += 25;
    } else {
      reward += 1;
    }
  }

  // Accuse
  else if (action.startsWith('accuse:')) {
    const accused = action.split(':')[1];
    state.done = true;

    if (accused === state.culprit) {
      if (state.contradictionsFound >= 2 || state.evidence.length >= 4) {
        state.victory = true;
        reward += 100;
        state.score += 100;
        addLog(state, `CASE CRACKED! ${SUSPECT_NAMES[accused]} collapses in tears, confessing fully to the murder of Lord Sterling!`);
      } else {
        state.victory = false;
        reward -= 40;
        addLog(state, `Premature accusation! Although ${SUSPECT_NAMES[accused]} was the culprit, the evidence was insufficient to sustain indictment in court.`);
      }
    } else {
      state.victory = false;
      reward -= 50;
      addLog(state, `WRONGFUL INDICTMENT! You accused ${SUSPECT_NAMES[accused]}, but they were innocent! The real murderer fled the country.`);
    }
    return { reward, done: true };
  }

  // Turn bound check
  if (state.turns >= state.maxTurns) {
    state.done = true;
    addLog(state, 'Investigation timeframe expired as dawn breaks over the manor.');
  }

  return { reward, done: state.done };
}

// Module export for Node.js test runners & Bot checkers
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    MAX_TURNS,
    SUSPECTS,
    SUSPECT_NAMES
  };
}
