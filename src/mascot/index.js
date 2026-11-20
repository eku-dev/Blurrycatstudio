// Billi — scroll choreography.
//
// The cat lives on "stations":
//   • home    – inside the hero photograph (hidden; the photo is the cat)
//   • ledges  – real edges on the page (the marquee band, the services grid,
//               the top of the work section, the footer rule). While it sits
//               on one, the canvas is positioned in the document, so it
//               scrolls with the page on the compositor: no jitter on phones.
//   • floor   – the bottom edge of the window. Here the cat walks, and its
//               stride is scrubbed by the scroll position.
// Moving between stations is a leap, with a short motion echo behind it.

import { Mesh, POSES, POSE_KEYS, buildCat, mixPose, newPose, walkPose, CYCLE_ADVANCE } from './model.js';
import { Renderer } from './renderer.js';

const HOME = 'home';
const FLOOR = 'floor';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const damp = (cur, target, lambda, dt) => cur + (target - cur) * (1 - Math.exp(-lambda * dt));

const DEFAULTS = {
  zIndex: 40,
  headerHeight: 72,
  appearAfter: -1, // visible immediately at scroll=0, sitting on top of #hero-tagline
  mobile: 'full',
  accent: [0.84, 0.61, 0.3], // warm amber eye colour
  // Each ledge is a headline/text block — Billi leaps and sits from one text to the next as you scroll
  ledges: [
    { id: 'tagline', el: '#hero-tagline', edge: 'top', x: { d: 0.5, m: 0.5 }, of: 'el', face: -1 },
    { id: 'manifesto', el: '#manifesto-text', edge: 'top', x: { d: 0.34, m: 0.4 }, of: 'el', face: 1 },
    { id: 'b0', el: '#build-title-0', edge: 'top', x: { d: 0.45, m: 0.5 }, of: 'el', face: -1 },
    { id: 'b1', el: '#build-title-1', edge: 'top', x: { d: 0.45, m: 0.5 }, of: 'el', face: 1 },
    { id: 'b2', el: '#build-title-2', edge: 'top', x: { d: 0.45, m: 0.5 }, of: 'el', face: -1 },
    { id: 'b3', el: '#build-title-3', edge: 'top', x: { d: 0.45, m: 0.5 }, of: 'el', face: 1 },
    { id: 'b4', el: '#build-title-4', edge: 'top', x: { d: 0.45, m: 0.5 }, of: 'el', face: -1 },
    { id: 'process', el: '#process-heading', edge: 'top', x: { d: 0.5, m: 0.5 }, of: 'el', face: 1 },
    { id: 'blackout', el: '#blackout-cta', edge: 'top', x: { d: 0.5, m: 0.5 }, of: 'el', face: -1 },
    { id: 'footerLogo', el: '#footer-logo-perch', edge: 'top', x: { d: 0.5, m: 0.5 }, of: 'el', face: -1, sleep: false },
  ],
  // Floor walk path — as you scroll down, Billi walks along the website in step with scroll
  floor: {
    d: [['start', 0.5], ['buildStart', 0.22], ['buildMid', 0.78], ['processStart', 0.5], ['end', 0.5]],
    m: [['start', 0.5], ['buildStart', 0.2], ['buildMid', 0.8], ['processStart', 0.5], ['end', 0.5]],
  },
};

export function mountBilli(userConfig = {}) {
  if (typeof window === 'undefined' || window.__billi) return window.__billi;
  const cfg = Object.assign({}, DEFAULTS, userConfig);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;

  /* ---------- canvas ---------- */
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.className = 'billi';
  canvas.style.cssText =
    `position:fixed;left:0;bottom:0;top:auto;z-index:${cfg.zIndex};pointer-events:none;` +
    'opacity:0;will-change:transform;contain:layout paint style;-webkit-tap-highlight-color:transparent;';
  const renderer = new Renderer(canvas);
  if (!renderer.ok) return null; // no WebGL: the site simply stays as it was
  document.body.appendChild(canvas);

  const mesh = new Mesh();
  const pose = newPose();
  const tmpA = newPose(), tmpB = newPose(), target = newPose();
  const rot = new Float32Array(9);
  const poseVel = {};

  /* ---------- state ---------- */
  const st = {
    station: HOME, mode: 'hidden', // hidden | rest | leap
    x: 0, y: 0, // ground point, viewport px
    floorX: null,
    phi: Math.PI - 0.45, face: -1, pitch: 0,
    walk: 0, walkPhase: 0, still: 0,
    alpha: 0, alphaTarget: 0,
    land: 9, rest: 0,
    leap: null,
    lum: 0.6, rim: 0.3, shade: 0.06,
    lookYaw: 0, lookPitch: 0, blink: 1, nextBlink: 2, blinkT: 9,
    ear: 0, nextEar: 4, earT: 9,
    sleep: 0, crouch: 0,
    docMode: false,
    hist: [],
    sy: -1, dir: 1, vel: 0,
    pointer: null, pointerAt: -1e9,
    time: 0,
  };
  let U = 120, S = 400, vw = 0, vh = 0, mobile = false, dpr = 1;
  let docH = 0, docW = 0;
  let ledges = [];
  let companion = false, off = false, layoutSig = '';
  let floorKeys = [];
  let sections = {};
  let lastStyle = '';

  const q = (sel) => { try { return document.querySelector(sel); } catch (e) { return null; } };

  function layout() {
    vw = document.documentElement.clientWidth || window.innerWidth;
    vh = window.innerHeight;
    mobile = vw < 768;
    const phoneLike = mobile || (coarse && vw < 1024);
    companion = phoneLike && cfg.mobile === 'companion';
    off = phoneLike && cfg.mobile === 'off';
    U = companion ? clamp(vw * 0.17, 60, 78) : mobile ? clamp(vw * 0.2, 68, 86) : clamp(vw * 0.085, 100, 146);
    S = Math.round(U * 3.3);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = S + 'px';
    canvas.style.height = S + 'px';
    renderer.resize(S, dpr);
    docH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    docW = vw;
    // (re)bind ledges
    const sig = (mobile ? 'm' : 'd') + (companion ? 'c' : '') + (off ? 'o' : '');
    const changed = sig !== layoutSig;
    layoutSig = sig;
    if (changed) {
      ledges = companion || off ? [] : cfg.ledges
        .map((l) => ({ def: l, el: q(l.el), xf: mobile ? l.x.m : l.x.d, x: 0, y: 0, ok: false }))
        .filter((l) => l.xf != null);
    }
    sections = { services: q('#services'), work: q('#work'), process: q('#process'), footer: q('footer') };
    resolveFloorPath();
    lastStyle = '';
    // Only a real change of layout (crossing a breakpoint) resets the cat.
    // Phones fire "resize" every time the address bar slides in or out; that
    // must never interrupt what the cat is doing.
    if (changed) {
      if (typeof st.station === 'number') { st.station = FLOOR; st.floorX = null; }
      if (st.leap) { st.leap = null; st.mode = 'rest'; st.station = FLOOR; st.floorX = null; }
      st.exit = false;
    }
  }

  const docTop = (el) => (el ? el.getBoundingClientRect().top + window.scrollY : null);

  function resolveFloorPath() {
    const sy = window.scrollY;
    const maxS = Math.max(1, docH - vh);
    const bEl = q('#act-build');
    const pEl = q('#act-process');
    const bTop = docTop(bEl);
    const bH = bEl ? bEl.offsetHeight : 0;
    const pTop = docTop(pEl);
    const m = {
      start: 0,
      end: maxS,
      buildStart: bTop != null ? bTop - vh * 0.45 : maxS * 0.24,
      buildMid: bTop != null ? bTop + bH * 0.48 - vh * 0.45 : maxS * 0.5,
      processStart: pTop != null ? pTop - vh * 0.45 : maxS * 0.72,
    };
    const keys = (mobile ? cfg.floor.m : cfg.floor.d)
      .map(([name, x]) => [m[name], x])
      .filter((k) => k[0] != null)
      .sort((a, b) => a[0] - b[0]);
    floorKeys = keys;
    void sy;
  }

  function floorXAt(sy) {
    const k = floorKeys;
    if (!k.length) return 0.8 * vw;
    if (sy <= k[0][0]) return k[0][1] * vw;
    for (let i = 0; i < k.length - 1; i++) {
      if (sy <= k[i + 1][0]) {
        const t = smooth(k[i][0], k[i + 1][0], sy);
        return lerp(k[i][1], k[i + 1][1], t) * vw;
      }
    }
    return k[k.length - 1][1] * vw;
  }

  const catHeight = () => U * 1.08;
  const minY = () => cfg.headerHeight + catHeight() + 8;
  const maxY = () => vh - 6;

  function measure() {
    for (let i = 0; i < ledges.length; i++) {
      const l = ledges[i];
      if (!l.el || !l.el.isConnected) { l.el = q(l.def.el); if (!l.el) { l.ok = false; continue; } }
      const r = l.el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) { l.ok = false; continue; }
      l.ok = true;
      l.y = l.def.edge === 'bottom' ? r.bottom : r.top;
      l.x = l.def.of === 'el' ? r.left + r.width * l.xf : vw * l.xf;
    }
  }

  // Where the photographed cat sits on its plinth (viewport px).
  function homePos() {
    const hero = q('#top');
    if (!hero) return { x: vw * 0.7, y: vh * 0.7 };
    const box = hero.firstElementChild || hero;
    const r = box.getBoundingClientRect();
    let rect;
    if (r.width / r.height >= 1) {
      const e = r.height * 1.04;
      rect = { x: r.width - e * 0.97, y: -e * 0.02, w: e };
    } else {
      const h1 = hero.querySelector('h1');
      const cta = hero.querySelector('.mt-auto');
      const o = h1 ? h1.getBoundingClientRect().bottom - r.top + 16 : r.height * 0.3;
      const s2 = cta ? cta.getBoundingClientRect().top - r.top - 12 : r.height * 0.75;
      const c = Math.min(r.width * 1.15, Math.max(160, s2 - o) / 0.73);
      rect = { x: r.width * 0.5 - c * 0.47, y: o - c * 0.17, w: c };
    }
    return { x: r.left + rect.x + rect.w * 0.5, y: r.top + rect.y + rect.w * 0.765 };
  }

  function posOf(station) {
    if (station === HOME) return homePos();
    if (station === FLOOR) return { x: reduced ? vw * (mobile ? 0.82 : 0.9) : floorXAt(window.scrollY), y: vh };
    const l = ledges[station];
    return { x: l.x, y: l.y };
  }

  function desired(sy) {
    if (off) return HOME;
    if (companion) return sy < vh * 0.3 ? HOME : FLOOR;
    if (sy < cfg.appearAfter) return HOME;
    const lo = minY(), hi = maxY();

    // Hero sticky section transitions cleanly from #hero-tagline -> #manifesto-text
    const arrivalH = vh * 1.05;
    const isLedgeAllowed = (l) => {
      if (l.def.id === 'tagline') return sy < arrivalH * 0.28;
      if (l.def.id === 'manifesto') return sy >= arrivalH * 0.28 && sy < arrivalH * 1.15;
      return true;
    };

    const cur = st.mode === 'leap' ? st.leap.to : st.station;
    const focusY = vh * 0.48;
    let best = FLOOR, bestScore = 1e9;
    for (let i = 0; i < ledges.length; i++) {
      const l = ledges[i];
      if (!l.ok || !isLedgeAllowed(l)) continue;
      const minAllowed = l.def.id === 'footerLogo' ? catHeight() * 0.85 : lo + 24;
      if (l.y < minAllowed || l.y > hi - 20) continue;
      const ahead = l.y - st.vel * 0.45;
      if (ahead < minAllowed - 14 || ahead > hi - 10) continue;
      const score = Math.abs(l.y - focusY) - (cur === i ? 60 : 0) - (l.def.id === 'footerLogo' ? 140 : 0);
      if (score < bestScore) { bestScore = score; best = i; }
    }
    return best;
  }

  /* ---------- leaping ---------- */
  function startLeap(to, chained) {
    const from = chained ? FLOOR : st.station;
    const p0 = st.mode === 'hidden' ? posOf(from) : { x: st.x, y: st.y };
    const p1 = posOf(to);
    const dist = Math.hypot(p1.x - p0.x, clamp(p1.y, -vh, 2 * vh) - clamp(p0.y, -vh, 2 * vh));
    st.leap = {
      from, to, t: st.mode === 'hidden' || chained ? 0 : -0.085,
      dur: clamp(0.36 + dist / 1500, 0.42, 0.8),
      fixedStart: p0,
      retarget: null,
    };
    st.x = p0.x; st.y = p0.y;
    st.mode = 'leap';
    st.hist.length = 0;
    st.sleep = 0;
    setDocMode(false);
  }

  function leapPoint(u, p0, p1) {
    const dy = p1.y - p0.y;
    const dist = Math.hypot(p1.x - p0.x, dy);
    const H = dist < 8 ? clamp(U * 1.05, 74, 132) : clamp(dist * 0.2, 22, 140);
    const down = 0.4 * u + 0.6 * u * u;
    const up = 1 - (0.4 * (1 - u) + 0.6 * (1 - u) * (1 - u));
    const w = dy >= 0 ? down : up;
    return { x: lerp(p0.x, p1.x, u), y: lerp(p0.y, p1.y, w) - H * 4 * u * (1 - u) };
  }

  function setDocMode(on) {
    if (st.docMode === on) return;
    st.docMode = on;
    canvas.style.position = on ? 'absolute' : 'fixed';
    canvas.style.top = on ? '0' : 'auto';
    canvas.style.bottom = on ? 'auto' : '0';
    lastStyle = '';
  }

  /* ---------- small gestures (phones) ---------- */
  // The companion cat stays in its corner, but scrolling wakes it up a
  // little: every so often it does one small thing — tilts its head, bats a
  // paw at the passing page, washes its face, watches the content go by,
  // gets up for a stretch — and a quick flick of the page makes it crouch
  // and wiggle as if about to pounce.
  const GESTURES = ['tilt', 'bat', 'watch', 'groom', 'stretch', 'tilt2', 'bat', 'watch'];
  const DUR = { tilt: 1.5, tilt2: 1.5, bat: 1.7, watch: 1.6, groom: 2.6, stretch: 2.2, wiggle: 1.0 };
  function gestures(dt, dsy, moving) {
    st.act = damp(st.act || 0, Math.min(1, Math.abs(st.vel) / 900), 6, dt);
    st.acc = (st.acc || 0) + Math.abs(dsy);
    const idle = !moving && st.walk < 0.05 && st.sleep < 0.1 && st.rest > 0.8;
    if (!st.gesture && idle) {
      if (Math.abs(st.vel) > 2200 && (st.sinceWiggle || 9) > 4) {
        st.gesture = { type: 'wiggle', t: 0 }; st.sinceWiggle = 0;
      } else if (st.acc > vh * 1.15) {
        st.gi = ((st.gi == null ? -1 : st.gi) + 1) % GESTURES.length;
        st.gesture = { type: GESTURES[st.gi], t: 0, dir: st.dir };
        st.acc = 0;
      }
    }
    st.sinceWiggle = (st.sinceWiggle || 0) + dt;
    const g = st.gesture;
    if (!g) return;
    if (!idle && g.t > 0.1) { st.gesture = null; return; }
    g.t += dt;
    const u = g.t / DUR[g.type];
    if (u >= 1) { st.gesture = null; return; }
    const e = smooth(0, 0.22, u) * (1 - smooth(0.74, 1, u)); // ease in, hold, ease out
    const t = g.t;
    switch (g.type) {
      case 'tilt':
      case 'tilt2':
        target.headTilt += (g.type === 'tilt' ? 0.42 : -0.38) * e;
        target.headYaw += 0.18 * e;
        target.ear -= 0.1 * e;
        break;
      case 'bat': // a paw lifted to swat at the page as it goes by
        target.flX += (0.16 + Math.sin(t * 9) * 0.045) * e;
        target.flY += (0.36 + Math.cos(t * 9) * 0.05) * e;
        target.headPitch += 0.16 * e;
        target.headYaw -= 0.3 * e;
        target.chestX += 0.02 * e;
        break;
      case 'watch': // follows the content up or down, then back
        target.headPitch += -0.42 * g.dir * e;
        target.headY += (g.dir > 0 ? 0.02 : -0.015) * e;
        target.headYaw += Math.sin(t * 2.2) * 0.2 * e;
        break;
      case 'groom': // washes its face with a forepaw
        target.flX += 0.07 * e;
        target.flY += (0.6 + Math.sin(t * 7) * 0.035) * e;
        target.headPitch += (0.42 + Math.sin(t * 7 + 0.6) * 0.07) * e;
        target.headX += 0.02 * e;
        target.headY -= 0.05 * e;
        target.headYaw -= 0.35 * e;
        target.eye -= 0.55 * e;
        break;
      case 'stretch': // up on all fours, a long arch, and back down
        mixPose(target, target, POSES.stand, e * 0.92);
        target.arch += 0.07 * e;
        target.headPitch += 0.2 * e;
        target.tailA = lerp(target.tailA, 2.2, e); target.tailK1 = lerp(target.tailK1, -1.2, e);
        break;
      case 'wiggle': // crouch, shimmy the hips — the pre-pounce
        mixPose(target, target, POSES.crouch, e * 0.8);
        target.hipX += Math.sin(t * 26) * 0.022 * e;
        target.hipY += Math.abs(Math.sin(t * 26)) * 0.012 * e;
        target.ear += 0.3 * e;
        break;
    }
  }

  /* ---------- background tone under the cat ---------- */
  let toneAt = 0;
  function sampleTone(now) {
    if (now - toneAt < 180) return;
    toneAt = now;
    const px = clamp(st.x, 2, vw - 2), py = clamp(st.y - U * 0.4, 2, vh - 2);
    let el = document.elementFromPoint(px, py);
    let lum = 0.5;
    let depth = 0;
    while (el && depth++ < 12) {
      const tag = el.tagName;
      if (tag === 'IMG' || tag === 'CANVAS' || tag === 'VIDEO') { lum = 0.55; break; }
      const cs = getComputedStyle(el);
      const c = parseColor(cs.backgroundColor);
      if (c && c[3] > 0.5) { lum = (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; break; }
      if (cs.backgroundImage && cs.backgroundImage !== 'none') { lum = 0.55; break; }
      el = el.parentElement;
    }
    st.lum = lum;
  }
  const colorCtx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const colorCache = new Map();
  function parseColor(str) {
    if (!str || str === 'transparent' || str === 'rgba(0, 0, 0, 0)') return null;
    if (colorCache.has(str)) return colorCache.get(str);
    let out = null;
    const m = /^rgba?\(([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:[,/ ]+([\d.]+%?))?\)$/.exec(str);
    if (m) out = [+m[1], +m[2], +m[3], m[4] == null ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : +m[4]];
    else if (colorCtx) {
      // oklab()/oklch()/color-mix(): let the browser resolve it
      try {
        colorCtx.clearRect(0, 0, 1, 1);
        colorCtx.fillStyle = '#000';
        colorCtx.fillStyle = str;
        colorCtx.fillRect(0, 0, 1, 1);
        const d = colorCtx.getImageData(0, 0, 1, 1).data;
        out = [d[0], d[1], d[2], d[3] / 255];
        if (d[3] > 0) out = [d[0] * 255 / d[3], d[1] * 255 / d[3], d[2] * 255 / d[3], d[3] / 255];
      } catch (e) { out = null; }
    }
    colorCache.set(str, out);
    return out;
  }

  /* ---------- frame ---------- */
  let last = performance.now();
  let raf = 0;
  let frame = 0;
  let dirty = true;
  let dtS = 0;

  function tick(now) {
    raf = requestAnimationFrame(tick);
    // frame times on phones are uneven; easing them keeps motion from stuttering
    const rawDt = Math.min(0.1, Math.max(0.001, (now - last) / 1000));
    dtS = dtS ? dtS + (rawDt - dtS) * 0.25 : rawDt;
    const dt = Math.min(0.1, Math.max(0.001, rawDt > dtS * 3 ? rawDt : dtS));
    const sy = window.scrollY;
    const scrolled = sy !== st.sy;
    const dsy = st.sy < 0 ? 0 : sy - st.sy;
    if (scrolled) { st.dir = sy > st.sy ? 1 : -1; }
    // px/s, smoothed: used to avoid leaping at ledges that are flying past
    // (an instant jump — anchor link, restore, scrollTo — is not a velocity)
    st.vel = st.sy < 0 || Math.abs(sy - st.sy) > vh * 0.6 ? 0 : damp(st.vel, (sy - st.sy) / dt, 10, dt);
    frame++;

    // nothing on screen and nothing changed: stay idle
    if (st.mode === 'hidden' && st.alpha < 0.004 && !scrolled && !dirty) { last = now; return; }
    // resting: idle motion at half rate is plenty
    last = now;
    dirty = false;
    st.sy = sy;
    st.time += dt;

    measure();
    const blocked = document.documentElement.style.overflow === 'hidden' || document.documentElement.classList.contains('lenis-stopped');
    const want = desired(sy);

    /* --- station logic --- */
    if (st.mode === 'hidden') {
      if (want !== HOME && companion) {
        // phones: stroll in from beyond the right edge
        st.station = FLOOR; st.mode = 'rest'; st.land = 9; st.rest = 0; st.exit = false;
        st.floorX = reduced ? vw - U * 1.0 : vw + U * 0.9;
        st.x = st.floorX; st.y = vh; st.face = -1; st.phi = Math.PI - 0.45;
      } else if (want !== HOME) {
        if (reduced || sy > vh * 1.2 || (typeof want === 'number' && ledges[want]?.def.id === 'tagline')) {
          // start seated calmly right on top of #hero-tagline (or mid-page on reload)
          st.station = want; st.mode = 'rest'; st.land = 9;
          const p = posOf(want); st.x = p.x; st.y = p.y; st.floorX = p.x;
          st.face = typeof want === 'number' ? ledges[want].def.face : -1;
          st.phi = st.face > 0 ? 0.45 : Math.PI - 0.45;
        } else {
          st.station = HOME;
          startLeap(want);
        }
      }
    } else if (st.mode === 'rest') {
      if (companion) {
        st.exit = want === HOME; // back at the top: stroll off again
        if (st.exit && reduced) { st.mode = 'hidden'; st.station = HOME; st.exit = false; }
      } else if (want !== st.station && st.rest > 0.12) {
        if (reduced) {
          st.station = want;
          if (want === HOME) st.mode = 'hidden';
          else { const p = posOf(want); st.x = p.x; st.y = p.y; st.floorX = p.x; }
        } else {
          startLeap(want);
        }
      }
    } else if (st.mode === 'leap') {
      const L = st.leap;
      if (want !== L.to && !L.retarget) {
        const u = L.t / L.dur;
        if (u < 0.55) { L.retarget = { from: posOf(L.to), k: 0 }; L.to = want; }
        else if (want !== HOME || L.to !== HOME) startLeap(want, true); // change of plan in mid-air
      }
    }

    /* --- position & pose target --- */
    let pitchT = 0;
    let scaleX = 1, scaleY = 1;
    let echoAmt = 0;
    let shadow = 1;
    let alphaT = 1;
    let poseLambda = 16;
    let swingL = 0, swingR = 0;

    if (st.mode === 'leap') {
      const L = st.leap;
      L.t += dt;
      let p0 = L.fixedStart || posOf(L.from);
      let p1 = posOf(L.to);
      if (L.retarget) {
        L.retarget.k = Math.min(1, L.retarget.k + dt / 0.16);
        const k = smooth(0, 1, L.retarget.k);
        p1 = { x: lerp(L.retarget.from.x, p1.x, k), y: lerp(L.retarget.from.y, p1.y, k) };
        if (L.retarget.k >= 1) L.retarget = null;
      }
      // a station that is far off-screen: enter from just beyond the edge
      p0 = { x: p0.x, y: clamp(p0.y, -vh * 0.25, vh * 1.25) };
      p1 = { x: p1.x, y: clamp(p1.y, -vh * 0.25, vh * 1.25) };
      const u = clamp(L.t / L.dur, 0, 1);
      const ue = lerp(u, u * u * (3 - 2 * u), 0.45); // gentler push-off and touchdown
      const p = L.t < 0 ? p0 : leapPoint(ue, p0, p1);
      const px = st.x, py = st.y;
      st.x = p.x; st.y = p.y;
      const vx = (st.x - px) / dt, vy = (st.y - py) / dt;
      const speed = Math.hypot(vx, vy);
      const dx = p1.x - p0.x;
      if (Math.abs(dx) > 36) st.face = dx > 0 ? 1 : -1;
      if (L.t < 0) {
        mixPose(target, POSES.sit, POSES.crouch, 0.9);
        poseLambda = 30;
      } else {
        if (u < 0.3) mixPose(target, POSES.crouch, POSES.leapOut, smooth(0, 0.3, u));
        else if (u < 0.62) mixPose(target, POSES.leapOut, POSES.leapTuck, smooth(0.3, 0.62, u));
        else mixPose(target, POSES.leapTuck, POSES.leapReach, smooth(0.62, 0.95, u));
        poseLambda = 22;
        if (speed > 40) pitchT = clamp(Math.atan2(-vy, Math.abs(vx) + 80), -0.72, 0.72) * smooth(0, 0.12, u) * (1 - smooth(0.82, 1, u));
        echoAmt = smooth(260, 900, speed);
        scaleX = 1 + 0.05 * Math.sin(u * Math.PI);
        scaleY = 1 - 0.03 * Math.sin(u * Math.PI);
      }
      shadow = 1 - smooth(0, 0.12, u) * (1 - smooth(0.88, 1, u));
      if (L.from === HOME) alphaT = smooth(0.02, 0.4, u);
      if (L.to === HOME) alphaT = 1 - smooth(0.55, 0.95, u);
      st.hist.unshift(st.x, st.y);
      if (st.hist.length > 16) st.hist.length = 16;
      if (u >= 1) {
        st.station = L.to;
        st.leap = null;
        st.land = 0; st.rest = 0; st.still = 0;
        if (L.to === HOME) { st.mode = 'hidden'; alphaT = 0; }
        else {
          st.mode = 'rest';
          st.floorX = st.x;
          if (typeof L.to === 'number') st.face = ledges[L.to].def.face;
        }
      }
    } else if (st.mode === 'rest') {
      st.land += dt; st.rest += dt;
      const onLedge = typeof st.station === 'number';
      if (onLedge) {
        const l = ledges[st.station];
        st.x = l.x; st.y = l.y;
        setDocMode(true);
        // the closer the ledge gets to leaving the screen, the deeper the crouch
        const nearTop = 1 - smooth(0, 70, l.y - minY());
        const nearBottom = 1 - smooth(0, 50, maxY() - l.y);
        st.crouch = damp(st.crouch, Math.max(nearTop, nearBottom) * 0.75, 12, dt);
        st.still += dt;
        const wantSleep = l.def.sleep && st.still > 1.8 && !scrolled;
        if (scrolled) st.still = 0;
        st.sleep = damp(st.sleep, wantSleep ? 1 : 0, wantSleep ? 2.2 : 9, dt);
        mixPose(tmpA, POSES.sit, POSES.crouch, st.crouch);
        mixPose(target, tmpA, POSES.sleep, smooth(0, 1, st.sleep));
        st.walk = damp(st.walk, 0, 10, dt);
      } else {
        // the floor: walk to wherever the scroll position says
        setDocMode(false);
        const tx = companion ? (st.exit ? vw + U * 0.95 : vw - U * 1.0)
          : reduced ? vw * (mobile ? 0.82 : 0.9) : floorXAt(sy);
        if (st.floorX == null) st.floorX = tx;
        const before = st.floorX;
        // companion: an unhurried, constant walking pace, independent of scroll
        const maxStep = (companion ? U * 2.3 : U * 7.5) * dt; // top speed, so a flick of the wheel becomes a trot not a slide
        const step = companion ? clamp(tx - st.floorX, -maxStep, maxStep)
          : clamp((tx - st.floorX) * (1 - Math.exp(-7 * dt)), -maxStep, maxStep);
        st.floorX += step;
        const moved = st.floorX - before;
        st.x = st.floorX; st.y = vh;
        const moving = Math.abs(tx - st.floorX) > 1.5;
        if (moving) {
          st.still = 0;
          if (Math.abs(moved) > 0.05) st.face = moved > 0 ? 1 : -1;
        } else st.still += dt;
        st.walkPhase += Math.abs(moved) / (CYCLE_ADVANCE * U);
        st.walk = damp(st.walk, moving || st.still < 0.35 ? 1 : 0, moving ? 14 : 5, dt);
        st.crouch = damp(st.crouch, 0, 10, dt);
        if (scrolled) st.still = Math.min(st.still, 0.4);
        // companion: at the very end of the page, curl up and sleep
        const napping = companion && !moving && st.still > 2.2 && sy > docH - vh - 140;
        st.sleep = damp(st.sleep, napping ? 1 : 0, napping ? 2.2 : 9, dt);
        walkPose(tmpA, st.walkPhase, 1);
        swingL = tmpA._hlSwing; swingR = tmpA._hrSwing;
        mixPose(tmpB, POSES.sitFloor, tmpA, smooth(0, 1, st.walk));
        mixPose(target, tmpB, POSES.sleep, smooth(0, 1, st.sleep));
        if (companion && !reduced) gestures(dt, dsy, moving);
        poseLambda = st.walk > 0.5 ? 40 : st.gesture ? 22 : 12;
        if (companion && !moving) st.face = -1; // settle facing into the page
        if (companion && st.exit && st.floorX >= vw + U * 0.9) { st.mode = 'hidden'; st.station = HOME; st.exit = false; }
      }
      // landing: absorb, then settle
      if (st.land < 0.5) {
        const k = Math.exp(-st.land * 9);
        mixPose(target, target, POSES.crouch, k * 0.85);
        scaleY = 1 - 0.09 * k; scaleX = 1 + 0.05 * k;
      }
    } else {
      alphaT = 0;
    }

    if (blocked) alphaT = 0;
    st.alpha = reduced ? damp(st.alpha, alphaT, 8, dt) : (st.mode === 'leap' ? alphaT : damp(st.alpha, alphaT, 14, dt));

    // pose easing
    // Each joint follows its target on a critically damped spring, so it
    // accelerates into a move and settles out of it — no sudden starts.
    {
      const w = poseLambda * 1.25, ex = Math.exp(-w * dt);
      for (let k = 0; k < POSE_KEYS.length; k++) {
        const key = POSE_KEYS[k];
        const d = pose[key] - target[key];
        const v = poseVel[key] || 0;
        const tmp = (v + w * d) * dt;
        pose[key] = target[key] + (d + tmp) * ex;
        poseVel[key] = (v - w * tmp) * ex;
      }
    }
    pose._hlSwing = swingL * st.walk;
    pose._hrSwing = swingR * st.walk;

    // facing: turn through the camera, never away from it
    const phiT = st.face > 0 ? 0.45 : Math.PI - 0.45;
    st.phi = damp(st.phi, phiT, 9, dt);
    st.pitch = damp(st.pitch, pitchT, 16, dt);

    // idle life
    st.nextBlink -= dt; st.blinkT += dt;
    if (st.nextBlink <= 0) { st.nextBlink = 2.4 + Math.random() * 4; st.blinkT = 0; }
    const blink = st.blinkT < 0.2 ? 0.5 + 0.5 * Math.cos((st.blinkT / 0.2) * Math.PI * 2) : 1;
    st.nextEar -= dt; st.earT += dt;
    if (st.nextEar <= 0) { st.nextEar = 3 + Math.random() * 6; st.earT = 0; }
    const earTw = st.earT < 0.28 ? Math.sin((st.earT / 0.28) * Math.PI) * 0.8 : 0;

    // Track cursor continuously: turn body toward cursor side and aim head/eyes directly at it
    let lookY = 0, lookP = 0;
    if (st.mode === 'rest' && st.pointer && st.sleep < 0.45) {
      const hx = st.x, hy = st.y - U * 0.78;
      const ddx = st.pointer.x - hx, ddy = st.pointer.y - hy;
      // Gently turn Billi to face whichever side of her the cursor is on
      if (st.walk < 0.12 && Math.abs(ddx) > U * 0.45) {
        st.face = ddx > 0 ? 1 : -1;
      }
      // Head yaw: turn smoothly from looking ahead (far side) to looking toward camera (when cursor is near center)
      const distX = clamp(Math.abs(ddx) / (U * 3.2), 0, 1);
      lookY = lerp(0.72, -0.22, distX);
      // Head pitch: negative ddy (cursor above cat) -> negative lookP -> head tilts UP
      lookP = clamp(ddy / (U * 2.4), -0.58, 0.52);
    }
    if (st.mode === 'rest' && typeof st.station === 'number' && st.crouch > 0.2) lookP += st.crouch * 0.25 * st.dir;
    // companion: a glance in the direction the page is moving
    if (scrolled) st.scrollAt = now;
    if (companion && st.sleep < 0.3 && !st.gesture && now - (st.scrollAt || -1e9) < 450) lookP += 0.24 * st.dir;
    st.lookYaw = damp(st.lookYaw, lookY, 10, dt);
    st.lookPitch = damp(st.lookPitch, lookP, 10, dt);

    // tone
    if (st.alpha > 0.01) sampleTone(now);
    const dark = 1 - smooth(0.16, 0.62, st.lum);
    st.rim = damp(st.rim, lerp(0.14, 0.6, dark), 5, dt);
    st.shade = damp(st.shade, lerp(0.056, 0.125, dark), 5, dt);

    /* --- draw --- */
    buildCat(mesh, pose, {
      time: st.time, tailSway: reduced ? 0 : lerp(1, 0.35, st.walk) * (1 - st.sleep * 0.75) * (1 + (companion ? (st.act || 0) * 1.3 : 0)),
      breathe: 1 + st.sleep, blink, lookYaw: st.lookYaw, lookPitch: st.lookPitch,
      earTwitch: 0, earTwitchL: earTw, side: clamp(Math.cos(st.phi) * 2.6, -1, 1),
    });
    const c = Math.cos(st.phi), s = Math.sin(st.phi), cp = Math.cos(st.pitch), sp = Math.sin(st.pitch);
    rot[0] = c * cp; rot[1] = sp; rot[2] = s * cp;
    rot[3] = -c * sp; rot[4] = cp; rot[5] = -s * sp;
    rot[6] = -s; rot[7] = 0; rot[8] = c;

    // canvas placement (and where the cat's ground point falls inside it)
    let left, top, tf;
    const ax = 0.5, ay = 0.74;
    if (st.docMode) {
      const dx = st.x + window.scrollX, dy = st.y + sy;
      left = clamp(dx - S * ax, 0, Math.max(0, docW - S));
      top = Math.min(dy - S * ay, Math.max(0, docH - S));
      tf = `translate3d(${left.toFixed(1)}px,${top.toFixed(1)}px,0)`;
      left -= window.scrollX; top -= sy;
    } else {
      left = st.x - S * ax;
      top = st.y - S * ay;
      tf = `translate3d(${left.toFixed(1)}px,${(top + S - vh).toFixed(1)}px,0)`;
    }
    const ox = ((st.x - left) / S) * 2 - 1;
    const oy = 1 - ((st.y - top) / S) * 2;
    const op = st.alpha > 0.004 ? '1' : '0';
    const style = tf + '|' + op;
    if (style !== lastStyle) {
      canvas.style.transform = tf;
      canvas.style.opacity = op;
      lastStyle = style;
    }

    const echoes = [];
    if (echoAmt > 0.02 && st.hist.length >= 4) {
      const al = [0.24, 0.14, 0.07];
      for (let k = 0; k < 3; k++) {
        const idx = (k + 1) * 4;
        if (st.hist.length < idx + 2) break;
        echoes.push({ x: ((st.hist[idx] - st.x) * 2) / S, y: (-(st.hist[idx + 1] - st.y) * 2) / S, a: al[k] * echoAmt });
      }
    }
    const D = 7;
    const light = 1 - dark;
    renderer.draw(mesh, {
      rot, pivot: [0, 0.4, 0], scale: [scaleX, scaleY, 1],
      focal: (2 * U * D) / S, dist: D, ox, oy,
      base: [st.shade, st.shade, st.shade * 0.95], rim: [0.96, 0.95, 0.92], rimAmt: st.rim,
      eye: cfg.accent, alpha: st.alpha,
      shadow: 0.2 * light * shadow * (1 - st.walk * 0.3),
      shadowRect: [ox, oy, (U * 0.4 * 2) / S, (U * 0.035 * 2) / S],
      echoes,
    });
  }

  /* ---------- wiring ---------- */
  const relayout = () => { layout(); dirty = true; };
  let resizeT = 0;
  const onResize = () => { clearTimeout(resizeT); resizeT = setTimeout(relayout, 120); };
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('orientationchange', onResize, { passive: true });
  window.addEventListener('load', onResize, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(onResize).observe(document.body);
  if (window.matchMedia('(hover: hover)').matches) {
    window.addEventListener('pointermove', (e) => {
      st.pointer = { x: e.clientX, y: e.clientY };
      st.pointerAt = performance.now();
    }, { passive: true });
  }
  window.addEventListener('pointerdown', (e) => {
    if (st.alpha < 0.2 || st.mode !== 'rest') return;
    const hitR = clamp(U * 0.95, 75, 135);
    const dx = e.clientX - st.x;
    const dy = e.clientY - (st.y - U * 0.52);
    if (dx * dx + dy * dy <= hitR * hitR) {
      st.earT = 0;
      st.blinkT = 0;
      st.sleep = 0;
      st.rest = 0;
      // Trigger a joyful in-place hop & land right back into a sit
      const spot = { x: st.x, y: st.y };
      st.leap = {
        from: st.station,
        to: st.station,
        t: -0.095,
        dur: 0.56,
        fixedStart: spot,
        retarget: null,
      };
      st.mode = 'leap';
      st.hist.length = 0;
      setDocMode(false);
      dirty = true;
      if (typeof cfg.onPet === 'function') cfg.onPet();
    }
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) { last = performance.now(); dirty = true; raf = requestAnimationFrame(tick); }
  });

  layout();
  raf = requestAnimationFrame(tick);

  const api = {
    state: st,
    refresh: relayout,
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      canvas.remove();
      window.__billi = null;
    },
  };
  window.__billi = api;
  return api;
}

// Mount once the page's own app has rendered its sections.
function boot() {
  const start = () => {
    let tries = 0;
    const attempt = () => {
      if (document.querySelector('#top') || tries++ > 40) mountBilli(window.BILLI_CONFIG || {});
      else setTimeout(attempt, 150);
    };
    attempt();
  };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}
boot();
