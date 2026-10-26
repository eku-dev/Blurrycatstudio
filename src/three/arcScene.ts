import * as THREE from 'three'

const vert = /* glsl */ `
  uniform float uBend;
  uniform float uHover;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    float x = uv.x - 0.5;
    p.z -= x * x * uBend;            // gentle cylindrical curve, like printed card stock
    p.z += uHover * 0.35;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

const frag = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uLoaded;
  uniform float uHover;
  uniform float uDim;
  uniform vec2 uPlane;   // plane aspect (w,h)
  uniform vec2 uImage;   // image size
  varying vec2 vUv;

  float roundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    // object-fit: cover
    float pa = uPlane.x / uPlane.y;
    float ia = uImage.x / uImage.y;
    vec2 s = pa > ia ? vec2(1.0, ia / pa) : vec2(pa / ia, 1.0);
    vec2 uv = (vUv - 0.5) * s * (1.0 - uHover * 0.06) + 0.5;
    vec3 col = texture2D(uTex, uv).rgb;
    col = mix(vec3(0.16, 0.16, 0.15), col, uLoaded);
    col *= mix(1.0 - uDim, 1.0, uHover);

    vec2 p = (vUv - 0.5) * uPlane;
    float d = roundedBox(p, uPlane * 0.5, 0.045);
    float a = 1.0 - smoothstep(-0.006, 0.006, d);
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }
`

export type ArcCard = { url: string; label: string }
export type ArcHandle = {
  dispose: () => void
  setProgress: (p: number) => void
}

export function mountArcScene(
  host: HTMLElement,
  cards: ArcCard[],
  opts: { reduced: boolean; onHover: (label: string | null) => void },
): ArcHandle {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.touchAction = 'pan-y'
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
  camera.position.set(0, 0, 14)

  const wheel = new THREE.Group()
  scene.add(wheel)

  const R = 7.6
  const W = 1.75, H = 2.3
  const N = cards.length
  const step = (Math.PI * 2) / N
  const geo = new THREE.PlaneGeometry(W, H, 24, 1)
  const loader = new THREE.TextureLoader()
  loader.setCrossOrigin('anonymous')

  const meshes: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[] = []
  cards.forEach((c, i) => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      uniforms: {
        uTex: { value: null },
        uLoaded: { value: 0 },
        uHover: { value: 0 },
        uDim: { value: 0.18 },
        uBend: { value: 0.28 },
        uPlane: { value: new THREE.Vector2(W, H) },
        uImage: { value: new THREE.Vector2(1, 1) },
      },
    })
    loader.load(c.url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = 4
      const im = tex.image as HTMLImageElement
      mat.uniforms.uTex.value = tex
      mat.uniforms.uImage.value.set(im.width, im.height)
      // fade in
      const t0 = performance.now()
      const fade = () => {
        const k = Math.min(1, (performance.now() - t0) / 700)
        mat.uniforms.uLoaded.value = k
        if (k < 1) requestAnimationFrame(fade)
      }
      fade()
    })
    const m = new THREE.Mesh(geo, mat)
    m.userData = { index: i, label: c.label, hover: 0 }
    wheel.add(m)
    meshes.push(m)
  })

  // Wheel centre sits below the fold so only the crown of the arc is visible.
  const centreY = () => (camera.aspect < 1 ? -6.2 : -5.4)

  const layout = (rot: number) => {
    const cy = centreY()
    meshes.forEach((m, i) => {
      const a = i * step + rot
      const h = m.userData.hover as number
      const r = R + h * 0.35
      m.position.set(Math.sin(a) * r, cy + Math.cos(a) * r, -Math.abs(Math.sin(a)) * 1.6)
      m.rotation.set(0.08, Math.sin(a) * 0.35, -a)
      m.scale.setScalar(1 + h * 0.08)
    })
  }

  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    renderer.domElement.style.width = w + 'px'
    renderer.domElement.style.height = h + 'px'
    camera.aspect = w / h
    camera.position.z = camera.aspect < 1 ? 19 : 14
    camera.updateProjectionMatrix()
  }

  // ── interaction: hover + drag with inertia ──
  const ray = new THREE.Raycaster()
  const ndc = new THREE.Vector2(9, 9)
  let hovered: THREE.Mesh | null = null
  let dragging = false
  let lastX = 0
  let velocity = 0
  let dragOffset = 0
  let progress = 0

  const toNdc = (e: PointerEvent) => {
    const b = renderer.domElement.getBoundingClientRect()
    ndc.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1)
  }
  const onMove = (e: PointerEvent) => {
    toNdc(e)
    if (dragging) {
      const dx = e.clientX - lastX
      lastX = e.clientX
      velocity = dx * 0.0022
      dragOffset += velocity
    }
  }
  const onDown = (e: PointerEvent) => {
    dragging = true
    lastX = e.clientX
    velocity = 0
  }
  const onUp = () => (dragging = false)
  const onLeave = () => {
    ndc.set(9, 9)
    dragging = false
  }
  const el = renderer.domElement
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerdown', onDown)
  window.addEventListener('pointerup', onUp)
  el.addEventListener('pointerleave', onLeave)

  let visible = true
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
  io.observe(host)

  const ro = new ResizeObserver(() => {
    resize()
    if (opts.reduced) render(0)
  })
  ro.observe(host)
  resize()

  let rot = 0
  let idle = 0
  const render = (dt: number) => {
    if (!opts.reduced) {
      if (!dragging) {
        velocity *= 0.94
        dragOffset += velocity
      }
      idle += dt * 0.025
    }
    const target = -progress * Math.PI * 0.9 + dragOffset + idle
    rot += (target - rot) * (opts.reduced ? 1 : 0.07)

    ray.setFromCamera(ndc, camera)
    const hit = ray.intersectObjects(meshes, false)[0]
    const next = (hit?.object as THREE.Mesh) ?? null
    if (next !== hovered) {
      hovered = next
      opts.onHover(hovered ? (hovered.userData.label as string) : null)
      el.style.cursor = hovered ? 'grab' : 'default'
    }
    meshes.forEach((m) => {
      const tgt = m === hovered ? 1 : 0
      m.userData.hover += (tgt - m.userData.hover) * (opts.reduced ? 1 : 0.1)
      m.material.uniforms.uHover.value = m.userData.hover
    })
    layout(rot)
    renderer.render(scene, camera)
  }

  const clock = new THREE.Clock()
  let raf = 0
  const loop = () => {
    raf = requestAnimationFrame(loop)
    const dt = Math.min(clock.getDelta(), 0.05)
    if (visible) render(dt)
  }
  if (opts.reduced) render(0)
  else loop()

  return {
    setProgress(p) {
      progress = p
      if (opts.reduced) render(0)
    },
    dispose() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointerleave', onLeave)
      meshes.forEach((m) => {
        ;(m.material.uniforms.uTex.value as THREE.Texture | null)?.dispose()
        m.material.dispose()
      })
      geo.dispose()
      renderer.dispose()
      el.remove()
    },
  }
}
