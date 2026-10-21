import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowUp, ArrowUpRight } from 'lucide-react'
import { useRef } from 'react'
import { EMAIL, NAV } from '../lib/data'
import { IMG, img, srcSet } from '../lib/images'
import { scrollToTarget } from '../lib/smooth'
import { useUI } from '../lib/ui'
import { Button, Logo, Magnetic, MaskLines, Reveal } from './primitives'

export function FinalCTA() {
  const { openContact } = useUI()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['-10%', '10%'])
  const clip = useTransform(scrollYProgress, [0.05, 0.45], ['inset(18% 22% 18% 22%)', 'inset(0% 0% 0% 0%)'])

  return (
    <section ref={ref} data-snap className="flex flex-col justify-center bg-ivory py-20 sm:py-24 lg:h-[100svh] lg:min-h-[620px] lg:py-0 lg:pt-[72px]">
      <div className="shell grid gap-12 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-6">
          <p className="label text-mute">
            <span className="text-coral">(05)</span> Let’s talk
          </p>
          <h2 className="mt-8 font-display text-[clamp(2.6rem,5.2vw,5.6rem)] font-semibold leading-[0.9] tracking-[-0.055em]">
            <MaskLines lines={['Have a good idea?', <>Let’s give it <span className="serif text-coral">form.</span></>]} />
          </h2>
          <Reveal delay={0.15}>
            <p className="mt-8 max-w-[42ch] text-[17px] leading-relaxed text-ink/75">
              From early concepts to full-scale production, we help you bring your ideas to life with clarity and craft.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <Magnetic>
                <Button variant="coral" onClick={openContact} icon={<ArrowUpRight size={16} />} className="h-14 px-8 text-[15px]">
                  Start a project
                </Button>
              </Magnetic>
              <a href={`mailto:${EMAIL}`} className="link-underline font-display text-[15px] font-medium text-ink/80">
                or write to {EMAIL}
              </a>
            </div>
          </Reveal>
        </div>
        <motion.div style={{ clipPath: clip }} className="relative aspect-[4/5] max-h-[72svh] overflow-hidden bg-stone lg:col-span-5 lg:col-start-8 lg:aspect-auto lg:h-[70svh]">
          <motion.img
            style={{ y }}
            src={img(IMG.archInterior, 1200)}
            srcSet={srcSet(IMG.archInterior, [600, 1000, 1500])}
            sizes="(min-width: 1024px) 40vw, 100vw"
            alt="A calm ivory interior with a tall arched doorway and soft daylight"
            loading="lazy"
            className="absolute inset-[-10%] h-[120%] w-[120%] max-w-none object-cover"
          />
          <span className="label absolute bottom-4 left-4 bg-ivory/90 px-3 py-2 text-[10px] text-ink">Space to think</span>
        </motion.div>
      </div>
    </section>
  )
}

const INSTAGRAM = 'https://www.instagram.com/blurrycatstudio/'

const SOCIAL = [
  { label: 'Behance', href: 'https://www.behance.net/' },
  { label: 'Dribbble', href: 'https://dribbble.com/' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/' },
  { label: 'Instagram', href: INSTAGRAM },
]

export function Footer() {
  const go = (e: React.MouseEvent, href: string) => {
    e.preventDefault()
    scrollToTarget(href)
  }
  return (
    <footer data-snap-end className="overflow-hidden bg-ink pt-20 text-ivory">
      <div className="shell">
        <div className="grid gap-12 border-b border-ivory/15 pb-16 md:grid-cols-12">
          <div className="md:col-span-5">
            <Logo tone="ivory" />
            <p className="mt-6 max-w-[34ch] text-[15px] leading-relaxed text-ivory/65">
              Design, CGI and intelligent systems for brands moving forward.
            </p>
            <a href={`mailto:${EMAIL}`} className="link-underline mt-8 inline-block font-display text-[clamp(1.3rem,2.4vw,1.9rem)] font-semibold tracking-[-0.03em]">
              {EMAIL}
            </a>
            <a href={INSTAGRAM} target="_blank" rel="noreferrer" className="link-underline mt-3 block w-fit text-[15px] text-ivory/70 hover:text-ivory">
              @blurrycatstudio on Instagram
            </a>
          </div>
          <nav aria-label="Footer" className="md:col-span-2 md:col-start-7">
            <p className="label mb-5 text-fog">Index</p>
            <ul className="space-y-2.5">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a href={n.href} onClick={(e) => go(e, n.href)} className="link-underline text-[15px] text-ivory/85">
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="md:col-span-2">
            <p className="label mb-5 text-fog">Elsewhere</p>
            <ul className="space-y-2.5">
              {SOCIAL.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noreferrer" className="link-underline inline-flex items-center gap-1.5 text-[15px] text-ivory/85">
                    {s.label} <ArrowUpRight size={13} className="opacity-60" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-2">
            <p className="label mb-5 text-fog">Studio</p>
            <address className="text-[15px] not-italic leading-relaxed text-ivory/85">
              Lucknow, India
              <br />
              <span className="text-ivory/55">Working worldwide</span>
            </address>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 py-6 text-[13px] text-ivory/50">
          <span>© {new Date().getFullYear()} Blurrycat Studio. All rights reserved.</span>
          <button type="button" onClick={() => scrollToTarget(0)} className="group inline-flex items-center gap-2 text-ivory/70 hover:text-ivory">
            Back to top
            <span className="grid h-8 w-8 place-items-center border border-ivory/20 transition-colors group-hover:border-coral group-hover:bg-coral group-hover:text-ink">
              <ArrowUp size={14} />
            </span>
          </button>
        </div>
      </div>
      <p aria-hidden className="select-none whitespace-nowrap text-center font-display text-[21vw] font-bold leading-[0.72] tracking-[-0.07em] text-ivory/[0.06]">
        Blurrycat
      </p>
    </footer>
  )
}
