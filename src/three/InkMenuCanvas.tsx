import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { reducedMotion } from '../lib/smooth'

interface InkMenuCanvasProps {
  menuHover: boolean
  menuOpen: boolean
  pageWash: boolean
  isHome: boolean
}

const damp = (a: number, b: number, lambda: number, dt: number) =>
  a + (b - a) * (1 - Math.exp(-lambda * dt))

const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform float uInk;
uniform float uScrollInk;
uniform vec2 uPointer;
uniform sampler2D uFloralBlack;
uniform float uHasBlack;

const float PI = 3.14159265359;

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
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = rot * p * 2.08;
    a *= 0.5;
  }
  return v;
}

mat3 rotY(float a) {
  float c = cos(a), s = sin(a);
  return mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);
}

mat3 rotX(float a) {
  float c = cos(a), s = sin(a);
  return mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c);
}

void main() {
  if (uInk <= 0.004 && uScrollInk <= 0.004) {
    gl_FragColor = vec4(0.0);
    return;
  }

  vec2 aspect = vec2(uRes.x / max(uRes.y, 1.0), 1.0);
  vec2 p = vUv * aspect;

  // 1. Top-right Menu & Page-Transition cotton-ink bloom + SPINNING 3D SPHERE floral sculpture
  float menuAlpha = 0.0;
  vec3 menuCol = vec3(0.015, 0.015, 0.018);
  if (uInk > 0.004) {
    vec2 inkOrigin = vec2(0.99, 0.97) * aspect;
    float dInk = length(p - inkOrigin);
    float fiberAmt = smoothstep(0.0, 0.22, uInk);
    float cottonFibers = (
      fbm(p * 6.2 + vec2(uTime * 0.07, -uTime * 0.05)) * 0.24
      + fbm(p * 19.0 - vec2(uTime * 0.04)) * 0.085
    ) * fiberAmt;

    float inkFront = uInk - (dInk - cottonFibers);
    float inkMask = smoothstep(-0.02, 0.055, inkFront);
    float wetRim = smoothstep(-0.085, 0.0, inkFront) * (1.0 - inkMask);

    // Monumental 3D Spinning Sphere filling the Menu background
    float t = uTime;
    // Normalized centered coordinates, scaled so the massive sphere spans the viewport gracefully
    vec2 sp = (vUv - 0.5) * vec2(uRes.x / max(uRes.y, 1.0), 1.0) * 1.18;
    float r2 = dot(sp, sp);

    if (r2 < 1.0) {
      float z = sqrt(max(0.0, 1.0 - r2));
      vec3 N = normalize(vec3(sp.x, sp.y, z));

      // Continuous 3D planetary spin + gentle cursor tilt
      float tiltX = (uPointer.y - 0.5) * 0.45 + sin(t * 0.22) * 0.14;
      float spinY = t * 0.18 + (uPointer.x - 0.5) * 0.65;
      vec3 spun = rotY(spinY) * rotX(tiltX) * N;

      // Seamless spherical equirectangular UV projection
      float u = 0.5 + atan(spun.z, spun.x) / (2.0 * PI);
      float v = 0.5 - asin(clamp(spun.y, -1.0, 1.0)) / PI;
      vec2 sphUv = vec2(fract(u * 2.0), clamp(v, 0.004, 0.996));

      vec3 tex = vec3(0.06);
      float reliefBump = 0.0;
      if (uHasBlack > 0.5) {
        tex = texture2D(uFloralBlack, sphUv).rgb;
        float texR = dot(texture2D(uFloralBlack, vec2(fract(sphUv.x + 0.004), sphUv.y)).rgb, vec3(0.3, 0.59, 0.11));
        float texU = dot(texture2D(uFloralBlack, vec2(sphUv.x, clamp(sphUv.y + 0.004, 0.004, 0.996))).rgb, vec3(0.3, 0.59, 0.11));
        float texC = dot(tex, vec3(0.3, 0.59, 0.11));
        reliefBump = (texC - 0.5 * (texR + texU)) * 3.5;
      }

      // 3D Sphere chiaroscuro lighting: cool moonlight top-left + warm golden rim bottom-right
      vec3 L1 = normalize(vec3(-0.45, 0.55, 0.7));
      vec3 L2 = normalize(vec3(0.78, -0.58, 0.28));
      vec3 bumpedN = normalize(N + vec3(reliefBump, reliefBump, 0.0) * 0.35);

      float diff1 = max(0.0, dot(bumpedN, L1));
      float diff2 = max(0.0, dot(bumpedN, L2));
      float fresnel = pow(1.0 - max(0.0, N.z), 3.0);

      vec3 lit = tex * (0.28 + diff1 * 1.15)
               + tex * vec3(1.0, 0.92, 0.78) * diff2 * 0.85
               + vec3(0.92, 0.88, 0.78) * fresnel * 0.22;

      // Soft spherical horizon falloff so the sphere dissolves seamlessly into obsidian space
      float edgeSoft = smoothstep(1.0, 0.76, sqrt(r2));
      menuCol = mix(vec3(0.015, 0.015, 0.018), lit, edgeSoft);
    }

    // Warm atmospheric light building softly from the bottom-right corner
    vec2 brOrigin = vec2(0.87 + sin(t * 0.45) * 0.03, 0.06 + cos(t * 0.38) * 0.025);
    float brDist = length((vUv - brOrigin) * aspect);
    float brGlow = exp(-(brDist * brDist) / 0.16) * (0.30 + 0.08 * sin(t * 0.85));
    menuCol += vec3(0.96, 0.90, 0.78) * brGlow * smoothstep(0.45, 1.1, uInk);

    float fadeIn = smoothstep(0.004, 0.055, uInk);
    menuAlpha = clamp(inkMask + wetRim * 0.30, 0.0, 1.0) * fadeIn;
  }

  // 2. Scroll-driven colour shift: organic black cotton-ink flooding upward from bottom
  float scrollAlpha = 0.0;
  if (uScrollInk > 0.004) {
    float sFiber = smoothstep(0.0, 0.2, uScrollInk) * (1.0 - smoothstep(0.88, 1.0, uScrollInk));
    float organicEdge = (
      fbm(vec2(p.x * 3.4 + uTime * 0.04, p.y * 3.4 - uTime * 0.03)) * 0.26
      + fbm(p * 11.0 + uTime * 0.02) * 0.09
    ) * sFiber;
    float rise = uScrollInk * 1.28;
    float front = rise - (vUv.y - organicEdge);
    float mask = smoothstep(-0.04, 0.09, front);
    float wet = smoothstep(-0.14, 0.01, front) * (1.0 - mask);
    scrollAlpha = clamp(mask + wet * 0.26, 0.0, 1.0) * smoothstep(0.004, 0.08, uScrollInk);
  }

  vec3 finalCol = mix(vec3(0.0), menuCol, smoothstep(0.0, 0.25, menuAlpha));
  float finalAlpha = max(menuAlpha, scrollAlpha);
  gl_FragColor = vec4(finalCol, finalAlpha);
}
`

export default function InkMenuCanvas({
  menuHover,
  menuOpen,
  pageWash,
  isHome,
}: InkMenuCanvasProps) {
  const menuHostRef = useRef<HTMLDivElement>(null)
  const hoverRef = useRef(menuHover)
  const openRef = useRef(menuOpen)
  const washRef = useRef(pageWash)
  const isHomeRef = useRef(isHome)

  hoverRef.current = menuHover
  openRef.current = menuOpen
  washRef.current = pageWash
  isHomeRef.current = isHome

  useEffect(() => {
    const host = menuHostRef.current
    if (!host) return

    const reduced = reducedMotion()
    const isMobile = window.innerWidth < 768

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 1.5))
    renderer.setSize(host.clientWidth, host.clientHeight)
    renderer.setClearColor(0x000000, 0)
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const pointerVec = new THREE.Vector2(0.5, 0.5)

    const placeholder = new THREE.DataTexture(new Uint8Array([8, 8, 10, 255]), 1, 1)
    placeholder.needsUpdate = true

    const geo = new THREE.PlaneGeometry(2, 2)
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uRes: { value: new THREE.Vector2(host.clientWidth, host.clientHeight) },
        uTime: { value: 0 },
        uInk: { value: 0 },
        uScrollInk: { value: 0 },
        uPointer: { value: pointerVec },
        uFloralBlack: { value: placeholder },
        uHasBlack: { value: 0 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
    })
    scene.add(new THREE.Mesh(geo, mat))

    new THREE.TextureLoader().load('/textures/floral-black-motion.jpg', (tex) => {
      tex.wrapS = THREE.RepeatWrapping
      tex.wrapT = THREE.ClampToEdgeWrapping
      tex.minFilter = THREE.LinearFilter
      tex.magFilter = THREE.LinearFilter
      mat.uniforms.uFloralBlack.value = tex
      mat.uniforms.uHasBlack.value = 1
    })

    let ptrX = 0.5
    let ptrY = 0.5
    let curInk = 0
    let curScrollInk = 0

    const onPointerMove = (e: PointerEvent) => {
      ptrX = e.clientX / window.innerWidth
      ptrY = 1 - e.clientY / window.innerHeight
    }

    const onResize = () => {
      if (!host) return
      const w = host.clientWidth
      const h = host.clientHeight
      renderer.setSize(w, h)
      mat.uniforms.uRes.value.set(w, h)
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('resize', onResize)

    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = now / 1000

      mat.uniforms.uTime.value = reduced ? 0 : t
      pointerVec.x = damp(pointerVec.x, ptrX, 4.0, dt)
      pointerVec.y = damp(pointerVec.y, ptrY, 4.0, dt)

      const diag = Math.hypot(host.clientWidth / Math.max(host.clientHeight, 1), 1)
      const fullOpen = openRef.current || washRef.current
      const target = fullOpen ? diag + 0.55 : hoverRef.current ? 0.34 : 0
      const speed = washRef.current ? 4.4 : openRef.current ? 2.4 : hoverRef.current ? 3.2 : 4.2
      curInk = damp(curInk, target, reduced ? 40 : speed, dt)
      if (!fullOpen && !hoverRef.current && curInk < 0.004) {
        curInk = 0
      }
      mat.uniforms.uInk.value = curInk

      let targetScrollInk = 0
      if (isHomeRef.current) {
        const blackout = document.getElementById('act-blackout')
        if (blackout) {
          const rect = blackout.getBoundingClientRect()
          const vh = window.innerHeight || 1
          const raw = (vh * 0.95 - rect.top) / (vh * 0.85)
          targetScrollInk = Math.max(0, Math.min(1, raw))
        }
      }
      curScrollInk = damp(curScrollInk, targetScrollInk, reduced ? 40 : 6.5, dt)
      if (targetScrollInk === 0 && curScrollInk < 0.004) curScrollInk = 0
      mat.uniforms.uScrollInk.value = curScrollInk

      const isMenuActive = curInk > 0.005
      host.style.zIndex = isMenuActive ? '45' : '12'

      renderer.render(scene, camera)
    }

    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('resize', onResize)
      geo.dispose()
      mat.dispose()
      placeholder.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={menuHostRef} aria-hidden className="pointer-events-none fixed inset-0 z-[12]" />
}
