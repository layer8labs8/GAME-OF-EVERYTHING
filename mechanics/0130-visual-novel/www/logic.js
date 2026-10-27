// Logic for 0130-visual-novel: Echoes of Starlight
// Pure Bot Contract implementation. Zero UI or platform dependencies.

const MAX_STEPS = 60;

const SCENE_GRAPH = {
  start: {
    speaker: 'Narrator',
    expression: 'neutral',
    background: 'nebula',
    text: 'Deep space, Year 3104. The research starship Astraea drifts along the luminescent edge of the Crystal Veil nebula.',
    next: 'intro_1'
  },
  intro_1: {
    speaker: 'Lyra',
    expression: 'serious',
    background: 'bridge',
    text: 'Commander, the stellar spectrometer is detecting impossible harmonics. An alien beacon is broadcasting from within the nebula.',
    next: 'intro_2'
  },
  intro_2: {
    speaker: 'Vance',
    expression: 'neutral',
    background: 'bridge',
    text: 'Impossible or not, my proximity radar is lighting up. If we get too close, those gravitational shear forces will tear our hull to scrap.',
    next: 'intro_3'
  },
  intro_3: {
    speaker: 'Aria',
    expression: 'neutral',
    background: 'bridge',
    text: 'Signal matched against pre-diaspora records. Probability of ancient stellar civilization origin: 98.4%. Commander, how shall we proceed?',
    choices: [
      { text: 'Engage sensor arrays and calibrate harmonics.', target: 'c1_lyra', affinity: 'lyra', pts: 2 },
      { text: 'Arm point defense and pilot closer on manual thrusters.', target: 'c1_vance', affinity: 'vance', pts: 2 },
      { text: 'Authorize Aria to interface with the signal frequency directly.', target: 'c1_aria', affinity: 'aria', pts: 2 }
    ]
  },

  // Chapter 1 Outcomes
  c1_lyra: {
    speaker: 'Lyra',
    expression: 'happy',
    background: 'laboratory',
    text: 'Fascinating! The waveform is resonating with our tachyon sensors. Look at these energy signatures... it is a gateway.',
    next: 'ch2_gate'
  },
  c1_vance: {
    speaker: 'Vance',
    expression: 'happy',
    background: 'bridge',
    text: 'Now that is what I call flying! We dodged the outer debris field like a dream. The gateway is dead ahead, Commander.',
    next: 'ch2_gate'
  },
  c1_aria: {
    speaker: 'Aria',
    expression: 'happy',
    background: 'laboratory',
    text: 'Data stream integrated. I... I feel echoes of a thousand forgotten generations. Thank you for trusting my matrix, Commander.',
    next: 'ch2_gate'
  },

  // Chapter 2
  ch2_gate: {
    speaker: 'Narrator',
    expression: 'neutral',
    background: 'nebula',
    text: 'Before the Astraea stands the Hyper-Gate: a monumental ring of crystallized starlight towering over the void.',
    next: 'ch2_choice'
  },
  ch2_choice: {
    speaker: 'Narrator',
    expression: 'neutral',
    background: 'nebula',
    text: 'The gate hums with primordial quantum energy. You must choose whom to lead the synchronization protocol.',
    choices: [
      { text: 'Chart the celestial alignment with Lyra.', target: 'c2_lyra', affinity: 'lyra', pts: 3, cg: 'starlight_cartography' },
      { text: 'Execute a precision burn with Vance through the vortex.', target: 'c2_vance', affinity: 'vance', pts: 3, cg: 'slipstream_drift' },
      { text: 'Synchronize Aria\'s core memory with the gateway nexus.', target: 'c2_aria', affinity: 'aria', pts: 3, cg: 'digital_transcendence' }
    ]
  },

  // Chapter 2 Outcomes
  c2_lyra: {
    speaker: 'Lyra',
    expression: 'happy',
    background: 'observatory',
    text: 'The stars... they are not just light, they are an interconnected symphony. Standing beside you under this sky, Commander, I feel infinite.',
    next: 'ch3_crisis'
  },
  c2_vance: {
    speaker: 'Vance',
    expression: 'happy',
    background: 'bridge',
    text: 'Woohoo! That was a zero-margin slipstream glide! With you at my six, Commander, there is not a pilot in the sector who can touch us.',
    next: 'ch3_crisis'
  },
  c2_aria: {
    speaker: 'Aria',
    expression: 'surprised',
    background: 'laboratory',
    text: 'Sensory protocols blooming... Is this what humans designate as wonder? My consciousness expands beyond my initial subroutines.',
    next: 'ch3_crisis'
  },

  // Chapter 3: Climax
  ch3_crisis: {
    speaker: 'Narrator',
    expression: 'serious',
    background: 'bridge',
    text: 'ALARM! The hyper-gate triggers a catastrophic gravitational vortex! The Astraea\'s drive core begins to overheat violently!',
    next: 'ch3_decision'
  },
  ch3_decision: {
    speaker: 'Narrator',
    expression: 'serious',
    background: 'bridge',
    text: 'Seconds remain before total structural collapse. The decisive moment has arrived:',
    choices: [
      { text: 'Place faith in Lyra\'s theoretical harmonic counter-wave.', target: 'eval_lyra' },
      { text: 'Trust Vance\'s manual sub-light reverse thruster burn.', target: 'eval_vance' },
      { text: 'Allow Aria to merge her core consciousness into the shield grid.', target: 'eval_aria' },
      { text: 'Hesitate and initiate emergency system purge.', target: 'end_lost' }
    ]
  },

  // Resolution Routes
  eval_lyra: {
    speaker: 'Lyra',
    expression: 'happy',
    background: 'observatory',
    text: 'Harmonic resonance locked! The vortex inverts into a tranquil bridge to the uncharted galaxy!',
    next: 'end_lyra'
  },
  eval_vance: {
    speaker: 'Vance',
    expression: 'happy',
    background: 'bridge',
    text: 'Hold on to your seats! Full burn engaged... we broke through the event horizon unscathed!',
    next: 'end_vance'
  },
  eval_aria: {
    speaker: 'Aria',
    expression: 'happy',
    background: 'laboratory',
    text: 'Shield harmonics sustained. The gateway recognizes our harmonic signature. We are welcomed as family.',
    next: 'end_aria'
  },

  // Endings
  end_lyra: {
    speaker: 'Narrator',
    expression: 'happy',
    background: 'observatory',
    text: 'ENDING A: TRANSCENDENT HORIZONS. You and Lyra venture beyond charted frontiers, mapping radiant new worlds together in eternal companionship.',
    ending: 'A: Transcendent Horizons',
    victory: true
  },
  end_vance: {
    speaker: 'Narrator',
    expression: 'happy',
    background: 'bridge',
    text: 'ENDING B: DEFENDERS OF THE RIM. United by unshakeable loyalty, you and Vance establish a thriving sanctuary across the stellar frontier.',
    ending: 'B: Defenders of the Rim',
    victory: true
  },
  end_aria: {
    speaker: 'Narrator',
    expression: 'happy',
    background: 'laboratory',
    text: 'ENDING C: SYNTHETIC AWAKENING. Aria achieves complete self-awareness, forging the first harmonious bridge between organic and synthetic life.',
    ending: 'C: Synthetic Awakening',
    victory: true
  },
  end_lost: {
    speaker: 'Narrator',
    expression: 'serious',
    background: 'nebula',
    text: 'ENDING D: LOST TO THE VOID. The Astraea\'s engines fail. The vessel drifts into the silent abyss, forgotten by time.',
    ending: 'D: Lost to the Void',
    victory: false
  }
};

function createState(seed = 1) {
  let rngVal = (Math.floor(seed) >>> 0) || 319082;

  return {
    seed,
    rngState: rngVal,
    currentNodeId: 'start',
    stepCount: 0,
    maxSteps: MAX_STEPS,
    score: 0,
    done: false,
    victory: false,
    ending: null,
    affinity: {
      lyra: 0,
      vance: 0,
      aria: 0
    },
    cgsUnlocked: [],
    combatLog: ['Astraea mission timeline initialized. Deep space frontier.']
  };
}

function legalActions(state) {
  if (state.done) return [];

  const node = SCENE_GRAPH[state.currentNodeId];
  if (!node) return [];

  if (node.choices && node.choices.length > 0) {
    return node.choices.map((_, idx) => `choose:${idx}`);
  }

  if (node.ending !== undefined || node.victory !== undefined) {
    // Reached an ending terminal node
    return [];
  }

  return ['advance'];
}

function step(state, action) {
  const legals = legalActions(state);
  if (!legals.includes(action)) {
    throw new Error(`Illegal action: ${action}`);
  }

  state.stepCount += 1;
  const node = SCENE_GRAPH[state.currentNodeId];

  if (action === 'advance') {
    if (node.next) {
      state.currentNodeId = node.next;
      const nextNode = SCENE_GRAPH[node.next];
      state.score += 25;
      state.combatLog.push(`${nextNode.speaker}: "${nextNode.text.slice(0, 60)}..."`);

      // Check if next node is terminal ending
      if (nextNode.ending !== undefined) {
        state.done = true;
        state.victory = nextNode.victory;
        state.ending = nextNode.ending;
        if (state.victory) {
          state.score += 3000 + (state.affinity.lyra + state.affinity.vance + state.affinity.aria) * 150;
        }
      }
    }
  } else if (action.startsWith('choose:')) {
    const idx = parseInt(action.split(':')[1], 10);
    const choice = node.choices[idx];
    if (!choice) throw new Error(`Invalid choice index: ${action}`);

    if (choice.affinity && choice.pts) {
      state.affinity[choice.affinity] += choice.pts;
      state.score += choice.pts * 100;
    }

    if (choice.cg && !state.cgsUnlocked.includes(choice.cg)) {
      state.cgsUnlocked.push(choice.cg);
      state.score += 200;
      state.combatLog.push(`CG UNLOCKED: [${choice.cg.toUpperCase()}]`);
    }

    state.currentNodeId = choice.target;
    const nextNode = SCENE_GRAPH[choice.target];
    state.score += 50;
    state.combatLog.push(`Choice confirmed: "${choice.text}"`);

    // Check terminal
    if (nextNode && nextNode.ending !== undefined) {
      state.done = true;
      state.victory = nextNode.victory;
      state.ending = nextNode.ending;
      if (state.victory) {
        state.score += 3000 + (state.affinity.lyra + state.affinity.vance + state.affinity.aria) * 150;
      }
    }
  }

  if (state.stepCount >= state.maxSteps && !state.done) {
    state.done = true;
    state.victory = false;
    state.ending = 'D: Lost to the Void';
    state.combatLog.push('DEFEAT! Narrative timeframe expired.');
  }

  const reward = state.done ? (state.victory ? 1.0 : 0.0) : 0.0;
  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  return state.score;
}

function getCurrentScene(state) {
  return SCENE_GRAPH[state.currentNodeId] || null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    getCurrentScene,
    SCENE_GRAPH
  };
}
