#!/usr/bin/env node
// Verifies www/index.html, manifest.json, icon.svg and sw.js for every playable mechanic.
// Executes logic.js + index.html scripts inside a sandboxed mock-DOM/Canvas VM to catch
// runtime errors in rendering, resize, pointer/touch and keyboard handlers.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const PLAYABLE = ['playable', 'polished', 'shipped'];

function makeMockCanvas() {
  let drawCalls = 0;
  const grad = () => ({ addColorStop() {} });
  const ctx = new Proxy(
    {
      fillStyle: '#000',
      strokeStyle: '#000',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      globalAlpha: 1,
      font: '16px sans-serif',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      shadowColor: 'transparent',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      fillRect() { drawCalls++; },
      strokeRect() { drawCalls++; },
      clearRect() { drawCalls++; },
      fillText() { drawCalls++; },
      strokeText() { drawCalls++; },
      fill() { drawCalls++; },
      stroke() { drawCalls++; },
      drawImage() { drawCalls++; },
      measureText(t) { return { width: String(t).length * 8 }; },
      createLinearGradient: grad,
      createRadialGradient: grad,
      getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)) }; },
      putImageData() { drawCalls++; },
    },
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        return () => {};
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      },
    }
  );

  const listeners = new Map();
  const canvas = {
    width: 360,
    height: 640,
    style: {},
    getContext() { return ctx; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 360, height: 640 }; },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    removeEventListener() {},
    setPointerCapture() {},
    releasePointerCapture() {},
  };

  return {
    canvas,
    listeners,
    getDrawCalls: () => drawCalls,
  };
}

function checkPlayableDir(dir) {
  const errors = [];
  const www = path.join(dir, 'www');
  for (const req of ['index.html', 'logic.js', 'manifest.json', 'sw.js', 'icon.svg']) {
    if (!fs.existsSync(path.join(www, req))) errors.push(`missing www/${req}`);
  }
  if (errors.length) return errors;

  // 1. Check manifest.json
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(www, 'manifest.json'), 'utf8'));
    if (!manifest.name || !manifest.short_name) errors.push('manifest.json needs name and short_name');
    if (manifest.orientation !== 'portrait') errors.push('manifest.json orientation must be "portrait"');
    if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
      errors.push('manifest.json needs at least one icon');
    } else {
      for (const ic of manifest.icons) {
        if (!ic.src || !fs.existsSync(path.join(www, ic.src))) errors.push(`manifest icon missing: ${ic.src}`);
      }
    }
  } catch (e) {
    errors.push(`manifest.json invalid JSON: ${e.message}`);
  }

  // 2. Check icon.svg
  const svg = fs.readFileSync(path.join(www, 'icon.svg'), 'utf8');
  if (!svg.includes('<svg') || !svg.includes('</svg>')) errors.push('icon.svg is not a valid SVG');

  // 3. Check sw.js syntax and cached FILES list
  try {
    const swSrc = fs.readFileSync(path.join(www, 'sw.js'), 'utf8');
    const cachedFiles = [];
    const syncThen = (val) => ({
      then: (fn) => syncThen(fn ? fn(val) : val),
      catch: () => syncThen(val),
    });
    const swSandbox = {
      self: { addEventListener(type, fn) { if (type === 'install') swSandbox._install = fn; } },
      caches: {
        open: () => syncThen({ addAll: (list) => { cachedFiles.push(...list); return syncThen(); } }),
        keys: () => syncThen([]),
        match: () => syncThen(null),
      },
      fetch: () => syncThen(null),
      Promise,
    };
    vm.runInNewContext(swSrc, swSandbox, { filename: 'sw.js', timeout: 1000 });
    if (swSandbox._install) swSandbox._install({ waitUntil() {} });
    for (const f of cachedFiles) {
      if (f === './' || f === '.') continue;
      if (!fs.existsSync(path.join(www, f))) errors.push(`sw.js caches missing file "${f}"`);
    }
  } catch (e) {
    errors.push(`sw.js error: ${e.message}`);
  }

  // 4. Check index.html + logic.js execution in mock browser VM
  const html = fs.readFileSync(path.join(www, 'index.html'), 'utf8');
  if (!/<canvas\b/i.test(html)) errors.push('index.html has no <canvas> element');
  if (!/<script\s+src=["']logic\.js["']\s*><\/script>/i.test(html)) {
    errors.push('index.html must load logic.js via <script src="logic.js"></script>');
  }

  const inlineScripts = [];
  const scriptRe = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRe.exec(html)) !== null) inlineScripts.push(match[1]);
  if (inlineScripts.length === 0) {
    errors.push('index.html has no inline game script');
    return errors;
  }

  try {
    const { canvas, listeners, getDrawCalls } = makeMockCanvas();
    const winListeners = new Map();
    const storage = new Map();
    let now = 1000;
    const rafQueue = [];
    const timers = [];

    const win = {
      innerWidth: 390,
      innerHeight: 844,
      devicePixelRatio: 2,
      location: { protocol: 'http:', href: 'http://localhost:8123/' },
      navigator: { serviceWorker: { register: () => Promise.resolve() } },
      performance: { now: () => now },
      localStorage: {
        getItem: (k) => (storage.has(k) ? storage.get(k) : null),
        setItem: (k, v) => { storage.set(k, String(v)); },
        removeItem: (k) => { storage.delete(k); },
      },
      addEventListener(type, fn) {
        if (!winListeners.has(type)) winListeners.set(type, []);
        winListeners.get(type).push(fn);
      },
      removeEventListener() {},
      requestAnimationFrame(fn) {
        rafQueue.push(fn);
        return rafQueue.length;
      },
      cancelAnimationFrame() {},
      setTimeout(fn, ms) {
        timers.push({ fn, due: now + (ms || 0) });
        return timers.length;
      },
      clearTimeout() {},
      setInterval() { return 1; },
      clearInterval() {},
      document: {
        getElementById: () => canvas,
        querySelector: () => canvas,
        querySelectorAll: () => [canvas],
        createElement: (tag) => (tag === 'canvas' ? makeMockCanvas().canvas : { style: {}, getContext: () => canvas.getContext('2d') }),
        body: { style: {}, appendChild() {} },
        documentElement: { style: {} },
        addEventListener() {},
      },
    };
    win.window = win;
    win.self = win;
    win.globalThis = win;

    const ctx = vm.createContext(win);
    const logicSrc = fs.readFileSync(path.join(www, 'logic.js'), 'utf8');
    vm.runInContext(logicSrc, ctx, { filename: 'logic.js', timeout: 2000 });
    for (let i = 0; i < inlineScripts.length; i++) {
      vm.runInContext(inlineScripts[i], ctx, { filename: `index.html#script${i + 1}`, timeout: 2000 });
    }

    const stepFrames = (count, dtMs = 16) => {
      for (let i = 0; i < count; i++) {
        now += dtMs;
        const readyTimers = timers.splice(0, timers.length).filter((t) => {
          if (t.due <= now) {
            t.fn();
            return false;
          }
          return true;
        });
        timers.push(...readyTimers);
        const batch = rafQueue.splice(0, rafQueue.length);
        for (const fn of batch) fn(now);
      }
    };

    const emit = (map, type, event) => {
      for (const fn of map.get(type) || []) {
        fn({ preventDefault() {}, stopPropagation() {}, ...event });
      }
    };

    stepFrames(5, 16);
    if (getDrawCalls() === 0) errors.push('index.html executed 5 frames without drawing on canvas');

    // Simulate resize
    win.innerWidth = 360;
    win.innerHeight = 640;
    emit(winListeners, 'resize', {});
    stepFrames(2, 16);

    // Simulate pointer interactions at several logical spots
    for (const [x, y] of [[180, 320], [60, 520], [180, 520], [180, 260], [300, 520], [90, 180]]) {
      emit(listeners, 'pointerdown', { clientX: x, clientY: y, pointerId: 1, buttons: 1, pointerType: 'touch' });
      emit(listeners, 'pointermove', { clientX: x + 20, clientY: y - 40, pointerId: 1, buttons: 1, pointerType: 'touch' });
      emit(listeners, 'pointerup', { clientX: x + 20, clientY: y - 40, pointerId: 1, buttons: 0, pointerType: 'touch' });
      stepFrames(3, 50);
    }
    emit(listeners, 'pointercancel', { pointerId: 1 });

    // Simulate keyboard interactions
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter', 'a', 'd', 'w', 's', '1', '2', 'r', 'z']) {
      emit(winListeners, 'keydown', { key, code: key });
      stepFrames(2, 20);
      emit(winListeners, 'keyup', { key, code: key });
    }
    stepFrames(5, 100);
  } catch (e) {
    errors.push(`index.html runtime error: ${e.message}`);
  }

  return errors;
}

function main() {
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry', 'mechanics.json'), 'utf8'));
  const errors = [];
  let checked = 0;

  for (const m of registry.mechanics.filter((x) => PLAYABLE.includes(x.status))) {
    const label = `${m.id}-${m.slug}`;
    const dir = path.join(ROOT, 'mechanics', label);
    for (const err of checkPlayableDir(dir)) errors.push(`${label}: ${err}`);
    checked += 1;
  }

  if (errors.length) {
    console.error(errors.map((e) => '  - ' + e).join('\n'));
    console.error(`playable check failed: ${errors.length} problem(s)`);
    process.exit(1);
  }
  console.log(`playable ok: ${checked} mechanic(s)`);
}

module.exports = { checkPlayableDir };
if (require.main === module) main();
