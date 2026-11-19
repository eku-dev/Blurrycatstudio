import { motion, useScroll, useTransform } from 'framer-motion'
import { type CSSProperties, type ReactNode, useRef } from 'react'

/** Soft radial + directional fog mask so images & slabs never show a hard rectangular border */
export const FOG_IMAGE_MASK: CSSProperties = {
  maskImage:
    'radial-gradient(ellipse 76% 74% at 50% 50%, #000 54%, rgba(0,0,0,0.65) 74%, transparent 100%)',
  WebkitMaskImage:
    'radial-gradient(ellipse 76% 74% at 50% 50%, #000 54%, rgba(0,0,0,0.65) 74%, transparent 100%)',
}

export const FOG_SLAB_MASK: CSSProperties = {
  maskImage:
    'linear-gradient(to bottom, transparent 0%, #000 10%, #000 90%, transparent 100%), linear-gradient(to right, transparent 0%, #000 10%, #000 90%, transparent 100%)',
  WebkitMaskImage:
    'linear-gradient(to bottom, transparent 0%, #000 10%, #000 90%, transparent 100%), linear-gradient(to right, transparent 0%, #000 10%, #000 90%, transparent 100%)',
  maskComposite: 'intersect',
  WebkitMaskComposite: 'source-in',
}

/**
 * Cinema-lens scroll focus:
 * Keeps the centered item sharp while softly blurring parts scrolling up above
 * and parts approaching below.
 */
export function CinematicFocus({
  children,
  className = '',
  blurMax = 12,
}: {
  children: ReactNode
  className?: string
  blurMax?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  const filter = useTransform(
    scrollYProgress,
    [0, 0.14, 0.5, 0.86, 1],
    [`blur(${blurMax}px)`, 'blur(0px)', 'blur(0px)', 'blur(0px)', `blur(${blurMax}px)`],
  )
  const opacity = useTransform(scrollYProgress, [0, 0.12, 0.5, 0.88, 1], [0.22, 1, 1, 1, 0.22])
  const scale = useTransform(scrollYProgress, [0, 0.15, 0.5, 0.85, 1], [0.97, 1, 1, 1, 0.97])

  return (
    <motion.div ref={ref} style={{ filter, opacity, scale }} className={className}>
      {children}
    </motion.div>
  )
}
