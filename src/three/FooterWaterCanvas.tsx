import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { reducedMotion } from '../lib/smooth'

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
uniform float uTime;
uniform vec2 uRes;
uniform vec2 uPointer;
uniform sampler2D uFlowers;
uniform float uHasFlowers;

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
    p *= 2.05;
    a *= 0.5;
  }
  return v;
}

// Sample the upper nocturnal floral frame with gentle breeze sway
vec3 sampleUpperScene(vec2 uv, float t) {
  // Map upper canvas (y: waterLine..1.0) cleanly into flower texture (0..1)
  vec2 fUv = uv;
  float sway = sin(t * 0.55 + uv.y * 2.6) * 0.008 * smoothstep(0.0, 0.7, uv.y);
  fUv.x += sway + (uPointer.x - 0.5) * 0.014;
  fUv.y += cos(t * 0.42 + uv.x * 2.2) * 0.005;

  vec3 col = vec3(0.0);
  if (uHasFlowers > 0.5) {
    vec2 clamped = clamp(fUv, 0.002, 0.998);
    vec3 tex = texture2D(uFlowers, clamped).rgb;
    // Soft oval vignette so edges dissolve seamlessly into pure #000000
    vec2 d = (uv - vec2(0.5, 0.48)) * vec2(1.85, 1.55);
    float vig = 1.0 - smoothstep(0.52, 0.98, length(d));
    col = tex * vig;
  }

  // Subtle luminous moonlight aura behind where 3D Billi sits (echoing the white I glow)
  vec2 catCenter = vec2(0.5, 0.30);
  vec2 cd = (uv - catCenter) * vec2(2.6, 1.25);
  float aura = exp(-dot(cd, cd) * 3.8) * (0.14 + 0.025 * sin(t * 1.2));
  col += vec3(0.95, 0.94, 0.90) * aura;

  return col;
}

void main() {
  float waterLine = 0.34;
  vec3 col = vec3(0.0);

  if (vUv.y >= waterLine) {
    // Above the water: nocturnal floral surround + cat sanctuary glow
    vec2 upperUv = vec2(vUv.x, (vUv.y - waterLine) / (1.0 - waterLine));
    col = sampleUpperScene(upperUv, uTime);
  } else {
    // Below the waterLine: realistic rippling black-mirror water reflection
    float depth = (waterLine - vUv.y) / waterLine; // 0 at shoreline -> 1 at bottom

    // Perspective horizontal water ripples (fine near shoreline, broader deeper down)
    float w1 = sin(depth * 52.0 - uTime * 2.1 + sin(vUv.x * 11.0 + uTime * 0.7) * 1.4);
    float w2 = sin(depth * 96.0 - uTime * 3.0 + vUv.x * 19.0) * 0.5;
    float turb = (fbm(vec2(vUv.x * 7.5 + uTime * 0.12, depth * 10.0 - uTime * 0.45)) - 0.5) * 2.0;

    float rippleX = (w1 * 0.016 + w2 * 0.008 + turb * 0.022) * (0.28 + depth * 1.35);
    float rippleY = (w1 * 0.007 + turb * 0.012) * (0.25 + depth);

    // Mirrored UV looking back up at the flowers & cat
    vec2 refUv = vec2(vUv.x + rippleX, clamp(depth * 0.92 + rippleY, 0.0, 0.99));
    vec3 reflectedFlowers = sampleUpperScene(refUv, uTime) * 0.72;

    // Bright silvery-white broken reflection streaks under the central cat silhouette
    float centerBand = exp(-pow((vUv.x - 0.5 + rippleX * 0.85) * 4.8, 2.0));
    float streakWave = smoothstep(0.08, 0.78, 0.5 + 0.5 * sin(depth * 64.0 - uTime * 2.3 + turb * 3.8));
    float shorelineGlow = exp(-depth * 7.5) * exp(-pow((vUv.x - 0.5) * 3.1, 2.0)) * 0.58;
    float shimmer = centerBand * streakWave * (1.0 - depth * 0.78) * 0.62 + shorelineGlow;

    // Subtle dark water specular glints
    float spec = pow(max(0.0, 0.5 + 0.5 * w1) * max(0.0, 0.5 + 0.5 * turb), 3.0) * centerBand * 0.35;

    float fadeBottom = 1.0 - smoothstep(0.15, 1.0, depth);
    float fadeEdges = 1.0 - smoothstep(0.28, 0.50, abs(vUv.x - 0.5));

    col = (reflectedFlowers + vec3(0.92, 0.93, 0.95) * (shimmer + spec)) * fadeBottom * fadeEdges;
  }

  // Crisp subtle shoreline shimmer right at y = waterLine
  float shoreDist = abs(vUv.y - waterLine);
  float shoreLine = exp(-shoreDist * 220.0) * exp(-pow((vUv.x - 0.5) * 3.4, 2.0)) * 0.38;
  col += vec3(0.95, 0.95, 0.92) * shoreLine;

  // Tiny nocturnal firefly sparks drifting softly in the dark air
  vec2 ff1 = vec2(0.86 + sin(uTime * 0.45) * 0.025, 0.64 + cos(uTime * 0.6) * 0.03);
  float d1 = length((vUv - ff1) * vec2(uRes.x / max(uRes.y, 1.0), 1.0));
  float g1 = exp(-d1 * d1 * 1800.0) * (0.55 + 0.45 * sin(uTime * 2.2));
  col += vec3(0.76, 0.92, 0.46) * g1 * 0.85;

  vec2 ff2 = vec2(0.16 + cos(uTime * 0.38) * 0.02, 0.78 + sin(uTime * 0.52) * 0.025);
  float d2 = length((vUv - ff2) * vec2(uRes.x / max(uRes.y, 1.0), 1.0));
  float g2 = exp(-d2 * d2 * 2400.0) * (0.45 + 0.55 * sin(uTime * 1.7 + 1.4));
  col += vec3(0.95, 0.86, 0.58) * g2 * 0.55;

  gl_FragColor = vec4(col, 1.0);
}
`

export default function FooterWaterCanvas() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const reduced = reducedMotion()
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setSize(host.clientWidth, host.clientHeight)
    renderer.setClearColor(0x000000, 1)
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const ptr = new THREE.Vector2(0.5, 0.5)

    const placeholder = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)
    placeholder.needsUpdate = true

    const geo = new THREE.PlaneGeometry(2, 2)
    const mat = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uRes: { value: new THREE.Vector2(host.clientWidth, host.clientHeight) },
        uPointer: { value: ptr },
        uFlowers: { value: placeholder },
        uHasFlowers: { value: 0 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
    })
    scene.add(new THREE.Mesh(geo, mat))

    new THREE.TextureLoader().load('/textures/footer-cat-flowers.jpg', (tex) => {
      tex.minFilter = THREE.LinearFilter
      tex.magFilter = THREE.LinearFilter
      mat.uniforms.uFlowers.value = tex
      mat.uniforms.uHasFlowers.value = 1
    })

    let targetX = 0.5
    let targetY = 0.5
    const onMove = (e: PointerEvent) => {
      targetX = e.clientX / window.innerWidth
      targetY = 1 - e.clientY / window.innerHeight
    }

    const onResize = () => {
      if (!host) return
      const w = host.clientWidth
      const h = host.clientHeight
      renderer.setSize(w, h)
      mat.uniforms.uRes.value.set(w, h)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('resize', onResize)

    let raf = 0
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const t = now / 1000
      mat.uniforms.uTime.value = reduced ? 0 : t
      ptr.x += (targetX - ptr.x) * 0.06
      ptr.y += (targetY - ptr.y) * 0.06
      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('resize', onResize)
      geo.dispose()
      mat.dispose()
      placeholder.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={hostRef} aria-hidden className="h-full w-full" />
}
