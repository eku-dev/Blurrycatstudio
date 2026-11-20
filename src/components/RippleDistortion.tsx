import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { reducedMotion } from '../lib/smooth'

export interface RippleDistortionProps {
  src?: string
  brushSize?: number
  strength?: number
  swirl?: number
  rings?: number
  grayscale?: boolean
  spread?: number
  fade?: number
  spacing?: number
  dispersion?: number
  glint?: number
  tint?: string
  tintAmount?: number
  highlightColor?: string
  trigger?: 'hover' | 'click' | 'both'
  clickStrength?: number
  quality?: 'low' | 'medium' | 'high'
  enabled?: boolean
  className?: string
}

const MAX_RIPPLES = 16

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
uniform sampler2D uTexture;
uniform float uHasTex;
uniform vec2 uRes;
uniform float uImgAspect;
uniform float uTime;
uniform float uStrength;
uniform float uSwirl;
uniform float uRings;
uniform float uGrayscale;
uniform float uDispersion;
uniform float uGlint;
uniform vec3 uTint;
uniform float uTintAmount;
uniform vec3 uHighlight;
uniform vec4 uRipples[${MAX_RIPPLES}]; // xy = uv pos, z = radius, w = amplitude

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

void main() {
  vec2 aspect = vec2(uRes.x / max(uRes.y, 1.0), 1.0);
  vec2 p = vUv * aspect;

  vec2 disp = vec2(0.0);
  float totalWave = 0.0;
  float ringCrest = 0.0;

  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    vec4 rp = uRipples[i];
    if (rp.w <= 0.001) continue;

    vec2 c = rp.xy * aspect;
    vec2 diff = p - c;
    float d = length(diff);
    float rad = rp.z;
    float band = max(0.04, rad * 0.55);
    float env = exp(-pow((d - rad) / band, 2.0)) * rp.w;
    float wave = sin((d - rad) * 28.0 * max(1.0, uRings * 0.5));

    vec2 dir = diff / max(d, 0.0005);
    vec2 tang = vec2(-dir.y, dir.x);
    vec2 push = dir * wave + tang * (wave * 0.35 * uSwirl);

    disp += push * env * uStrength * 0.14;
    totalWave += abs(wave) * env;
    ringCrest += max(0.0, wave) * env;
  }

  // Pure overlay ripple mode (no background image — ripples across the entire section)
  if (uHasTex < 0.5) {
    float rippleAmt = clamp(totalWave * 0.85, 0.0, 1.0);
    if (rippleAmt <= 0.002) {
      gl_FragColor = vec4(0.0);
      return;
    }
    vec3 baseCol = mix(vec3(0.72, 0.74, 0.78), uTint, clamp(uTintAmount * 4.0, 0.0, 1.0));
    vec3 col = mix(baseCol, uHighlight, clamp(ringCrest * 0.75 + uGlint * 0.3, 0.0, 1.0));
    float alpha = clamp(rippleAmt * (0.34 + uStrength * 0.9), 0.0, 0.52);
    gl_FragColor = vec4(col * alpha, alpha);
    return;
  }

  vec2 baseUv = coverUv(vUv, uRes, uImgAspect);
  vec2 uvR = clamp(baseUv + disp * (1.0 + uDispersion * 0.5), 0.002, 0.998);
  vec2 uvG = clamp(baseUv + disp, 0.002, 0.998);
  vec2 uvB = clamp(baseUv + disp * (1.0 - uDispersion * 0.5), 0.002, 0.998);

  vec3 col = vec3(
    texture2D(uTexture, uvR).r,
    texture2D(uTexture, uvG).g,
    texture2D(uTexture, uvB).b
  );

  if (uGrayscale > 0.5) {
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    col = vec3(l);
  }

  float rippleAmt = clamp(totalWave, 0.0, 1.0);
  col = mix(col, mix(col, uTint, 0.65), rippleAmt * uTintAmount * 2.5);
  col += uHighlight * pow(rippleAmt, 2.2) * (0.12 + uGlint * 0.4);

  gl_FragColor = vec4(col, 1.0);
}
`

export default function RippleDistortion({
  src,
  brushSize = 150,
  strength = 0.2,
  swirl = 1,
  rings = 4,
  grayscale = true,
  spread = 5,
  fade = 3,
  spacing = 15,
  dispersion = 0,
  glint = 0,
  tint = '#a855f7',
  tintAmount = 0.1,
  highlightColor = '#ffffff',
  trigger = 'hover',
  clickStrength = 2,
  quality = 'low',
  enabled = true,
  className = '',
}: RippleDistortionProps) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled) return
    const host = hostRef.current
    if (!host) return

    const reduced = reducedMotion()
    const dprCap = quality === 'high' ? 1.5 : quality === 'medium' ? 1.2 : 0.85

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap))
    renderer.setSize(host.clientWidth || 1, host.clientHeight || 1)
    renderer.setClearColor(0x000000, 0)
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    const rippleUniforms = Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4(0, 0, 0, 0))
    const tintCol = new THREE.Color(tint)
    const hiCol = new THREE.Color(highlightColor)

    const placeholder = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)
    placeholder.needsUpdate = true

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTexture: { value: placeholder },
        uHasTex: { value: 0 },
        uRes: { value: new THREE.Vector2(host.clientWidth || 1, host.clientHeight || 1) },
        uImgAspect: { value: 16 / 9 },
        uTime: { value: 0 },
        uStrength: { value: strength },
        uSwirl: { value: swirl },
        uRings: { value: rings },
        uGrayscale: { value: grayscale ? 1 : 0 },
        uDispersion: { value: dispersion },
        uGlint: { value: glint },
        uTint: { value: tintCol },
        uTintAmount: { value: tintAmount },
        uHighlight: { value: hiCol },
        uRipples: { value: rippleUniforms },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
    })

    const geo = new THREE.PlaneGeometry(2, 2)
    scene.add(new THREE.Mesh(geo, mat))

    let loadedTex: THREE.Texture | null = null
    if (src) {
      new THREE.TextureLoader().load(src, (tex) => {
        loadedTex = tex
        tex.minFilter = THREE.LinearFilter
        tex.magFilter = THREE.LinearFilter
        tex.generateMipmaps = false
        const img = tex.image as HTMLImageElement | undefined
        if (img && img.naturalWidth && img.naturalHeight) {
          mat.uniforms.uImgAspect.value = img.naturalWidth / img.naturalHeight
        }
        mat.uniforms.uTexture.value = tex
        mat.uniforms.uHasTex.value = 1
      })
    }

    let nextIdx = 0
    let lastX = -9999
    let lastY = -9999

    const spawnRipple = (clientX: number, clientY: number, ampMult: number) => {
      if (reduced) return
      const rect = host.getBoundingClientRect()
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        return
      }
      const u = (clientX - rect.left) / Math.max(1, rect.width)
      const v = 1 - (clientY - rect.top) / Math.max(1, rect.height)
      const baseR = Math.max(0.03, (brushSize / Math.max(rect.height, 300)) * 0.22)
      rippleUniforms[nextIdx].set(u, v, baseR, Math.min(2.5, ampMult))
      nextIdx = (nextIdx + 1) % MAX_RIPPLES
    }

    const onPointerMove = (e: PointerEvent) => {
      if (trigger === 'click') return
      const dist = Math.hypot(e.clientX - lastX, e.clientY - lastY)
      if (dist < Math.max(4, spacing)) return
      lastX = e.clientX
      lastY = e.clientY
      spawnRipple(e.clientX, e.clientY, 1.0)
    }

    const onPointerDown = (e: PointerEvent) => {
      spawnRipple(e.clientX, e.clientY, clickStrength)
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onPointerDown, { passive: true })

    const ro = new ResizeObserver(() => {
      const w = host.clientWidth || 1
      const h = host.clientHeight || 1
      renderer.setSize(w, h)
      mat.uniforms.uRes.value.set(w, h)
    })
    ro.observe(host)

    let visible = false
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? false
      },
      { rootMargin: '160px' },
    )
    io.observe(host)

    let raf = 0
    let last = performance.now()
    const spreadRate = spread * 0.055
    const fadeRate = fade * 0.55

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (!visible) return

      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      mat.uniforms.uTime.value = now / 1000

      for (let i = 0; i < MAX_RIPPLES; i++) {
        const rp = rippleUniforms[i]
        if (rp.w > 0.001) {
          rp.z += spreadRate * dt
          rp.w *= Math.exp(-fadeRate * dt)
          if (rp.w < 0.003) rp.w = 0
        }
      }

      renderer.render(scene, camera)
    }

    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      geo.dispose()
      mat.dispose()
      placeholder.dispose()
      loadedTex?.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [
    src,
    brushSize,
    strength,
    swirl,
    rings,
    grayscale,
    spread,
    fade,
    spacing,
    dispersion,
    glint,
    tint,
    tintAmount,
    highlightColor,
    trigger,
    clickStrength,
    quality,
    enabled,
  ])

  return <div ref={hostRef} aria-hidden className={`h-full w-full overflow-hidden ${className}`} />
}
