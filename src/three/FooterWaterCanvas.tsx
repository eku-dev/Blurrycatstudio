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

void main() {
  float waterLine = 0.34;
  float lum = 0.0;

  if (vUv.y >= waterLine) {
    // Subtle monochrome moonlight aura behind the glowing white logo (zero coloured flowers)
    vec2 upperUv = vec2(vUv.x, (vUv.y - waterLine) / (1.0 - waterLine));
    vec2 cd = (upperUv - vec2(0.5, 0.38)) * vec2(2.4, 1.35);
    lum = exp(-dot(cd, cd) * 4.2) * (0.14 + 0.025 * sin(uTime * 1.1));
  } else {
    // Pure shimmering monochrome silver-white water reflection under the glowing crest
    float depth = (waterLine - vUv.y) / waterLine;
    float w1 = sin(depth * 52.0 - uTime * 2.1 + sin(vUv.x * 11.0 + uTime * 0.7) * 1.4);
    float w2 = sin(depth * 96.0 - uTime * 3.0 + vUv.x * 19.0) * 0.5;
    float turb = (fbm(vec2(vUv.x * 7.5 + uTime * 0.12, depth * 10.0 - uTime * 0.45)) - 0.5) * 2.0;
    float rippleX = (w1 * 0.016 + w2 * 0.008 + turb * 0.022) * (0.28 + depth * 1.35);

    float centerBand = exp(-pow((vUv.x - 0.5 + rippleX * 0.85) * 4.4, 2.0));
    float streakWave = smoothstep(0.08, 0.78, 0.5 + 0.5 * sin(depth * 64.0 - uTime * 2.3 + turb * 3.8));
    float shorelineGlow = exp(-depth * 7.5) * exp(-pow((vUv.x - 0.5) * 3.0, 2.0)) * 0.62;
    float shimmer = centerBand * streakWave * (1.0 - depth * 0.76) * 0.65 + shorelineGlow;
    float spec = pow(max(0.0, 0.5 + 0.5 * w1) * max(0.0, 0.5 + 0.5 * turb), 3.0) * centerBand * 0.35;

    float fadeBottom = 1.0 - smoothstep(0.15, 1.0, depth);
    float fadeEdges = 1.0 - smoothstep(0.28, 0.50, abs(vUv.x - 0.5));
    lum = (shimmer + spec) * fadeBottom * fadeEdges;
  }

  // Crisp subtle shoreline shimmer right at y = waterLine
  float shoreDist = abs(vUv.y - waterLine);
  float shoreLine = exp(-shoreDist * 220.0) * exp(-pow((vUv.x - 0.5) * 3.2, 2.0)) * 0.42;
  lum += shoreLine;

  float a = clamp(lum, 0.0, 1.0);
  gl_FragColor = vec4(vec3(0.95, 0.96, 0.98) * a, a);
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
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setSize(host.clientWidth || 1, host.clientHeight || 1)
    renderer.setClearColor(0x000000, 0)
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    const geo = new THREE.PlaneGeometry(2, 2)
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uRes: { value: new THREE.Vector2(host.clientWidth || 1, host.clientHeight || 1) },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
    })
    scene.add(new THREE.Mesh(geo, mat))

    const onResize = () => {
      if (!host) return
      const w = host.clientWidth || 1
      const h = host.clientHeight || 1
      renderer.setSize(w, h)
      mat.uniforms.uRes.value.set(w, h)
    }
    window.addEventListener('resize', onResize)

    let raf = 0
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      mat.uniforms.uTime.value = reduced ? 0 : now / 1000
      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      geo.dispose()
      mat.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={hostRef} aria-hidden className="h-full w-full" />
}
