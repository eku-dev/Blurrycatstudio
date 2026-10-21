/**
 * Full-bleed photograph with an animated motion-blur / streak effect, in raw WebGL
 * (no three.js — this is the hero, it has to be light).
 *
 * The photo is placed inside the canvas at `rect`; everything outside it samples the
 * photo's clamped edge pixels, which stretches the studio backdrop across the hero as
 * soft streaks. A directional blur trails behind the subject, vertical smear bands
 * drift through it, and the face stays comparatively sharp. Pointer speed and scroll
 * speed push the blur harder; it eases back to a steady "in motion" state.
 */

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

const FRAG = `
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;      // canvas size (px)
uniform vec4 uRect;     // photo rect in canvas px: x, y (from top), w, h
uniform float uTime;
uniform float uAmt;     // overall blur amount
uniform vec2 uDir;      // trail direction (image space)
uniform vec2 uFocus;    // face position in image uv (y down)
uniform float uDarken;  // left/top darkening for headline contrast
varying vec2 vUv;

float hash(float n) { return fract(sin(n) * 43758.5453123); }
float noise(float x) {
  float i = floor(x), f = fract(x);
  return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f));
}
float grain(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

vec3 photo(vec2 uv) { return texture2D(uTex, clamp(uv, 0.001, 0.999)).rgb; }

void main() {
  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uRes;           // canvas px, y down
  vec2 uv = (px - uRect.xy) / uRect.zw;                  // image uv, y down

  // keep the face readable; blur grows with distance from it
  float focus = smoothstep(0.06, 0.38, distance(uv * vec2(1.0, 1.1), uFocus * vec2(1.0, 1.1)));
  float amt = uAmt * mix(0.22, 1.0, focus);

  // vertical smear bands that drift slowly sideways
  float fine = noise(uv.x * 110.0 + uTime * 0.35);
  float bands = smoothstep(0.45, 1.0, noise(uv.x * 9.0 - uTime * 0.12));
  float smear = (fine * 0.45 + bands) * amt;

  vec3 acc = vec3(0.0);
  float tot = 0.0;
  for (int i = 0; i < 28; i++) {
    float t = float(i) / 27.0;
    float w = 1.0 - t * 0.8;
    vec2 o = uDir * t * amt * 0.16 + vec2(0.0, t * smear * 0.22);
    acc += photo(uv + o) * w;
    tot += w;
  }
  vec3 col = acc / tot;
  col = mix(photo(uv), col, clamp(amt * 1.6, 0.0, 1.0));

  // faint ghost echo — the subject a beat behind itself
  col = mix(col, photo(uv + uDir * 0.035 * uAmt), 0.12 * uAmt);

  // cinematic shading for headline contrast, then film grain
  float shade = 1.0 - uDarken * (1.0 - smoothstep(0.0, 0.65, vUv.x * 0.55 + (1.0 - vUv.y) * 0.75));
  col *= shade;
  col += (grain(px + fract(uTime) * 100.0) - 0.5) * 0.035;

  gl_FragColor = vec4(col, 1.0);
}`

export type MotionPhotoOptions = {
  src: string
  /** Face position in the photo, as uv with y pointing down. */
  focus: [number, number]
  /** Where the photo sits in the canvas for a given canvas size. */
  layout: (w: number, h: number) => { x: number; y: number; w: number; h: number }
  reduced: boolean
  onReady?: () => void
}

export function mountMotionPhoto(host: HTMLElement, opts: MotionPhotoOptions) {
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'display:block;width:100%;height:100%'
  host.appendChild(canvas)
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false })
  if (!gl) {
    canvas.remove()
    throw new Error('WebGL unavailable')
  }

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader')
    return s
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  gl.useProgram(prog)

  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const aPos = gl.getAttribLocation(prog, 'aPos')
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

  const u = (n: string) => gl.getUniformLocation(prog, n)
  const U = {
    res: u('uRes'), rect: u('uRect'), time: u('uTime'), amt: u('uAmt'),
    dir: u('uDir'), focus: u('uFocus'), darken: u('uDarken'),
  }
  gl.uniform2f(U.focus, opts.focus[0], opts.focus[1])
  gl.uniform1f(U.darken, 0.32)

  const tex = gl.createTexture()
  let ready = false
  const img = new Image()
  img.decoding = 'async'
  img.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img)
    ready = true
    t0 = performance.now()
    opts.onReady?.()
    if (opts.reduced) draw(performance.now())
  }
  img.src = opts.src

  // ── sizing ──
  let W = 0, H = 0
  const dpr = Math.min(window.devicePixelRatio, 1.5) // blur hides resolution; keep the fill-rate low
  const resize = () => {
    W = host.clientWidth
    H = host.clientHeight
    if (!W || !H) return
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.uniform2f(U.res, canvas.width, canvas.height)
    const r = opts.layout(W, H)
    gl.uniform4f(U.rect, r.x * dpr, r.y * dpr, r.w * dpr, r.h * dpr)
    if (opts.reduced && ready) draw(performance.now())
  }
  const ro = new ResizeObserver(resize)
  ro.observe(host)
  resize()

  // ── motion input: pointer speed and scroll speed feed the blur ──
  let energy = 0
  let dirX = 1, dirY = 0.12
  let lastX = 0, lastY = 0, lastScroll = window.scrollY
  const onMove = (e: PointerEvent) => {
    const dx = e.clientX - lastX, dy = e.clientY - lastY
    lastX = e.clientX
    lastY = e.clientY
    const speed = Math.hypot(dx, dy)
    if (speed > 1 && speed < 400) {
      energy = Math.min(1.2, energy + speed * 0.004)
      // trail points away from the movement
      dirX += (-dx / speed - dirX) * 0.15
      dirY += (-dy / speed * 0.5 - dirY) * 0.15
    }
  }
  const onScroll = () => {
    const d = Math.abs(window.scrollY - lastScroll)
    lastScroll = window.scrollY
    energy = Math.min(1.4, energy + d * 0.004)
  }
  if (!opts.reduced) {
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
  }

  let visible = true
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
  io.observe(host)

  let t0 = performance.now()
  let amt = 0.5
  const draw = (now: number) => {
    if (!ready) return
    const t = (now - t0) / 1000
    if (opts.reduced) {
      amt = 0.55
    } else {
      const intro = Math.max(0, 1.6 - t * 0.9) // arrives in a rush, then settles
      const gust = Math.pow(Math.max(0, Math.sin(t * 0.9) * Math.sin(t * 0.37)), 6) * 0.8
      const target = 0.48 + Math.sin(t * 0.6) * 0.06 + gust + energy + intro
      amt += (target - amt) * 0.08
      energy *= 0.94
      // ease the direction back to the default sideways trail
      dirX += (1 - dirX) * 0.01
      dirY += (0.12 - dirY) * 0.01
    }
    const len = Math.hypot(dirX, dirY) || 1
    gl.uniform1f(U.time, t)
    gl.uniform1f(U.amt, amt)
    gl.uniform2f(U.dir, dirX / len, dirY / len)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  let raf = 0
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop)
    if (visible) draw(now)
  }
  if (!opts.reduced) raf = requestAnimationFrame(loop)

  return {
    /** Re-run `layout` — call when surrounding content changes size (e.g. web fonts load). */
    refresh: resize,
    dispose() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', onScroll)
      gl.deleteTexture(tex)
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.remove()
    },
  }
}
