import { type ReactNode, useEffect, useRef, useState } from 'react'
import { reducedMotion } from '../lib/smooth'

export interface ScrollExpandProps {
  src: string
  alt?: string
  title?: string
  indexLabel?: string
  titleId?: string
  scrollHint?: string
  useWindowScroll?: boolean
  startWidth?: number
  startHeight?: number
  startRadius?: number
  endRadius?: number
  mediaZoom?: number
  scrollDistance?: number
  holdDistance?: number
  smoothing?: number
  overlayScrim?: number
  enabled?: boolean
  children?: ReactNode
  renderMedia?: () => ReactNode
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export default function ScrollExpand({
  src,
  alt = '',
  title,
  indexLabel,
  titleId,
  scrollHint,
  useWindowScroll = true,
  startWidth = 42,
  startHeight = 58,
  startRadius = 24,
  endRadius = 0,
  mediaZoom = 1.35,
  scrollDistance = 1.2,
  holdDistance = 0.35,
  smoothing = 0.1,
  overlayScrim = 0.45,
  enabled = true,
  children,
  renderMedia,
}: ScrollExpandProps) {
  const outerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const mediaRef = useRef<HTMLDivElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)
  const hintRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check, { passive: true })
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!enabled || !useWindowScroll) return
    const outer = outerRef.current
    if (!outer) return

    const reduced = reducedMotion()
    let targetProgress = 0
    let smoothProgress = 0
    let raf = 0

    const effStartW = isMobile ? Math.max(startWidth, 74) : startWidth
    const effStartH = isMobile ? Math.max(startHeight, 48) : startHeight
    const totalUnits = Math.max(0.2, scrollDistance + holdDistance)
    const expandEnd = scrollDistance / totalUnits

    const update = () => {
      raf = requestAnimationFrame(update)
      const rect = outer.getBoundingClientRect()
      const vh = window.innerHeight || 1
      const scrollable = Math.max(1, outer.offsetHeight - vh)
      const raw = clamp(-rect.top / scrollable, 0, 1)
      // Expand from 0 -> 1 over scrollDistance, then hold at 1 over holdDistance
      targetProgress = clamp(raw / Math.max(0.01, expandEnd), 0, 1)

      if (reduced) {
        smoothProgress = targetProgress
      } else {
        smoothProgress += (targetProgress - smoothProgress) * clamp(smoothing, 0.02, 0.5)
      }

      // Smooth ease-out curve for cinematic expansion
      const p = smoothProgress * smoothProgress * (3 - 2 * smoothProgress)

      if (frameRef.current) {
        const w = lerp(effStartW, 100, p)
        const h = lerp(effStartH, 100, p)
        const r = lerp(startRadius, endRadius, p)
        frameRef.current.style.width = `${w}vw`
        frameRef.current.style.height = `${h}svh`
        frameRef.current.style.borderRadius = `${r}px`
      }

      if (mediaRef.current) {
        const z = lerp(mediaZoom, 1.0, p)
        mediaRef.current.style.transform = `scale(${z})`
      }

      if (scrimRef.current) {
        scrimRef.current.style.opacity = `${lerp(overlayScrim * 0.6, overlayScrim, p)}`
      }

      if (copyRef.current) {
        const copyAlpha = clamp((p - 0.12) / 0.55, 0.25, 1)
        const copyY = lerp(24, 0, p)
        copyRef.current.style.opacity = `${copyAlpha}`
        copyRef.current.style.transform = `translate3d(0, ${copyY}px, 0)`
      }

      if (hintRef.current) {
        hintRef.current.style.opacity = `${clamp(1 - p * 3.2, 0, 1)}`
      }
    }

    raf = requestAnimationFrame(update)
    return () => cancelAnimationFrame(raf)
  }, [
    enabled,
    useWindowScroll,
    isMobile,
    startWidth,
    startHeight,
    startRadius,
    endRadius,
    mediaZoom,
    scrollDistance,
    holdDistance,
    smoothing,
    overlayScrim,
  ])

  const totalHeightVh = Math.round((1 + scrollDistance + holdDistance) * 100)

  return (
    <div
      ref={outerRef}
      className="relative w-full"
      style={{ height: useWindowScroll ? `${totalHeightVh}svh` : '100%' }}
    >
      <div className="sticky top-0 flex h-[100svh] w-full items-center justify-center overflow-hidden">
        <div
          ref={frameRef}
          className="relative overflow-hidden will-change-[width,height,border-radius]"
          style={{
            width: `${isMobile ? Math.max(startWidth, 74) : startWidth}vw`,
            height: `${isMobile ? Math.max(startHeight, 48) : startHeight}svh`,
            borderRadius: `${startRadius}px`,
          }}
        >
          {/* Expanding / Zooming Media Layer — always crisp & visible from frame 0 */}
          <div
            ref={mediaRef}
            className="relative h-full w-full will-change-transform"
            style={{ transform: `scale(${mediaZoom})` }}
          >
            <img
              src={src}
              alt={alt}
              loading="eager"
              decoding="async"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            />
            {renderMedia && <div className="relative z-10 h-full w-full">{renderMedia()}</div>}
          </div>

          {/* Soft Cinematic Scrim (lighter at center so the image shines clearly) */}
          <div
            ref={scrimRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-black/65 via-black/20 to-black/15"
            style={{ opacity: overlayScrim }}
          />

          {/* Centered Editorial Overlay */}
          <div
            ref={copyRef}
            className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center px-6 text-center text-[#F4F3F0]"
          >
            {indexLabel && (
              <span className="font-sans text-[11px] uppercase tracking-[0.26em] text-[#F4F3F0]/70">
                {indexLabel}
              </span>
            )}
            {title && (
              <h3
                id={titleId}
                className="mt-3 inline-block font-serif text-[clamp(2.4rem,5.4vw,5rem)] font-normal not-italic leading-[1.04] tracking-[-0.015em] text-[#F4F3F0]"
              >
                {title}
              </h3>
            )}
            {children && (
              <div className="mt-4 max-w-[38ch] font-sans text-[15px] leading-relaxed text-[#F4F3F0]/80">
                {children}
              </div>
            )}
          </div>

          {/* Optional Scroll Hint */}
          {scrollHint && (
            <div
              ref={hintRef}
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-6 text-center font-sans text-[11px] uppercase tracking-[0.22em] text-[#F4F3F0]/75"
            >
              {scrollHint}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
