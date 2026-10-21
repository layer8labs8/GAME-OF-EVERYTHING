(function (root) {
  // Grid characters: '#' wall, ' ' floor, '@' player, '$' crate,
  // '.' target, '*' crate on target, '+' player on target.
  const DIRS = { U: [-1, 0], D: [1, 0], L: [0, -1], R: [0, 1] };

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

  const api = { move, isSolved, play };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SokobanLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
