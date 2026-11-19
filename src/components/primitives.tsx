import { motion, useMotionValue, useSpring } from 'framer-motion'
import type { CSSProperties, ReactNode } from 'react'

export const EASE = [0.16, 1, 0.3, 1] as const

/** Custom fine-line architectural monogram crest (BC + subtle geometric cat ears) */
export function BrandCrest({
  className = 'h-6 w-5',
  style,
}: {
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg
      viewBox="0 0 24 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Outer architectural shield with subtle geometric cat-ear apexes */}
      <path
        d="M3 2.5L7.5 6H16.5L21 2.5V15.5C21 20.8 17.2 24.4 12 26C6.8 24.4 3 20.8 3 15.5V2.5Z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="round"
      />
      {/* Central architectural spine + interlocked B / C monogram */}
      <path
        d="M12 6V25.5"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M6.5 11H10.2C11.2 11 12 11.7 12 12.6C12 13.5 11.2 14.2 10.2 14.2H6.5V11ZM6.5 14.2H10.5C11.4 14.2 12 14.9 12 15.8C12 16.7 11.4 17.5 10.5 17.5H6.5V14.2Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M17.5 12.1C16.8 11.3 15.9 11 14.9 11C13.3 11 12 12.4 12 14.25C12 16.1 13.3 17.5 14.9 17.5C15.9 17.5 16.8 17.1 17.5 16.3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Logo({ tone = 'ink' }: { tone?: 'ivory' | 'ink' }) {
  return (
    <span
      className={`inline-flex items-center gap-3 ${
        tone === 'ivory' ? 'text-[#F5F5F5]' : 'text-[#161618]'
      }`}
    >
      <BrandCrest className="h-[22px] w-[19px] shrink-0" />
      <span className="font-serif text-[12px] font-normal uppercase tracking-[0.26em] leading-none">
        BLURRYCAT STUDIOS AI
      </span>
    </span>
  )
}

export function Button({
  children,
  onClick,
  icon,
  variant = 'ink',
  className = '',
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  icon?: ReactNode
  variant?: 'ivory' | 'ink'
  className?: string
  type?: 'button' | 'submit'
}) {
  const style =
    variant === 'ink'
      ? 'bg-[#161618] text-[#F2F2F0] hover:bg-[#2B2C30]'
      : 'border border-[#161618]/25 bg-transparent text-[#161618] hover:border-[#161618] hover:bg-[#161618] hover:text-[#F2F2F0]'
  return (
    <button
      type={type}
      onClick={onClick}
      className={`inline-flex h-12 items-center gap-2.5 px-6 font-display text-[13px] font-medium tracking-tight transition-colors duration-300 cursor-pointer ${style} ${className}`}
    >
      <span>{children}</span>
      {icon}
    </button>
  )
}

export function Magnetic({ children }: { children: ReactNode }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 260, damping: 20 })
  const sy = useSpring(y, { stiffness: 260, damping: 20 })

  return (
    <motion.div
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        const b = e.currentTarget.getBoundingClientRect()
        x.set((e.clientX - b.left - b.width / 2) * 0.22)
        y.set((e.clientY - b.top - b.height / 2) * 0.22)
      }}
      onPointerLeave={() => {
        x.set(0)
        y.set(0)
      }}
      className="inline-block"
    >
      {children}
    </motion.div>
  )
}

export function MaskLines({ lines, delay = 0 }: { lines: ReactNode[]; delay?: number }) {
  return (
    <span className="block">
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.06em]">
          <motion.span
            className="block"
            initial={{ y: '110%' }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.9, ease: EASE, delay: delay + i * 0.08 }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </span>
  )
}

export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.85, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
