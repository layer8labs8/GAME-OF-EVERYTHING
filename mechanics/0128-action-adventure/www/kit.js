// Shared game feel for every mechanic: start screen, sound, particles, screen shake and a mute button.
// Each game gets a copy in www/kit.js. Edit this file, then run: npm run kit
(function () {
  'use strict';

  // Drawing helpers for game screens: GOE.art.tile(ctx, ...) and friends.
  const rgb = (color) => {
    const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [128, 128, 128];
  };
  const mix = (color, to, t) => 'rgb(' + rgb(color).map((v) => Math.round(v + (to - v) * t)).join(',') + ')';
  const lighten = (color, t) => mix(color, 255, t);
  const darken = (color, t) => mix(color, 0, t);

  function roundPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function glow(ctx, x, y, r, color, alpha) {
    const [cr, cg, cb] = rgb(color);
    const g = ctx.createRadialGradient(x, y, Math.max(0.1, r * 0.1), x, y, r);
    g.addColorStop(0, 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (alpha === undefined ? 0.35 : alpha) + ')');
    g.addColorStop(1, 'rgba(' + cr + ',' + cg + ',' + cb + ',0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function tile(ctx, x, y, w, h, r, color) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, lighten(color, 0.26));
    g.addColorStop(0.55, color);
    g.addColorStop(1, darken(color, 0.26));
    ctx.fillStyle = g;
    roundPath(ctx, x, y, w, h, r);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    roundPath(ctx, x + w * 0.09, y + h * 0.07, w * 0.82, h * 0.26, Math.min(r, h * 0.12));
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 1;
    roundPath(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r);
    ctx.stroke();
  }

  window.GOE = { art: { lighten, darken, glow, tile, roundPath } };

  const CSS = `
    @keyframes goe-shake { 0%,100% { transform: translate(0,0); } 20% { transform: translate(-7px,3px); } 40% { transform: translate(6px,-4px); } 60% { transform: translate(-4px,-3px); } 80% { transform: translate(3px,4px); } }
    @keyframes goe-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .65; transform: scale(.97); } }
    @keyframes goe-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
    canvas { filter: saturate(1.2) contrast(1.05); }
    #goe-fx { filter: none; }
    #goe-vignette { position: fixed; inset: 0; z-index: 15; pointer-events: none; background: radial-gradient(circle at 50% 45%, transparent 62%, rgba(0,0,0,.34) 100%); }
    button { transition: transform .08s ease, filter .08s ease; }
    button:active { transform: scale(.95); filter: brightness(1.25); }
    #goe-start { position: fixed; inset: 0; z-index: 30; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 28px; box-sizing: border-box; text-align: center; color: #fff; font-family: system-ui, sans-serif; background: radial-gradient(circle at 50% 35%, rgba(36,48,92,.93), rgba(6,9,20,.97)); cursor: pointer; }
    #goe-start h1 { margin: 0 0 14px; font-size: 34px; letter-spacing: .5px; animation: goe-in .35s ease both; }
    #goe-start p { margin: 0 0 30px; max-width: 320px; font-size: 16px; line-height: 1.45; color: #c9d3ee; animation: goe-in .45s ease both; }
    #goe-start b { padding: 13px 34px; border-radius: 30px; background: #ffd166; color: #14182a; font-size: 18px; animation: goe-pulse 1.5s ease infinite; }
    #goe-level { position: fixed; left: 36px; right: 8px; bottom: 8px; z-index: 40; pointer-events: none; text-align: center; color: #ffe680; font: 600 13px system-ui, sans-serif; text-shadow: 0 1px 3px #000; }
    #goe-mute { position: fixed; left: 4px; bottom: 4px; z-index: 40; width: 26px; height: 26px; padding: 0; border: 0; border-radius: 50%; background: rgba(0,0,0,.45); color: #fff; font: 12px system-ui, sans-serif; opacity: .75; }
  `;

  const realRaf = window.requestAnimationFrame.bind(window);
  const realNow = performance.now.bind(performance);
  const main = () => [...document.querySelectorAll('canvas')].filter((c) => c.id !== 'goe-fx')[0];

  let started = false;
  let frames = 0;
  let held = [];
  let pausedAt = 0;
  let lost = 0;
  let muted = false;
  let audio = null;
  let lastBlip = 0;
  let lastPop = 0;
  let lastX = null;
  let lastY = null;
  let fx = null;
  let pen = null;
  let fxRunning = false;
  let parts = [];
  let words = [];
  let flash = 0;
  let recent = [];
  let campaign = null;
  let level = 0;

  const reduced = () => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  };

  function blip(freq, ms, type, gain) {
    if (muted) return;
    const now = realNow();
    if (now - lastBlip < 45) return;
    lastBlip = now;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const osc = audio.createOscillator();
      const amp = audio.createGain();
      const end = audio.currentTime + ms / 1000;
      osc.type = type || 'triangle';
      osc.frequency.value = freq;
      amp.gain.setValueAtTime(gain || 0.05, audio.currentTime);
      amp.gain.exponentialRampToValueAtTime(0.001, end);
      osc.connect(amp);
      amp.connect(audio.destination);
      osc.start();
      osc.stop(end);
    } catch (e) { /* no sound on this device */ }
  }

  function tune(notes, gap) {
    notes.forEach((freq, i) => setTimeout(() => { lastBlip = 0; blip(freq, 170, 'triangle', 0.06); }, i * gap));
  }

  function setupFx() {
    if (fx) return;
    fx = document.createElement('canvas');
    fx.id = 'goe-fx';
    fx.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:20';
    document.body.appendChild(fx);
    pen = fx.getContext('2d');
  }

  function origin() {
    if (lastX !== null) return [lastX, lastY];
    return [window.innerWidth / 2, window.innerHeight * 0.4];
  }

  function burst(x, y, count, colors, speed) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = (0.4 + Math.random()) * speed;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, size: 2 + Math.random() * 4, color: colors[i % colors.length] });
    }
    runFx();
  }

  function runFx() {
    if (fxRunning) return;
    setupFx();
    fxRunning = true;
    let last = realNow();
    const tick = () => {
      const now = realNow();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (fx.width !== Math.round(w * dpr)) fx.width = Math.round(w * dpr);
      if (fx.height !== Math.round(h * dpr)) fx.height = Math.round(h * dpr);
      pen.setTransform(dpr, 0, 0, dpr, 0, 0);
      pen.clearRect(0, 0, w, h);

      if (flash > 0) {
        pen.fillStyle = 'rgba(255,50,60,' + flash + ')';
        pen.fillRect(0, 0, w, h);
        flash = Math.max(0, flash - dt * 1.4);
      }
      for (const p of parts) {
        p.life -= dt * 1.5;
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        p.vy += dt * 7;
        pen.globalAlpha = Math.max(0, p.life);
        pen.fillStyle = p.color;
        pen.beginPath();
        pen.arc(p.x, p.y, p.size * Math.max(0.3, p.life), 0, Math.PI * 2);
        pen.fill();
      }
      pen.textAlign = 'center';
      for (const t of words) {
        t.life -= dt * 1.1;
        t.y -= dt * 55;
        pen.globalAlpha = Math.max(0, t.life);
        pen.font = 'bold ' + t.size + 'px system-ui, sans-serif';
        pen.fillStyle = 'rgba(0,0,0,.55)';
        pen.fillText(t.text, t.x + 1.5, t.y + 1.5);
        pen.fillStyle = t.color;
        pen.fillText(t.text, t.x, t.y);
      }
      pen.globalAlpha = 1;
      parts = parts.filter((p) => p.life > 0);
      words = words.filter((t) => t.life > 0);
      if (parts.length || words.length || flash > 0) realRaf(tick);
      else {
        pen.clearRect(0, 0, w, h);
        fxRunning = false;
      }
    };
    realRaf(tick);
  }

  function shake() {
    if (reduced()) return;
    document.body.style.animation = 'goe-shake .22s linear';
    setTimeout(() => { document.body.style.animation = ''; }, 240);
  }

  function pop(amount) {
    const now = realNow();
    if (now - lastPop < 110) return;
    lastPop = now;
    const [x, y] = origin();
    burst(x, y, Math.min(16, 6 + Math.round(Math.log2(amount + 1)) * 2), ['#ffd166', '#7cc4ff', '#ffffff'], 3);
    if (amount >= 5) {
      words.push({ text: '+' + amount, x, y: y - 16, life: 1, size: amount >= 100 ? 28 : 21, color: '#ffe680' });
      runFx();
    }
    blip(Math.min(1250, 500 + Math.log2(amount + 1) * 60), 80, 'triangle', 0.045);
  }

  function hurt() {
    shake();
    flash = Math.max(flash, 0.28);
    runFx();
    blip(130, 230, 'sawtooth', 0.06);
  }

  // Games that export CAMPAIGN get numbered levels; beating one unlocks the next.
  function levelKey() {
    return 'goe-level-' + (window.location ? window.location.pathname : '');
  }

  function showLevel() {
    if (!campaign) return;
    let chip = document.getElementById('goe-level');
    if (!chip || chip.id !== 'goe-level') {
      chip = document.createElement('div');
      chip.id = 'goe-level';
      document.body.appendChild(chip);
    }
    const entry = campaign.CAMPAIGN[level];
    chip.textContent = 'Level ' + (level + 1) + '/' + campaign.CAMPAIGN.length + ' · ' + entry.goal;
  }

  function startCampaign(api) {
    campaign = api;
    try { level = Math.min(api.CAMPAIGN.length - 1, Math.max(0, Number(localStorage.getItem(levelKey())) || 0)); } catch (e) { level = 0; }
    const make = api.createState;
    api.createState = function (seed) {
      const state = make(seed, api.CAMPAIGN[level]);
      showLevel();
      return state;
    };
  }

  function levelUp() {
    if (!campaign || level >= campaign.CAMPAIGN.length - 1) return;
    level += 1;
    try { localStorage.setItem(levelKey(), String(level)); } catch (e) { /* private window */ }
    words.push({ text: 'Level ' + (level + 1) + ' unlocked', x: window.innerWidth / 2, y: window.innerHeight * 0.3, life: 2, size: 26, color: '#3ddc97' });
    runFx();
  }

  function finish(api, state) {
    const won = state && ((api.isWon && api.isWon(state)) || state.won === true || state.winner === 'player' || state.victory === true || state.result === 'win');
    if (won) {
      levelUp();
      const w = window.innerWidth;
      for (let i = 0; i < 5; i++) burst(w * (0.15 + i * 0.175), window.innerHeight * 0.3, 22, ['#ffd166', '#3ddc97', '#7cc4ff', '#ff7b9c'], 4.5);
      tune([523, 659, 784, 1047], 120);
    } else {
      tune([392, 311, 233], 170);
    }
  }

  function react(api, state, before, wasOver, res) {
    const now = realNow();
    recent = recent.filter((t) => now - t < 1000);
    const delta = before === null ? 0 : api.score(state) - before;
    const reward = res && typeof res.reward === 'number' ? res.reward : 0;
    const steady = recent.length > 10; // score that ticks up every frame should not spark every frame
    if (delta > 0 || reward > 0) recent.push(now);
    if (reward < 0 || delta < 0) hurt();
    else if (delta > 0 && (!steady || delta >= 50)) pop(delta);
    if (!wasOver && api.isOver(state)) finish(api, state);
  }

  function wrap(api) {
    if (!api || typeof api.step !== 'function' || typeof api.isOver !== 'function' || api.goeKit) return;
    // Screens may call step, or a real-time or direct version of it. All of them take the state first.
    const hook = (original) => function (state) {
      let before = null;
      let wasOver = true;
      try {
        before = typeof api.score === 'function' ? api.score(state) : null;
        wasOver = api.isOver(state);
      } catch (e) { /* the game decides what is valid */ }
      const res = original.apply(this, arguments);
      try { if (typeof api.score === 'function') react(api, state, before, wasOver, res); } catch (e) { /* effects must never stop a game */ }
      return res;
    };
    try {
      for (const name of ['step', 'advance', 'tick', 'place']) {
        if (typeof api[name] === 'function') api[name] = hook(api[name]);
      }
      api.goeKit = true;
      if (Array.isArray(api.CAMPAIGN) && api.CAMPAIGN.length && typeof api.createState === 'function') startCampaign(api);
    } catch (e) { /* read-only api: the game still runs, just without effects */ }
  }

  function begin() {
    if (started) return;
    started = true;
    lost += realNow() - pausedAt;
    const box = document.getElementById('goe-start');
    if (box && box.remove) box.remove();
    const waiting = held;
    held = [];
    waiting.forEach((cb) => realRaf((t) => cb(t - lost)));
    blip(660, 90, 'triangle', 0.05);
  }

  function showStart() {
    if (document.getElementById('goe-start') && document.getElementById('goe-start').id === 'goe-start') return;
    pausedAt = realNow();
    const meta = document.querySelector('meta[name="description"]');
    const about = meta && meta.content ? meta.content : '';
    const box = document.createElement('div');
    box.id = 'goe-start';
    box.innerHTML = '<h1></h1><p></p><b>Tap to play</b>';
    const name = (document.title || '').split(/\s[-:]\s/)[0];
    if (box.children && box.children.length) {
      box.children[0].textContent = name;
      box.children[1].textContent = about;
    }
    box.onpointerdown = (e) => { e.stopPropagation(); e.preventDefault(); begin(); };
    document.body.appendChild(box);
  }

  function setup() {
    const style = document.createElement('style');
    style.textContent = CSS;
    (document.head || document.body).appendChild(style);

    try { muted = localStorage.getItem('goe-muted') === '1'; } catch (e) { /* private window */ }

    performance.now = () => (started || !pausedAt ? realNow() : pausedAt) - lost;
    window.requestAnimationFrame = (cb) => {
      if (!started) {
        frames += 1;
        if (frames > 3) {
          held.push(cb);
          showStart();
          return 0;
        }
      }
      return realRaf((t) => cb(t - lost));
    };

    for (const key of Object.keys(window)) {
      try {
        const value = window[key];
        if (value && typeof value === 'object' && value !== window) wrap(value);
      } catch (e) { /* some window properties refuse to be read */ }
    }
    if (typeof window.step === 'function' && typeof window.isOver === 'function') wrap(window);

    const vignette = document.createElement('div');
    vignette.id = 'goe-vignette';
    document.body.appendChild(vignette);

    const mute = document.createElement('button');
    mute.id = 'goe-mute';
    mute.setAttribute && mute.setAttribute('aria-label', 'Sound on or off');
    const show = () => { mute.textContent = muted ? '\u{1F507}' : '\u{1F50A}'; };
    const toggle = () => {
      muted = !muted;
      try { localStorage.setItem('goe-muted', muted ? '1' : '0'); } catch (e) { /* private window */ }
      show();
    };
    mute.onclick = toggle;
    show();
    document.body.appendChild(mute);

    window.addEventListener('pointerdown', (e) => {
      lastX = e.clientX;
      lastY = e.clientY;
      if (!started && frames > 3) return;
      blip(420, 22, 'triangle', 0.018);
    }, true);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'm' || e.key === 'M') toggle();
      else if (!started && frames > 3) begin();
    });
  }

  try {
    setup();
    void main;
  } catch (e) { /* the game must still run without the kit */ }
})();
