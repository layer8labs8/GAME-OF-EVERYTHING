// Ashen Knight - real-time souls-like duel logic.
// The world advances continuously through tick(state, dt, input), like the dodge arcade.
// The bot interface wraps tick with a fixed 0.1 s step per discrete action.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AshenKnight = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const W = 360;
  const H = 640;
  const GROUND = 430;
  const ARENA_MIN = 30;
  const ARENA_MAX = 330;
  const BOT_DT = 0.1;
  const TIME_LIMIT = 240;

  // Player move timings in seconds: hit = moment the blow lands, end = move finished.
  const MOVES = {
    light: { cost: 16, hit: 0.14, end: 0.42, range: 74, dmg: 14, poise: 9 },
    heavy: { cost: 30, hit: 0.38, end: 0.8, range: 88, dmg: 32, poise: 36 },
    roll: { cost: 25, end: 0.46, iStart: 0.03, iEnd: 0.34, dist: 150 },
    parry: { cost: 20, guard: 0.18, end: 0.5 },
    heal: { end: 0.95, at: 0.6, amount: 40 },
    hurt: { end: 0.4 },
  };

  // Boss attacks: windup = telegraph time, active = hurtful span, recover = punish span.
  const ATTACKS = {
    cleave: { windup: 0.75, active: 0.14, recover: 0.65, range: 96, dmg: 26 },
    slam: { windup: 0.95, active: 0.16, recover: 0.95, radius: 72, dmg: 36 },
    jab: { windup: 0.45, active: 0.1, recover: 0.45, range: 76, dmg: 18 },
    wave: { windup: 0.8, active: 0.1, recover: 0.8, dmg: 28, speed: 250 },
  };

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function createState(seed = 12345) {
    const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
    return {
      w: W,
      h: H,
      ground: GROUND,
      rng: s,
      time: 0,
      stepCount: 0,
      scoreVal: 0,
      won: false,
      lost: false,
      events: [],
      player: {
        x: 110,
        hp: 100,
        maxHp: 100,
        stamina: 100,
        maxStamina: 100,
        staminaDelay: 0,
        flasks: 3,
        move: null,
        moveT: 0,
        moveDir: 1,
        moveHit: false,
        buffer: null,
        bufferT: 0,
        blocking: false,
        facing: 1,
      },
      boss: {
        name: 'Ember Lord',
        x: 250,
        hp: 420,
        maxHp: 420,
        poise: 100,
        maxPoise: 100,
        poiseDelay: 0,
        phase: 1,
        mode: 'idle', // idle | approach | windup | active | recover | stagger
        modeT: 0,
        cooldown: 1.2,
        attack: null,
        targetX: 250,
        struck: false,
        facing: -1,
      },
      waves: [],
    };
  }

  function isOver(state) {
    return state.won || state.lost;
  }

  function score(state) {
    return state.scoreVal;
  }

  function canAct(state) {
    const m = state.player.move;
    return !isOver(state) && (m === null);
  }

  function emit(state, type, x, extra) {
    const e = { type, x: Math.round(x) };
    if (extra !== undefined) e.v = extra;
    state.events.push(e);
  }

  // Start a player move; returns false when it is not possible right now.
  function startMove(state, name) {
    const p = state.player;
    if (!canAct(state)) return false;
    if (name === 'heal') {
      if (p.flasks <= 0) return false;
    } else {
      const cost = MOVES[name].cost;
      if (p.stamina < cost) return false;
      p.stamina -= cost;
      p.staminaDelay = 0.6;
    }
    p.move = name;
    p.moveT = 0;
    p.moveHit = false;
    p.blocking = false;
    return true;
  }

  function isInvulnerable(p) {
    return p.move === 'roll' && p.moveT >= MOVES.roll.iStart && p.moveT <= MOVES.roll.iEnd;
  }

  function isParrying(p) {
    return p.move === 'parry' && p.moveT <= MOVES.parry.guard;
  }

  // Resolve a boss blow that reaches the player. Returns true when the blow connected or was handled.
  function resolveBlow(state, dmg, fromX) {
    const p = state.player;
    const b = state.boss;
    if (isInvulnerable(p)) {
      state.scoreVal += 50;
      emit(state, 'dodge', p.x);
      return;
    }
    if (isParrying(p) && fromX !== null) {
      state.scoreVal += 150;
      b.poise = Math.max(0, b.poise - 55);
      emit(state, 'parry', (p.x + b.x) / 2);
      if (b.poise <= 0) staggerBoss(state);
      else {
        b.mode = 'recover';
        b.modeT = 0;
        b.attack = 'cleave';
      }
      return;
    }
    if (p.blocking && p.stamina > 0) {
      const chip = Math.ceil(dmg * 0.25);
      p.hp = Math.max(0, p.hp - chip);
      p.stamina = Math.max(0, p.stamina - dmg);
      p.staminaDelay = 0.8;
      emit(state, 'block', p.x, chip);
      if (p.stamina <= 0) {
        p.blocking = false;
        p.move = 'hurt';
        p.moveT = 0;
        emit(state, 'guardbreak', p.x);
      }
      return;
    }
    p.hp = Math.max(0, p.hp - dmg);
    p.move = 'hurt';
    p.moveT = 0;
    p.blocking = false;
    emit(state, 'hurt', p.x, dmg);
  }

  function staggerBoss(state) {
    const b = state.boss;
    b.mode = 'stagger';
    b.modeT = 0;
    b.attack = null;
    b.poise = b.maxPoise;
    state.scoreVal += 200;
    emit(state, 'stagger', b.x);
  }

  function hitBoss(state, dmg, poiseDmg) {
    const b = state.boss;
    const p = state.player;
    let total = dmg;
    const critical = b.mode === 'stagger';
    if (critical) {
      total = dmg * 3;
      b.mode = 'recover';
      b.modeT = 0;
      b.attack = 'cleave';
      emit(state, 'critical', b.x, total);
      state.scoreVal += total * 4;
    } else {
      b.poise = Math.max(0, b.poise - poiseDmg);
      b.poiseDelay = 2;
      emit(state, 'hit', b.x, total);
      state.scoreVal += total * 3;
    }
    b.hp = Math.max(0, b.hp - total);
    b.x = clamp(b.x + p.facing * 6, ARENA_MIN, ARENA_MAX);
    if (b.hp > 0 && !critical && b.poise <= 0) staggerBoss(state);
    if (b.phase === 1 && b.hp > 0 && b.hp <= b.maxHp / 2) {
      b.phase = 2;
      b.mode = 'idle';
      b.modeT = 0;
      b.cooldown = 1.0;
      b.poise = b.maxPoise;
      state.scoreVal += 500;
      emit(state, 'phase', b.x);
    }
  }

  function updatePlayer(state, dt, input) {
    const p = state.player;
    const b = state.boss;
    p.facing = b.x >= p.x ? 1 : -1;

    if (p.move !== null) p.moveT += dt;

    if (p.move === 'light' || p.move === 'heavy') {
      const m = MOVES[p.move];
      if (!p.moveHit && p.moveT >= m.hit) {
        p.moveHit = true;
        if (Math.abs(b.x - p.x) <= m.range && b.hp > 0) hitBoss(state, m.dmg, m.poise);
        else emit(state, 'whiff', p.x + p.facing * 40);
      }
      if (p.moveT >= m.end) p.move = null;
    } else if (p.move === 'roll') {
      const m = MOVES.roll;
      const speed = m.dist / m.end;
      p.x += p.moveDir * speed * dt;
      if (p.moveT >= m.end) p.move = null;
    } else if (p.move === 'parry') {
      if (p.moveT >= MOVES.parry.end) p.move = null;
    } else if (p.move === 'heal') {
      if (!p.moveHit && p.moveT >= MOVES.heal.at) {
        p.moveHit = true;
        p.flasks -= 1;
        p.hp = Math.min(p.maxHp, p.hp + MOVES.heal.amount);
        emit(state, 'heal', p.x, MOVES.heal.amount);
      }
      if (p.moveT >= MOVES.heal.end) p.move = null;
    } else if (p.move === 'hurt') {
      if (p.moveT >= MOVES.hurt.end) p.move = null;
    }

    const free = p.move === null;
    p.blocking = free && !!input.block && p.stamina > 0;

    // Input buffer: a press made shortly before the current move ends still fires.
    if (input.action) {
      p.buffer = input.action;
      p.bufferT = 0.25;
    } else if (p.bufferT > 0) {
      p.bufferT = Math.max(0, p.bufferT - dt);
      if (p.bufferT === 0) p.buffer = null;
    }

    if (free) {
      const mv = clamp(Number(input.move) || 0, -1, 1);
      const speed = p.blocking ? 70 : 150;
      p.x += mv * speed * dt;
      const act = p.buffer;
      if (act) {
        let started = false;
        if (act === 'roll') {
          const dir = mv !== 0 ? Math.sign(mv) : -p.facing;
          started = startMove(state, 'roll');
          if (started) p.moveDir = dir;
        } else if (MOVES[act] && act !== 'hurt') {
          started = startMove(state, act);
        }
        if (started) {
          p.buffer = null;
          p.bufferT = 0;
        }
      }
    }
    if (p.move === 'heal') p.x += clamp(Number(input.move) || 0, -1, 1) * 40 * dt;

    // Keep a little space between the two bodies.
    const gap = 34;
    if (Math.abs(b.x - p.x) < gap && p.move !== 'roll') p.x = b.x - p.facing * gap;
    p.x = clamp(p.x, ARENA_MIN, ARENA_MAX);

    // Stamina regeneration.
    if (p.staminaDelay > 0) p.staminaDelay = Math.max(0, p.staminaDelay - dt);
    else if (p.move === null || p.move === 'hurt') {
      const rate = p.blocking ? 12 : 34;
      p.stamina = Math.min(p.maxStamina, p.stamina + rate * dt);
    }
  }

  function chooseAttack(state) {
    const b = state.boss;
    const p = state.player;
    const dist = Math.abs(b.x - p.x);
    const roll = nextRandom(state);
    if (b.phase === 2 && roll < 0.35) return 'wave';
    if (dist > 130) return roll < 0.6 ? 'slam' : 'approach';
    if (dist < 75 && roll < 0.4) return 'jab';
    return roll < 0.65 ? 'cleave' : 'slam';
  }

  function updateBoss(state, dt) {
    const b = state.boss;
    const p = state.player;
    if (b.hp <= 0) return;
    const speedUp = b.phase === 2 ? 1.25 : 1;
    const t = dt * speedUp;
    b.modeT += t;
    if (b.mode !== 'windup' && b.mode !== 'active') b.facing = p.x >= b.x ? 1 : -1;

    if (b.poiseDelay > 0) b.poiseDelay = Math.max(0, b.poiseDelay - dt);
    else b.poise = Math.min(b.maxPoise, b.poise + 12 * dt);

    if (b.mode === 'idle' || b.mode === 'approach') {
      const dist = Math.abs(b.x - p.x);
      if (dist > 80) b.x += b.facing * 60 * t;
      b.cooldown -= t;
      if (b.cooldown <= 0) {
        const pick = chooseAttack(state);
        if (pick === 'approach') {
          b.mode = 'approach';
          b.cooldown = 0.6;
        } else {
          b.mode = 'windup';
          b.modeT = 0;
          b.attack = pick;
          b.struck = false;
          b.targetX = clamp(p.x, ARENA_MIN, ARENA_MAX);
          emit(state, 'telegraph', b.x, pick);
        }
      }
    } else if (b.mode === 'windup') {
      const a = ATTACKS[b.attack];
      if (b.attack === 'slam') {
        // The boss tracks the player while airborne, then commits for the last 0.3 s.
        if (b.modeT < a.windup - 0.3) b.targetX = clamp(p.x, ARENA_MIN, ARENA_MAX);
      }
      if (b.modeT >= a.windup) {
        b.mode = 'active';
        b.modeT = 0;
        if (b.attack === 'slam') {
          b.x = b.targetX;
          emit(state, 'slam', b.x);
        } else if (b.attack === 'wave') {
          state.waves.push({ x: b.x + b.facing * 30, dir: b.facing, hit: false });
          emit(state, 'wave', b.x);
        } else {
          emit(state, 'cleave', b.x + b.facing * 50);
        }
      }
    } else if (b.mode === 'active') {
      const a = ATTACKS[b.attack];
      if (!b.struck) {
        let inRange = false;
        if (b.attack === 'jab') inRange = Math.abs(p.x - b.x) <= a.range && Math.sign(p.x - b.x) === b.facing;
        if (b.attack === 'cleave') inRange = Math.abs(p.x - b.x) <= a.range && Math.sign(p.x - b.x) === b.facing;
        if (b.attack === 'slam') inRange = Math.abs(p.x - b.x) <= a.radius;
        if (inRange) {
          b.struck = true;
          resolveBlow(state, a.dmg, b.x);
        }
      }
      if (b.mode === 'active' && b.modeT >= a.active) {
        b.mode = 'recover';
        b.modeT = 0;
      }
    } else if (b.mode === 'recover') {
      const a = ATTACKS[b.attack] || ATTACKS.cleave;
      if (b.modeT >= a.recover) {
        b.mode = 'idle';
        b.modeT = 0;
        b.cooldown = 0.25 + nextRandom(state) * 0.6;
      }
    } else if (b.mode === 'stagger') {
      if (b.modeT >= 2.0) {
        b.mode = 'idle';
        b.modeT = 0;
        b.cooldown = 0.5;
      }
    }
    b.x = clamp(b.x, ARENA_MIN, ARENA_MAX);
  }

  function updateWaves(state, dt) {
    const p = state.player;
    for (const wv of state.waves) {
      wv.x += wv.dir * ATTACKS.wave.speed * dt;
      if (!wv.hit && Math.abs(wv.x - p.x) < 16) {
        wv.hit = true;
        resolveBlow(state, ATTACKS.wave.dmg, null);
      }
    }
    state.waves = state.waves.filter((wv) => wv.x > 0 && wv.x < W);
  }

  // Advance the duel by dt seconds. input = { move: -1..1, block: bool, action: null|'light'|'heavy'|'roll'|'parry'|'heal' }.
  function tick(state, dt, input) {
    state.events = [];
    if (isOver(state)) return state;
    const d = clamp(Number(dt) || 0, 0, 0.1);
    const inp = input || {};
    state.time += d;

    updatePlayer(state, d, inp);
    updateBoss(state, d);
    updateWaves(state, d);

    const p = state.player;
    const b = state.boss;
    if (b.hp <= 0) {
      state.won = true;
      state.scoreVal += 3000 + p.flasks * 300 + Math.max(0, Math.floor((TIME_LIMIT - state.time) * 5));
      emit(state, 'victory', b.x);
    } else if (p.hp <= 0) {
      state.lost = true;
      emit(state, 'death', p.x);
    } else if (state.time >= TIME_LIMIT) {
      state.lost = true;
      emit(state, 'timeout', p.x);
    }
    state.scoreVal = Math.round(state.scoreVal);
    return state;
  }

  // ---- Bot interface: each discrete action holds that input for BOT_DT seconds. ----
  const ACTION_INPUT = {
    wait: {},
    left: { move: -1 },
    right: { move: 1 },
    block: { block: true },
    light: { action: 'light' },
    heavy: { action: 'heavy' },
    roll: { action: 'roll' },
    parry: { action: 'parry' },
    heal: { action: 'heal' },
  };

  function legalActions(state) {
    if (isOver(state)) return [];
    const p = state.player;
    const actions = ['wait', 'left', 'right'];
    if (!canAct(state)) return actions;
    if (p.stamina > 0) actions.push('block');
    if (p.stamina >= MOVES.light.cost) actions.push('light');
    if (p.stamina >= MOVES.heavy.cost) actions.push('heavy');
    if (p.stamina >= MOVES.roll.cost) actions.push('roll');
    if (p.stamina >= MOVES.parry.cost) actions.push('parry');
    if (p.flasks > 0) actions.push('heal');
    return actions;
  }

  function step(state, action) {
    if (isOver(state)) throw new Error('Game is over; no actions allowed');
    if (typeof action !== 'string' || !legalActions(state).includes(action)) {
      throw new Error('Illegal action ' + JSON.stringify(action));
    }
    const before = state.scoreVal;
    state.stepCount += 1;
    tick(state, BOT_DT, ACTION_INPUT[action]);
    return { reward: state.scoreVal - before, done: isOver(state) };
  }

  return {
    W,
    H,
    GROUND,
    BOT_DT,
    TIME_LIMIT,
    MOVES,
    ATTACKS,
    createState,
    tick,
    legalActions,
    step,
    isOver,
    score,
  };
});
