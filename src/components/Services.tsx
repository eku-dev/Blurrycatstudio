import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import { Play } from 'lucide-react'
import { useRef } from 'react'
import { IMG, img, srcSet } from '../lib/images'
import { useUI } from '../lib/ui'
import { FlowStatus, StackMarquee, VoiceFlow, useFlowTimeline } from './VoiceFlow'
import { MaskLines, Reveal, SectionLabel } from './primitives'

const TICKER = [
  'Voice Agents',
  '3D & CGI',
  'AI Systems',
  'Web Development',
  'App Development',
  'Automation',
  'Branding',
  'Content Creation',
  'Product Visualization',
  'Social Media Management',
  'Ad Campaigns',
  'Creative Direction',
]

export function Ticker() {
  const row = [...TICKER, ...TICKER]
  return (
    <div className="overflow-hidden border-t border-ink/10 bg-ivory py-3.5 lg:py-4" aria-hidden>
      <div className="flex w-max animate-marquee" style={{ animationDuration: '76s' }}>
        {row.concat(row).map((t, i) => (
          <span key={i} className="flex items-center gap-8 pr-8 font-display text-[clamp(1.15rem,2vw,1.9rem)] font-semibold tracking-[-0.035em] text-ink">
            {t}
            <span className="inline-block h-2.5 w-2.5 rotate-45 bg-accent" />
          </span>
        ))}
      </div>
    </div>
  )
}

function Photo({ id, alt, className = '' }: { id: string; alt: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['-6%', '6%'])
  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.img
        style={{ y }}
        src={img(id, 1000)}
        srcSet={srcSet(id, [500, 900, 1400])}
        sizes="(min-width: 1024px) 40vw, 100vw"
        alt={alt}
        loading="lazy"
        decoding="async"
        className="absolute inset-[-8%] h-[116%] w-[116%] max-w-none object-cover transition-transform duration-[1.4s] ease-[var(--ease-expo)] group-hover:scale-[1.04]"
      />
    </div>
  )
}

function CardHead({ n, title, dark }: { n: string; title: string; dark?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className={`label mb-3 ${dark ? 'text-fog' : 'opacity-60'}`}>{n}</p>
        <h3 className="whitespace-nowrap font-display text-[clamp(1.6rem,min(2.2vw,4.2svh),2.4rem)] font-semibold leading-none tracking-[-0.045em]">{title}</h3>
      </div>
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center border transition-all duration-500 group-hover:rotate-45 ${
          dark ? 'border-ivory/25 group-hover:border-accent group-hover:bg-accent group-hover:text-ink' : 'border-current/25 group-hover:bg-ink group-hover:text-ivory'
        }`}
      >
        <Play size={15} className="fill-current" />
      </span>
    </div>
  )
}

const Tags = ({ items, dark, className = '' }: { items: string[]; dark?: boolean; className?: string }) => (
  <ul className={`mt-4 flex flex-wrap gap-x-5 gap-y-1.5 ${className}`}>
    {items.map((t) => (
      <li key={t} className={`label text-[10px] ${dark ? 'text-fog' : 'text-ink/60'}`}>
        — {t}
      </li>
    ))}
  </ul>
)

const MORE = [
  {
    n: '04',
    title: 'Branding',
    text: 'Identities, naming and brand systems that make a business instantly recognisable.',
    tags: ['Identity', 'Strategy', 'Guidelines'],
    img: IMG.swatches,
    alt: 'Colour swatches and printed brand proofs on a desk',
    dark: false,
  },
  {
    n: '05',
    title: 'Content Creation',
    text: 'Campaign visuals, social content and short-form video, made with the same craft as our CGI.',
    tags: ['Social', 'Video', 'Campaigns'],
    img: IMG.filmCamera,
    alt: 'A cinema camera on a tripod in a dim studio',
    dark: true,
  },
  {
    n: '06',
    title: 'Web Development',
    text: 'Fast, accessible websites and web apps — designed, built and looked after in-house.',
    tags: ['Websites', 'Web apps', 'E-commerce'],
    img: IMG.laptop,
    alt: 'A minimal laptop on a white surface',
    dark: false,
  },
]

export default function Services() {
  const { openReel } = useUI()
  const card = 'group relative flex h-full cursor-pointer flex-col overflow-hidden text-left'
  const voiceRef = useRef<HTMLAnchorElement>(null)
  const inView = useInView(voiceRef, { amount: 0.35 })
  const { step, loop } = useFlowTimeline(inView)
  // Every service card opens the studio showreel.
  const go = (e: React.MouseEvent) => (e.preventDefault(), openReel())
  const short = '[@media(max-height:780px)]:hidden'

  return (
    <section id="services" data-snap className="flex flex-col bg-ivory pb-16 pt-[92px] lg:pb-24">
      <div className="shell flex flex-1 flex-col lg:min-h-0">
        <div className="grid gap-5 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <SectionLabel index="01">What we do</SectionLabel>
            <h2 className="mt-4 font-display text-[clamp(2.1rem,min(4vw,6.4svh),4rem)] font-semibold leading-[0.95] tracking-[-0.05em]">
              <MaskLines lines={['Many creative possibilities,', <span className="serif">one studio.</span>]} />
            </h2>
          </div>
          <Reveal className="lg:col-span-4" delay={0.15}>
            <p className="max-w-[40ch] text-[15px] leading-relaxed text-ink/70">
              Design, 3D and engineering in the same room — so what gets imagined is what gets built.
            </p>
          </Reveal>
        </div>

        <div className="mt-6 grid gap-px border border-ink/12 bg-ink/12 lg:mt-8 lg:h-[max(560px,calc(100svh-250px))] lg:grid-cols-12 lg:grid-rows-2">
          {/* 01 — Voice Agents: a live n8n-style execution + the tools we build with */}
          <Reveal className="min-w-0 lg:col-span-7 lg:row-span-2 lg:min-h-0">
            <a ref={voiceRef} href="#showreel" onClick={go} className={`${card} min-w-0 bg-ink text-ivory`}>
              <div className="p-6 pb-0 lg:p-8 lg:pb-0">
                <CardHead n="01" title="Voice Agents" dark />
              </div>
              <div className="mx-4 mt-5 flex flex-col border border-ivory/10 bg-[#1d1e1b] p-3 sm:mx-6 lg:mx-8 lg:min-h-0 lg:flex-1">
                <div className="mb-2 flex items-center justify-between gap-4 px-1">
                  <FlowStatus step={step} />
                  <span className="label shrink-0 text-[10px] text-fog">n8n · workflow</span>
                </div>
                {/* vertical layout on phones so the whole workflow is visible, wide from sm up */}
                <VoiceFlow step={step} loop={loop} variant="tall" className="mx-auto h-auto w-full max-w-[380px] sm:hidden" />
                <div className="hidden sm:block lg:min-h-0 lg:flex-1">
                  <VoiceFlow step={step} loop={loop} className="h-auto w-full lg:h-full" />
                </div>
              </div>
              <div className="grid gap-3 p-6 lg:grid-cols-[1fr_auto] lg:items-end lg:px-8 lg:py-5">
                <p className="max-w-[46ch] text-[14px] leading-relaxed text-ivory/75 lg:text-[15px]">
                  Human-friendly conversational AI agents for customer support, lead qualification, and business
                  operations.
                </p>
                <Tags items={['Support', 'Qualification', 'Operations']} dark className={`lg:mt-0 ${short}`} />
              </div>
              <div className="mt-auto">
                <StackMarquee />
              </div>
            </a>
          </Reveal>

          {/* 02 — 3D & CGI */}
          <Reveal className="min-w-0 lg:col-span-5 lg:min-h-0" delay={0.08}>
            <a href="#showreel" onClick={go} className={`${card} bg-accent text-ink sm:grid sm:grid-cols-[1.2fr_1fr]`}>
              <div className="flex flex-col p-6 lg:p-8">
                <CardHead n="02" title="3D & CGI" />
                <p className="mt-6 max-w-[30ch] pt-4 text-[14px] leading-relaxed text-ink/85 sm:mt-auto lg:text-[15px]">
                  Photorealistic product renders, cinematic visuals, and high-end CGI production.
                </p>
                <Tags items={['Product', 'Motion', 'Spatial']} className={short} />
              </div>
              <Photo id={IMG.render} alt="A red sphere resting on a white pedestal, rendered in soft studio light" className="aspect-[4/3] sm:aspect-auto" />
            </a>
          </Reveal>

          {/* 03 — AI Systems */}
          <Reveal className="min-w-0 lg:col-span-5 lg:min-h-0" delay={0.16}>
            <a href="#showreel" onClick={go} className={`${card} bg-paper sm:grid sm:grid-cols-[1fr_1.2fr]`}>
              <Photo id={IMG.circuit} alt="Black and white macro of a circuit board" className="aspect-[4/3] sm:aspect-auto" />
              <div className="flex flex-col p-6 lg:p-8">
                <CardHead n="03" title="AI Systems" />
                <p className="mt-6 max-w-[30ch] pt-4 text-[14px] leading-relaxed text-ink/75 sm:mt-auto lg:text-[15px]">
                  Custom AI workflows, tailored digital solutions, and intelligent business automation.
                </p>
                <Tags items={['Workflows', 'Automation', 'Integrations']} className={short} />
              </div>
            </a>
          </Reveal>
        </div>

        {/* 04–06 — compact cards, image on top */}
        <div className="grid gap-px border border-t-0 border-ink/12 bg-ink/12 md:grid-cols-3">
          {MORE.map((c, i) => (
            <Reveal key={c.n} className="min-w-0" delay={i * 0.08}>
              <a href="#showreel" onClick={go} className={`${card} ${c.dark ? 'bg-ink text-ivory' : 'bg-paper text-ink'}`}>
                <Photo id={c.img} alt={c.alt} className="aspect-[16/10]" />
                <div className="flex flex-1 flex-col p-6 lg:p-8">
                  <CardHead n={c.n} title={c.title} dark={c.dark} />
                  <p className={`mt-5 max-w-[34ch] text-[14px] leading-relaxed lg:text-[15px] ${c.dark ? 'text-ivory/75' : 'text-ink/75'}`}>{c.text}</p>
                  <Tags items={c.tags} dark={c.dark} />
                </div>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
