import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { reducedMotion } from '../lib/smooth'

interface WorldCanvasProps {
  onReady?: () => void
}

const damp = (a: number, b: number, lambda: number, dt: number) =>
  a + (b - a) * (1 - Math.exp(-lambda * dt))

const BG_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const BG_FRAG = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform float uScroll;
uniform vec2 uTrail[6];
uniform float uPull[6];
uniform vec2 uIdlePos[3];
uniform float uIdleAmp[3];
uniform sampler2D uPlasterA;
uniform sampler2D uPlasterB;
uniform float uHasA;
uniform float uHasB;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.04;
    a *= 0.5;
  }
  return v;
}

vec2 coverUv(vec2 uv, vec2 res, float imgAspect) {
  float screenAspect = res.x / max(res.y, 1.0);
  vec2 s = vec2(1.0);
  if (screenAspect > imgAspect) {
    s.y = imgAspect / screenAspect;
  } else {
    s.x = screenAspect / imgAspect;
  }
  return (uv - 0.5) * s + 0.5;
}

// Sample blended monochromatic plaster bas-relief luminance (acts as both albedo & relief height)
float sampleRelief(vec2 uv, float scrollMix) {
  vec2 cUv = clamp(uv, 0.002, 0.998);
  float a = 0.78;
  if (uHasA > 0.5) {
    vec3 ta = texture2D(uPlasterA, cUv).rgb;
    a = dot(ta, vec3(0.299, 0.587, 0.114));
  }
  float b = a;
  if (uHasB > 0.5) {
    vec3 tb = texture2D(uPlasterB, cUv).rgb;
    float lb = dot(tb, vec3(0.299, 0.587, 0.114));
    // Sculpted botanical relief normalized to mist-grey plaster range
    b = mix(0.76, 0.96, smoothstep(0.04, 0.72, lb));
  }
  return mix(a, b, scrollMix);
}

void main() {
  vec2 aspect = vec2(uRes.x / max(uRes.y, 1.0), 1.0);
  vec2 p = vUv * aspect;

  // 1. Cursor clay-sculpting pull + subtle organic breathing motion
  vec2 warp = vec2(0.0);
  float cursorMask = 0.0;
  for (int i = 0; i < 6; i++) {
    vec2 cp = uTrail[i] * aspect;
    vec2 diff = p - cp;
    float dist = length(diff);
    float radius = 0.115 + float(i) * 0.018;
    float influence = exp(-(dist * dist) / (radius * radius)) * uPull[i];

    float angle = atan(diff.y, diff.x);
    float breath = sin(uTime * 1.9 - dist * 12.0 + cos(angle * 4.0) * 0.45);
    vec2 dir = diff / max(dist, 0.0005);
    warp += dir * (0.022 + 0.012 * breath) * influence;
    cursorMask = max(cursorMask, influence);
  }

  // 2. Autonomous idle clay-relief blooms emerging from random areas of the plaster wall
  float idleMask = 0.0;
  for (int j = 0; j < 3; j++) {
    vec2 ip = uIdlePos[j] * aspect;
    vec2 diff = p - ip;
    float dist = length(diff);
    float organic = (fbm(p * 3.4 + vec2(float(j) * 4.3, uTime * 0.14)) - 0.5) * 0.11;
    float rad = 0.25 + organic;
    float inf = exp(-(dist * dist) / (rad * rad)) * uIdleAmp[j];

    float breath = sin(uTime * 1.35 + float(j) * 2.0 - dist * 9.0);
    vec2 dir = diff / max(dist, 0.0005);
    warp += dir * (0.014 + 0.009 * breath) * inf;
    idleMask = max(idleMask, inf);
  }

  float combinedMask = max(cursorMask, idleMask);

  // Soft plaster-molding edge feather so the sculpture rises seamlessly out of the flat wall
  float plasterNoise = (fbm(p * 4.2 + uTime * 0.04) - 0.5) * 0.16;
  float extrude = smoothstep(0.04, 0.72, combinedMask + plasterNoise * combinedMask);

  // Authentic matte Venetian plaster / fine unfired clay wall base (#C9CACD)
  float trowel = (fbm(p * 3.2) - 0.5) * 0.028 + (fbm(p * 11.5) - 0.5) * 0.014;
  float fineGrain = (hash(gl_FragCoord.xy + fract(uTime) * 6.0) - 0.5) * 0.012;
  vec3 flatWall = vec3(0.788, 0.792, 0.802) + trowel + fineGrain * 0.6;

  // Scroll softly blends between relief wall A (bird + blossoms) and wall B (botanical branches)
  float scrollMix = smoothstep(0.22, 0.78, uScroll);
  vec2 baseUv = coverUv(vUv - warp * 0.55 + vec2(0.0, uScroll * 0.06), uRes, 16.0 / 9.0);

  // True 3D bas-relief extrusion: sample height & gradients to compute live clay normals
  float eps = 2.2 / max(uRes.y, 1.0);
  float hC = sampleRelief(baseUv, scrollMix);
  // Subtle parallax lift as the clay pushes outward toward the viewer
  vec2 liftedUv = baseUv + vec2(-0.0045, 0.0045) * (hC - 0.78) * extrude;
  float h = sampleRelief(liftedUv, scrollMix);
  float hL = sampleRelief(liftedUv - vec2(eps, 0.0), scrollMix);
  float hR = sampleRelief(liftedUv + vec2(eps, 0.0), scrollMix);
  float hD = sampleRelief(liftedUv - vec2(0.0, eps), scrollMix);
  float hU = sampleRelief(liftedUv + vec2(0.0, eps), scrollMix);

  // Directional top-left museum skylight shading that scales smoothly with extrude (0 -> 1)
  float gx = (hR - hL) * 4.8 * extrude;
  float gy = (hU - hD) * 4.8 * extrude;
  vec3 N = normalize(vec3(-gx, -gy, 1.0));
  vec3 L = normalize(vec3(-0.56, 0.64, 0.52));
  float wrapDiffuse = clamp((dot(N, L) + 0.45) / 1.45, 0.0, 1.0);
  float lighting = mix(1.0, 0.82 + wrapDiffuse * 0.28, extrude);

  // Normalize relief tone around the exact wall grey so flat areas of the texture match the wall seamlessly
  float reliefDelta = (h - 0.77) * 1.15;
  vec3 sculptedClay = clamp(flatWall + vec3(reliefDelta) * extrude, 0.0, 1.0) * lighting;

  // Subtle ambient occlusion in deep sculpted crevices + velvety highlight on raised clay ridges
  float ridgeHighlight = smoothstep(0.04, 0.18, reliefDelta) * extrude * 0.055;
  sculptedClay += vec3(ridgeHighlight);

  vec3 col = mix(flatWall, sculptedClay, extrude);

  gl_FragColor = vec4(col, 1.0);
}
`

export default function WorldCanvas({ onReady }: WorldCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const reduced = reducedMotion()
    const isMobile = window.innerWidth < 768

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 1.5))
    renderer.setSize(host.clientWidth, host.clientHeight)
    host.appendChild(renderer.domElement)

    const bgScene = new THREE.Scene()
    const bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const trailVecs = Array.from({ length: 6 }, () => new THREE.Vector2(0.5, 0.5))
    const pullVals = [0, 0, 0, 0, 0, 0]

    // 3 autonomous idle spots that gently sculpt clay reliefs out of random areas when cursor is still
    const idleSpots = [
      {
        pos: new THREE.Vector2(0.46, 0.66),
        target: new THREE.Vector2(0.46, 0.66),
        phase: 0.3,
        period: 6.8,
        lastCycle: -1,
      },
      {
        pos: new THREE.Vector2(0.84, 0.58),
        target: new THREE.Vector2(0.84, 0.58),
        phase: 2.4,
        period: 7.9,
        lastCycle: -1,
      },
      {
        pos: new THREE.Vector2(0.22, 0.34),
        target: new THREE.Vector2(0.22, 0.34),
        phase: 4.8,
        period: 8.8,
        lastCycle: -1,
      },
    ]
    const idlePosVecs = idleSpots.map((s) => s.pos)
    const idleAmps = [0, 0, 0]

    const placeholder = new THREE.DataTexture(new Uint8Array([201, 202, 205, 255]), 1, 1)
    placeholder.needsUpdate = true

    const bgGeo = new THREE.PlaneGeometry(2, 2)
    const bgMat = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uRes: { value: new THREE.Vector2(host.clientWidth, host.clientHeight) },
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uTrail: { value: trailVecs },
        uPull: { value: pullVals },
        uIdlePos: { value: idlePosVecs },
        uIdleAmp: { value: idleAmps },
        uPlasterA: { value: placeholder },
        uPlasterB: { value: placeholder },
        uHasA: { value: 0 },
        uHasB: { value: 0 },
      },
      vertexShader: BG_VERT,
      fragmentShader: BG_FRAG,
    })
    bgScene.add(new THREE.Mesh(bgGeo, bgMat))

    const loader = new THREE.TextureLoader()
    loader.load('/textures/floral-grey-relief.jpg', (tex) => {
      tex.minFilter = THREE.LinearFilter
      tex.magFilter = THREE.LinearFilter
      bgMat.uniforms.uPlasterA.value = tex
      bgMat.uniforms.uHasA.value = 1
    })
    loader.load('/textures/footer-vines-over.jpg', (tex) => {
      tex.minFilter = THREE.LinearFilter
      tex.magFilter = THREE.LinearFilter
      bgMat.uniforms.uPlasterB.value = tex
      bgMat.uniforms.uHasB.value = 1
    })

    let ptrUvX = 0.5
    let ptrUvY = 0.5
    let activePull = 0
    let lastMovePerf = performance.now() - 2500
    let pointerInside = false

    const onPointerMove = (e: PointerEvent) => {
      const nx = e.clientX / window.innerWidth
      const ny = 1 - e.clientY / window.innerHeight
      const speed = Math.hypot(nx - ptrUvX, ny - ptrUvY)
      ptrUvX = nx
      ptrUvY = ny
      pointerInside = true
      lastMovePerf = performance.now()
      activePull = Math.min(1.0, activePull + 0.55 + speed * 5.2)
    }

    const onPointerDown = () => {
      lastMovePerf = performance.now()
      activePull = 1.0
    }

    const onPointerLeave = () => {
      pointerInside = false
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    document.addEventListener('mouseleave', onPointerLeave, { passive: true })

    const onResize = () => {
      if (!host) return
      const w = host.clientWidth
      const h = host.clientHeight
      renderer.setSize(w, h)
      bgMat.uniforms.uRes.value.set(w, h)
    }
    window.addEventListener('resize', onResize)

    onReady?.()

    let raf = 0
    let last = performance.now()
    let idleBlend = 0
    let smoothScroll = 0

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = now / 1000

      bgMat.uniforms.uTime.value = reduced ? 0 : t

      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      const targetScroll = Math.min(1, Math.max(0, window.scrollY / maxScroll))
      smoothScroll = damp(smoothScroll, targetScroll, 4.0, dt)
      bgMat.uniforms.uScroll.value = smoothScroll

      const idleSec = (now - lastMovePerf) / 1000
      const hoverSustain = pointerInside && idleSec < 1.3 ? 0.78 : 0
      activePull = damp(activePull, hoverSustain, 1.35, dt)

      trailVecs[0].x = damp(trailVecs[0].x, ptrUvX, 9.0, dt)
      trailVecs[0].y = damp(trailVecs[0].y, ptrUvY, 9.0, dt)
      pullVals[0] = damp(pullVals[0], activePull, 4.2, dt)

      for (let i = 1; i < 6; i++) {
        const follow = 6.0 - i * 0.78
        trailVecs[i].x = damp(trailVecs[i].x, trailVecs[i - 1].x, follow, dt)
        trailVecs[i].y = damp(trailVecs[i].y, trailVecs[i - 1].y, follow, dt)
        pullVals[i] = damp(pullVals[i], pullVals[i - 1] * 0.82, 2.0, dt)
      }

      const wantIdle = !reduced && idleSec > 1.6 ? 1 : 0
      idleBlend = damp(idleBlend, wantIdle, wantIdle ? 0.9 : 3.2, dt)

      for (let j = 0; j < idleSpots.length; j++) {
        const sp = idleSpots[j]
        const cyclePos = (t + sp.phase) / sp.period
        const cycleIdx = Math.floor(cyclePos)
        const frac = cyclePos - cycleIdx

        if (cycleIdx !== sp.lastCycle) {
          sp.lastCycle = cycleIdx
          sp.target.set(0.14 + Math.random() * 0.72, 0.16 + Math.random() * 0.68)
        }
        sp.pos.x = damp(sp.pos.x, sp.target.x, 1.15, dt)
        sp.pos.y = damp(sp.pos.y, sp.target.y, 1.15, dt)

        const breath = Math.pow(Math.sin(frac * Math.PI), 1.5)
        idleAmps[j] = damp(idleAmps[j], breath * idleBlend * 0.96, 2.4, dt)
      }

      renderer.render(bgScene, bgCamera)
    }

    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('mouseleave', onPointerLeave)
      window.removeEventListener('resize', onResize)
      bgGeo.dispose()
      bgMat.dispose()
      placeholder.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [onReady])

  return <div ref={hostRef} aria-hidden className="pointer-events-none fixed inset-0 z-0" />
}
