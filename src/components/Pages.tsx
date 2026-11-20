import { motion } from 'framer-motion'
import { useState } from 'react'
import FooterWaterCanvas from '../three/FooterWaterCanvas'
import { CinematicFocus, FOG_IMAGE_MASK } from './CinematicFocus'
import GridDistortion from './GridDistortion'
import { BrandCrest, EASE } from './primitives'

export type RouteId = 'home' | 'projects' | 'studio' | 'contact'

const EMAIL = 'hello@blurrycatstudio.com'
const INSTAGRAM = 'https://www.instagram.com/blurrycatstudio/'

export const STUDIO_WORKS = [
  {
    n: '01',
    title: 'Voice Agents',
    line: 'Human-warm conversational AI for support, qualification, and bookings.',
    image: '/images/build-voice.jpg',
    alt: 'Sculptural matte-black studio condenser microphone in mist-grey limestone',
  },
  {
    n: '02',
    title: '3D & CGI',
    line: 'Photorealistic product renders and quiet cinematic motion.',
    image: '/images/build-cgi.jpg',
    alt: 'Sculpted obsidian and alabaster sphere on travertine pedestal',
  },
  {
    n: '03',
    title: 'AI Systems',
    line: 'Custom workflows and intelligent automation built for real operations.',
    image: '/images/build-ai.jpg',
    alt: 'Smoked-glass optical prisms and dark anodized nodes',
  },
  {
    n: '04',
    title: 'Branding & Content',
    line: 'Identities, naming, and campaign visuals crafted with CGI precision.',
    image: '/images/build-branding.jpg',
    alt: 'Blind-embossed cotton paper proofs and dark carved stone',
  },
  {
    n: '05',
    title: 'Web Development',
    line: 'Fast, tactile websites and web apps designed and built in-house.',
    image: '/images/build-web.jpg',
    alt: 'Brushed-graphite monolith frame inside a mist-grey gallery',
  },
] as const

/* ───────────────────── Projects / All Works Page (Pitch Black) ───────────────────── */

export function ProjectsPage({ onNavigate }: { onNavigate: (r: RouteId) => void }) {
  return (
    <div className="relative z-20 min-h-[100svh] bg-[#000000] px-6 pb-32 pt-28 text-[#F2F1EE] sm:px-10">
      <div className="mx-auto max-w-[1120px]">
        {/* Back button */}
        <motion.button
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, ease: EASE }}
          onClick={() => onNavigate('home')}
          className="link-underline font-sans text-[12px] tracking-wide text-[#F2F1EE]/65 transition-colors hover:text-white cursor-pointer"
        >
          ← Back to home
        </motion.button>

        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: EASE }}
          className="mt-12 max-w-[680px]"
        >
          <p className="font-sans text-[11px] uppercase tracking-[0.24em] text-[#F2F1EE]/45">
            Selected capabilities · (5)
          </p>
          <h1 className="mt-4 font-serif text-[clamp(2.6rem,5.4vw,4.8rem)] font-normal not-italic leading-[1.05] text-[#F2F1EE]">
            What we craft <span className="italic">in-house.</span>
          </h1>
        </motion.div>

        {/* Fog-blended Zig-Zag Showcase */}
        <div className="mt-20 space-y-24 lg:space-y-32">
          {STUDIO_WORKS.map((work, i) => {
            const reversed = i % 2 === 1
            return (
              <CinematicFocus key={work.n}>
                <article className="grid items-center gap-10 md:grid-cols-12 md:gap-12">
                  <div
                    className={`md:col-span-6 ${
                      reversed ? 'md:order-2 md:col-start-7' : 'md:order-1 md:col-start-1'
                    }`}
                  >
                    <div
                      style={FOG_IMAGE_MASK}
                      className="relative aspect-[4/3] w-full overflow-hidden"
                    >
                      <GridDistortion
                        imageSrc={work.image}
                        alt={work.alt}
                        grid={15}
                        radius={0.18}
                        strength={0.15}
                        relaxation={0.96}
                        mode="drag"
                        softness={0}
                        chroma={0}
                        idle={0.3}
                        clickRipple
                        intro
                      />
                    </div>
                  </div>

                  <div
                    className={`md:col-span-5 ${
                      reversed
                        ? 'md:order-1 md:col-start-1 md:text-right'
                        : 'md:order-2 md:col-start-8 md:text-left'
                    }`}
                  >
                    <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-[#F2F1EE]/40">
                      {work.n}
                    </p>
                    <h2 className="mt-3 font-serif text-[clamp(2rem,3.4vw,3.1rem)] font-normal not-italic leading-[1.08] text-[#F2F1EE]">
                      {work.title}
                    </h2>
                    <p
                      className={`mt-4 max-w-[34ch] font-sans text-[15px] leading-relaxed text-[#F2F1EE]/65 ${
                        reversed ? 'md:ml-auto' : ''
                      }`}
                    >
                      {work.line}
                    </p>
                  </div>
                </article>
              </CinematicFocus>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <CinematicFocus className="mt-32 text-center">
          <button
            type="button"
            onClick={() => onNavigate('contact')}
            className="link-underline font-serif text-[clamp(2rem,4vw,3.4rem)] font-normal not-italic text-[#F2F1EE] cursor-pointer"
          >
            Start a conversation →
          </button>
        </CinematicFocus>
      </div>
    </div>
  )
}

/* ───────────────────── The Studio Page (Mist Grey, Borderless) ───────────────────── */

export function StudioPage({ onNavigate }: { onNavigate: (r: RouteId) => void }) {
  return (
    <div className="relative z-10 min-h-[100svh] px-6 pb-32 pt-28 text-[#161618] sm:px-10">
      <div className="mx-auto max-w-[920px]">
        <motion.button
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, ease: EASE }}
          onClick={() => onNavigate('home')}
          className="link-underline font-sans text-[12px] tracking-wide text-[#161618]/65 transition-colors hover:text-[#161618] cursor-pointer"
        >
          ← Back to home
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: EASE }}
          className="mt-14"
        >
          <div className="flex items-center gap-3">
            <BrandCrest className="h-[22px] w-[19px] text-[#161618]" />
            <span className="font-serif text-[12px] uppercase tracking-[0.26em] text-[#161618]/80">
              BLURRYCAT STUDIOS AI
            </span>
          </div>

          <h1 className="mt-8 font-serif text-[clamp(2.5rem,5.2vw,4.6rem)] font-normal not-italic leading-[1.08] text-[#161618]">
            More than a studio. A <span className="italic">long-term</span> partner.
          </h1>
          <p className="mt-6 max-w-[46ch] font-sans text-[16px] leading-relaxed text-[#161618]/70">
            Design, 3D and engineering in the same room — Lucknow, India, working worldwide.
          </p>
        </motion.div>

        <div className="mt-24 grid gap-14 md:grid-cols-3">
          {[
            {
              n: '01',
              t: 'Thoughtful by design.',
              d: 'Every decision earns its place. We start with the problem, never the trend.',
            },
            {
              n: '02',
              t: 'Built for real life.',
              d: 'Craft that survives real users, real data, and real budgets.',
            },
            {
              n: '03',
              t: 'Made to matter.',
              d: 'Measured by what changes for your business — not just how it looks.',
            },
          ].map((p) => (
            <CinematicFocus key={p.n}>
              <p className="font-sans text-[11px] uppercase tracking-[0.2em] text-[#161618]/45">
                {p.n}
              </p>
              <h2 className="mt-3 font-serif text-[1.75rem] font-normal not-italic text-[#161618]">
                {p.t}
              </h2>
              <p className="mt-3 font-sans text-[14.5px] leading-relaxed text-[#161618]/70">
                {p.d}
              </p>
            </CinematicFocus>
          ))}
        </div>

        <CinematicFocus className="mt-28 flex flex-wrap items-center gap-10">
          <button
            type="button"
            onClick={() => onNavigate('projects')}
            className="link-underline font-serif text-[clamp(1.6rem,2.6vw,2.3rem)] font-normal not-italic text-[#161618] cursor-pointer"
          >
            See all projects →
          </button>
          <button
            type="button"
            onClick={() => onNavigate('contact')}
            className="link-underline font-sans text-[13px] tracking-wide text-[#161618]/70 hover:text-[#161618] cursor-pointer"
          >
            Contact us
          </button>
        </CinematicFocus>
      </div>
    </div>
  )
}

/* ───────────────────── Contact Page (Pitch Black + Nocturnal Water) ───────────────────── */

export function ContactPage({ onNavigate }: { onNavigate: (r: RouteId) => void }) {
  const [sent, setSent] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSent(true)
  }

  return (
    <div className="relative z-20 flex min-h-[100svh] flex-col justify-between overflow-hidden bg-[#000000] px-6 py-24 text-[#F2F1EE] sm:px-10">
      {/* Subtle Living Nocturnal Floral Water Background */}
      <div className="pointer-events-none fixed inset-0 opacity-35">
        <FooterWaterCanvas />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[780px]">
        <motion.button
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, ease: EASE }}
          onClick={() => onNavigate('home')}
          className="link-underline font-sans text-[12px] tracking-wide text-[#F2F1EE]/65 transition-colors hover:text-white cursor-pointer"
        >
          ← Back to home
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: EASE }}
          className="mt-12"
        >
          <p className="font-sans text-[11px] uppercase tracking-[0.24em] text-[#F2F1EE]/45">
            Inquiries
          </p>
          <h1 className="mt-4 font-serif text-[clamp(2.4rem,5vw,4.4rem)] font-normal not-italic leading-[1.06] text-[#F2F1EE]">
            Let’s bring your idea <span className="italic">into focus.</span>
          </h1>
          <a
            href={`mailto:${EMAIL}`}
            className="link-underline mt-6 inline-block font-serif text-[clamp(1.4rem,2.4vw,2rem)] font-normal not-italic text-[#F2F1EE]/85"
          >
            {EMAIL}
          </a>
        </motion.div>

        {sent ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-16"
          >
            <p className="font-serif text-[2rem] text-[#F2F1EE]">
              Received. We’ll reply within one working day.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="link-underline mt-6 font-sans text-[13px] text-[#F2F1EE]/75 hover:text-white cursor-pointer"
            >
              Return to studio →
            </button>
          </motion.div>
        ) : (
          <form onSubmit={submit} className="mt-14 space-y-10">
            <div>
              <label className="block font-sans text-[11px] uppercase tracking-[0.2em] text-[#F2F1EE]/45">
                Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-2 w-full bg-transparent py-3 font-serif text-[1.4rem] text-[#F2F1EE] placeholder:text-[#F2F1EE]/25 focus:outline-none"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(242,241,238,0.28), rgba(242,241,238,0.06))',
                  backgroundSize: '100% 1px',
                  backgroundPosition: 'bottom',
                  backgroundRepeat: 'no-repeat',
                }}
              />
            </div>

            <div>
              <label className="block font-sans text-[11px] uppercase tracking-[0.2em] text-[#F2F1EE]/45">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="mt-2 w-full bg-transparent py-3 font-serif text-[1.4rem] text-[#F2F1EE] placeholder:text-[#F2F1EE]/25 focus:outline-none"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(242,241,238,0.28), rgba(242,241,238,0.06))',
                  backgroundSize: '100% 1px',
                  backgroundPosition: 'bottom',
                  backgroundRepeat: 'no-repeat',
                }}
              />
            </div>

            <div>
              <label className="block font-sans text-[11px] uppercase tracking-[0.2em] text-[#F2F1EE]/45">
                What are we building?
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Voice agent, 3D campaign, web experience..."
                className="mt-2 w-full resize-none bg-transparent py-3 font-serif text-[1.3rem] text-[#F2F1EE] placeholder:text-[#F2F1EE]/25 focus:outline-none"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(242,241,238,0.28), rgba(242,241,238,0.06))',
                  backgroundSize: '100% 1px',
                  backgroundPosition: 'bottom',
                  backgroundRepeat: 'no-repeat',
                }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-6 pt-4">
              <button
                type="submit"
                className="link-underline font-serif text-[1.8rem] font-normal not-italic text-[#F2F1EE] cursor-pointer"
              >
                Send note →
              </button>
              <a
                href={INSTAGRAM}
                target="_blank"
                rel="noreferrer"
                className="link-underline font-sans text-[12px] tracking-wide text-[#F2F1EE]/60 hover:text-white"
              >
                @blurrycatstudio
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
