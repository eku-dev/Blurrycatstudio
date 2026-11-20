// Billi — the Blurrycat mascot.
// A procedural cat: every frame the body is rebuilt from a small "pose"
// (a handful of joint positions) into tubes and ellipsoids. Because the cat
// is black, the silhouette does all the work, so smooth primitives that
// overlap read as one continuous body.
//
// Cat space: x = forward (nose), y = up, z = toward the cat's left side.
// Ground is y = 0, the origin sits between the paws. One unit ≈ body length.

const TAU = Math.PI * 2;

export const MAT = { BODY: 0, EYE: 1, PUPIL: 2, WHISKER: 3, IRIS_RIM: 4, GLINT: 5, NOSE: 6, EAR_IN: 7 };

/* ------------------------------------------------------------------ */
/* small vector helpers (plain arrays, allocation-light)               */
/* ------------------------------------------------------------------ */
const v3 = (x = 0, y = 0, z = 0) => [x, y, z];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/* ------------------------------------------------------------------ */
/* dynamic mesh                                                        */
/* ------------------------------------------------------------------ */
export class Mesh {
  constructor(maxVerts = 6000, maxIdx = 30000) {
    // interleaved: px py pz nx ny nz mat
    this.stride = 7;
    this.v = new Float32Array(maxVerts * this.stride);
    this.i = new Uint16Array(maxIdx);
    this.nv = 0;
    this.ni = 0;
  }
  reset() {
    this.nv = 0;
    this.ni = 0;
  }
  vert(p, n, m) {
    const o = this.nv * 7;
    const v = this.v;
    v[o] = p[0]; v[o + 1] = p[1]; v[o + 2] = p[2];
    v[o + 3] = n[0]; v[o + 4] = n[1]; v[o + 5] = n[2];
    v[o + 6] = m;
    return this.nv++;
  }
  tri(a, b, c) {
    const i = this.i;
    i[this.ni++] = a; i[this.ni++] = b; i[this.ni++] = c;
  }

  // Rings stitched into a skin. rings: [{c, r, t}] centre, radius, tangent.
  // Frames are parallel-transported so the tube never twists.
  tube(pts, radii, seg, div, mat) {
    // Catmull-Rom resample
    const P = [];
    const R = [];
    const n = pts.length;
    for (let k = 0; k < n - 1; k++) {
      const p0 = pts[Math.max(0, k - 1)], p1 = pts[k], p2 = pts[k + 1], p3 = pts[Math.min(n - 1, k + 2)];
      const r0 = radii[Math.max(0, k - 1)], r1 = radii[k], r2 = radii[k + 1], r3 = radii[Math.min(n - 1, k + 2)];
      const steps = k === n - 2 ? div + 1 : div;
      for (let s = 0; s < steps; s++) {
        const t = s / div, t2 = t * t, t3 = t2 * t;
        const c0 = -0.5 * t3 + t2 - 0.5 * t, c1 = 1.5 * t3 - 2.5 * t2 + 1, c2 = -1.5 * t3 + 2 * t2 + 0.5 * t, c3 = 0.5 * t3 - 0.5 * t2;
        P.push([
          p0[0] * c0 + p1[0] * c1 + p2[0] * c2 + p3[0] * c3,
          p0[1] * c0 + p1[1] * c1 + p2[1] * c2 + p3[1] * c3,
          p0[2] * c0 + p1[2] * c1 + p2[2] * c2 + p3[2] * c3,
        ]);
        R.push(Math.max(0.004, r0 * c0 + r1 * c1 + r2 * c2 + r3 * c3));
      }
    }
    const m = P.length;
    // tangents
    const T = [];
    for (let k = 0; k < m; k++) T.push(norm(sub(P[Math.min(m - 1, k + 1)], P[Math.max(0, k - 1)])));
    // initial frame
    let N = Math.abs(T[0][2]) < 0.9 ? norm(cross(T[0], [0, 0, 1])) : norm(cross(T[0], [0, 1, 0]));
    let B = cross(T[0], N);
    const ringStart = [];
    const ring = (c, r, Nn, Bn, tan, bias) => {
      const start = this.nv;
      for (let s = 0; s < seg; s++) {
        const a = (s / seg) * TAU, ca = Math.cos(a), sa = Math.sin(a);
        const nx = Nn[0] * ca + Bn[0] * sa, ny = Nn[1] * ca + Bn[1] * sa, nz = Nn[2] * ca + Bn[2] * sa;
        // bias tilts the normal along the tangent for rounded end caps
        const q = norm([nx + tan[0] * bias, ny + tan[1] * bias, nz + tan[2] * bias]);
        this.vert([c[0] + nx * r, c[1] + ny * r, c[2] + nz * r], q, mat);
      }
      return start;
    };
    // rounded start cap
    ringStart.push(ring(sub(P[0], mul(T[0], R[0] * 0.92)), R[0] * 0.3, N, B, T[0], -3));
    ringStart.push(ring(sub(P[0], mul(T[0], R[0] * 0.55)), R[0] * 0.78, N, B, T[0], -0.8));
    for (let k = 0; k < m; k++) {
      if (k > 0) {
        // parallel transport
        const ax = cross(T[k - 1], T[k]);
        const s = len(ax);
        if (s > 1e-5) {
          const c = dot(T[k - 1], T[k]);
          const a = norm(ax);
          const rot = (v) => {
            const d = dot(a, v);
            const cr = cross(a, v);
            return [
              v[0] * c + cr[0] * s + a[0] * d * (1 - c),
              v[1] * c + cr[1] * s + a[1] * d * (1 - c),
              v[2] * c + cr[2] * s + a[2] * d * (1 - c),
            ];
          };
          N = norm(rot(N));
        }
        B = cross(T[k], N);
      }
      ringStart.push(ring(P[k], R[k], N, B, T[k], 0));
    }
    const e = m - 1;
    ringStart.push(ring(add(P[e], mul(T[e], R[e] * 0.55)), R[e] * 0.78, N, B, T[e], 0.8));
    ringStart.push(ring(add(P[e], mul(T[e], R[e] * 0.92)), R[e] * 0.3, N, B, T[e], 3));
    for (let k = 0; k < ringStart.length - 1; k++) {
      const a = ringStart[k], b = ringStart[k + 1];
      for (let s = 0; s < seg; s++) {
        const s2 = (s + 1) % seg;
        this.tri(a + s, b + s, a + s2);
        this.tri(a + s2, b + s, b + s2);
      }
    }
    // close the tips
    const first = ringStart[0], last = ringStart[ringStart.length - 1];
    for (let s = 1; s < seg - 1; s++) {
      this.tri(first, first + s + 1, first + s);
      this.tri(last, last + s, last + s + 1);
    }
  }

  // Ellipsoid with an arbitrary orthonormal basis (ax, ay, az) and radii.
  ellipsoid(c, ax, ay, az, rx, ry, rz, mat, su = 12, sv = 8) {
    const start = this.nv;
    for (let j = 0; j <= sv; j++) {
      const ph = (j / sv) * Math.PI, sp = Math.sin(ph), cp = Math.cos(ph);
      for (let k = 0; k < su; k++) {
        const th = (k / su) * TAU;
        const ux = sp * Math.cos(th), uy = cp, uz = sp * Math.sin(th);
        const p = [
          c[0] + ax[0] * ux * rx + ay[0] * uy * ry + az[0] * uz * rz,
          c[1] + ax[1] * ux * rx + ay[1] * uy * ry + az[1] * uz * rz,
          c[2] + ax[2] * ux * rx + ay[2] * uy * ry + az[2] * uz * rz,
        ];
        const gx = ux / rx, gy = uy / ry, gz = uz / rz;
        const nn = norm([
          ax[0] * gx + ay[0] * gy + az[0] * gz,
          ax[1] * gx + ay[1] * gy + az[1] * gz,
          ax[2] * gx + ay[2] * gy + az[2] * gz,
        ]);
        this.vert(p, nn, mat);
      }
    }
    for (let j = 0; j < sv; j++) {
      for (let k = 0; k < su; k++) {
        const a = start + j * su + k, b = start + j * su + ((k + 1) % su);
        const c2 = a + su, d = b + su;
        this.tri(a, b, c2);
        this.tri(b, d, c2);
      }
    }
  }

  // Ear: an elliptical cone from a base to a tip.
  cone(base, tip, wide, thin, rw, rt, mat, seg = 8) {
    const axis = norm(sub(tip, base));
    const start = this.nv;
    for (let s = 0; s < seg; s++) {
      const a = (s / seg) * TAU, ca = Math.cos(a), sa = Math.sin(a);
      const d = [wide[0] * ca * rw + thin[0] * sa * rt, wide[1] * ca * rw + thin[1] * sa * rt, wide[2] * ca * rw + thin[2] * sa * rt];
      const nn = norm(add(norm([wide[0] * ca / rw + thin[0] * sa / rt, wide[1] * ca / rw + thin[1] * sa / rt, wide[2] * ca / rw + thin[2] * sa / rt]), mul(axis, 0.35)));
      this.vert(add(base, d), nn, mat);
      this.vert(add(tip, mul(d, 0.06)), nn, mat);
    }
    for (let s = 0; s < seg; s++) {
      const a = start + s * 2, b = start + ((s + 1) % seg) * 2;
      this.tri(a, b, a + 1);
      this.tri(b, b + 1, a + 1);
    }
  }
}

/* ------------------------------------------------------------------ */
/* poses                                                               */
/* ------------------------------------------------------------------ */
// A pose is a flat bag of numbers so two poses can be blended linearly.
// Positions are in the cat's sagittal (x,y) plane; the builder adds z.
function pose(o) {
  return Object.assign(
    {
      hipX: -0.3, hipY: 0.57, chestX: 0.28, chestY: 0.56, arch: 0,
      headX: 0.53, headY: 0.77, headYaw: 0.3, headPitch: 0, headTilt: 0,
      flX: 0.29, flY: 0, frX: 0.29, frY: 0,
      hlX: -0.34, hlY: 0, hrX: -0.34, hrY: 0,
      hockX: -0.09, hockY: 0.2,       // ankle offset from the hind paw
      wristBend: 0,                   // folded front legs (loaf)
      spread: 1, haunch: 0,
      tailA: 2.75, tailK1: -1.0, tailK2: 0.9, tailTilt: 0, tailLen: 0.9, tailFloor: 0,
      eye: 1, ear: 0,
    },
    o,
  );
}

// Proportions follow the studio photograph: a slender shorthair — long legs,
// long neck, small head, tall ears.
const SIT = {
  hipX: -0.19, hipY: 0.165, chestX: 0.085, chestY: 0.56, arch: 0.06,
  headX: 0.175, headY: 0.885, headYaw: 0.75,
  flX: 0.15, frX: 0.15, hlX: 0.02, hrX: 0.02,
  hockX: -0.14, hockY: 0.03, spread: 0.7, haunch: 1,
};
export const POSES = {
  stand: pose({}),
  sit: pose({ ...SIT, tailA: 3.3, tailK1: 2.7, tailK2: 0.1, tailLen: 0.8 }),
  // tail resting on the ground with a lifted tip (used on the page floor)
  sitFloor: pose({ ...SIT, tailA: 3.3, tailK1: 0.1, tailK2: -3.4, tailLen: 0.86, tailFloor: 1 }),
  crouch: pose({
    hipX: -0.27, hipY: 0.34, chestX: 0.22, chestY: 0.28, arch: 0.07,
    headX: 0.47, headY: 0.42, headYaw: 0.15, headPitch: 0.1,
    flX: 0.32, frX: 0.32, hlX: -0.2, hrX: -0.2, hockX: -0.12, hockY: 0.08,
    tailA: 3.0, tailK1: -0.3, tailK2: 0.5, ear: 0.4,
  }),
  // take-off: fully stretched
  leapOut: pose({
    hipX: -0.36, hipY: 0.46, chestX: 0.32, chestY: 0.5, arch: -0.03,
    headX: 0.61, headY: 0.6, headYaw: 0.1, headPitch: -0.05,
    flX: 0.8, flY: 0.44, frX: 0.71, frY: 0.4,
    hlX: -0.92, hlY: 0.28, hrX: -0.83, hrY: 0.32, hockX: 0.12, hockY: 0.1,
    tailA: 3.05, tailK1: -0.25, tailK2: 0.35, tailLen: 0.92, ear: 0.6, spread: 0.85,
  }),
  // mid-air: gathered, spine rounded
  leapTuck: pose({
    hipX: -0.27, hipY: 0.47, chestX: 0.25, chestY: 0.5, arch: 0.1,
    headX: 0.52, headY: 0.64, headYaw: 0.15,
    flX: 0.45, flY: 0.2, frX: 0.4, frY: 0.2,
    hlX: -0.3, hlY: 0.16, hrX: -0.25, hrY: 0.18, hockX: -0.12, hockY: 0.1,
    tailA: 2.85, tailK1: -0.6, tailK2: 0.6, ear: 0.5, spread: 0.85,
  }),
  // landing: front paws reach for the ledge, hind legs swing under
  leapReach: pose({
    hipX: -0.28, hipY: 0.52, chestX: 0.25, chestY: 0.44, arch: 0.07,
    headX: 0.51, headY: 0.6, headYaw: 0.15, headPitch: 0.15,
    flX: 0.55, flY: 0.02, frX: 0.48, frY: 0.04,
    hlX: -0.14, hlY: 0.22, hrX: -0.1, hrY: 0.24, hockX: -0.13, hockY: 0.09,
    tailA: 2.5, tailK1: -0.9, tailK2: 0.5, ear: 0.3, spread: 0.85,
  }),
  // loaf, chin down, eyes shut
  sleep: pose({
    hipX: -0.22, hipY: 0.15, chestX: 0.16, chestY: 0.16, arch: 0.075,
    headX: 0.37, headY: 0.125, headYaw: 0.55, headPitch: 0.25, headTilt: 0.12,
    flX: 0.3, frX: 0.34, hlX: -0.06, hrX: -0.06,
    hockX: -0.13, hockY: 0.03, wristBend: 1, spread: 0.8, haunch: 1,
    tailA: 3.3, tailK1: 0.2, tailK2: -2.2, tailLen: 0.74, tailFloor: 1,
    eye: 0.04, ear: 0.15,
  }),
};

const KEYS = Object.keys(POSES.stand);
export const POSE_KEYS = KEYS;
export function mixPose(out, a, b, t) {
  for (let k = 0; k < KEYS.length; k++) {
    const key = KEYS[k];
    out[key] = a[key] + (b[key] - a[key]) * t;
  }
  return out;
}
export const newPose = () => Object.assign({}, POSES.stand);

// Four-beat walk laid over the standing pose. phase 0..1 = one full stride.
export const STRIDE = 0.44;       // paw travel during stance (units)
export const STANCE = 0.66;       // share of the cycle a paw is planted
export const CYCLE_ADVANCE = STRIDE / STANCE; // body travel per cycle
export function walkPose(out, phase, energy = 1) {
  const s = POSES.stand;
  for (let k = 0; k < KEYS.length; k++) out[KEYS[k]] = s[KEYS[k]];
  const paw = (off) => {
    const p = (((phase + off) % 1) + 1) % 1;
    if (p < STANCE) return [STRIDE * (0.5 - p / STANCE), 0, 0];
    const u = (p - STANCE) / (1 - STANCE);
    const e = u * u * (3 - 2 * u);
    return [STRIDE * (e - 0.5), Math.sin(u * Math.PI) * 0.07, Math.sin(u * Math.PI)];
  };
  const hl = paw(0), fl = paw(0.28), hr = paw(0.5), fr = paw(0.78);
  out.hlX += hl[0] * energy; out.hlY += hl[1] * energy;
  out.hrX += hr[0] * energy; out.hrY += hr[1] * energy;
  out.flX += fl[0] * energy; out.flY += fl[1] * energy;
  out.frX += fr[0] * energy; out.frY += fr[1] * energy;
  // a walking cat carries its head low and level, the back barely bobs,
  // shoulders and hips rise over whichever leg is bearing weight
  const bob = Math.sin(phase * TAU * 2);
  out.hipY += bob * 0.007 * energy;
  out.chestY -= bob * 0.009 * energy;
  out.headX = lerp(s.headX, 0.6, energy);
  out.headY = lerp(s.headY, 0.69, energy) + Math.sin(phase * TAU * 2 + 0.6) * 0.004 * energy;
  out.headYaw = 0.22;
  out.headPitch = 0.08 * energy;
  out.arch = 0.012 * Math.sin(phase * TAU * 2 + 1.2) * energy;
  out.tailA = 2.62 + Math.sin(phase * TAU) * 0.06; out.tailK1 = -1.0; out.tailK2 = 1.2;
  // carry the swing leg's lift for the builder (ankle flexes while swinging)
  out._hlSwing = hl[2] * energy; out._hrSwing = hr[2] * energy;
  return out;
}

/* ------------------------------------------------------------------ */
/* building the body from a pose                                       */
/* ------------------------------------------------------------------ */
// planar two-bone IK; bend = +1 puts the joint on the +x side, -1 on -x
function ik2(ax, ay, bx, by, l1, l2, bend) {
  let dx = bx - ax, dy = by - ay;
  let d = Math.hypot(dx, dy) || 1e-4;
  const max = (l1 + l2) * 0.999;
  if (d > max) { const s = d / max; l1 *= s; l2 *= s; }
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const mx = ax + (dx / d) * a, my = ay + (dy / d) * a;
  // two candidates, perpendicular to the a→b line
  const px = (-dy / d) * h, py = (dx / d) * h;
  const c1x = mx + px, c2x = mx - px;
  if ((c1x - c2x) * bend >= 0) return [c1x, my + py];
  return [c2x, my - py];
}

const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];

/**
 * @param mesh   Mesh to fill
 * @param p      pose
 * @param fx     live extras: { time, tailSway, breathe, blink, lookYaw, lookPitch, earTwitch }
 */
export function buildCat(mesh, p, fx) {
  mesh.reset();
  const B = MAT.BODY;
  const t = fx.time;
  const breathe = 1 + Math.sin(t * 1.7) * 0.012 * fx.breathe;

  const hip = v3(p.hipX, p.hipY, 0);
  const chest = v3(p.chestX, p.chestY, 0);
  const head = v3(p.headX, p.headY, 0);

  /* spine + neck — one continuous skin */
  const spineDir = norm(sub(chest, hip));
  const spineN = [-spineDir[1], spineDir[0], 0]; // "up" relative to the spine
  const mid = add(lerp3(hip, chest, 0.5), mul(spineN, p.arch + 0.012));
  const rump = add(hip, add(mul(spineDir, -0.12), mul(spineN, -0.015)));
  const toHead = sub(head, chest);
  const neck = add(chest, add(mul(toHead, 0.5), mul(spineN, 0.02)));
  mesh.tube(
    [rump, hip, mid, chest, neck, add(chest, mul(toHead, 0.92))],
    [0.08, 0.15, 0.15 * breathe, 0.158 * breathe, 0.094, 0.082],
    12, 4, B,
  );

  /* head */
  // side: +1 when the cat's left flank faces the camera, -1 when its right does,
  // so the head (and the tail's sweep) always turn toward the viewer.
  const side = fx.side == null ? 1 : fx.side;
  const yaw = (p.headYaw + fx.lookYaw) * side;
  const pitch = p.headPitch + fx.lookPitch;
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  let hf = [cy * cp, -sp, sy * cp];              // head forward
  let hs = norm(cross(hf, Y));                    // head side: +side = the cat's left
  let hu = cross(hs, hf);
  if (p.headTilt) {
    const ct = Math.cos(p.headTilt), st = Math.sin(p.headTilt);
    const hu2 = add(mul(hu, ct), mul(hs, st));
    hs = sub(mul(hs, ct), mul(hu, st));
    hu = hu2;
  }
  const HR = [0.128, 0.117, 0.135];
  mesh.ellipsoid(head, hf, hu, hs, HR[0], HR[1], HR[2], B, 14, 10);
  // The face. A cat's head is a wedge, not a ball: full cheeks low on the
  // skull, a short bridge, two whisker pads, a small chin and a leather nose.
  const at = (f, u, sd) => add(head, add(add(mul(hf, f), mul(hu, u)), mul(hs, sd)));
  for (let e = -1; e <= 1; e += 2) {
    mesh.ellipsoid(at(0.03, -0.034, 0.07 * e), hf, hu, hs, 0.078, 0.06, 0.058, B, 10, 6);      // cheek
    mesh.ellipsoid(at(0.106, -0.052, 0.026 * e), hf, hu, hs, 0.04, 0.032, 0.036, B, 10, 6);     // whisker pad
    mesh.ellipsoid(at(0.07, 0.05, 0.05 * e), hf, hu, hs, 0.05, 0.03, 0.04, B, 8, 5);            // brow
  }
  mesh.ellipsoid(at(0.088, -0.018, 0), hf, hu, hs, 0.06, 0.04, 0.042, B, 10, 6);                // bridge
  mesh.ellipsoid(at(0.086, -0.082, 0), hf, hu, hs, 0.036, 0.026, 0.034, B, 8, 5);               // chin
  mesh.ellipsoid(at(0.141, -0.031, 0), hf, hu, hs, 0.012, 0.011, 0.019, MAT.NOSE, 8, 5);        // nose
  const muz = at(0.092, -0.044, 0);
  // whiskers: three fine hairs each side, the one light detail on a black cat
  for (let e = -1; e <= 1; e += 2) {
    for (let w = -1; w <= 1; w++) {
      const root = add(muz, add(add(mul(hf, 0.03), mul(hs, 0.052 * e)), mul(hu, -0.008 + w * 0.012)));
      const tipw = add(root, add(add(mul(hs, 0.15 * e), mul(hu, w * 0.035 - 0.012)), mul(hf, -0.02)));
      mesh.tube([root, lerp3(root, tipw, 0.5), tipw], [0.0026, 0.0022, 0.0012], 4, 1, MAT.WHISKER);
    }
  }

  /* ears */
  const earBack = p.ear + fx.earTwitch;
  for (let e = -1; e <= 1; e += 2) {
    const tw = e > 0 ? fx.earTwitchL : 0;
    const base = add(head, add(add(mul(hu, 0.07), mul(hs, 0.07 * e)), mul(hf, -0.012)));
    const tip = add(base, add(add(mul(hu, 0.16 - earBack * 0.04), mul(hs, (0.04 + earBack * 0.05) * e)), mul(hf, -0.02 - (earBack + tw) * 0.09)));
    const wide = norm(add(mul(hs, 1), mul(hf, 0.25 * e)));
    const thin = norm(cross(wide, norm(sub(tip, base))));
    mesh.cone(base, tip, wide, thin, 0.072, 0.03, B, 8);
    // the paler inside of the ear, facing forward
    const inBase = add(lerp3(base, tip, 0.1), mul(thin, 0.02 * (dot(thin, hf) > 0 ? 1 : -1)));
    mesh.cone(inBase, lerp3(base, tip, 0.8), wide, thin, 0.048, 0.012, MAT.EAR_IN, 8);
  }

  /* eyes — the one spot of colour */
  for (let e = -1; e <= 1; e += 2) {
    let d = [0.098, 0.02, 0.063 * e];
    const k = 1 / Math.sqrt((d[0] / HR[0]) ** 2 + (d[1] / HR[1]) ** 2 + (d[2] / HR[2]) ** 2);
    d = mul(d, k * 0.995);
    const c = add(head, add(add(mul(hf, d[0]), mul(hu, d[1])), mul(hs, d[2])));
    const nloc = norm([d[0] / HR[0] ** 2, d[1] / HR[1] ** 2, d[2] / HR[2] ** 2]);
    const n = norm(add(add(mul(hf, nloc[0]), mul(hu, nloc[1])), mul(hs, nloc[2])));
    let es = norm(cross(hu, n));                 // along the eye
    let eu = cross(n, es);
    // outer corners lifted slightly: the almond tilt
    const tilt = 0.26 * e, ct = Math.cos(tilt), st = Math.sin(tilt);
    const es2 = add(mul(es, ct), mul(eu, st));
    eu = sub(mul(eu, ct), mul(es, st));
    es = es2;
    const open = Math.max(0.03, p.eye * fx.blink);
    // dark lid line, iris with a deeper outer ring, a vertical pupil that
    // rounds as the eye narrows, and one bright catchlight
    mesh.ellipsoid(c, n, eu, es, 0.01, 0.031 * open, 0.041, MAT.PUPIL, 12, 6);
    mesh.ellipsoid(add(c, mul(n, 0.003)), n, eu, es, 0.01, 0.0268 * open, 0.0358, MAT.IRIS_RIM, 12, 6);
    mesh.ellipsoid(add(c, mul(n, 0.006)), n, eu, es, 0.008, 0.0215 * open, 0.0285, MAT.EYE, 12, 6);
    mesh.ellipsoid(add(c, mul(n, 0.0092)), n, eu, es, 0.006, 0.0195 * open, 0.0088 + (1 - open) * 0.008, MAT.PUPIL, 10, 5);
    if (open > 0.35) mesh.ellipsoid(add(c, add(add(mul(n, 0.0128), mul(eu, 0.0085 * open)), mul(es, 0.008))), n, eu, es, 0.003, 0.0042, 0.0042, MAT.GLINT, 6, 4);
  }

  /* legs */
  const sideZ = (base) => base * p.spread;
  // front
  const frontLeg = (px, py, z) => {
    const sh = v3(chest[0] + 0.025 * spineDir[0], chest[1] - 0.085, z * 0.92);
    const wr = [px - 0.012, py + 0.045];
    let el = ik2(sh[0], sh[1], wr[0], wr[1], 0.235, 0.225, -1);
    if (p.wristBend > 0) {
      // folded: elbow pushed back and down along the ground, paw tucked under the chest
      el = [lerp(el[0], sh[0] - 0.1, p.wristBend), lerp(el[1], 0.06, p.wristBend)];
    }
    mesh.tube(
      [sh, v3(el[0], el[1], z), v3(wr[0], wr[1], z), v3(px + 0.03, py + 0.03, z)],
      [0.076, 0.047, 0.033, 0.035], 8, 3, B,
    );
    mesh.ellipsoid(v3(px + 0.03, py + 0.028, z), X, Y, Z, 0.052, 0.029, 0.04, B, 8, 5);
  };
  frontLeg(p.flX, p.flY, sideZ(0.088));
  frontLeg(p.frX, p.frY, sideZ(-0.088));
  // hind
  const hindLeg = (px, py, z, swing) => {
    const hj = v3(hip[0] - 0.015, hip[1] - 0.045, z * 0.9);
    const hk = [px + p.hockX - swing * 0.04, py + p.hockY + swing * 0.02];
    const kn = ik2(hj[0], hj[1], hk[0], hk[1], 0.22, 0.215, 1);
    const thigh = 0.1 + p.haunch * 0.035;
    mesh.tube(
      [hj, v3(kn[0], kn[1], z * 1.05), v3(hk[0], hk[1], z), v3(px + 0.02, py + 0.03, z)],
      [thigh, 0.058 + p.haunch * 0.03, 0.034, 0.035], 8, 3, B,
    );
    mesh.ellipsoid(v3(px + 0.028, py + 0.028, z), X, Y, Z, 0.054, 0.029, 0.04, B, 8, 5);
    // the haunch: a soft mass over hip and knee, fuller when seated
    const hc = v3(lerp(hj[0], kn[0], 0.42), lerp(hj[1], kn[1], 0.42) + 0.01, z * (0.95 + p.haunch * 0.2));
    const hr = 0.108 + p.haunch * 0.07;
    mesh.ellipsoid(hc, X, Y, Z, hr * 1.12, hr, 0.085 + p.haunch * 0.04, B, 10, 6);
  };
  hindLeg(p.hlX, p.hlY, sideZ(0.1), p._hlSwing || 0);
  hindLeg(p.hrX, p.hrY, sideZ(-0.1), p._hrSwing || 0);

  /* tail — a curve that bends in a plane tilted between "up" and "sideways" */
  const N = 12;
  const tb = add(hip, add(mul(spineDir, -0.15), mul(spineN, 0.035)));
  const tilt = p.tailTilt * (Math.PI / 2);
  const tu = [0, Math.cos(tilt), Math.sin(tilt) * side];   // the tail plane's "up"
  const pts = [tb];
  const rad = [0.046];
  let ang = p.tailA;
  let cur = tb;
  const segLen = p.tailLen / N;
  for (let k = 1; k <= N; k++) {
    const u = k / N;
    ang += lerp(p.tailK1, p.tailK2, u) / N;
    // lazy travelling wave, stronger toward the tip
    const sway = Math.sin(t * 1.35 - u * 2.6) * 0.5 * u * fx.tailSway;
    const a = ang + sway * (1 - p.tailTilt * 0.6);
    const dir = [Math.cos(a), Math.sin(a) * tu[1], Math.sin(a) * tu[2]];
    cur = add(cur, mul(dir, segLen));
    // side-to-side flick
    const zf = Math.sin(t * 1.1 - u * 2.1 + 1.3) * 0.045 * u * fx.tailSway * (1 - p.tailTilt);
    // tailFloor keeps the tail resting on the ground instead of hanging below it
    if (p.tailFloor > 0) cur[1] = lerp(cur[1], Math.max(cur[1], 0.045), p.tailFloor);
    pts.push([cur[0], cur[1], cur[2] + zf]);
    rad.push(lerp(0.04, 0.024, u));
  }
  mesh.tube(pts, rad, 8, 2, B);
}
