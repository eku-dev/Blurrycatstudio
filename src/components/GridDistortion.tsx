import { useEffect, useRef } from 'react'
import { reducedMotion } from '../lib/smooth'

export interface GridDistortionProps {
  imageSrc: string
  alt?: string
  grid?: number
  radius?: number
  strength?: number
  relaxation?: number
  mode?: 'drag' | 'push'
  softness?: number
  chroma?: number
  idle?: number
  clickRipple?: boolean
  intro?: boolean
  className?: string
}

/**
 * Zero-WebGL-context kinetic grid distortion renderer.
 * Draws the image in a grid x grid displacement mesh on a 2D canvas so we never
 * exhaust browser WebGL context limits (8-16 max) when combined with 3D scenes.
 */
export default function GridDistortion({
  imageSrc,
  alt = '',
  grid = 15,
  radius = 0.18,
  strength = 0.15,
  relaxation = 0.96,
  mode = 'drag',
  idle = 0.3,
  clickRipple = false,
  intro = false,
  className = '',
}: GridDistortionProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = reducedMotion()
    const size = Math.max(4, Math.round(grid))

    // Displacement field: vx, vy per cell
    const dxField = new Float32Array(size * size)
    const dyField = new Float32Array(size * size)
    if (intro && !reduced) {
      for (let i = 0; i < size * size; i++) {
        dxField[i] = (Math.random() - 0.5) * 18
        dyField[i] = (Math.random() - 0.5) * 18
      }
    }

    const img = new Image()
    img.decoding = 'async'
    let imgReady = false
    img.onload = () => {
      imgReady = true
      drawOnce()
    }
    img.src = imageSrc

    let cw = 1
    let ch = 1
    let dpr = 1

    const resize = () => {
      const rect = container.getBoundingClientRect()
      cw = Math.max(1, rect.width)
      ch = Math.max(1, rect.height)
      dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.25 : 1.5)
      canvas.width = Math.round(cw * dpr)
      canvas.height = Math.round(ch * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(container)

    const mouse = { x: 0.5, y: 0.5, prevX: 0.5, prevY: 0.5, vX: 0, vY: 0, inside: false }
    const ripples: { x: number; y: number; r: number; amp: number }[] = []

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      const x = (e.clientX - rect.left) / Math.max(rect.width, 1)
      const y = (e.clientY - rect.top) / Math.max(rect.height, 1)
      mouse.vX = x - mouse.prevX
      mouse.vY = y - mouse.prevY
      mouse.prevX = x
      mouse.prevY = y
      mouse.x = x
      mouse.y = y
      mouse.inside = true
    }

    const onPointerLeave = () => {
      mouse.inside = false
      mouse.vX = 0
      mouse.vY = 0
    }

    const onPointerDown = (e: PointerEvent) => {
      if (!clickRipple || reduced) return
      const rect = container.getBoundingClientRect()
      const x = (e.clientX - rect.left) / Math.max(rect.width, 1)
      const y = (e.clientY - rect.top) / Math.max(rect.height, 1)
      ripples.push({ x, y, r: 0.02, amp: 1.0 })
    }

    let visible = true
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true
      },
      { rootMargin: '180px' },
    )
    io.observe(container)

    container.addEventListener('pointermove', onPointerMove, { passive: true })
    container.addEventListener('pointerleave', onPointerLeave, { passive: true })
    container.addEventListener('pointerdown', onPointerDown, { passive: true })

    function drawOnce() {
      if (!imgReady || !ctx || !img.naturalWidth || !img.naturalHeight) return
      ctx.clearRect(0, 0, cw, ch)

      // Compute cover crop in source image pixels
      const imgAspect = img.naturalWidth / img.naturalHeight
      const boxAspect = cw / ch
      let sx0 = 0
      let sy0 = 0
      let swTotal = img.naturalWidth
      let shTotal = img.naturalHeight
      if (boxAspect > imgAspect) {
        shTotal = img.naturalWidth / boxAspect
        sy0 = (img.naturalHeight - shTotal) * 0.5
      } else {
        swTotal = img.naturalHeight * boxAspect
        sx0 = (img.naturalWidth - swTotal) * 0.5
      }

      const cellW = cw / size
      const cellH = ch / size
      const srcCellW = swTotal / size
      const srcCellH = shTotal / size

      for (let j = 0; j < size; j++) {
        for (let i = 0; i < size; i++) {
          const idx = i + j * size
          const ox = dxField[idx]
          const oy = dyField[idx]

          const sx = Math.min(
            Math.max(sx0 + i * srcCellW - ox * (swTotal / cw), 0),
            Math.max(0, img.naturalWidth - srcCellW),
          )
          const sy = Math.min(
            Math.max(sy0 + j * srcCellH - oy * (shTotal / ch), 0),
            Math.max(0, img.naturalHeight - srcCellH),
          )

          ctx.drawImage(
            img,
            sx,
            sy,
            srcCellW,
            srcCellH,
            i * cellW - 0.5,
            j * cellH - 0.5,
            cellW + 1,
            cellH + 1,
          )
        }
      }
    }

    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (!visible || !imgReady) return

      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = now / 1000

      const relax = Math.pow(relaxation, dt * 60)
      for (let i = 0; i < size * size; i++) {
        dxField[i] *= relax
        dyField[i] *= relax
      }

      if (!reduced) {
        const gmx = size * mouse.x
        const gmy = size * mouse.y
        const maxDist = size * radius
        const maxDistSq = maxDist * maxDist

        if (mouse.inside) {
          for (let j = 0; j < size; j++) {
            for (let i = 0; i < size; i++) {
              const dx = gmx - (i + 0.5)
              const dy = gmy - (j + 0.5)
              const distSq = dx * dx + dy * dy
              if (distSq < maxDistSq) {
                const idx = i + j * size
                const dist = Math.sqrt(distSq)
                const power = Math.min(maxDist / Math.max(dist, 0.35), 9)
                if (mode === 'drag') {
                  dxField[idx] += strength * 340 * mouse.vX * power
                  dyField[idx] += strength * 340 * mouse.vY * power
                } else {
                  const inv = 1 / Math.max(dist, 0.25)
                  dxField[idx] -= dx * inv * strength * 16 * (1 - dist / maxDist)
                  dyField[idx] -= dy * inv * strength * 16 * (1 - dist / maxDist)
                }
              }
            }
          }
          mouse.vX *= 0.84
          mouse.vY *= 0.84
        }

        if (idle > 0) {
          const ix = (0.5 + Math.sin(t * 0.55) * 0.34) * size
          const iy = (0.5 + Math.cos(t * 0.43) * 0.34) * size
          const iRad = size * radius * 1.15
          const iRadSq = iRad * iRad
          for (let j = 0; j < size; j++) {
            for (let i = 0; i < size; i++) {
              const dx = ix - (i + 0.5)
              const dy = iy - (j + 0.5)
              const dSq = dx * dx + dy * dy
              if (dSq < iRadSq) {
                const idx = i + j * size
                const falloff = 1 - Math.sqrt(dSq) / iRad
                dxField[idx] += Math.cos(t * 0.9 + j * 0.35) * idle * strength * 4.2 * falloff
                dyField[idx] += Math.sin(t * 0.8 + i * 0.35) * idle * strength * 4.2 * falloff
              }
            }
          }
        }

        for (let rIdx = ripples.length - 1; rIdx >= 0; rIdx--) {
          const rp = ripples[rIdx]
          rp.r += dt * 0.95
          rp.amp *= Math.pow(0.92, dt * 60)
          if (rp.amp < 0.02 || rp.r > 1.4) {
            ripples.splice(rIdx, 1)
            continue
          }
          const rx = rp.x * size
          const ry = rp.y * size
          const ringR = rp.r * size
          const band = Math.max(1.2, size * 0.15)
          for (let j = 0; j < size; j++) {
            for (let i = 0; i < size; i++) {
              const dx = i + 0.5 - rx
              const dy = j + 0.5 - ry
              const d = Math.sqrt(dx * dx + dy * dy)
              const delta = Math.abs(d - ringR)
              if (delta < band) {
                const idx = i + j * size
                const w = (1 - delta / band) * rp.amp * strength * 42
                const inv = 1 / Math.max(d, 0.25)
                dxField[idx] += dx * inv * w
                dyField[idx] += dy * inv * w
              }
            }
          }
        }
      }

      drawOnce()
    }

    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('pointerleave', onPointerLeave)
      container.removeEventListener('pointerdown', onPointerDown)
    }
  }, [imageSrc, grid, radius, strength, relaxation, mode, idle, clickRipple, intro])

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={alt}
      className={`relative h-full w-full overflow-hidden ${className}`}
    >
      {/* Instant fallback image underneath so media is always visible from frame 0 */}
      <img
        src={imageSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <canvas ref={canvasRef} className="relative z-10 block h-full w-full" />
    </div>
  )
}

export interface GridDistortionTextProps {
  text: string
  color?: string
  fontFamily?: 'serif' | 'sans'
  fontSize?: number
  align?: 'left' | 'center'
  height?: number
  grid?: number
  radius?: number
  strength?: number
  relaxation?: number
  mode?: 'drag' | 'push'
  softness?: number
  chroma?: number
  idle?: number
  clickRipple?: boolean
  intro?: boolean
  className?: string
}

/**
 * Applies the exact same zero-WebGL-context kinetic GridDistortion effect
 * to crisp multi-line transparent serif or sans typography.
 */
export function GridDistortionText({
  text,
  color = '#161618',
  fontFamily = 'serif',
  fontSize,
  align = 'left',
  height = 56,
  grid = 15,
  radius = 0.18,
  strength = 0.15,
  relaxation = 0.96,
  mode = 'drag',
  idle = 0.3,
  clickRipple = true,
  intro = true,
  className = '',
}: GridDistortionTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = reducedMotion()
    const size = Math.max(4, Math.round(grid))

    const dxField = new Float32Array(size * size)
    const dyField = new Float32Array(size * size)
    if (intro && !reduced) {
      for (let i = 0; i < size * size; i++) {
        dxField[i] = (Math.random() - 0.5) * 10
        dyField[i] = (Math.random() - 0.5) * 10
      }
    }

    // Offscreen crisp text raster buffer
    const srcCanvas = document.createElement('canvas')
    const sctx = srcCanvas.getContext('2d')

    let cw = 1
    let ch = 1
    let dpr = 1

    const rasterizeText = () => {
      if (!sctx) return
      const rect = container.getBoundingClientRect()
      cw = Math.max(1, rect.width)
      ch = Math.max(1, rect.height)
      dpr = Math.min(window.devicePixelRatio || 1, 2)

      canvas.width = Math.round(cw * dpr)
      canvas.height = Math.round(ch * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      srcCanvas.width = Math.round(cw * dpr)
      srcCanvas.height = Math.round(ch * dpr)
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      sctx.clearRect(0, 0, cw, ch)

      const isSmall = window.innerWidth < 640
      const resolvedSize = fontSize
        ? isSmall
          ? Math.max(13, Math.round(fontSize * 0.78))
          : fontSize
        : fontFamily === 'serif'
          ? Math.min(42, Math.max(26, ch * 0.68))
          : 14.5

      sctx.font =
        fontFamily === 'serif'
          ? `400 ${resolvedSize}px "Instrument Serif", Georgia, serif`
          : `400 ${resolvedSize}px "Inter", system-ui, sans-serif`
      sctx.fillStyle = color
      sctx.textBaseline = 'middle'
      sctx.textAlign = align

      // Word wrap cleanly inside cw
      const words = text.split(' ')
      const lines: string[] = []
      let current = ''
      const maxLineW = Math.max(40, cw - 8)
      for (const word of words) {
        const test = current ? `${current} ${word}` : word
        if (sctx.measureText(test).width > maxLineW && current) {
          lines.push(current)
          current = word
        } else {
          current = test
        }
      }
      if (current) lines.push(current)

      const lineHeight = resolvedSize * (fontFamily === 'serif' ? 1.12 : 1.5)
      const totalH = lines.length * lineHeight
      const startY = ch * 0.5 - totalH * 0.5 + lineHeight * 0.5
      const drawX = align === 'center' ? cw * 0.5 : 2

      for (let i = 0; i < lines.length; i++) {
        sctx.fillText(lines[i], drawX, startY + i * lineHeight)
      }
    }

    rasterizeText()
    let cancelled = false
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) rasterizeText()
      })
    }

    const ro = new ResizeObserver(rasterizeText)
    ro.observe(container)

    const mouse = { x: 0.5, y: 0.5, prevX: 0.5, prevY: 0.5, vX: 0, vY: 0, inside: false }
    const ripples: { x: number; y: number; r: number; amp: number }[] = []

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      const x = (e.clientX - rect.left) / Math.max(rect.width, 1)
      const y = (e.clientY - rect.top) / Math.max(rect.height, 1)
      mouse.vX = x - mouse.prevX
      mouse.vY = y - mouse.prevY
      mouse.prevX = x
      mouse.prevY = y
      mouse.x = x
      mouse.y = y
      mouse.inside = true
    }

    const onPointerLeave = () => {
      mouse.inside = false
      mouse.vX = 0
      mouse.vY = 0
    }

    const onPointerDown = (e: PointerEvent) => {
      if (!clickRipple || reduced) return
      const rect = container.getBoundingClientRect()
      const x = (e.clientX - rect.left) / Math.max(rect.width, 1)
      const y = (e.clientY - rect.top) / Math.max(rect.height, 1)
      ripples.push({ x, y, r: 0.02, amp: 1.0 })
    }

    let visible = true
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true
      },
      { rootMargin: '140px' },
    )
    io.observe(container)

    container.addEventListener('pointermove', onPointerMove, { passive: true })
    container.addEventListener('pointerleave', onPointerLeave, { passive: true })
    container.addEventListener('pointerdown', onPointerDown, { passive: true })

    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (!visible) return

      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = now / 1000

      const relax = Math.pow(relaxation, dt * 60)
      for (let i = 0; i < size * size; i++) {
        dxField[i] *= relax
        dyField[i] *= relax
      }

      if (!reduced) {
        const gmx = size * mouse.x
        const gmy = size * mouse.y
        const maxDist = size * radius
        const maxDistSq = maxDist * maxDist

        if (mouse.inside) {
          for (let j = 0; j < size; j++) {
            for (let i = 0; i < size; i++) {
              const dx = gmx - (i + 0.5)
              const dy = gmy - (j + 0.5)
              const distSq = dx * dx + dy * dy
              if (distSq < maxDistSq) {
                const idx = i + j * size
                const dist = Math.sqrt(distSq)
                const power = Math.min(maxDist / Math.max(dist, 0.35), 9)
                if (mode === 'drag') {
                  dxField[idx] += strength * 260 * mouse.vX * power
                  dyField[idx] += strength * 260 * mouse.vY * power
                } else {
                  const inv = 1 / Math.max(dist, 0.25)
                  dxField[idx] -= dx * inv * strength * 12 * (1 - dist / maxDist)
                  dyField[idx] -= dy * inv * strength * 12 * (1 - dist / maxDist)
                }
              }
            }
          }
          mouse.vX *= 0.84
          mouse.vY *= 0.84
        }

        if (idle > 0) {
          const ix = (0.5 + Math.sin(t * 0.55) * 0.34) * size
          const iy = (0.5 + Math.cos(t * 0.43) * 0.3) * size
          const iRad = size * radius * 1.15
          const iRadSq = iRad * iRad
          for (let j = 0; j < size; j++) {
            for (let i = 0; i < size; i++) {
              const dx = ix - (i + 0.5)
              const dy = iy - (j + 0.5)
              const dSq = dx * dx + dy * dy
              if (dSq < iRadSq) {
                const idx = i + j * size
                const falloff = 1 - Math.sqrt(dSq) / iRad
                dxField[idx] += Math.cos(t * 0.9 + j * 0.35) * idle * strength * 2.4 * falloff
                dyField[idx] += Math.sin(t * 0.8 + i * 0.35) * idle * strength * 2.4 * falloff
              }
            }
          }
        }

        for (let rIdx = ripples.length - 1; rIdx >= 0; rIdx--) {
          const rp = ripples[rIdx]
          rp.r += dt * 0.95
          rp.amp *= Math.pow(0.92, dt * 60)
          if (rp.amp < 0.02 || rp.r > 1.4) {
            ripples.splice(rIdx, 1)
            continue
          }
          const rx = rp.x * size
          const ry = rp.y * size
          const ringR = rp.r * size
          const band = Math.max(1.2, size * 0.15)
          for (let j = 0; j < size; j++) {
            for (let i = 0; i < size; i++) {
              const dx = i + 0.5 - rx
              const dy = j + 0.5 - ry
              const d = Math.sqrt(dx * dx + dy * dy)
              const delta = Math.abs(d - ringR)
              if (delta < band) {
                const idx = i + j * size
                const w = (1 - delta / band) * rp.amp * strength * 30
                const inv = 1 / Math.max(d, 0.25)
                dxField[idx] += dx * inv * w
                dyField[idx] += dy * inv * w
              }
            }
          }
        }
      }

      ctx.clearRect(0, 0, cw, ch)
      const cellW = cw / size
      const cellH = ch / size
      const srcCellW = srcCanvas.width / size
      const srcCellH = srcCanvas.height / size

      for (let j = 0; j < size; j++) {
        for (let i = 0; i < size; i++) {
          const idx = i + j * size
          const sx = Math.min(Math.max(i * srcCellW - dxField[idx] * dpr, 0), Math.max(0, srcCanvas.width - srcCellW))
          const sy = Math.min(Math.max(j * srcCellH - dyField[idx] * dpr, 0), Math.max(0, srcCanvas.height - srcCellH))
          ctx.drawImage(
            srcCanvas,
            sx,
            sy,
            srcCellW,
            srcCellH,
            i * cellW,
            j * cellH,
            cellW + 0.5,
            cellH + 0.5,
          )
        }
      }
    }

    raf = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('pointerleave', onPointerLeave)
      container.removeEventListener('pointerdown', onPointerDown)
    }
  }, [text, color, fontFamily, fontSize, align, height, grid, radius, strength, relaxation, mode, idle, clickRipple, intro])

  return (
    <div
      ref={containerRef}
      style={{ height: `${height}px` }}
      className={`relative w-full cursor-pointer select-none ${className}`}
    >
      <span className="sr-only">{text}</span>
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}
