// Pure deterministic simulation logic for 0107-territory-capture (Sector Domination)

const MAP_ROWS = 5;
const MAP_COLS = 5;
const MAX_TURNS = 35;
const VICTORY_SECTORS = 18;

function createRng(seed) {
  let s = (Math.imul(seed ^ 0x85ebca6b, 1) + 1) >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getNeighbors(r, c) {
  const neighbors = [];
  const deltas = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 }
  ];
  deltas.forEach(d => {
    const nr = r + d.dr;
    const nc = c + d.dc;
    if (nr >= 0 && nr < MAP_ROWS && nc >= 0 && nc < MAP_COLS) {
      neighbors.push({ r: nr, c: nc });
    }
  });
  return neighbors;
}

function calculateReinforcements(grid, owner) {
  let count = 0;
  let supplyDepots = 0;
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      const cell = grid[r][c];
      if (cell.owner === owner) {
        count++;
        if (cell.isSupplyDepot) supplyDepots++;
      }
    }
  }
  return Math.max(3, Math.floor(count / 3)) + supplyDepots;
}

function createState(seed = 54321) {
  const numSeed = typeof seed === 'number' ? seed : 54321;
  const rng = createRng(numSeed);

  const grid = [];
  for (let r = 0; r < MAP_ROWS; r++) {
    const row = [];
    for (let c = 0; c < MAP_COLS; c++) {
      row.push({
        r,
        c,
        owner: 'neutral',
        troops: 2 + Math.floor(rng() * 3), // 2 to 4 troops
        fort: 0,
        isSupplyDepot: false,
        hasAttacked: false
      });
    }
    grid.push(row);
  }

  // Supply depots in central crossroads
  grid[2][2].isSupplyDepot = true;
  grid[1][3].isSupplyDepot = true;
  grid[3][1].isSupplyDepot = true;

  // Player starting stronghold (bottom-right cluster)
  const playerStarts = [[4, 4], [4, 3], [3, 4], [4, 2]];
  playerStarts.forEach(([r, c]) => {
    grid[r][c].owner = 'player';
    grid[r][c].troops = 5;
    grid[r][c].fort = 1;
  });

  // Enemy starting stronghold (top-left cluster)
  const enemyStarts = [[0, 0], [0, 1], [1, 0], [0, 2]];
  enemyStarts.forEach(([r, c]) => {
    grid[r][c].owner = 'enemy';
    grid[r][c].troops = 5;
    grid[r][c].fort = 1;
  });

  const pRes = calculateReinforcements(grid, 'player');

  return {
    seed: numSeed,
    rngStep: 0,
    turn: 1,
    maxTurns: MAX_TURNS,
    playerReserves: pRes,
    grid,
    history: ['War Council: Strategic sector deployment initialized. Establish frontline dominance.'],
    winner: null,
    done: false
  };
}

function legalActions(state) {
  if (state.done) return [];
  const actions = [];
  const grid = state.grid;

  // 1. Deploy troops from reserve pool to friendly sectors
  if (state.playerReserves >= 2) {
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        if (grid[r][c].owner === 'player' && grid[r][c].troops < 25) {
          actions.push(`deploy:${r},${c}`);
        }
      }
    }
  }

  // 2. Assault adjacent enemy/neutral sectors from friendly sectors
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      const from = grid[r][c];
      if (from.owner === 'player' && from.troops >= 3 && !from.hasAttacked) {
        const neighbors = getNeighbors(r, c);
        neighbors.forEach(n => {
          const to = grid[n.r][n.c];
          if (to.owner !== 'player') {
            actions.push(`attack:${r},${c}->${n.r},${n.c}`);
          }
        });
      }
    }
  }

  // 3. Fortify friendly sector (costs 2 garrison troops, max fort 2)
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      const s = grid[r][c];
      if (s.owner === 'player' && s.troops >= 4 && s.fort < 2) {
        actions.push(`fortify:${r},${c}`);
      }
    }
  }

  // 4. Conclude turn orders
  actions.push('end_turn');

  return actions;
}

function executeEnemyTurn(state) {
  const grid = state.grid;
  let enemyReserves = calculateReinforcements(grid, 'enemy');

  // 1. Deploy enemy reinforcements to frontline sectors (sectors with adjacent non-enemy)
  const enemyFrontlines = [];
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      if (grid[r][c].owner === 'enemy') {
        const nbrs = getNeighbors(r, c);
        if (nbrs.some(n => grid[n.r][n.c].owner !== 'enemy')) {
          enemyFrontlines.push(grid[r][c]);
        }
      }
    }
  }

  // Reinforce weakest frontline
  while (enemyReserves >= 2 && enemyFrontlines.length > 0) {
    enemyFrontlines.sort((a, b) => a.troops - b.troops);
    enemyFrontlines[0].troops += 2;
    enemyReserves -= 2;
  }

  // 2. Enemy Attacks: evaluate attacks against weakest adjacent targets
  const enemyAttackers = [];
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      const cell = grid[r][c];
      if (cell.owner === 'enemy' && cell.troops >= 3) {
        enemyAttackers.push(cell);
      }
    }
  }

  enemyAttackers.sort((a, b) => b.troops - a.troops);

  enemyAttackers.forEach(atk => {
    if (atk.troops < 3) return;
    const nbrs = getNeighbors(atk.r, atk.c);
    const validTargets = nbrs
      .map(n => grid[n.r][n.c])
      .filter(t => t.owner !== 'enemy');

    if (validTargets.length === 0) return;

    // Prefer player targets over neutral
    validTargets.sort((a, b) => {
      if (a.owner === 'player' && b.owner !== 'player') return -1;
      if (b.owner === 'player' && a.owner !== 'player') return 1;
      return a.troops - b.troops;
    });

    const target = validTargets[0];
    const attackPower = atk.troops - 1;
    const defensePower = Math.floor(target.troops * (1 + target.fort * 0.4));

    if (attackPower > defensePower) {
      // Enemy captures sector
      const surviving = Math.max(1, Math.floor(attackPower - defensePower * 0.7));
      atk.troops = 1;
      target.owner = 'enemy';
      target.troops = surviving;
      target.fort = Math.max(0, target.fort - 1);
      state.history.push(`Enemy offensive overran Sector (${target.r}, ${target.c})!`);
    } else {
      // Repelled
      atk.troops = 1;
      target.troops = Math.max(1, Math.floor(target.troops - attackPower * 0.7));
      state.history.push(`Garrison at Sector (${target.r}, ${target.c}) repelled enemy assault!`);
    }
  });
}

function evaluateOutcome(state) {
  let playerCount = 0;
  let enemyCount = 0;

  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      if (state.grid[r][c].owner === 'player') playerCount++;
      else if (state.grid[r][c].owner === 'enemy') enemyCount++;
    }
  }

  // Victory: Hegemony or total enemy destruction
  if (enemyCount === 0 || playerCount >= VICTORY_SECTORS) {
    state.done = true;
    state.winner = 'player';
    state.history.push(`TOTAL VICTORY! Secured hegemony with ${playerCount} strategic sectors controlled!`);
    return;
  }

  // Defeat: Extinction
  if (playerCount === 0) {
    state.done = true;
    state.winner = 'enemy';
    state.history.push('CRUSHING DEFEAT: All friendly sectors overrun and destroyed.');
    return;
  }

  // Max turn timeout
  if (state.turn >= state.maxTurns) {
    state.done = true;
    if (playerCount > enemyCount) {
      state.winner = 'player';
      state.history.push(`CAMPAIGN CONCLUDED: Achieved territorial advantage (${playerCount} vs ${enemyCount} sectors).`);
    } else {
      state.winner = 'enemy';
      state.history.push(`CAMPAIGN STALEMATE: Failed to break hostile lines (${playerCount} vs ${enemyCount} sectors).`);
    }
  }
}

function step(state, action) {
  if (state.done) {
    throw new Error('Game is already over');
  }

  const valid = legalActions(state);
  if (!valid.includes(action)) {
    throw new Error(`Illegal action: ${action}`);
  }

  let reward = 0;
  const grid = state.grid;

  if (action.startsWith('deploy:')) {
    const coords = action.split(':')[1].split(',').map(Number);
    const r = coords[0];
    const c = coords[1];

    grid[r][c].troops += 2;
    state.playerReserves -= 2;
    state.history.push(`Deployed +2 reinforcements to Sector (${r}, ${c}) [Garrison: ${grid[r][c].troops}].`);
    reward += 3;
  } else if (action.startsWith('attack:')) {
    const parts = action.split(':')[1].split('->');
    const from = parts[0].split(',').map(Number);
    const to = parts[1].split(',').map(Number);

    const fSec = grid[from[0]][from[1]];
    const tSec = grid[to[0]][to[1]];

    fSec.hasAttacked = true;
    const attackPower = fSec.troops - 1;
    const defensePower = Math.floor(tSec.troops * (1 + tSec.fort * 0.4));

    if (attackPower > defensePower) {
      const surviving = Math.max(1, Math.floor(attackPower - defensePower * 0.7));
      const formerOwner = tSec.owner;
      fSec.troops = 1;
      tSec.owner = 'player';
      tSec.troops = surviving;
      tSec.fort = Math.max(0, tSec.fort - 1);

      reward += formerOwner === 'enemy' ? 25 : 12;
      state.history.push(`VICTORIOUS ASSAULT! Captured Sector (${to[0]}, ${to[1]}) from ${formerOwner}!`);
    } else {
      fSec.troops = 1;
      tSec.troops = Math.max(1, Math.floor(tSec.troops - attackPower * 0.7));
      reward -= 5;
      state.history.push(`ASSAULT REPELLED! Heavy casualties assaulting Sector (${to[0]}, ${to[1]}).`);
    }
  } else if (action.startsWith('fortify:')) {
    const coords = action.split(':')[1].split(',').map(Number);
    const r = coords[0];
    const c = coords[1];

    grid[r][c].troops -= 2;
    grid[r][c].fort += 1;
    state.history.push(`Fortified Sector (${r}, ${c}) to Tier ${grid[r][c].fort} Bastion.`);
    reward += 5;
  } else if (action === 'end_turn') {
    // Check if player already achieved victory before enemy phase
    evaluateOutcome(state);
    if (state.done) {
      if (state.winner === 'player') reward += 100;
      return { reward, done: true };
    }

    // Reset attack flags for friendly sectors
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        grid[r][c].hasAttacked = false;
      }
    }

    // Run Enemy Turn
    executeEnemyTurn(state);

    // Prepare Next Turn
    state.turn++;
    const newRes = calculateReinforcements(grid, 'player');
    state.playerReserves += newRes;
    state.history.push(`Turn ${state.turn}: Mobilized +${newRes} reinforcements into reserve pool.`);
    reward += 5;
  }

  evaluateOutcome(state);

  if (state.done) {
    if (state.winner === 'player') reward += 100;
    else reward -= 50;
  }

  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  let playerSectors = 0;
  let playerTroops = 0;
  let supplyBonus = 0;

  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      const cell = state.grid[r][c];
      if (cell.owner === 'player') {
        playerSectors++;
        playerTroops += cell.troops;
        if (cell.isSupplyDepot) supplyBonus += 25;
      }
    }
  }

  let total = playerSectors * 30 + playerTroops * 4 + supplyBonus + state.playerReserves * 2;
  if (state.winner === 'player') total += 150;
  return Math.max(0, total);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    MAP_ROWS,
    MAP_COLS,
    VICTORY_SECTORS
  };
}