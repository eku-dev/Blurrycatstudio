import { useEffect, useRef } from 'react'
import { useUI } from '../lib/ui'

export default function LaserCursor() {
  const { laserOn } = useUI()
  const dotRef = useRef<HTMLDivElement>(null)
  const haloRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    let tx = -200
    let ty = -200
    let hx = -200
    let hy = -200
    let raf = 0

    const onMove = (e: PointerEvent) => {
      tx = e.clientX
      ty = e.clientY
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${tx}px, ${ty}px, 0)`
        dotRef.current.style.opacity = '1'
      }
      if (haloRef.current) {
        haloRef.current.style.opacity = '1'
      }
    }

    const onLeave = () => {
      if (dotRef.current) dotRef.current.style.opacity = '0'
      if (haloRef.current) haloRef.current.style.opacity = '0'
    }

    const loop = () => {
      hx += (tx - hx) * (laserOn ? 0.28 : 0.14)
      hy += (ty - hy) * (laserOn ? 0.28 : 0.14)
      if (haloRef.current) {
        haloRef.current.style.transform = `translate3d(${hx}px, ${hy}px, 0)`
      }
      raf = requestAnimationFrame(loop)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('mouseleave', onLeave)
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('mouseleave', onLeave)
    }
  }, [laserOn])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[90] hidden md:block">
      <div
        ref={haloRef}
        className={`fixed left-0 top-0 -ml-4 -mt-4 h-8 w-8 rounded-full opacity-0 transition-[background-color,border-color] duration-300 ${
          laserOn
            ? 'border border-[#d92626]/70 bg-[#d92626]/15 shadow-[0_0_24px_rgba(217,38,38,0.45)]'
            : 'border border-[#161618]/25 bg-transparent'
        }`}
      />
      <div
        ref={dotRef}
        className={`fixed left-0 top-0 -ml-[3px] -mt-[3px] h-1.5 w-1.5 rounded-full opacity-0 transition-colors duration-200 ${
          laserOn
            ? 'bg-[#e02424] shadow-[0_0_12px_rgba(224,36,36,0.9)]'
            : 'bg-[#161618]'
        }`}
      />
    </div>
  )
}
