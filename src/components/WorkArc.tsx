import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ARC_CARDS } from '../lib/data'
import { img } from '../lib/images'
import { reducedMotion } from '../lib/smooth'
import { useUI } from '../lib/ui'
import type { ArcHandle } from '../three/arcScene'
import { Button, MaskLines, Reveal } from './primitives'

/** Rotating circular caption, like a stamp at the heart of the wheel. */
function RingText() {
  const text = 'SELECTED WORK · 2024—2026 · BLURRYCAT STUDIO · '
  return (
    <svg viewBox="0 0 200 200" className="h-20 w-20 animate-spin-slow text-ivory/70 lg:h-24 lg:w-24" aria-hidden>
      <defs>
        <path id="ring" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
      </defs>
      <text fill="currentColor" fontSize="12.5" letterSpacing="3.6" fontFamily="Inter" fontWeight="500">
        <textPath href="#ring">{text}</textPath>
      </text>
      <path d="M92 100 l8 -14 l8 14z" fill="#FFC330" />
    </svg>
  )
}

export default function WorkArc() {
  const { openContact } = useUI()
  const section = useRef<HTMLElement>(null)
  const host = useRef<HTMLDivElement>(null)
  const scene = useRef<ArcHandle | null>(null)
  const [label, setLabel] = useState<string | null>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [failed, setFailed] = useState(false)
  const { scrollYProgress } = useScroll({ target: section, offset: ['start end', 'end start'] })

  useMotionValueEvent(scrollYProgress, 'change', (p) => scene.current?.setProgress(p))

  // Mount the WebGL wheel (and fetch its 16 textures) only when the section comes near.
  useEffect(() => {
    const el = host.current
    if (!el) return
    let cancelled = false
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        import('../three/arcScene')
          .then(({ mountArcScene }) => {
            if (cancelled) return
            scene.current = mountArcScene(
              el,
              ARC_CARDS.map((c) => ({ url: img(c.id, 480), label: c.label })),
              { reduced: reducedMotion(), onHover: setLabel },
            )
            scene.current.setProgress(scrollYProgress.get())
          })
          .catch(() => !cancelled && setFailed(true))
      },
      { rootMargin: '100% 0px' },
    )
    io.observe(el)
    return () => {
      cancelled = true
      io.disconnect()
      scene.current?.dispose()
      scene.current = null
    }
  }, [scrollYProgress])

  return (
    <section
      id="work"
      data-snap
      ref={section}
      className="relative h-[100svh] min-h-[680px] overflow-hidden bg-ink text-ivory"
      onPointerMove={(e) => {
        const b = e.currentTarget.getBoundingClientRect()
        setPos({ x: e.clientX - b.left, y: e.clientY - b.top })
      }}
    >
      <div ref={host} className="absolute inset-0" aria-hidden />

      {failed && (
        <div className="absolute inset-x-0 top-24 flex justify-center gap-3 overflow-hidden px-5 opacity-80">
          {ARC_CARDS.slice(0, 6).map((c) => (
            <img key={c.id} src={img(c.id, 300)} alt="" loading="lazy" className="aspect-[3/4] w-36 object-cover" />
          ))}
        </div>
      )}

      {/* hover caption that follows the pointer */}
      <AnimatePresence>
        {label && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className="label pointer-events-none absolute z-20 hidden bg-accent px-3 py-2 text-[10px] text-ink md:block"
            style={{ left: pos.x + 18, top: pos.y + 18 }}
          >
            {label} — drag
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center px-5 pb-10 text-center lg:pb-12">
        <div className="mb-5">
          <RingText />
        </div>
        <p className="label mb-5 text-fog">
          <span className="text-accent">(02)</span> Selected work
        </p>
        <h2 className="font-display text-[clamp(1.9rem,3.4vw,3.6rem)] font-semibold leading-[0.92] tracking-[-0.055em]">
          <MaskLines lines={['Turning every story', <>into <span className="serif">unforgettable visuals.</span></>]} />
        </h2>
        <Reveal delay={0.2} className="pointer-events-auto">
          <p className="mx-auto mt-4 max-w-[46ch] text-[15px] leading-relaxed text-ivory/70">
            A selection of projects where design, technology and creativity come together to create real impact.
          </p>
          <div className="mt-6 flex justify-center">
            <Button onClick={openContact} variant="ivory" icon={<ArrowUpRight size={16} />}>
              Start a project
            </Button>
          </div>
        </Reveal>
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-ink via-ink/85 to-transparent" />
    </section>
  )
}
