import { motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { MaskLines, Reveal, SectionLabel } from './primitives'

/* ───────────── Philosophy ───────────── */

const Icon = {
  thoughtful: (
    <svg viewBox="0 0 48 48" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
      <rect x="6" y="6" width="36" height="36" />
      <circle cx="24" cy="24" r="12" />
      <path d="M6 24h36M24 6v36" opacity=".35" />
      <circle cx="24" cy="24" r="2.5" fill="#FFC330" stroke="none" />
    </svg>
  ),
  real: (
    <svg viewBox="0 0 48 48" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
      <path d="M6 42h36M10 42V22l14-12 14 12v20" />
      <path d="M20 42V30h8v12" />
      <rect x="21" y="16" width="6" height="6" fill="#FFC330" stroke="none" />
    </svg>
  ),
  matter: (
    <svg viewBox="0 0 48 48" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
      <path d="M24 6l18 36H6z" />
      <path d="M24 20l7 14H17z" fill="#FFC330" stroke="none" />
    </svg>
  ),
}

const PRINCIPLES = [
  { k: 'thoughtful' as const, t: 'Thoughtful by design.', d: 'Every decision earns its place. We start with the problem, not the trend, and remove anything that doesn’t serve the people using it.' },
  { k: 'real' as const, t: 'Built for real life.', d: 'Work that survives contact with real users, real data and real budgets — documented, maintainable and handed over properly.' },
  { k: 'matter' as const, t: 'Made to matter.', d: 'We measure success by what changes for your business, not by how a project looks in a portfolio. Ideally, both.' },
]

export function Philosophy() {
  return (
    <section id="studio" className="relative overflow-hidden bg-ink py-24 text-ivory lg:py-36">
      <div aria-hidden className="grain pointer-events-none absolute inset-0 opacity-60" />
      <div className="shell relative">
        <SectionLabel index="04" tone="ivory">
          The studio
        </SectionLabel>
        <div className="mt-10 grid gap-10 lg:grid-cols-12">
          <h2 className="font-display text-[clamp(2.5rem,6vw,6rem)] font-semibold leading-[0.92] tracking-[-0.055em] lg:col-span-8">
            <MaskLines lines={['More than a studio.', <>A <span className="serif text-accent">long-term</span> partner.</>]} />
          </h2>
          <Reveal delay={0.15} className="self-end lg:col-span-4">
            <p className="max-w-[40ch] text-[17px] leading-relaxed text-ivory/75">
              We combine design, technology and strategic thinking to help ambitious brands turn ideas into meaningful
              digital experiences.
            </p>
          </Reveal>
        </div>

        <ol className="mt-20 grid border-t border-ivory/15 md:grid-cols-3 lg:mt-28">
          {PRINCIPLES.map((p, i) => (
            <Reveal as="li" key={p.k} delay={i * 0.1} className={`py-10 md:px-8 md:py-12 ${i > 0 ? 'border-t border-ivory/15 md:border-l md:border-t-0' : 'md:pl-0'}`}>
              <div className="flex items-start justify-between text-ivory/85">
                {Icon[p.k]}
                <span className="label text-fog">0{i + 1}</span>
              </div>
              <h3 className="mt-12 font-display text-[28px] font-semibold tracking-[-0.04em]">{p.t}</h3>
              <p className="mt-4 max-w-[36ch] text-[15px] leading-relaxed text-ivory/65">{p.d}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ───────────── Process: a curved, scroll-driven stack of slides ───────────── */

const STEPS = [
  { n: '01', t: 'Discover', d: 'Workshops, audits and conversations with the people who will use what we make.', tone: 'paper', meta: ['Stakeholder sessions', 'Audit', 'Opportunity map'] },
  { n: '02', t: 'Direction', d: 'A clear creative and technical direction — the one decision everything else follows.', tone: 'ink', meta: ['Concept routes', 'Moodboards', 'Architecture'] },
  { n: '03', t: 'Design', d: 'Identity, interface, CGI and conversation design, iterated with you, in the open.', tone: 'accent', meta: ['Prototypes', 'Renders', 'Voice scripts'] },
  { n: '04', t: 'Build', d: 'Production-grade code, pipelines and agents — tested against real-world use.', tone: 'charcoal', meta: ['Frontend', 'Automation', 'QA'] },
  { n: '05', t: 'Evolve', d: 'Launch is the midpoint. We measure, refine and keep the work getting better.', tone: 'paper', meta: ['Analytics', 'Iteration', 'Support'] },
] as const

const toneCls = {
  paper: 'bg-paper text-ink',
  ink: 'bg-ink text-ivory border border-ivory/10',
  accent: 'bg-accent text-ink',
  charcoal: 'bg-[#2e2f2b] text-ivory',
}

export function Process() {
  const ref = useRef<HTMLElement>(null)
  const [h, setH] = useState(360)
  const [active, setActive] = useState(0)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const STEP = 26 // degrees between slides
  const rot = useTransform(scrollYProgress, [0.05, 0.95], [0, STEP * (STEPS.length - 1)])

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    setActive(Math.min(STEPS.length - 1, Math.max(0, Math.round(((p - 0.05) / 0.9) * (STEPS.length - 1)))))
  })

  useEffect(() => {
    const r = () => setH(Math.min(420, Math.max(280, window.innerHeight * 0.4)))
    r()
    window.addEventListener('resize', r)
    return () => window.removeEventListener('resize', r)
  }, [])

  const radius = h / 2 / Math.tan(((STEP / 2) * Math.PI) / 180)

  return (
    <section id="process" data-snap-steps={STEPS.length} ref={ref} className="relative bg-charcoal text-ivory" style={{ height: `${STEPS.length * 70 + 60}vh` }}>
      <div className="shell sticky top-0 grid h-[100svh] grid-rows-[auto_1fr] overflow-hidden lg:grid-cols-12 lg:grid-rows-1 lg:items-center">
        <div className="pt-24 lg:col-span-4 lg:pt-0">
            <SectionLabel index="03" tone="ivory">
              How we work
            </SectionLabel>
            <h2 className="mt-6 font-display text-[clamp(2rem,4.2vw,4rem)] font-semibold leading-[0.95] tracking-[-0.05em]">
              A clear process,
              <br />
              <span className="serif">calmly</span> run.
            </h2>
          <ol className="mt-12 hidden gap-0 lg:flex lg:flex-col" aria-label="Process steps">
            {STEPS.map((s, i) => (
              <li key={s.n} className={`flex items-center gap-4 py-1.5 font-display text-[15px] transition-colors duration-500 ${i === active ? 'text-ivory' : 'text-ivory/35'}`}>
                <span className={`h-px transition-all duration-500 ${i === active ? 'w-10 bg-accent' : 'w-4 bg-ivory/30'}`} />
                {s.n} {s.t}
              </li>
            ))}
          </ol>
        </div>

        <div
          className="relative flex h-full items-center justify-center lg:col-span-8 [mask-image:linear-gradient(transparent,#000_18%,#000_82%,transparent)]"
          style={{ perspective: '1800px' }}
        >
          <motion.div className="relative w-full max-w-[820px]" style={{ height: h, z: -radius, rotateX: rot, transformStyle: 'preserve-3d' }}>
            {STEPS.map((s, i) => (
              <article
                key={s.n}
                className={`absolute inset-0 flex flex-col justify-between p-6 [backface-visibility:hidden] sm:p-9 ${toneCls[s.tone]}`}
                style={{ transform: `rotateX(${-i * STEP}deg) translateZ(${radius}px)` }}
              >
                <div className="flex items-start justify-between">
                  <span className="label opacity-70">Process — {s.n}/05</span>
                  <span className="font-display text-[clamp(3.5rem,7vw,6.5rem)] font-bold leading-[0.75] tracking-[-0.07em] opacity-90">{i + 1}</span>
                </div>
                <div className="grid items-end gap-6 sm:grid-cols-[1.3fr_1fr]">
                  <div>
                    <h3 className="font-display text-[clamp(2.2rem,5vw,4.4rem)] font-semibold uppercase leading-[0.85] tracking-[-0.05em]">{s.t}</h3>
                    <p className="mt-4 max-w-[40ch] text-[14px] leading-relaxed opacity-80 sm:text-[15px]">{s.d}</p>
                  </div>
                  <ul className="hidden border-t border-current/20 sm:block">
                    {s.meta.map((m) => (
                      <li key={m} className="label flex justify-between border-b border-current/20 py-2 text-[10px] opacity-80">
                        {m} <span>→</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ───────────── Journal ───────────── */

const NOTES = [
  { tag: 'Design', t: 'On restraint: designing AI products people actually trust' },
  { tag: 'CGI', t: 'Light first — how we stage a product render' },
  { tag: 'Voice', t: 'Voice is an interface: notes on conversation design' },
]

export function Journal() {
  return (
    <section id="journal" data-snap className="flex flex-col justify-center bg-paper py-24 lg:h-[100svh] lg:min-h-[600px] lg:py-0 lg:pt-[72px]">
      <div className="shell">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <SectionLabel index="04">Journal</SectionLabel>
            <h2 className="mt-6 font-display text-[clamp(2rem,4vw,3.6rem)] font-semibold leading-none tracking-[-0.05em]">
              Notes on <span className="serif">craft.</span>
            </h2>
          </div>
          <p className="max-w-[36ch] text-[14px] text-mute">Essays from the studio floor. The first pieces are being written now.</p>
        </div>
        <ul className="mt-14 border-t border-ink/15">
          {NOTES.map((n, i) => (
            <Reveal as="li" key={n.t} delay={i * 0.06} className="group grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-2 border-b border-ink/15 py-7 md:grid-cols-[120px_1fr_auto]">
              <span className="label text-mute">{n.tag}</span>
              <h3 className="col-span-2 font-display text-[clamp(1.3rem,2.4vw,2rem)] font-medium tracking-[-0.035em] transition-transform duration-700 ease-[var(--ease-expo)] group-hover:translate-x-2 md:col-span-1">
                {n.t}
              </h3>
              <span className="label col-start-2 text-[10px] text-slate md:col-start-3">Coming soon</span>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
