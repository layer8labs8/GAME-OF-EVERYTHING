(function (root) {
  'use strict';

  const MAX_DAYS = 5;
  const MAX_STEPS = 60;

  function nextRandom(state) {
    state.rngState = ((state.rngState * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    return state.rngState / 0x7fffffff;
  }

  function shuffle(array, state) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(nextRandom(state) * (i + 1));
      const tmp = array[i];
      array[i] = array[j];
      array[j] = tmp;
    }
    return array;
  }

  function createState(seed = 12345) {
    const s = {
      members: {
        p0: { id: 'p0', name: 'Inquisitor (You)', role: 'loyalist', alive: true, votes: 0 },
        m1: { id: 'm1', name: 'Dr. Sterling',      role: 'loyalist', alive: true, votes: 0 },
        m2: { id: 'm2', name: 'Lady Constance',   role: 'loyalist', alive: true, votes: 0 },
        m3: { id: 'm3', name: 'Officer Hayes',    role: 'loyalist', alive: true, votes: 0 },
        m4: { id: 'm4', name: 'Scholar Vane',     role: 'loyalist', alive: true, votes: 0 },
      },
      phase: 'night', // 'night' -> 'day' -> 'voting'
      day: 1,
      inspected: {},
      protectedTarget: null,
      lastNightVictim: null,
      lastExiled: null,
      testimonies: [],
      log: ['A dark storm gathers. 2 Saboteurs hide among the 5 council members.'],
      stepCount: 0,
      gameOver: false,
      winner: null,
      scoreVal: 0,
      rngState: (seed >>> 0) || 12345,
    };

    // Randomly assign 2 of m1..m4 as saboteurs
    const aiIds = ['m1', 'm2', 'm3', 'm4'];
    shuffle(aiIds, s);
    s.members[aiIds[0]].role = 'saboteur';
    s.members[aiIds[1]].role = 'saboteur';

    return s;
  }

  function isOver(state) {
    if (state.gameOver) return true;
    if (state.stepCount >= MAX_STEPS) return true;

    const living = Object.values(state.members).filter(m => m.alive);
    const saboteurs = living.filter(m => m.role === 'saboteur').length;
    const loyalists = living.filter(m => m.role === 'loyalist').length;

    if (saboteurs === 0) return true;
    if (saboteurs >= loyalists) return true;
    if (state.day > MAX_DAYS) return true;

    return false;
  }

  function score(state) {
    return state.scoreVal;
  }

  function legalActions(state) {
    if (isOver(state)) return [];

    const actions = [];
    const living = Object.values(state.members).filter(m => m.alive && m.id !== 'p0');

    if (state.phase === 'night') {
      // Inquisitor can inspect any living AI member
      for (let i = 0; i < living.length; i++) {
        actions.push(`inspect:${living[i].id}`);
      }
      actions.push('pass');
    } else if (state.phase === 'day') {
      actions.push('begin_vote');
    } else if (state.phase === 'voting') {
      for (let i = 0; i < living.length; i++) {
        actions.push(`vote:${living[i].id}`);
      }
      actions.push('skip_vote');
    }

    return actions;
  }

  function resolveNight(state) {
    // Saboteurs pick a victim among living loyalists
    const livingLoyalists = Object.values(state.members).filter(m => m.alive && m.role === 'loyalist');
    const livingSaboteurs = Object.values(state.members).filter(m => m.alive && m.role === 'saboteur');

    state.lastNightVictim = null;
    if (livingSaboteurs.length > 0 && livingLoyalists.length > 0) {
      // Saboteurs prefer not to kill player immediately on night 1 to keep investigation engaging
      const aiLoyalists = livingLoyalists.filter(m => m.id !== 'p0');
      const pool = aiLoyalists.length > 0 ? aiLoyalists : livingLoyalists;
      const victim = pool[Math.floor(nextRandom(state) * pool.length)];

      if (victim && victim.id !== state.protectedTarget) {
        victim.alive = false;
        state.lastNightVictim = victim;
        state.log.push(`⚠️ Dawn broke: ${victim.name} was found assassinated!`);
      } else {
        state.log.push('🛡️ A sinister strike in the shadows was thwarted tonight!');
      }
    }

    // Generate day testimonies
    state.testimonies = [];
    const aliveAi = Object.values(state.members).filter(m => m.alive && m.id !== 'p0');
    const locations = ['in the Observatory', 'in the Grand Archives', 'guarding the Main Vault', 'in the Laboratory'];

    for (let i = 0; i < aliveAi.length; i++) {
      const m = aliveAi[i];
      const loc = locations[Math.floor(nextRandom(state) * locations.length)];
      if (m.role === 'saboteur') {
        state.testimonies.push(`${m.name}: "I swear I was peaceful ${loc}. I noticed strange shadows near the halls."`);
      } else {
        state.testimonies.push(`${m.name}: "I was studying ${loc}. The conspirators must be dealt with!"`);
      }
    }

    state.phase = 'day';
  }

  function resolveVoting(state, playerVoteId) {
    // Reset votes
    for (const key in state.members) {
      state.members[key].votes = 0;
    }

    if (playerVoteId && state.members[playerVoteId]) {
      state.members[playerVoteId].votes += 1;
    }

    const living = Object.values(state.members).filter(m => m.alive);
    const aliveAi = living.filter(m => m.id !== 'p0');

    // AI members vote
    for (let i = 0; i < aliveAi.length; i++) {
      const voter = aliveAi[i];
      const candidates = living.filter(c => c.id !== voter.id);

      if (voter.role === 'saboteur') {
        // Saboteurs vote for a loyalist or follow player's vote
        const targetLoyalist = candidates.find(c => c.role === 'loyalist');
        const pick = targetLoyalist || candidates[Math.floor(nextRandom(state) * candidates.length)];
        pick.votes += 1;
      } else {
        // Loyalist votes based on suspicion or random candidate
        const pick = candidates[Math.floor(nextRandom(state) * candidates.length)];
        pick.votes += 1;
      }
    }

    // Tally votes
    let maxVotes = 0;
    let accused = null;
    let tie = false;

    for (let i = 0; i < living.length; i++) {
      const m = living[i];
      if (m.votes > maxVotes) {
        maxVotes = m.votes;
        accused = m;
        tie = false;
      } else if (m.votes === maxVotes && maxVotes > 0) {
        tie = true;
      }
    }

    let exileReward = 0;
    if (accused && !tie && maxVotes >= 2) {
      accused.alive = false;
      state.lastExiled = accused;
      if (accused.role === 'saboteur') {
        state.log.push(`⚖️ The Council voted to exile ${accused.name} (${maxVotes} votes). They were a SABOTEUR!`);
        exileReward += 15;
        state.scoreVal += 15;
      } else {
        state.log.push(`⚖️ The Council voted to exile ${accused.name} (${maxVotes} votes). Tragically, they were a LOYALIST.`);
        exileReward -= 10;
        state.scoreVal -= 10;
      }
    } else {
      state.lastExiled = null;
      state.log.push('⚖️ The council could not reach consensus. No one was exiled.');
    }

    return exileReward;
  }

  function step(state, action) {
    if (!action || typeof action !== 'string') {
      throw new Error('Invalid action: ' + action);
    }
    if (isOver(state)) {
      throw new Error('Game is already over');
    }

    const legal = legalActions(state);
    if (!legal.includes(action)) {
      throw new Error('Illegal action: ' + action);
    }

    let reward = 0;

    if (state.phase === 'night') {
      if (action.startsWith('inspect:')) {
        const targetId = action.split(':')[1];
        const target = state.members[targetId];
        state.inspected[targetId] = target.role;
        state.log.push(`🔍 Night Investigation: ${target.name} is a ${target.role.toUpperCase()}!`);
        reward += target.role === 'saboteur' ? 5 : 2;
        state.scoreVal += reward;
      }
      resolveNight(state);
    } else if (state.phase === 'day') {
      if (action === 'begin_vote') {
        state.phase = 'voting';
      }
    } else if (state.phase === 'voting') {
      const playerVoteId = action.startsWith('vote:') ? action.split(':')[1] : null;
      const voteReward = resolveVoting(state, playerVoteId);
      reward += voteReward;

      // Check win/loss conditions
      const living = Object.values(state.members).filter(m => m.alive);
      const saboteurs = living.filter(m => m.role === 'saboteur').length;
      const loyalists = living.filter(m => m.role === 'loyalist').length;

      if (saboteurs === 0) {
        state.gameOver = true;
        state.winner = 'loyalist';
        reward += 30;
        state.scoreVal += 30;
        state.log.push('🏆 VICTORY! All Saboteurs have been unmasked and purged.');
      } else if (saboteurs >= loyalists || !state.members.p0.alive) {
        state.gameOver = true;
        state.winner = 'saboteur';
        reward -= 20;
        state.scoreVal -= 20;
        state.log.push('💀 DEFEAT! The Saboteurs seized control of the Council.');
      } else {
        state.day += 1;
        state.phase = 'night';
      }
    }

    state.stepCount += 1;
    if (state.stepCount >= MAX_STEPS && !state.gameOver) {
      state.gameOver = true;
      const living = Object.values(state.members).filter(m => m.alive);
      const saboteurs = living.filter(m => m.role === 'saboteur').length;
      state.winner = saboteurs === 0 ? 'loyalist' : 'saboteur';
    }

    const done = isOver(state);
    return { reward, done };
  }

  const socialDeductionLogic = {
    MAX_DAYS,
    MAX_STEPS,
    createState,
    legalActions,
    isOver,
    score,
    step,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = socialDeductionLogic;
  } else {
    root.socialDeductionLogic = socialDeductionLogic;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
