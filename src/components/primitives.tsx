import { motion, useInView, useMotionValue, useSpring, useReducedMotion } from 'framer-motion'
import type { ReactNode, MouseEvent } from 'react'
import { useRef } from 'react'
import { scrollToTarget } from '../lib/smooth'

export const EASE = [0.16, 1, 0.3, 1] as const

/**
 * Wordmark logo (PNG, tight-cropped, 581×35 — transparent background).
 * Replace with the designer's SVGs — keep the same filenames and nothing else needs to change.
 *   light  → white "BLURRYCAT" + yellow "STUDIO", for dark backgrounds
 *   dark   → black wordmark, for light backgrounds
 */
export function Logo({ className = '', tone = 'ink' }: { className?: string; tone?: 'ink' | 'ivory' }) {
  return (
    <img
      src={tone === 'ivory' ? '/brand/logo-light.png' : '/brand/logo-dark.png'}
      alt="Blurrycat Studio"
      width={581}
      height={35}
      decoding="async"
      className={`block h-[13px] w-auto select-none sm:h-[16px] ${className}`}
    />
  )
}

/** Fade + rise when scrolled into view. */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className = '',
  as = 'div',
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
  as?: 'div' | 'li' | 'article' | 'section' | 'p' | 'h2'
}) {
  const M = motion[as] as typeof motion.div
  return (
    <M
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12% 0px' }}
      transition={{ duration: 1.1, ease: EASE, delay }}
    >
      {children}
    </M>
  )
}

/** Line-by-line masked headline reveal. Observes the wrapper — the lines themselves start clipped. */
export function MaskLines({ lines, className = '', delay = 0, inView = true }: { lines: ReactNode[]; className?: string; delay?: number; inView?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  const seen = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  const show = !inView || seen
  return (
    <span ref={ref} className={`block ${className}`}>
      {lines.map((l, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
          <motion.span
            className="block"
            initial={{ y: '110%' }}
            animate={{ y: show ? '0%' : '110%' }}
            transition={{ duration: 1.25, ease: EASE, delay: delay + i * 0.09 }}
          >
            {l}
          </motion.span>
        </span>
      ))}
    </span>
  )
}

/** Button that drifts gently toward the pointer. */
export function Magnetic({ children, strength = 0.28, className = '' }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduce = useReducedMotion()
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 18, mass: 0.4 })
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 18, mass: 0.4 })
  const move = (e: MouseEvent) => {
    if (reduce || !ref.current || !window.matchMedia('(pointer: fine)').matches) return
    const b = ref.current.getBoundingClientRect()
    x.set((e.clientX - b.left - b.width / 2) * strength)
    y.set((e.clientY - b.top - b.height / 2) * strength)
  }
  const leave = () => {
    x.set(0)
    y.set(0)
  }
  return (
    <motion.span ref={ref} onMouseMove={move} onMouseLeave={leave} style={{ x, y }} className={`inline-block ${className}`}>
      {children}
    </motion.span>
  )
}

type BtnProps = {
  children: ReactNode
  onClick?: () => void
  href?: string
  variant?: 'ink' | 'accent' | 'line' | 'ivory'
  className?: string
  icon?: ReactNode
}

const variants = {
  ink: 'bg-ink text-ivory hover:text-ink',
  accent: 'bg-accent text-ink hover:text-ivory',
  ivory: 'bg-ivory text-ink hover:text-ink',
  line: 'border border-current text-current hover:text-ivory',
}
const fills = { ink: 'bg-accent', accent: 'bg-ink', ivory: 'bg-accent', line: 'bg-ink' }

/** Rectangular button with a wipe fill on hover. */
export function Button({ children, onClick, href, variant = 'ink', className = '', icon }: BtnProps) {
  const cls = `group relative inline-flex h-12 items-center gap-3 overflow-hidden px-6 font-display text-[14px] font-semibold tracking-[-0.005em] transition-colors duration-500 ${variants[variant]} ${className}`
  const inner = (
    <>
      <span
        aria-hidden
        className={`absolute inset-0 origin-bottom scale-y-0 transition-transform duration-500 ease-[var(--ease-expo)] group-hover:scale-y-100 ${fills[variant]}`}
      />
      <span className="relative">{children}</span>
      {icon && <span className="relative transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">{icon}</span>}
    </>
  )
  if (href) {
    const anchor = href.startsWith('#')
    return (
      <a
        href={href}
        className={cls}
        onClick={(e) => {
          if (anchor) {
            e.preventDefault()
            scrollToTarget(href)
          }
          onClick?.()
        }}
      >
        {inner}
      </a>
    )
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  )
}

export function SectionLabel({ index, children, tone = 'ink' }: { index: string; children: ReactNode; tone?: 'ink' | 'ivory' }) {
  return (
    <div className={`label flex items-center gap-3 ${tone === 'ink' ? 'text-mute' : 'text-fog'}`}>
      <span className={tone === 'ink' ? 'text-accent-ink' : 'text-accent'}>({index})</span>
      <span className={`h-px w-8 ${tone === 'ink' ? 'bg-ink/25' : 'bg-ivory/25'}`} />
      <span>{children}</span>
    </div>
  )
}
