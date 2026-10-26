(function (root) {
  const W = 12;
  const H = 16;
  const MAX_HUNGER = 140;
  const MAX_STEPS = 2400;
  const DIRS = {
    U: { dx: 0, dy: -1, opp: 'D' },
    D: { dx: 0, dy: 1, opp: 'U' },
    L: { dx: -1, dy: 0, opp: 'R' },
    R: { dx: 1, dy: 0, opp: 'L' },
  };
  const ORDER = ['U', 'D', 'L', 'R'];

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function spawnFood(state) {
    const occupied = {};
    for (let i = 0; i < state.snake.length; i++) {
      occupied[state.snake[i].x + ',' + state.snake[i].y] = true;
    }
    const empty = [];
    for (let y = 0; y < state.h; y++) {
      for (let x = 0; x < state.w; x++) {
        if (!occupied[x + ',' + y]) empty.push({ x, y });
      }
    }
    if (empty.length === 0) return null;
    const idx = Math.floor(nextRandom(state) * empty.length);
    return empty[idx];
  }

  function createState(seed) {
    const state = {
      w: W,
      h: H,
      snake: [
        { x: 5, y: 8 },
        { x: 4, y: 8 },
        { x: 3, y: 8 },
      ],
      dir: 'R',
      food: null,
      eaten: 0,
      hunger: 0,
      stepCount: 0,
      alive: true,
      won: false,
      rng: (seed >>> 0) || 1,
    };
    state.food = spawnFood(state);
    return state;
  }

  function isOver(state) {
    return Boolean(!state.alive || state.won || state.hunger >= MAX_HUNGER || state.stepCount >= MAX_STEPS);
  }

  function legalActions(state) {
    if (isOver(state)) return [];
    const opp = DIRS[state.dir] ? DIRS[state.dir].opp : '';
    return ORDER.filter((d) => d !== opp);
  }

  function step(state, action) {
    const legal = legalActions(state);
    if (!legal.includes(action)) throw new Error('Illegal action');

    const move = DIRS[action];
    const head = state.snake[0];
    const nx = head.x + move.dx;
    const ny = head.y + move.dy;

    state.dir = action;
    state.stepCount += 1;

    if (nx < 0 || nx >= state.w || ny < 0 || ny >= state.h) {
      state.alive = false;
      return { reward: -10, done: true };
    }

    const willEat = Boolean(state.food && nx === state.food.x && ny === state.food.y);
    const checkLen = willEat ? state.snake.length : state.snake.length - 1;
    for (let i = 0; i < checkLen; i++) {
      if (state.snake[i].x === nx && state.snake[i].y === ny) {
        state.alive = false;
        return { reward: -10, done: true };
      }
    }

    state.snake.unshift({ x: nx, y: ny });
    let reward = 0;
    if (willEat) {
      state.eaten += 1;
      state.hunger = 0;
      reward = 10;
      if (state.snake.length >= state.w * state.h) {
        state.food = null;
        state.won = true;
        reward += 100;
      } else {
        state.food = spawnFood(state);
      }
    } else {
      state.snake.pop();
      state.hunger += 1;
    }

    return { reward, done: isOver(state) };
  }

  function score(state) {
    return state.eaten * 10 + (state.won ? 100 : 0);
  }

  const api = { W, H, MAX_HUNGER, MAX_STEPS, createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
