// Logic for 0114-tactical-rpg: Strike Protocol: Tactical Vanguard
// Pure Bot Contract implementation. Zero UI or platform dependencies.

const GRID_W = 7;
const GRID_H = 6;
const MAX_TURNS = 120;

function nextRng(state) {
  state.rngState = (Math.imul(state.rngState, 1664525) + 1013904223) >>> 0;
  return state.rngState / 4294967296;
}

function dist(x1, y1, x2, y2) {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

function getCoverAt(state, x, y) {
  if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return 0;
  return state.coverGrid[y][x];
}

function isOccupied(state, x, y) {
  // Check full cover blocks movement
  if (getCoverAt(state, x, y) === 2) return true;

  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[i];
    if (p.hp > 0 && p.x === x && p.y === y) return true;
  }
  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    if (e.hp > 0 && e.x === x && e.y === y) return true;
  }
  return false;
}

function createState(seed = 1) {
  let rngVal = (Math.floor(seed) >>> 0) || 456789123;
  function rand() {
    rngVal = (Math.imul(rngVal, 1664525) + 1013904223) >>> 0;
    return rngVal / 4294967296;
  }

  // Cover grid: 0 = Clear, 1 = Half Cover (low crates), 2 = Full Cover (pillar)
  const coverGrid = [];
  for (let y = 0; y < GRID_H; y++) {
    const row = [];
    for (let x = 0; x < GRID_W; x++) {
      const roll = rand();
      // Leave deployment rows clear (y=0 enemy, y=5 player)
      if (y === 0 || y === GRID_H - 1) {
        row.push(0);
      } else if (roll < 0.16) {
        row.push(2); // Full cover pillar
      } else if (roll < 0.38) {
        row.push(1); // Half cover barrier
      } else {
        row.push(0); // Clear ground
      }
    }
    coverGrid.push(row);
  }

  const players = [
    {
      id: 'p1',
      name: 'Pointman',
      role: 'pointman',
      hp: 90,
      maxHp: 90,
      atk: 30,
      def: 6,
      minRange: 1,
      maxRange: 3,
      ammo: 3,
      maxAmmo: 3,
      mobility: 3,
      ap: 2,
      x: 1,
      y: 5,
      overwatch: false,
      cooldown: 0
    },
    {
      id: 'p2',
      name: 'Sniper',
      role: 'sniper',
      hp: 60,
      maxHp: 60,
      atk: 36,
      def: 2,
      minRange: 2,
      maxRange: 5,
      ammo: 3,
      maxAmmo: 3,
      mobility: 2,
      ap: 2,
      x: 3,
      y: 5,
      overwatch: false,
      cooldown: 0
    },
    {
      id: 'p3',
      name: 'Support',
      role: 'support',
      hp: 75,
      maxHp: 75,
      atk: 22,
      def: 4,
      minRange: 1,
      maxRange: 4,
      ammo: 4,
      maxAmmo: 4,
      mobility: 3,
      ap: 2,
      x: 5,
      y: 5,
      overwatch: false,
      medkits: 2,
      cooldown: 0
    }
  ];

  const enemies = [
    {
      id: 'e1',
      name: 'Syndicate Enforcer',
      role: 'enforcer',
      hp: 110,
      maxHp: 110,
      atk: 26,
      def: 8,
      minRange: 1,
      maxRange: 3,
      ammo: 3,
      maxAmmo: 3,
      mobility: 2,
      x: 2,
      y: 0,
      overwatch: false
    },
    {
      id: 'e2',
      name: 'Syndicate Scout',
      role: 'scout',
      hp: 60,
      maxHp: 60,
      atk: 20,
      def: 3,
      minRange: 1,
      maxRange: 4,
      ammo: 3,
      maxAmmo: 3,
      mobility: 3,
      x: 5,
      y: 0,
      overwatch: false
    },
    {
      id: 'e3',
      name: 'Syndicate Psion',
      role: 'psion',
      hp: 50,
      maxHp: 50,
      atk: 28,
      def: 2,
      minRange: 1,
      maxRange: 4,
      ammo: 3,
      maxAmmo: 3,
      mobility: 2,
      x: 0,
      y: 0,
      overwatch: false
    }
  ];

  return {
    seed,
    rngState: rngVal,
    coverGrid,
    players,
    enemies,
    activeUnitId: 'p1',
    round: 1,
    turnCount: 0,
    score: 0,
    done: false,
    victory: false,
    combatLog: ['Squad deployed to forward sector. Operational status: GREEN.']
  };
}

function getActiveAgent(state) {
  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[i];
    if (p.id === state.activeUnitId && p.hp > 0 && p.ap > 0) {
      return p;
    }
  }
  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[i];
    if (p.hp > 0 && p.ap > 0) {
      return p;
    }
  }
  return null;
}

function legalActions(state) {
  if (state.done) return [];

  const agent = getActiveAgent(state);
  if (!agent) return [];

  const actions = [];

  // Movement actions (consumes 1 AP)
  if (agent.ap >= 1) {
    for (let dy = -agent.mobility; dy <= agent.mobility; dy++) {
      for (let dx = -agent.mobility; dx <= agent.mobility; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (Math.abs(dx) + Math.abs(dy) <= agent.mobility) {
          const nx = agent.x + dx;
          const ny = agent.y + dy;
          if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H) {
            if (!isOccupied(state, nx, ny)) {
              actions.push(`move:${nx},${ny}`);
            }
          }
        }
      }
    }
  }

  // Shooting actions (consumes 1 AP and 1 Ammo)
  if (agent.ap >= 1 && agent.ammo > 0) {
    for (let i = 0; i < state.enemies.length; i++) {
      const e = state.enemies[i];
      if (e.hp > 0) {
        const d = dist(agent.x, agent.y, e.x, e.y);
        if (d >= agent.minRange && d <= agent.maxRange) {
          actions.push(`shoot:${e.id}`);
        }
      }
    }
  }

  // Overwatch action (consumes 1 AP and ready for reaction fire)
  if (agent.ap >= 1 && agent.ammo > 0 && !agent.overwatch) {
    actions.push('overwatch');
  }

  // Reload action (consumes 1 AP if ammo is below max)
  if (agent.ap >= 1 && agent.ammo < agent.maxAmmo) {
    actions.push('reload');
  }

  // Special skill actions
  if (agent.ap >= 1 && agent.cooldown <= 0) {
    if (agent.role === 'pointman' && agent.ammo > 0) {
      // Breach Shot: massive damage at point blank (dist <= 2)
      for (let i = 0; i < state.enemies.length; i++) {
        const e = state.enemies[i];
        if (e.hp > 0 && dist(agent.x, agent.y, e.x, e.y) <= 2) {
          actions.push(`skill:${e.id}`);
        }
      }
    } else if (agent.role === 'sniper' && agent.ammo > 0) {
      // Deadeye: sniper shot ignoring cover (range 2 to 5)
      for (let i = 0; i < state.enemies.length; i++) {
        const e = state.enemies[i];
        if (e.hp > 0) {
          const d = dist(agent.x, agent.y, e.x, e.y);
          if (d >= 2 && d <= agent.maxRange) {
            actions.push(`skill:${e.id}`);
          }
        }
      }
    } else if (agent.role === 'support' && agent.medkits > 0) {
      // Field Dressing: Heal wounded ally or self (dist <= 1)
      for (let i = 0; i < state.players.length; i++) {
        const p = state.players[i];
        if (p.hp > 0 && p.hp < p.maxHp && dist(agent.x, agent.y, p.x, p.y) <= 1) {
          actions.push(`heal:${p.id}`);
        }
      }
    }
  }

  // Can always yield remaining AP and end operative's turn
  actions.push('end_turn');

  return actions;
}

function calculateHitAndDamage(state, attacker, defender, isSkill) {
  const d = dist(attacker.x, attacker.y, defender.x, defender.y);
  const defCover = getCoverAt(state, defender.x, defender.y);

  // Cover bonus
  let coverMitigation = 0;
  if (defCover === 1) coverMitigation = 6; // Half cover
  if (defCover === 2) coverMitigation = 12; // Full cover

  if (isSkill && attacker.role === 'sniper') {
    coverMitigation = 0; // Deadeye pierces cover
  }

  let baseAtk = attacker.atk;
  if (isSkill) {
    baseAtk = Math.round(attacker.atk * 1.5);
  }

  // Proximity bonus for pointman
  if (attacker.role === 'pointman' && d <= 1) {
    baseAtk += 8;
  }

  const effectiveDef = defender.def + coverMitigation;
  const rawDmg = Math.max(6, baseAtk - effectiveDef);

  // Determinate critical roll using nextRng
  const critRoll = nextRng(state);
  const isFlanked = defCover === 0;
  const critThreshold = isFlanked ? 0.35 : 0.15;
  const isCrit = critRoll < critThreshold;
  const critMult = isCrit ? 1.5 : 1.0;

  const finalDamage = Math.max(3, Math.round(rawDmg * critMult));
  return { damage: finalDamage, isCrit };
}

function executeEnemyTurn(state) {
  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    if (e.hp <= 0) continue;

    let ap = 2;

    while (ap > 0) {
      // Check if any player in range to shoot
      let bestTarget = null;
      let minHp = 999;

      for (let j = 0; j < state.players.length; j++) {
        const p = state.players[j];
        if (p.hp > 0) {
          const d = dist(e.x, e.y, p.x, p.y);
          if (d >= e.minRange && d <= e.maxRange) {
            if (p.hp < minHp) {
              minHp = p.hp;
              bestTarget = p;
            }
          }
        }
      }

      if (bestTarget && e.ammo > 0) {
        // Shoot
        e.ammo--;
        ap--;
        const hit = calculateHitAndDamage(state, e, bestTarget, false);
        bestTarget.hp = Math.max(0, bestTarget.hp - hit.damage);
        state.combatLog.push(`${e.name} fired at ${bestTarget.name} for ${hit.damage} DMG${hit.isCrit ? ' [CRITICAL!]' : ''}!`);
        if (bestTarget.hp === 0) {
          state.combatLog.push(`${bestTarget.name} was neutralized!`);
        }
      } else if (e.ammo === 0) {
        // Reload
        e.ammo = e.maxAmmo;
        ap--;
        state.combatLog.push(`${e.name} reloaded weapon.`);
      } else {
        // Maneuver closer to nearest player
        let closestPlayer = null;
        let cDist = 999;
        for (let j = 0; j < state.players.length; j++) {
          const p = state.players[j];
          if (p.hp > 0) {
            const d = dist(e.x, e.y, p.x, p.y);
            if (d < cDist) {
              cDist = d;
              closestPlayer = p;
            }
          }
        }

        if (!closestPlayer) break;

        let bestMove = null;
        let bestTargetDist = cDist;

        for (let dy = -e.mobility; dy <= e.mobility; dy++) {
          for (let dx = -e.mobility; dx <= e.mobility; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (Math.abs(dx) + Math.abs(dy) <= e.mobility) {
              const nx = e.x + dx;
              const ny = e.y + dy;
              if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H) {
                if (!isOccupied(state, nx, ny)) {
                  const nd = dist(nx, ny, closestPlayer.x, closestPlayer.y);
                  if (nd < bestTargetDist) {
                    bestTargetDist = nd;
                    bestMove = { x: nx, y: ny };
                  }
                }
              }
            }
          }
        }

        if (bestMove) {
          e.x = bestMove.x;
          e.y = bestMove.y;
          ap--;

          // Check if triggered any player's overwatch
          for (let k = 0; k < state.players.length; k++) {
            const owPlayer = state.players[k];
            if (owPlayer.hp > 0 && owPlayer.overwatch && owPlayer.ammo > 0) {
              const dToEnemy = dist(owPlayer.x, owPlayer.y, e.x, e.y);
              if (dToEnemy >= owPlayer.minRange && dToEnemy <= owPlayer.maxRange) {
                owPlayer.overwatch = false;
                owPlayer.ammo--;
                const owHit = calculateHitAndDamage(state, owPlayer, e, false);
                e.hp = Math.max(0, e.hp - owHit.damage);
                state.score += owHit.damage * 2;
                state.combatLog.push(`OVERWATCH TRIGGERED! ${owPlayer.name} reaction-fired at ${e.name} for ${owHit.damage} DMG!`);
                if (e.hp === 0) {
                  state.score += 180;
                  state.combatLog.push(`${e.name} was terminated by overwatch ambush!`);
                  break;
                }
              }
            }
          }
        } else {
          // Cannot move closer, forfeit AP
          ap = 0;
        }
      }
    }
  }

  // Round reset
  state.round++;
  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[i];
    p.ap = 2;
    p.overwatch = false;
    if (p.cooldown > 0) p.cooldown--;
  }

  // Active unit defaults to first alive player
  const nextAlive = state.players.find(p => p.hp > 0);
  state.activeUnitId = nextAlive ? nextAlive.id : null;
}

function checkSquadOutcome(state) {
  const allEnemiesDead = state.enemies.every(e => e.hp <= 0);
  if (allEnemiesDead) {
    state.done = true;
    state.victory = true;
    state.score += 600 + Math.max(0, 120 - state.round * 10);
    state.combatLog.push('MISSION SUCCESS! Hostile sector secured.');
    return;
  }

  const allPlayersDead = state.players.every(p => p.hp <= 0);
  if (allPlayersDead) {
    state.done = true;
    state.victory = false;
    state.combatLog.push('MISSION FAILED! All squad operatives KIA.');
    return;
  }

  if (state.turnCount >= MAX_TURNS) {
    state.done = true;
    state.victory = false;
    state.combatLog.push('MISSION FAILED! Turn limit exceeded.');
  }
}

function step(state, action) {
  if (state.done) {
    throw new Error('Game is already over');
  }

  const legal = legalActions(state);
  if (!legal.includes(action)) {
    throw new Error(`Illegal action: ${action}`);
  }

  const agent = getActiveAgent(state);
  if (!agent) {
    throw new Error('No active operative available');
  }

  state.turnCount++;
  let reward = 0.0;

  if (action.startsWith('move:')) {
    const coords = action.slice(5).split(',').map(Number);
    agent.x = coords[0];
    agent.y = coords[1];
    agent.ap--;
    state.combatLog.push(`${agent.name} repositioned to (${coords[0]}, ${coords[1]}).`);
  } else if (action.startsWith('shoot:')) {
    const targetId = action.slice(6);
    const target = state.enemies.find(e => e.id === targetId);
    if (!target) throw new Error('Target not found');

    agent.ap--;
    agent.ammo--;
    const hit = calculateHitAndDamage(state, agent, target, false);
    target.hp = Math.max(0, target.hp - hit.damage);
    state.score += hit.damage * 2;
    reward += 0.05;
    state.combatLog.push(`${agent.name} fired at ${target.name} for ${hit.damage} DMG${hit.isCrit ? ' [CRITICAL!]' : ''}!`);

    if (target.hp === 0) {
      state.score += 180;
      reward += 0.25;
      state.combatLog.push(`${target.name} was neutralized!`);
    }
  } else if (action === 'overwatch') {
    agent.ap = 0; // Overwatch consumes all remaining AP
    agent.overwatch = true;
    state.combatLog.push(`${agent.name} entered Overwatch posture.`);
  } else if (action === 'reload') {
    agent.ap--;
    agent.ammo = agent.maxAmmo;
    state.combatLog.push(`${agent.name} reloaded magazine.`);
  } else if (action.startsWith('skill:')) {
    const targetId = action.slice(6);
    const target = state.enemies.find(e => e.id === targetId);
    if (!target) throw new Error('Target not found');

    agent.ap--;
    agent.ammo--;
    agent.cooldown = 2;
    const hit = calculateHitAndDamage(state, agent, target, true);
    target.hp = Math.max(0, target.hp - hit.damage);
    state.score += hit.damage * 3;
    reward += 0.1;
    const skillName = agent.role === 'pointman' ? 'Breach Shot' : 'Deadeye';
    state.combatLog.push(`${agent.name} executed ${skillName} on ${target.name} for ${hit.damage} DMG${hit.isCrit ? ' [CRITICAL!]' : ''}!`);

    if (target.hp === 0) {
      state.score += 180;
      reward += 0.25;
      state.combatLog.push(`${target.name} was obliterated!`);
    }
  } else if (action.startsWith('heal:')) {
    const targetId = action.slice(5);
    const target = state.players.find(p => p.id === targetId);
    if (!target) throw new Error('Ally not found');

    agent.ap--;
    agent.medkits--;
    target.hp = Math.min(target.maxHp, target.hp + 30);
    state.combatLog.push(`${agent.name} administered Field Dressing to ${target.name} (+30 HP).`);
  } else if (action === 'end_turn') {
    agent.ap = 0;
    state.combatLog.push(`${agent.name} holds position.`);
  }

  // Outcome check
  checkSquadOutcome(state);
  if (state.done) {
    return { reward: state.victory ? 1.0 : 0.0, done: true };
  }

  // Turn management: Check if another alive player still has AP
  const nextReady = state.players.find(p => p.hp > 0 && p.ap > 0);
  if (nextReady) {
    state.activeUnitId = nextReady.id;
  } else {
    // All squad members spent AP: Execute Enemy Turn
    executeEnemyTurn(state);
    checkSquadOutcome(state);
    if (state.done) {
      return { reward: state.victory ? 1.0 : 0.0, done: true };
    }
  }

  return { reward, done: state.done };
}

function isOver(state) {
  return Boolean(state.done);
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
