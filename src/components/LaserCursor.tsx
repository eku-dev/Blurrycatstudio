import { useEffect, useRef } from 'react'
import { useUI } from '../lib/ui'

export default function LaserCursor() {
  const { laserOn } = useUI()
  const dotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (
      window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }

    const onMove = (e: PointerEvent) => {
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`
        dotRef.current.style.opacity = '1'
      }
    }

    const onLeave = () => {
      if (dotRef.current) dotRef.current.style.opacity = '0'
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('mouseleave', onLeave)

    return () => {
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('mouseleave', onLeave)
    }
  }, [laserOn])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[90] hidden md:block">
      <div
        ref={dotRef}
        className={`fixed left-0 top-0 -ml-[3px] -mt-[3px] h-1.5 w-1.5 rounded-full opacity-0 transition-colors duration-200 ${
          laserOn
            ? 'bg-[#e02424] shadow-[0_0_12px_rgba(224,36,36,0.9)]'
            : 'bg-white mix-blend-difference'
        }`}
      />
    </div>
  )
}
