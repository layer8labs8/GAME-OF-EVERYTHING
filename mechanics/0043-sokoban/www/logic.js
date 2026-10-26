(function (root) {
  // Grid characters: '#' wall, ' ' floor, '@' player, '$' crate,
  // '.' target, '*' crate on target, '+' player on target.
  const DIRS = { U: [-1, 0], D: [1, 0], L: [0, -1], R: [0, 1] };
  const ORDER = ['U', 'D', 'L', 'R'];
  const MAX_STEPS = 200;

  const LEVELS = [
    { id: '001', name: 'First push', difficulty: 1, par: 3, grid: ['#######', '#@ $ .#', '#######'] },
    { id: '002', name: 'Down and across', difficulty: 1, par: 5, grid: ['######', '#@   #', '# $  #', '#  . #', '######'] },
    { id: '003', name: 'Two crates up', difficulty: 2, par: 6, grid: ['#######', '# . . #', '#  $$ #', '#  @  #', '#######'] },
    { id: '004', name: 'Mind the wall', difficulty: 2, par: 10, grid: ['#######', '#     #', '# $#$ #', '# .@. #', '#######'] },
    { id: '005', name: 'Pairs', difficulty: 2, par: 14, grid: ['########', '#      #', '# $  $ #', '#      #', '# .  . #', '#@     #', '########'] },
    { id: '006', name: 'Behind the wall', difficulty: 3, par: 16, grid: ['########', '#   #  #', '# $ # .#', '#   #  #', '#@     #', '#      #', '########'] },
    { id: '007', name: 'Three in a row', difficulty: 3, par: 19, grid: ['#######', '#     #', '# $$$ #', '#     #', '# ... #', '#  @  #', '#######'] },
    { id: '008', name: 'Narrow escape', difficulty: 3, par: 19, grid: ['#######', '#@    #', '# $ # #', '#   $ #', '# . . #', '#######'] },
    { id: '009', name: 'Two chambers', difficulty: 3, par: 20, grid: ['#########', '#   #   #', '# $ # $ #', '#   #   #', '# . # . #', '#   @   #', '#########'] },
    { id: '010', name: 'Side pocket', difficulty: 4, par: 15, grid: ['########', '#   .. #', '# #$$# #', '# @    #', '#      #', '########'] },
    { id: '011', name: 'Switchback', difficulty: 4, par: 28, grid: ['########', '# .  # #', '# $  $ #', '###  . #', '  # @  #', '  ######'] },
    { id: '012', name: 'Inner vault', difficulty: 4, par: 31, grid: ['#########', '#   .   #', '# #$#$# #', '# . @ . #', '#   $   #', '#       #', '#########'] },
  ];

  function nextRng(s) {
    let a = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return { rng: a, val: ((t ^ (t >>> 14)) >>> 0) / 4294967296 };
  }

  function move(grid, dir) {
    const d = DIRS[dir];
    if (!d) throw new Error(`bad direction: ${dir}`);
    const cells = grid.map((row) => row.split(''));
    let pr = -1;
    let pc = -1;
    cells.forEach((row, r) => row.forEach((ch, c) => {
      if (ch === '@' || ch === '+') {
        pr = r;
        pc = c;
      }
    }));
    if (pr < 0) throw new Error('grid has no player');

    const at = (r, c) => (r >= 0 && r < cells.length && c >= 0 && c < cells[r].length ? cells[r][c] : '#');
    const nr = pr + d[0];
    const nc = pc + d[1];
    const next = at(nr, nc);

    if (next === '$' || next === '*') {
      const br = nr + d[0];
      const bc = nc + d[1];
      const beyond = at(br, bc);
      if (beyond !== ' ' && beyond !== '.') return grid.slice();
      cells[br][bc] = beyond === '.' ? '*' : '$';
      cells[nr][nc] = next === '*' ? '.' : ' ';
    } else if (next !== ' ' && next !== '.') {
      return grid.slice();
    }

    cells[pr][pc] = cells[pr][pc] === '+' ? '.' : ' ';
    cells[nr][nc] = cells[nr][nc] === '.' ? '+' : '@';
    return cells.map((row) => row.join(''));
  }

  function isSolved(grid) {
    const text = grid.join('');
    return !text.includes('$') && text.includes('*');
  }

  function play(grid, moves) {
    return [...moves].reduce((g, dir) => move(g, dir), grid);
  }

  function countStars(grid) {
    let n = 0;
    for (const row of grid) for (const ch of row) if (ch === '*') n++;
    return n;
  }

  function openDirs(grid) {
    const cur = grid.join('|');
    return ORDER.filter((dir) => move(grid, dir).join('|') !== cur);
  }

  function createState(seed, levelIndex) {
    const r = nextRng((seed >>> 0) || 1);
    const idx = Number.isInteger(levelIndex) && levelIndex >= 0 && levelIndex < LEVELS.length
      ? levelIndex
      : Math.floor(r.val * LEVELS.length);
    const lvl = LEVELS[idx];
    return {
      levelIndex: idx,
      grid: lvl.grid.slice(),
      par: lvl.par,
      stepCount: 0,
      maxSteps: MAX_STEPS,
      solved: isSolved(lvl.grid),
      rng: r.rng,
    };
  }

  function isOver(state) {
    return Boolean(state.solved || state.stepCount >= state.maxSteps || openDirs(state.grid).length === 0);
  }

  function legalActions(state) {
    if (state.solved || state.stepCount >= state.maxSteps) return [];
    return openDirs(state.grid);
  }

  function step(state, action) {
    const legal = legalActions(state);
    if (!legal.includes(action)) throw new Error('Illegal action');
    const beforeStars = countStars(state.grid);
    state.grid = move(state.grid, action);
    state.stepCount += 1;
    state.solved = isSolved(state.grid);
    const afterStars = countStars(state.grid);
    let reward = -1 + (afterStars - beforeStars) * 10;
    if (state.solved) reward += 100;
    const done = isOver(state);
    return { reward, done };
  }

  function score(state) {
    const placed = countStars(state.grid) * 25;
    if (!state.solved) return placed;
    const bonus = Math.max(0, 100 - Math.max(0, state.stepCount - state.par) * 2);
    return placed + bonus;
  }

  const api = { LEVELS, MAX_STEPS, move, isSolved, play, createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    root.SokobanLogic = api;
    root.GameLogic = api;
  }
})(typeof self !== 'undefined' ? self : globalThis);
