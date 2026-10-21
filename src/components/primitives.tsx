import { motion, useInView, useMotionValue, useSpring, useReducedMotion } from 'framer-motion'
import type { ReactNode, MouseEvent } from 'react'
import { useRef } from 'react'
import { scrollToTarget } from '../lib/smooth'

export const EASE = [0.16, 1, 0.3, 1] as const

export function Logo({ className = '', tone = 'ink' }: { className?: string; tone?: 'ink' | 'ivory' }) {
  const fg = tone === 'ink' ? '#171816' : '#F5F3EE'
  const bg = tone === 'ink' ? '#F5F3EE' : '#171816'
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" aria-hidden>
        <path d="M5 28V10l5.5-6.5L14 10h4l3.5-6.5L27 10v18z" fill={fg} />
        <path d="M9 17q2.6-2.8 5.2 0q-2.6 2.8-5.2 0zM17.8 17q2.6-2.8 5.2 0q-2.6 2.8-5.2 0z" fill={bg} />
        <rect x="5" y="24.5" width="22" height="3.5" fill="#E5533D" />
      </svg>
      <span className="whitespace-nowrap font-display text-[17px] font-bold tracking-[-0.02em]" style={{ color: fg }}>
        Blurrycat <span className="serif text-[19px] font-normal">Studio</span>
      </span>
    </span>
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
  variant?: 'ink' | 'coral' | 'line' | 'ivory'
  className?: string
  icon?: ReactNode
}

const variants = {
  ink: 'bg-ink text-ivory hover:text-ink',
  coral: 'bg-coral text-ink hover:text-ivory',
  ivory: 'bg-ivory text-ink hover:text-ink',
  line: 'border border-current text-current hover:text-ivory',
}
const fills = { ink: 'bg-coral', coral: 'bg-ink', ivory: 'bg-coral', line: 'bg-ink' }

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
      <span className="text-coral">({index})</span>
      <span className={`h-px w-8 ${tone === 'ink' ? 'bg-ink/25' : 'bg-ivory/25'}`} />
      <span>{children}</span>
    </div>
  )
}
