import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowUpRight, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { mountMotionPhoto } from '../fx/motionPhoto'
import { reducedMotion } from '../lib/smooth'
import { useUI } from '../lib/ui'
import { Ticker } from './Services'
import { Button, EASE, Magnetic, MaskLines } from './primitives'

const PHOTO = '/images/billi.webp'

/** Where the 1:1 studio photograph sits inside the hero canvas. */
function layout(w: number, h: number) {
  if (w / h >= 1) {
    // desktop: full height, anchored right; the backdrop streaks out to the left
    const s = h * 1.04
    return { x: w - s * 0.97, y: -s * 0.02, w: s, h: s }
  }
  // portrait: centred under the headline, above the copy
  const s = Math.min(w * 1.15, h * 0.5)
  return { x: w * 0.5 - s * 0.42, y: h * 0.27, w: s, h: s }
}

export default function Hero() {
  const { openContact, openReel } = useUI()
  const section = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end start'] })
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '-18%'])
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  useEffect(() => {
    if (!stage.current) return
    let handle: { dispose: () => void } | null = null
    try {
      handle = mountMotionPhoto(stage.current, {
        src: PHOTO,
        focus: [0.4, 0.27],
        layout,
        reduced: reducedMotion(),
        onReady: () => setReady(true),
      })
    } catch {
      // WebGL unavailable — the studio gradient below still carries the composition.
    }
    return () => handle?.dispose()
  }, [])

  return (
    <section
      id="top"
      ref={section}
      data-snap
      className="relative isolate flex min-h-[max(100svh,720px)] flex-col overflow-hidden bg-[#4b4b4b] lg:h-[100svh] lg:min-h-[620px]"
    >
      <div className="relative flex flex-1 flex-col pt-[72px]">
        {/* First paint / fallback: the photograph's own studio gradient */}
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,#3a3a3a_0%,#555_45%,#9a9a9a_68%,#dcdcdc_100%)]" />
        <motion.div
          ref={stage}
          initial={{ opacity: 0 }}
          animate={{ opacity: ready ? 1 : 0 }}
          transition={{ duration: 1.4, ease: EASE }}
          className="absolute inset-0"
          role="img"
          aria-label="A black cat seated on a stone plinth in a grey studio, caught in a motion blur"
        />

        <motion.div style={{ y: textY, opacity: fade }} className="shell pointer-events-none relative z-10 flex flex-1 flex-col">
          <h1 className="mt-14 font-display text-[clamp(2.9rem,min(8.6vw,13.5svh),9.4rem)] font-semibold leading-[0.9] tracking-[-0.055em] text-ivory lg:mt-[9svh]">
            <MaskLines
              inView={false}
              delay={0.25}
              lines={[
                'We make',
                'complex ideas',
                <>
                  feel <span className="serif pr-[0.06em] text-[1.08em] tracking-[-0.02em] text-coral">inevitable.</span>
                </>,
              ]}
            />
          </h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, ease: EASE, delay: 0.85 }}
            className="pointer-events-auto mt-auto pb-8 lg:pb-[5svh]"
          >
            <p className="max-w-[30ch] text-[17px] font-medium leading-relaxed text-ink lg:text-[19px]">
              Design, CGI and intelligent systems for brands moving forward.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Magnetic>
                <Button onClick={openContact} icon={<ArrowUpRight size={16} />}>
                  Start a project
                </Button>
              </Magnetic>
              <button
                type="button"
                onClick={openReel}
                className="group inline-flex h-12 items-center gap-3 bg-ivory/85 pr-4 font-display text-[14px] font-semibold text-ink"
              >
                <span className="grid h-12 w-12 place-items-center border border-ink/20 transition-colors duration-500 group-hover:border-coral group-hover:bg-coral">
                  <Play size={14} className="fill-current" />
                </span>
                <span className="link-underline">Watch showreel</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <div className="relative z-10">
        <Ticker />
      </div>
    </section>
  )
}
