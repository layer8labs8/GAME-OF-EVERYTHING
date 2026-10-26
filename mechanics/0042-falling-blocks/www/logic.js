(function (root) {
  const W = 10;
  const H = 20;
  const MAX_STEPS = 2400;
  const ACTIONS = ['left', 'right', 'rotate', 'down', 'drop'];
  const LINE_SCORES = [0, 100, 300, 500, 800];

  const SHAPES = [
    [[0, 1], [1, 1], [2, 1], [3, 1]], // I
    [[0, 0], [1, 0], [0, 1], [1, 1]], // O
    [[1, 0], [0, 1], [1, 1], [2, 1]], // T
    [[1, 0], [2, 0], [0, 1], [1, 1]], // S
    [[0, 0], [1, 0], [1, 1], [2, 1]], // Z
    [[0, 0], [0, 1], [1, 1], [2, 1]], // J
    [[2, 0], [0, 1], [1, 1], [2, 1]], // L
  ];

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function rotateCW(cells) {
    const raw = cells.map(([x, y]) => [2 - y, x]);
    let minX = 99;
    let minY = 99;
    for (const [x, y] of raw) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
    }
    return raw.map(([x, y]) => [x - minX, y - minY]);
  }

  function fits(board, cells, px, py) {
    for (let i = 0; i < cells.length; i++) {
      const cx = px + cells[i][0];
      const cy = py + cells[i][1];
      if (cx < 0 || cx >= W || cy < 0 || cy >= H) return false;
      if (board[cy][cx] !== 0) return false;
    }
    return true;
  }

  function makePiece(kind) {
    return {
      kind,
      cells: SHAPES[kind].map((c) => [c[0], c[1]]),
      x: 3,
      y: 0,
      color: kind + 1,
    };
  }

  function ghostY(state) {
    let gy = state.piece.y;
    while (fits(state.board, state.piece.cells, state.piece.x, gy + 1)) gy += 1;
    return gy;
  }

  function lockAndSpawn(state) {
    const p = state.piece;
    for (const [dx, dy] of p.cells) {
      const cy = p.y + dy;
      const cx = p.x + dx;
      if (cy >= 0 && cy < H && cx >= 0 && cx < W) state.board[cy][cx] = p.color;
    }

    let cleared = 0;
    for (let r = H - 1; r >= 0; r--) {
      if (state.board[r].every((v) => v !== 0)) {
        state.board.splice(r, 1);
        state.board.unshift(Array(W).fill(0));
        cleared += 1;
        r += 1;
      }
    }

    let gain = LINE_SCORES[cleared] || cleared * 200;
    state.lines += cleared;
    state.points += gain;

    const next = makePiece(state.nextKind);
    state.nextKind = Math.floor(nextRandom(state) * SHAPES.length);
    state.piece = next;
    state.stallCount = 0;
    if (!fits(state.board, next.cells, next.x, next.y)) {
      state.toppedOut = true;
      gain -= 10;
    }
    return gain;
  }

  function createState(seed) {
    const state = {
      w: W,
      h: H,
      board: Array.from({ length: H }, () => Array(W).fill(0)),
      piece: null,
      nextKind: 0,
      stallCount: 0,
      lines: 0,
      points: 0,
      stepCount: 0,
      toppedOut: false,
      rng: (seed >>> 0) || 1,
    };
    const first = Math.floor(nextRandom(state) * SHAPES.length);
    state.nextKind = Math.floor(nextRandom(state) * SHAPES.length);
    state.piece = makePiece(first);
    return state;
  }

  function isOver(state) {
    return Boolean(state.toppedOut || state.stepCount >= MAX_STEPS);
  }

  function legalActions(state) {
    return isOver(state) ? [] : ACTIONS.slice();
  }

  function step(state, action) {
    if (isOver(state) || !ACTIONS.includes(action)) throw new Error('Illegal action');

    const p = state.piece;
    let reward = 0;

    if (action === 'left') {
      if (fits(state.board, p.cells, p.x - 1, p.y)) p.x -= 1;
      state.stallCount += 1;
    } else if (action === 'right') {
      if (fits(state.board, p.cells, p.x + 1, p.y)) p.x += 1;
      state.stallCount += 1;
    } else if (action === 'rotate') {
      if (p.kind !== 1) {
        const rot = rotateCW(p.cells);
        for (const kick of [0, -1, 1]) {
          if (fits(state.board, rot, p.x + kick, p.y)) {
            p.cells = rot;
            p.x += kick;
            break;
          }
        }
      }
      state.stallCount += 1;
    } else if (action === 'down') {
      state.stallCount = 0;
      if (fits(state.board, p.cells, p.x, p.y + 1)) {
        p.y += 1;
      } else {
        reward += lockAndSpawn(state);
      }
    } else if (action === 'drop') {
      const gy = ghostY(state);
      const dist = gy - p.y;
      p.y = gy;
      state.points += dist;
      reward += dist + lockAndSpawn(state);
    }

    if (!state.toppedOut && state.stallCount >= 3) {
      state.stallCount = 0;
      if (fits(state.board, p.cells, p.x, p.y + 1)) {
        p.y += 1;
      } else {
        reward += lockAndSpawn(state);
      }
    }

    state.stepCount += 1;
    return { reward, done: isOver(state) };
  }

  function score(state) {
    return state.points;
  }

  const api = { W, H, SHAPES, MAX_STEPS, fits, ghostY, createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
