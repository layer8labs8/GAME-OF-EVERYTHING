(function (root) {
  const WIDTH = 360;
  const MAX_STEPS = 160;
  const TOTAL_THUGS = 8;
  const PLAYER_MAX_HP = 100;

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function createState(seed) {
    const state = {
      rng: (seed >>> 0) || 1,
      player: {
        x: 60,
        lane: 1,
        hp: PLAYER_MAX_HP,
        combo: 0,
        superGauge: 20,
      },
      enemies: [],
      items: [],
      thugsRemaining: TOTAL_THUGS,
      thugsDefeated: 0,
      stepCount: 0,
      score: 0,
      won: false,
      lost: false,
      lastEvent: 'Streets are crawling with syndicate thugs! Clean them up!',
    };

    spawnThug(state, 300, 1);
    spawnThug(state, 320, 2);
    return state;
  }

  function spawnThug(state, x, lane) {
    if (state.thugsRemaining <= 0) return;
    state.enemies.push({
      id: TOTAL_THUGS - state.thugsRemaining + 1,
      x,
      lane,
      hp: 35,
      attackCooldown: 1,
    });
    state.thugsRemaining -= 1;
  }

  function hasBasicTermination(state) {
    return Boolean(state.won || state.lost || state.stepCount >= MAX_STEPS);
  }

  function canPickFood(state) {
    return state.items.some(
      (it) => it.lane === state.player.lane && Math.abs(it.x - state.player.x) <= 30
    );
  }

  function legalActions(state) {
    if (hasBasicTermination(state)) return [];

    const actions = ['wait', 'punch', 'jump_kick'];

    if (state.player.x > 25) actions.push('left');
    if (state.player.x < WIDTH - 25) actions.push('right');
    if (state.player.lane > 0) actions.push('lane_up');
    if (state.player.lane < 2) actions.push('lane_down');

    if (state.player.superGauge >= 50) {
      actions.push('super');
    }

    if (canPickFood(state)) {
      actions.push('pick_food');
    }

    return actions;
  }

  function isOver(state) {
    return hasBasicTermination(state) || legalActions(state).length === 0;
  }

  function step(state, action) {
    const legal = legalActions(state);
    if (!legal.includes(action)) throw new Error('Illegal action: ' + action);

    let reward = 1;

    // 1. Resolve player action
    if (action === 'left') state.player.x = Math.max(20, state.player.x - 20);
    else if (action === 'right') state.player.x = Math.min(WIDTH - 20, state.player.x + 20);
    else if (action === 'lane_up') state.player.lane -= 1;
    else if (action === 'lane_down') state.player.lane += 1;
    else if (action === 'punch') {
      const damages = [12, 18, 30];
      const dmg = damages[state.player.combo];
      state.player.combo = (state.player.combo + 1) % 3;
      state.player.superGauge = Math.min(100, state.player.superGauge + 15);

      let hitAny = false;
      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const en = state.enemies[i];
        if (en.lane === state.player.lane && Math.abs(en.x - state.player.x) <= 38) {
          en.hp -= dmg;
          state.score += dmg;
          reward += dmg;
          hitAny = true;
          if (en.hp <= 0) {
            state.enemies.splice(i, 1);
            state.thugsDefeated += 1;
            reward += 40;
            state.score += 40;
            if (nextRandom(state) < 0.4) {
              state.items.push({ id: state.stepCount * 10 + i, x: en.x, lane: en.lane });
            }
          }
        }
      }
      state.lastEvent = hitAny ? `Combo hit connected for ${dmg} damage!` : 'Jab whiffed in empty air.';
    } else if (action === 'jump_kick') {
      const dmg = 22;
      let hitAny = false;
      state.player.superGauge = Math.min(100, state.player.superGauge + 10);
      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const en = state.enemies[i];
        if (Math.abs(en.lane - state.player.lane) <= 1 && Math.abs(en.x - state.player.x) <= 45) {
          en.hp -= dmg;
          state.score += dmg;
          reward += dmg;
          hitAny = true;
          if (en.hp <= 0) {
            state.enemies.splice(i, 1);
            state.thugsDefeated += 1;
            reward += 40;
            state.score += 40;
            if (nextRandom(state) < 0.4) {
              state.items.push({ id: state.stepCount * 10 + i, x: en.x, lane: en.lane });
            }
          }
        }
      }
      state.lastEvent = hitAny ? 'Flying Jump Kick crushed the enemy!' : 'Jump kick landed safely.';
    } else if (action === 'super') {
      state.player.superGauge -= 50;
      const dmg = 45;
      let hits = 0;
      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const en = state.enemies[i];
        if (Math.abs(en.x - state.player.x) <= 65) {
          en.hp -= dmg;
          state.score += dmg;
          reward += dmg;
          hits += 1;
          if (en.hp <= 0) {
            state.enemies.splice(i, 1);
            state.thugsDefeated += 1;
            reward += 40;
            state.score += 40;
          }
        }
      }
      state.lastEvent = `DRAGON UPPERCUT scorched ${hits} thugs!`;
    } else if (action === 'pick_food') {
      const idx = state.items.findIndex(
        (it) => it.lane === state.player.lane && Math.abs(it.x - state.player.x) <= 30
      );
      if (idx >= 0) {
        state.items.splice(idx, 1);
        state.player.hp = Math.min(PLAYER_MAX_HP, state.player.hp + 30);
        reward += 20;
        state.lastEvent = 'Delicious street roast devoured (+30 HP)!';
      }
    }

    // 2. Win check
    if (state.thugsDefeated >= TOTAL_THUGS && state.enemies.length === 0) {
      state.won = true;
      reward += 100;
      state.score += 100;
      state.stepCount += 1;
      return { reward, done: true };
    }

    // 3. Enemy AI
    for (const en of state.enemies) {
      if (en.attackCooldown > 0) {
        en.attackCooldown -= 1;
      }

      if (en.lane === state.player.lane && Math.abs(en.x - state.player.x) <= 32) {
        if (en.attackCooldown === 0) {
          const dmg = 15;
          state.player.hp -= dmg;
          reward -= 15;
          en.attackCooldown = 2;
          state.lastEvent = `Thug struck you with a pipe for ${dmg} damage!`;
          if (state.player.hp <= 0) {
            state.player.hp = 0;
            state.lost = true;
            state.stepCount += 1;
            return { reward, done: true };
          }
        }
      } else {
        // Move towards player
        if (en.lane !== state.player.lane && nextRandom(state) < 0.45) {
          en.lane += en.lane < state.player.lane ? 1 : -1;
        } else {
          const dir = en.x > state.player.x ? -1 : 1;
          en.x = Math.max(20, Math.min(WIDTH - 20, en.x + dir * 14));
        }
      }
    }

    // 4. Reinforcements
    if (state.enemies.length < 2 && state.thugsRemaining > 0) {
      const lane = Math.floor(nextRandom(state) * 3);
      spawnThug(state, 320, lane);
    }

    state.stepCount += 1;
    const done = isOver(state);
    return { reward, done };
  }

  function score(state) {
    return Math.max(0, state.score);
  }

  const api = {
    WIDTH,
    MAX_STEPS,
    TOTAL_THUGS,
    PLAYER_MAX_HP,
    createState,
    legalActions,
    step,
    isOver,
    score,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
