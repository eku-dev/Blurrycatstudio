import { useEffect, useRef } from 'react'
import { reducedMotion } from '../lib/smooth'

export interface SplashCursorProps {
  rainbow?: boolean
  size?: number
  force?: number
  swirl?: number
  trail?: number
  clickSplash?: boolean
  colorSpeed?: number
  intensity?: number
  momentum?: number
  shading?: number
  glow?: number
  quality?: 'low' | 'medium' | 'high'
  intro?: boolean
  contained?: boolean
  className?: string
}

/**
 * GPU Navier-Stokes fluid SplashCursor rendered in refined monochrome grey
 * when rainbow={false}, with curl vorticity (swirl), liquid shading, click splashes,
 * and an intro swirl.
 */
export default function SplashCursor({
  rainbow = false,
  size = 1,
  force = 1,
  swirl = 3,
  trail = 1,
  clickSplash = true,
  colorSpeed = 1,
  intensity = 1,
  momentum = 1,
  shading = 1,
  glow = 0,
  quality = 'high',
  intro = true,
  contained = false,
  className = '',
}: SplashCursorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (reducedMotion()) return
    const canvas = canvasRef.current
    if (!canvas) return

    const params: WebGLContextAttributes = {
      alpha: true,
      depth: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: false,
    }

    const gl2 = canvas.getContext('webgl2', params) as WebGL2RenderingContext | null
    const isWebGL2 = !!gl2
    const gl = (gl2 ||
      canvas.getContext('webgl', params) ||
      canvas.getContext('experimental-webgl', params)) as
      | WebGL2RenderingContext
      | WebGLRenderingContext
      | null
    if (!gl) return

    let halfFloatTexType: number
    let supportLinearFiltering = false
    if (isWebGL2) {
      ;(gl as WebGL2RenderingContext).getExtension('EXT_color_buffer_float')
      supportLinearFiltering = !!gl.getExtension('OES_texture_float_linear')
      halfFloatTexType = (gl as WebGL2RenderingContext).HALF_FLOAT
    } else {
      const halfFloat = gl.getExtension('OES_texture_half_float')
      supportLinearFiltering = !!gl.getExtension('OES_texture_half_float_linear')
      if (!halfFloat) return
      halfFloatTexType = halfFloat.HALF_FLOAT_OES
    }

    const formatRGBA = isWebGL2
      ? { internalFormat: (gl as WebGL2RenderingContext).RGBA16F, format: gl.RGBA }
      : { internalFormat: gl.RGBA, format: gl.RGBA }
    const formatRG = isWebGL2
      ? { internalFormat: (gl as WebGL2RenderingContext).RG16F, format: (gl as WebGL2RenderingContext).RG }
      : { internalFormat: gl.RGBA, format: gl.RGBA }
    const formatR = isWebGL2
      ? { internalFormat: (gl as WebGL2RenderingContext).R16F, format: (gl as WebGL2RenderingContext).RED }
      : { internalFormat: gl.RGBA, format: gl.RGBA }

    const isMobile = window.innerWidth < 768
    const simRes = quality === 'high' ? (isMobile ? 96 : 128) : quality === 'medium' ? 96 : 64
    const dyeRes = quality === 'high' ? (isMobile ? 384 : 768) : quality === 'medium' ? 512 : 256
    const filtering = supportLinearFiltering ? gl.LINEAR : gl.NEAREST

    const compileShader = (type: number, source: string) => {
      const shader = gl.createShader(type)!
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      return shader
    }

    const createProgram = (vertSrc: string, fragSrc: string) => {
      const program = gl.createProgram()!
      const vs = compileShader(gl.VERTEX_SHADER, vertSrc)
      const fs = compileShader(gl.FRAGMENT_SHADER, fragSrc)
      gl.attachShader(program, vs)
      gl.attachShader(program, fs)
      gl.linkProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      const uniforms: Record<string, WebGLUniformLocation | null> = {}
      const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
      for (let i = 0; i < count; i++) {
        const info = gl.getActiveUniform(program, i)
        if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name)
      }
      return { program, uniforms }
    }

    const baseVert = `
      precision highp float;
      attribute vec2 aPosition;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform vec2 texelSize;
      void main() {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `

    const clearProg = createProgram(
      baseVert,
      `
      precision mediump float;
      varying highp vec2 vUv;
      uniform sampler2D uTexture;
      uniform float value;
      void main() {
        gl_FragColor = value * texture2D(uTexture, vUv);
      }
      `,
    )

    const splatProg = createProgram(
      baseVert,
      `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uTarget;
      uniform float aspectRatio;
      uniform vec3 color;
      uniform vec2 point;
      uniform float radius;
      void main() {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
      }
      `,
    )

    const advectionProg = createProgram(
      baseVert,
      `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uVelocity;
      uniform sampler2D uSource;
      uniform vec2 texelSize;
      uniform float dt;
      uniform float dissipation;
      void main() {
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        vec4 result = texture2D(uSource, coord);
        float decay = 1.0 + dissipation * dt;
        gl_FragColor = result / decay;
      }
      `,
    )

    const divergenceProg = createProgram(
      baseVert,
      `
      precision mediump float;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uVelocity;
      void main() {
        float L = texture2D(uVelocity, vL).x;
        float R = texture2D(uVelocity, vR).x;
        float T = texture2D(uVelocity, vT).y;
        float B = texture2D(uVelocity, vB).y;
        vec2 C = texture2D(uVelocity, vUv).xy;
        if (vL.x < 0.0) { L = -C.x; }
        if (vR.x > 1.0) { R = -C.x; }
        if (vT.y > 1.0) { T = -C.y; }
        if (vB.y < 0.0) { B = -C.y; }
        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
      }
      `,
    )

    const curlProg = createProgram(
      baseVert,
      `
      precision mediump float;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uVelocity;
      void main() {
        float L = texture2D(uVelocity, vL).y;
        float R = texture2D(uVelocity, vR).y;
        float T = texture2D(uVelocity, vT).x;
        float B = texture2D(uVelocity, vB).x;
        float vorticity = R - L - T + B;
        gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
      }
      `,
    )

    const vorticityProg = createProgram(
      baseVert,
      `
      precision highp float;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uVelocity;
      uniform sampler2D uCurl;
      uniform float curl;
      uniform float dt;
      void main() {
        float L = texture2D(uCurl, vL).x;
        float R = texture2D(uCurl, vR).x;
        float T = texture2D(uCurl, vT).x;
        float B = texture2D(uCurl, vB).x;
        float C = texture2D(uCurl, vUv).x;
        vec2 f = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        f /= length(f) + 0.0001;
        f *= curl * C;
        f.y *= -1.0;
        vec2 vel = texture2D(uVelocity, vUv).xy + f * dt;
        vel = clamp(vel, vec2(-1000.0), vec2(1000.0));
        gl_FragColor = vec4(vel, 0.0, 1.0);
      }
      `,
    )

    const pressureProg = createProgram(
      baseVert,
      `
      precision mediump float;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uDivergence;
      void main() {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        float divergence = texture2D(uDivergence, vUv).x;
        float pressure = (L + R + B + T - divergence) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
      }
      `,
    )

    const gradSubProg = createProgram(
      baseVert,
      `
      precision mediump float;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uVelocity;
      void main() {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        vec2 vel = texture2D(uVelocity, vUv).xy;
        vel.xy -= vec2(R - L, T - B);
        gl_FragColor = vec4(vel, 0.0, 1.0);
      }
      `,
    )

    const displayProg = createProgram(
      baseVert,
      `
      precision highp float;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uTexture;
      uniform float uShading;
      uniform float uGlow;
      uniform float uIntensity;
      void main() {
        vec3 c = texture2D(uTexture, vUv).rgb;
        float density = max(c.r, max(c.g, c.b));
        if (uShading > 0.01) {
          vec3 lc = texture2D(uTexture, vL).rgb;
          vec3 rc = texture2D(uTexture, vR).rgb;
          vec3 tc = texture2D(uTexture, vT).rgb;
          vec3 bc = texture2D(uTexture, vB).rgb;
          float dx = length(rc) - length(lc);
          float dy = length(tc) - length(bc);
          vec3 n = normalize(vec3(dx, dy, 0.045));
          vec3 l = normalize(vec3(-0.35, 0.55, 0.75));
          float diff = clamp(dot(n, l) * 0.5 + 0.5, 0.35, 1.0);
          float spec = pow(max(0.0, dot(n, l)), 10.0) * 0.16;
          c = c * mix(1.0, diff, clamp(uShading, 0.0, 1.0)) + vec3(spec) * density * clamp(uShading, 0.0, 1.0);
        }
        c += c * uGlow * 0.35;
        float a = clamp(density * 0.72 * uIntensity, 0.0, 0.82);
        gl_FragColor = vec4(c * a, a);
      }
      `,
    )

    // Fullscreen quad
    const vbo = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW)
    const ibo = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(0)

    type FBO = {
      texture: WebGLTexture
      fbo: WebGLFramebuffer
      width: number
      height: number
      texelSizeX: number
      texelSizeY: number
      attach: (id: number) => number
    }

    type DoubleFBO = {
      width: number
      height: number
      texelSizeX: number
      texelSizeY: number
      read: FBO
      write: FBO
      swap: () => void
    }

    const createFBO = (w: number, h: number, internalFormat: number, format: number, filter: number): FBO => {
      gl.activeTexture(gl.TEXTURE0)
      const texture = gl.createTexture()!
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, halfFloatTexType, null)

      const fbo = gl.createFramebuffer()!
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
      gl.viewport(0, 0, w, h)
      gl.clear(gl.COLOR_BUFFER_BIT)

      return {
        texture,
        fbo,
        width: w,
        height: h,
        texelSizeX: 1 / w,
        texelSizeY: 1 / h,
        attach(id: number) {
          gl.activeTexture(gl.TEXTURE0 + id)
          gl.bindTexture(gl.TEXTURE_2D, texture)
          return id
        },
      }
    }

    const createDoubleFBO = (w: number, h: number, internalFormat: number, format: number, filter: number): DoubleFBO => {
      let fbo1 = createFBO(w, h, internalFormat, format, filter)
      let fbo2 = createFBO(w, h, internalFormat, format, filter)
      return {
        width: w,
        height: h,
        texelSizeX: fbo1.texelSizeX,
        texelSizeY: fbo1.texelSizeY,
        get read() {
          return fbo1
        },
        set read(v) {
          fbo1 = v
        },
        get write() {
          return fbo2
        },
        set write(v) {
          fbo2 = v
        },
        swap() {
          const t = fbo1
          fbo1 = fbo2
          fbo2 = t
        },
      }
    }

    const getResolution = (res: number) => {
      let ar = gl.drawingBufferWidth / Math.max(1, gl.drawingBufferHeight)
      if (ar < 1) ar = 1 / ar
      const min = Math.round(res)
      const max = Math.round(res * ar)
      return gl.drawingBufferWidth > gl.drawingBufferHeight
        ? { width: max, height: min }
        : { width: min, height: max }
    }

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 1.5)
      const w = Math.floor((contained ? canvas.clientWidth : window.innerWidth) * dpr)
      const h = Math.floor((contained ? canvas.clientHeight : window.innerHeight) * dpr)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = Math.max(1, w)
        canvas.height = Math.max(1, h)
        return true
      }
      return false
    }
    resizeCanvas()

    let sRes = getResolution(simRes)
    let dRes = getResolution(dyeRes)
    let dye = createDoubleFBO(dRes.width, dRes.height, formatRGBA.internalFormat, formatRGBA.format, filtering)
    let velocity = createDoubleFBO(sRes.width, sRes.height, formatRG.internalFormat, formatRG.format, filtering)
    let divergence = createFBO(sRes.width, sRes.height, formatR.internalFormat, formatR.format, gl.NEAREST)
    let curl = createFBO(sRes.width, sRes.height, formatR.internalFormat, formatR.format, gl.NEAREST)
    let pressure = createDoubleFBO(sRes.width, sRes.height, formatR.internalFormat, formatR.format, gl.NEAREST)

    const blit = (target: FBO | null) => {
      if (!target) {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      } else {
        gl.viewport(0, 0, target.width, target.height)
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo)
      }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
    }

    // Refined monochrome grey palette when rainbow={false}
    let phase = 0
    const nextColor = () => {
      phase += 0.08 * colorSpeed
      if (!rainbow) {
        // Architectural liquid grey cycling softly between cool charcoal-silver & mist pearl
        const v = 0.28 + 0.24 * (0.5 + 0.5 * Math.sin(phase))
        return { r: v * 0.98, g: v, b: v * 1.03 }
      }
      const h = (phase * 0.15) % 1
      const i = Math.floor(h * 6)
      const f = h * 6 - i
      const q = 1 - f
      let r = 0, g = 0, b = 0
      switch (i % 6) {
        case 0: r = 1; g = f; b = 0; break
        case 1: r = q; g = 1; b = 0; break
        case 2: r = 0; g = 1; b = f; break
        case 3: r = 0; g = q; b = 1; break
        case 4: r = f; g = 0; b = 1; break
        case 5: r = 1; g = 0; b = q; break
      }
      return { r: r * 0.25, g: g * 0.25, b: b * 0.25 }
    }

    const correctRadius = (r: number) => {
      const ar = canvas.width / Math.max(1, canvas.height)
      return ar > 1 ? r * ar : r
    }

    const splat = (x: number, y: number, dx: number, dy: number, color: { r: number; g: number; b: number }) => {
      const baseRadius = (0.0018 * size)
      gl.useProgram(splatProg.program)
      gl.uniform1i(splatProg.uniforms.uTarget, velocity.read.attach(0))
      gl.uniform1f(splatProg.uniforms.aspectRatio, canvas.width / Math.max(1, canvas.height))
      gl.uniform2f(splatProg.uniforms.point, x, y)
      gl.uniform3f(splatProg.uniforms.color, dx, dy, 0)
      gl.uniform1f(splatProg.uniforms.radius, correctRadius(baseRadius))
      blit(velocity.write)
      velocity.swap()

      gl.uniform1i(splatProg.uniforms.uTarget, dye.read.attach(0))
      gl.uniform3f(splatProg.uniforms.color, color.r, color.g, color.b)
      blit(dye.write)
      dye.swap()
    }

    const pointer = { x: 0.5, y: 0.5, prevX: 0.5, prevY: 0.5, moved: false }

    const toNorm = (clientX: number, clientY: number) => {
      if (contained) {
        const rect = canvas.getBoundingClientRect()
        return {
          x: (clientX - rect.left) / Math.max(1, rect.width),
          y: 1 - (clientY - rect.top) / Math.max(1, rect.height),
        }
      }
      return {
        x: clientX / Math.max(1, window.innerWidth),
        y: 1 - clientY / Math.max(1, window.innerHeight),
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      const p = toNorm(e.clientX, e.clientY)
      if (!pointer.moved) {
        pointer.prevX = p.x
        pointer.prevY = p.y
        pointer.moved = true
      }
      const dx = (p.x - pointer.prevX) * 5200 * force
      const dy = (p.y - pointer.prevY) * 5200 * force
      pointer.prevX = p.x
      pointer.prevY = p.y
      pointer.x = p.x
      pointer.y = p.y
      if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
        splat(p.x, p.y, dx, dy, nextColor())
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      if (!clickSplash) return
      const p = toNorm(e.clientX, e.clientY)
      const col = nextColor()
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + Math.random() * 0.4
        const mag = (240 + Math.random() * 180) * force
        splat(p.x, p.y, Math.cos(ang) * mag, Math.sin(ang) * mag, col)
      }
    }

    const targetEl: EventTarget = contained ? canvas : window
    targetEl.addEventListener('pointermove', onPointerMove as EventListener, { passive: true })
    targetEl.addEventListener('pointerdown', onPointerDown as EventListener, { passive: true })

    // Intro grey fluid swirl on load
    if (intro) {
      const c = nextColor()
      splat(0.48, 0.52, 260 * force, 140 * force, c)
      splat(0.54, 0.48, -220 * force, -160 * force, c)
    }

    const curlStrength = swirl * 10
    const velDissipation = Math.max(0.25, 2.2 / Math.max(0.25, momentum))
    const dyeDissipation = Math.max(0.45, 3.2 / Math.max(0.25, trail))

    let raf = 0
    let last = performance.now()

    const step = (now: number) => {
      raf = requestAnimationFrame(step)
      const dt = Math.min(0.0166, (now - last) / 1000)
      last = now

      if (resizeCanvas()) {
        sRes = getResolution(simRes)
        dRes = getResolution(dyeRes)
        dye = createDoubleFBO(dRes.width, dRes.height, formatRGBA.internalFormat, formatRGBA.format, filtering)
        velocity = createDoubleFBO(sRes.width, sRes.height, formatRG.internalFormat, formatRG.format, filtering)
        divergence = createFBO(sRes.width, sRes.height, formatR.internalFormat, formatR.format, gl.NEAREST)
        curl = createFBO(sRes.width, sRes.height, formatR.internalFormat, formatR.format, gl.NEAREST)
        pressure = createDoubleFBO(sRes.width, sRes.height, formatR.internalFormat, formatR.format, gl.NEAREST)
      }

      gl.disable(gl.BLEND)

      // 1. Curl
      gl.useProgram(curlProg.program)
      gl.uniform2f(curlProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
      gl.uniform1i(curlProg.uniforms.uVelocity, velocity.read.attach(0))
      blit(curl)

      // 2. Vorticity (swirl)
      gl.useProgram(vorticityProg.program)
      gl.uniform2f(vorticityProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
      gl.uniform1i(vorticityProg.uniforms.uVelocity, velocity.read.attach(0))
      gl.uniform1i(vorticityProg.uniforms.uCurl, curl.attach(1))
      gl.uniform1f(vorticityProg.uniforms.curl, curlStrength)
      gl.uniform1f(vorticityProg.uniforms.dt, dt)
      blit(velocity.write)
      velocity.swap()

      // 3. Divergence
      gl.useProgram(divergenceProg.program)
      gl.uniform2f(divergenceProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
      gl.uniform1i(divergenceProg.uniforms.uVelocity, velocity.read.attach(0))
      blit(divergence)

      // 4. Pressure clear & Jacobi iterations
      gl.useProgram(clearProg.program)
      gl.uniform1i(clearProg.uniforms.uTexture, pressure.read.attach(0))
      gl.uniform1f(clearProg.uniforms.value, 0.8)
      blit(pressure.write)
      pressure.swap()

      gl.useProgram(pressureProg.program)
      gl.uniform2f(pressureProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
      gl.uniform1i(pressureProg.uniforms.uDivergence, divergence.attach(0))
      for (let i = 0; i < 16; i++) {
        gl.uniform1i(pressureProg.uniforms.uPressure, pressure.read.attach(1))
        blit(pressure.write)
        pressure.swap()
      }

      // 5. Gradient subtraction
      gl.useProgram(gradSubProg.program)
      gl.uniform2f(gradSubProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
      gl.uniform1i(gradSubProg.uniforms.uPressure, pressure.read.attach(0))
      gl.uniform1i(gradSubProg.uniforms.uVelocity, velocity.read.attach(1))
      blit(velocity.write)
      velocity.swap()

      // 6. Advect velocity
      gl.useProgram(advectionProg.program)
      gl.uniform2f(advectionProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
      gl.uniform1i(advectionProg.uniforms.uVelocity, velocity.read.attach(0))
      gl.uniform1i(advectionProg.uniforms.uSource, velocity.read.attach(0))
      gl.uniform1f(advectionProg.uniforms.dt, dt)
      gl.uniform1f(advectionProg.uniforms.dissipation, velDissipation)
      blit(velocity.write)
      velocity.swap()

      // 7. Advect dye
      gl.uniform2f(advectionProg.uniforms.texelSize, dye.texelSizeX, dye.texelSizeY)
      gl.uniform1i(advectionProg.uniforms.uVelocity, velocity.read.attach(0))
      gl.uniform1i(advectionProg.uniforms.uSource, dye.read.attach(1))
      gl.uniform1f(advectionProg.uniforms.dissipation, dyeDissipation)
      blit(dye.write)
      dye.swap()

      // 8. Render to screen with transparent alpha blending
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      gl.useProgram(displayProg.program)
      gl.uniform2f(displayProg.uniforms.texelSize, 1 / Math.max(1, canvas.width), 1 / Math.max(1, canvas.height))
      gl.uniform1i(displayProg.uniforms.uTexture, dye.read.attach(0))
      gl.uniform1f(displayProg.uniforms.uShading, shading)
      gl.uniform1f(displayProg.uniforms.uGlow, glow)
      gl.uniform1f(displayProg.uniforms.uIntensity, intensity)
      blit(null)
    }

    raf = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(raf)
      targetEl.removeEventListener('pointermove', onPointerMove as EventListener)
      targetEl.removeEventListener('pointerdown', onPointerDown as EventListener)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [
    rainbow,
    size,
    force,
    swirl,
    trail,
    clickSplash,
    colorSpeed,
    intensity,
    momentum,
    shading,
    glow,
    quality,
    intro,
    contained,
  ])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={
        contained
          ? `pointer-events-none absolute inset-0 h-full w-full ${className}`
          : `pointer-events-none fixed inset-0 z-[35] h-screen w-screen ${className}`
      }
    />
  )
}
