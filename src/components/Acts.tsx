import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { scrollToTarget } from '../lib/smooth'
import FooterWaterCanvas from '../three/FooterWaterCanvas'
import { CinematicFocus, FOG_IMAGE_MASK, FOG_SLAB_MASK } from './CinematicFocus'
import GridDistortion, { GridDistortionText } from './GridDistortion'
import { type RouteId, STUDIO_WORKS } from './Pages'
import { BrandCrest, EASE } from './primitives'
import RippleDistortion from './RippleDistortion'
import ScrollExpand from './ScrollExpand'

const EMAIL = 'hello@blurrycatstudio.com'
const INSTAGRAM = 'https://www.instagram.com/blurrycatstudio/'

const PROCESS_STEPS = [
  { n: '01', title: 'Discover', line: 'Audits and conversations with the people who use it.' },
  { n: '02', title: 'Direction', line: 'One clear creative and technical direction.' },
  { n: '03', title: 'Design', line: 'Identity, CGI, interface, and voice — iterated in the open.' },
  { n: '04', title: 'Build', line: 'Production code, pipelines, and agents tested for real use.' },
  { n: '05', title: 'Evolve', line: 'Launch is the midpoint. We measure and refine.' },
] as const

/* ───────────────────── Act 1: Opening & Scroll Manifesto ───────────────────── */

export function ActArrival() {
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const heroFilter = useTransform(heroProgress, [0, 0.72], ['blur(0px)', 'blur(14px)'])
  const heroOpacity = useTransform(heroProgress, [0, 0.72], [1, 0.12])

  return (
    <section id="act-arrival" className="relative z-10 text-[#161618]">
      {/* Opening Viewport — blurs gently as it scrolls up */}
      <motion.div
        ref={heroRef}
        style={{ filter: heroFilter, opacity: heroOpacity }}
        className="shell flex min-h-[100svh] items-center"
      >
        <div className="grid w-full grid-cols-1 items-center gap-5 text-center md:grid-cols-[1.15fr_1.6fr_0.85fr] md:gap-6 md:text-left">
          {/* Left: Custom BC Crest + BLURRYCAT STUDIOS AI */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.0, delay: 0.12, ease: EASE }}
            className="flex items-center justify-center gap-3.5 md:justify-start"
          >
            <BrandCrest className="h-[22px] w-[19px] shrink-0 text-[#161618]" />
            <span className="font-serif text-[11px] font-normal uppercase tracking-[0.26em] text-[#161618]/90 sm:text-[12px]">
              BLURRYCAT STUDIOS AI
            </span>
          </motion.div>

          {/* Center: Tagline — 3D Billi sits directly on top of this text */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.05, delay: 0.24, ease: EASE }}
            className="md:text-center"
          >
            <h1
              id="hero-tagline"
              className="inline-block font-serif text-[clamp(1.65rem,2.45vw,2.5rem)] font-normal not-italic leading-[1.15] tracking-[-0.015em] text-[#161618]"
            >
              Innovative digital &amp; AI experiences studio
            </h1>
          </motion.div>

          {/* Right: Scroll down */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.0, delay: 0.36, ease: EASE }}
            className="md:text-right"
          >
            <button
              type="button"
              onClick={() => scrollToTarget('#act-manifesto')}
              className="link-underline font-sans text-[12px] font-normal tracking-wide text-[#161618]/70 transition-colors hover:text-[#161618] cursor-pointer"
            >
              Scroll down
            </button>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll-Revealed Manifesto — concise & cinema-blurred on entry/exit */}
      <div id="act-manifesto" className="shell flex min-h-[76svh] items-center py-16">
        <CinematicFocus className="max-w-[700px]">
          <p
            id="manifesto-text"
            className="font-serif text-[clamp(2.2rem,4.5vw,4.2rem)] font-normal not-italic leading-[1.12] tracking-[-0.018em] text-[#161618]"
          >
            Transcend anything seen or felt before by crafting unparalleled experiences for ambitious brands.
          </p>
        </CinematicFocus>
      </div>
    </section>
  )
}

/* ───────────────────── Act 2: What We Build — 5 Foggy Zig-Zag Items ───────────────────── */

function ZigZagItem({
  item,
  index,
  onOpenProjects,
}: {
  item: (typeof STUDIO_WORKS)[number]
  index: number
  onOpenProjects: () => void
}) {
  const isReversed = index % 2 === 1

  return (
    <CinematicFocus className="py-16 lg:py-24">
      <article className="grid items-center gap-10 md:grid-cols-12 md:gap-12">
        {/* Image Side — GridDistortion WebGL canvas + zero physical border (soft radial fog mask) */}
        <div
          className={`md:col-span-6 ${
            isReversed ? 'md:order-2 md:col-start-7' : 'md:order-1 md:col-start-1'
          }`}
        >
          <div
            onDoubleClick={onOpenProjects}
            style={FOG_IMAGE_MASK}
            className="relative aspect-[4/3] w-full overflow-hidden cursor-pointer"
          >
            <GridDistortion
              imageSrc={item.image}
              alt={item.alt}
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

        {/* Text Side — ultra-concise */}
        <div
          className={`md:col-span-5 ${
            isReversed
              ? 'md:order-1 md:col-start-1 md:text-right'
              : 'md:order-2 md:col-start-8 md:text-left'
          }`}
        >
          <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-[#161618]/45">
            {item.n}
          </p>

          <h3
            id={`build-title-${index}`}
            className="mt-3 inline-block font-serif text-[clamp(2.2rem,3.6vw,3.4rem)] font-normal not-italic leading-[1.06] tracking-[-0.015em] text-[#161618]"
          >
            {item.title}
          </h3>

          <p
            className={`mt-4 max-w-[32ch] font-sans text-[15px] leading-relaxed text-[#161618]/68 ${
              isReversed ? 'md:ml-auto' : ''
            }`}
          >
            {item.line}
          </p>
        </div>
      </article>
    </CinematicFocus>
  )
}

export function ActWhatWeBuild({ onNavigate }: { onNavigate: (r: RouteId) => void }) {
  const first = STUDIO_WORKS[0]
  const middle = STUDIO_WORKS.slice(1, -1)
  const last = STUDIO_WORKS[STUDIO_WORKS.length - 1]

  return (
    <section id="act-build" className="relative z-10 py-14 text-[#161618] lg:py-20">
      <div className="mx-auto w-full max-w-[1120px] px-6 sm:px-10">
        <CinematicFocus className="mb-10 text-center lg:mb-14">
          <p className="font-sans text-[11px] uppercase tracking-[0.24em] text-[#161618]/45">
            What we build
          </p>
          <h2 className="mt-3 font-serif text-[clamp(2.1rem,4vw,3.6rem)] font-normal not-italic leading-[1.08] text-[#161618]">
            Many possibilities, <span className="italic">one studio.</span>
          </h2>
        </CinematicFocus>
      </div>

      {/* First Item (01 Voice Agents): Full ScrollExpand cinema frame with live GridDistortion */}
      <ScrollExpand
        src={first.image}
        alt={first.alt}
        indexLabel={first.n}
        title={first.title}
        titleId="build-title-0"
        scrollHint="Scroll to expand"
        useWindowScroll
        startWidth={42}
        startHeight={58}
        startRadius={24}
        endRadius={0}
        mediaZoom={1.35}
        scrollDistance={1.2}
        holdDistance={0.35}
        smoothing={0.1}
        overlayScrim={0.45}
        enabled
        renderMedia={() => (
          <GridDistortion
            imageSrc={first.image}
            alt={first.alt}
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
        )}
      >
        <p>{first.line}</p>
      </ScrollExpand>

      {/* Middle Items (02, 03, 04): Borderless foggy zig-zag gallery */}
      <div className="mx-auto w-full max-w-[1120px] px-6 sm:px-10">
        {middle.map((item, idx) => (
          <ZigZagItem
            key={item.n}
            item={item}
            index={idx + 1}
            onOpenProjects={() => onNavigate('projects')}
          />
        ))}
      </div>

      {/* Last Item (05 Web Development): Full ScrollExpand cinema frame with live GridDistortion */}
      <ScrollExpand
        src={last.image}
        alt={last.alt}
        indexLabel={last.n}
        title={last.title}
        titleId={`build-title-${STUDIO_WORKS.length - 1}`}
        scrollHint="Scroll to expand"
        useWindowScroll
        startWidth={42}
        startHeight={58}
        startRadius={24}
        endRadius={0}
        mediaZoom={1.35}
        scrollDistance={1.2}
        holdDistance={0.35}
        smoothing={0.1}
        overlayScrim={0.45}
        enabled
        renderMedia={() => (
          <GridDistortion
            imageSrc={last.image}
            alt={last.alt}
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
        )}
      >
        <p>{last.line}</p>
      </ScrollExpand>
    </section>
  )
}

/* ───────────────────── Act 3: Foggy Road-Like Grey Textured Slab ("How We Build") ───────────────────── */

export function ActHowWeBuildRoad() {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start 92%', 'start 18%'],
  })

  // Unrolls & flattens forward like a misty stone road from the upper viewport
  const rotateX = useTransform(scrollYProgress, [0, 1], [32, 0])
  const scaleX = useTransform(scrollYProgress, [0, 1], [0.78, 1])
  const translateY = useTransform(scrollYProgress, [0, 1], [-80, 0])
  const slabOpacity = useTransform(scrollYProgress, [0, 0.35], [0.25, 1])

  return (
    <section
      id="act-process"
      ref={sectionRef}
      className="relative z-10 overflow-x-clip px-4 pt-16 pb-32 text-[#161618] sm:px-8 lg:pt-24 lg:pb-44"
      style={{ perspective: '1600px' }}
    >
      {/* Centered Grey Textured Road Slab — ZERO physical border, dissolved with foggy edge mask */}
      <motion.div
        style={{
          rotateX,
          scaleX,
          y: translateY,
          opacity: slabOpacity,
          transformOrigin: 'top center',
          ...FOG_SLAB_MASK,
        }}
        className="relative mx-auto w-full max-w-[920px] overflow-hidden bg-[#B3B5BA]/85"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.22] mix-blend-multiply"
          style={{ backgroundImage: "url('/textures/floral-grey-relief.jpg')" }}
        />
        <div aria-hidden className="grain pointer-events-none absolute inset-0 opacity-65" />

        {/* Road Slab Content — ENTIRE section powered by GridDistortionText */}
        <div className="relative px-5 pt-20 pb-36 sm:px-14 sm:pt-28 sm:pb-44 lg:px-24">
          <CinematicFocus className="text-center">
            <div className="mx-auto max-w-[260px]">
              <GridDistortionText
                text="HOW WE BUILD"
                color="rgba(22,22,24,0.55)"
                fontFamily="sans"
                fontSize={11}
                align="center"
                height={28}
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
            <h2 id="process-heading" className="mx-auto mt-3 max-w-[680px]">
              <GridDistortionText
                text="A clear process, calmly run."
                color="#161618"
                fontFamily="serif"
                fontSize={56}
                align="center"
                height={116}
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
            </h2>
          </CinematicFocus>

          <ol className="mt-12 space-y-8 sm:mt-16 sm:space-y-10 lg:mt-20">
            {PROCESS_STEPS.map((step) => (
              <li
                key={step.n}
                className="grid gap-1 sm:gap-2 md:grid-cols-12 md:items-center"
              >
                <div className="md:col-span-2">
                  <GridDistortionText
                    text={step.n}
                    color="rgba(22,22,24,0.48)"
                    fontFamily="sans"
                    fontSize={12}
                    align="left"
                    height={32}
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
                <h3 className="md:col-span-4">
                  <GridDistortionText
                    text={step.title}
                    color="#161618"
                    fontFamily="serif"
                    fontSize={40}
                    align="left"
                    height={56}
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
                </h3>
                <div className="md:col-span-6">
                  <GridDistortionText
                    text={step.line}
                    color="rgba(22,22,24,0.74)"
                    fontFamily="sans"
                    fontSize={14.5}
                    align="left"
                    height={56}
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
              </li>
            ))}
          </ol>
        </div>
      </motion.div>
    </section>
  )
}

/* ───────────────────── Act 4: Ink-Filled Blackout — "See all projects" ───────────────────── */

export function ActBlackoutProjects({ onNavigate }: { onNavigate: (r: RouteId) => void }) {
  return (
    <section
      id="act-blackout"
      className="relative z-20 flex min-h-[100svh] items-center justify-center bg-transparent px-6 text-[#F2F1EE]"
    >
      <CinematicFocus className="text-center">
        <button
          id="blackout-cta"
          type="button"
          onClick={() => onNavigate('projects')}
          className="group relative inline-flex items-start gap-1.5 pb-4 text-[#F2F1EE] cursor-pointer"
        >
          <span className="font-serif text-[clamp(2.4rem,4.6vw,4.4rem)] font-normal not-italic leading-none tracking-[-0.015em] transition-opacity duration-300 group-hover:opacity-80">
            See all projects
          </span>
          <span className="mt-1 font-serif text-[13px] not-italic text-[#F2F1EE]/65 sm:text-[15px]">
            (5)
          </span>
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-px origin-left bg-[#F2F1EE]/65 transition-transform duration-500 ease-[var(--ease-expo)] group-hover:scale-x-105 group-hover:bg-[#F2F1EE]"
          />
        </button>
      </CinematicFocus>
    </section>
  )
}

/* ───────────────────── Act 5: Cat Sanctuary Floral & Water Reflection Footer ───────────────────── */

export function ActFinale({ onNavigate }: { onNavigate: (r: RouteId) => void }) {
  return (
    <footer
      id="act-finale"
      className="relative z-20 flex min-h-[100svh] flex-col justify-center overflow-hidden bg-[#000000] px-6 py-16 text-[#F2F1EE] sm:px-10 lg:px-14"
    >
      {/* Interactive RippleDistortion nocturnal botanical backdrop across the footer */}
      <div className="pointer-events-none absolute inset-0 opacity-55">
        <RippleDistortion
          src="/textures/footer-botanical.jpg"
          brushSize={150}
          strength={0.2}
          swirl={1}
          rings={4}
          grayscale
          spread={5}
          fade={3}
          spacing={15}
          dispersion={0}
          glint={0}
          tint="#a855f7"
          tintAmount={0.1}
          highlightColor="#ffffff"
          trigger="hover"
          clickStrength={2}
          quality="low"
          enabled
        />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_minmax(320px,540px)_1fr] lg:gap-8">
        {/* Left Side: Studio Name & Direct Info */}
        <div className="order-2 flex flex-col items-center text-center lg:order-1 lg:items-start lg:text-left">
          <div className="flex items-center gap-3.5">
            <BrandCrest className="h-[24px] w-[20px] shrink-0 text-[#F2F1EE]" />
            <span className="font-serif text-[13px] font-normal uppercase tracking-[0.26em] text-[#F2F1EE]">
              BLURRYCAT STUDIOS AI
            </span>
          </div>

          <a
            href={`mailto:${EMAIL}`}
            className="link-underline mt-6 inline-block font-serif text-[clamp(1.25rem,1.9vw,1.6rem)] font-normal not-italic text-[#F2F1EE] transition-opacity hover:opacity-80 lg:mt-7"
          >
            {EMAIL}
          </a>

          <address className="mt-3 font-sans text-[12px] not-italic leading-[1.7] tracking-wide text-[#F2F1EE]/50 lg:mt-4">
            Lucknow, India · Worldwide
          </address>
        </div>

        {/* Center: Glowing Studio Crest Logo nestled INSIDE the nocturnal flowers (behind + over) over rippling water */}
        <div className="relative order-1 mx-auto h-[58svh] w-full max-w-[540px] sm:h-[74svh] lg:order-2 lg:h-[78svh]">
          {/* Layer 1 (Behind): Nocturnal flowers + real-time shimmering water reflection */}
          <FooterWaterCanvas />

          {/* Layer 2 (Middle): Monumental glowing pure-white BC Crest standing directly on the water line */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 z-10 flex items-end justify-center"
            style={{ top: '18%', bottom: '34%' }}
          >
            <div className="relative inline-flex h-full max-h-[340px] items-end justify-center">
              <BrandCrest
                className="h-full w-auto text-white"
                style={{
                  filter:
                    'drop-shadow(0 0 18px rgba(255,255,255,0.48)) drop-shadow(0 0 46px rgba(255,255,255,0.2))',
                }}
              />
              {/* Exact perch anchor on the flat top bar between the two crest ears */}
              <div
                id="footer-logo-perch"
                className="pointer-events-none absolute left-1/2 h-px w-16 -translate-x-1/2"
                style={{ top: '21.5%' }}
              />
            </div>
          </div>

          {/* Layer 3 (Front — OVER the bright white strokes): Ultra-fine tapering botanical veins & curling tendrils */}
          <svg
            aria-hidden
            viewBox="0 0 400 500"
            fill="none"
            className="pointer-events-none absolute inset-0 z-20 h-full w-full"
            style={{ animation: 'floralDrift 20s ease-in-out infinite' }}
          >
            {/* Main climbing vine curling organically from lower-left across the left crest, threading B & C, up to right ear */}
            <path
              d="M142 325 C124 295, 118 258, 134 226 C150 194, 184 196, 202 174 C218 154, 214 128, 232 108"
              stroke="#040406"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
            {/* Secondary hairline vein branching across the C curve and lower shield */}
            <path
              d="M162 204 C188 214, 224 206, 246 226 C264 242, 266 270, 248 294"
              stroke="#040406"
              strokeWidth="1.25"
              strokeLinecap="round"
            />
            {/* Delicate curling spiral tendrils gripping the shield edges */}
            <path
              d="M133 230 C118 224, 114 208, 124 202 C131 198, 136 205, 131 211"
              stroke="#040406"
              strokeWidth="0.95"
              strokeLinecap="round"
            />
            <path
              d="M210 164 C226 160, 234 148, 228 140 C223 135, 217 140, 220 146"
              stroke="#040406"
              strokeWidth="0.9"
              strokeLinecap="round"
            />
            <path
              d="M254 242 C268 236, 274 224, 266 218 C260 214, 256 220, 260 225"
              stroke="#040406"
              strokeWidth="0.85"
              strokeLinecap="round"
            />
            {/* Pointed slender botanical leaves silhouetted cleanly over the white strokes */}
            <g fill="#040406">
              <path d="M138 258 C126 250, 124 238, 134 232 C140 241, 141 250, 138 258Z" />
              <path d="M174 198 C168 184, 174 172, 185 170 C186 181, 182 191, 174 198Z" />
              <path d="M204 170 C196 158, 200 145, 210 141 C212 152, 210 162, 204 170Z" />
              <path d="M222 128 C216 116, 221 105, 231 102 C231 112, 228 121, 222 128Z" />
              <path d="M236 216 C246 206, 257 206, 263 214 C254 219, 245 219, 236 216Z" />
              <path d="M256 274 C266 266, 274 270, 276 280 C268 282, 261 280, 256 274Z" />
              <path d="M158 308 C147 298, 148 286, 158 281 C162 291, 162 300, 158 308Z" />
            </g>
          </svg>
        </div>

        {/* Right Side: Just the Links */}
        <div className="order-3 flex flex-col items-center text-center lg:items-end lg:text-right">
          <nav aria-label="Footer navigation" className="flex flex-wrap justify-center gap-x-6 gap-y-2.5 lg:flex-col lg:items-end lg:gap-3">
            <button
              type="button"
              onClick={() => onNavigate('studio')}
              className="link-underline font-serif text-[clamp(1.3rem,1.9vw,1.65rem)] font-normal not-italic text-[#F2F1EE]/85 transition-colors hover:text-white cursor-pointer"
            >
              The Studio
            </button>
            <button
              type="button"
              onClick={() => onNavigate('projects')}
              className="link-underline font-serif text-[clamp(1.3rem,1.9vw,1.65rem)] font-normal not-italic text-[#F2F1EE]/85 transition-colors hover:text-white cursor-pointer"
            >
              Projects
            </button>
            <button
              type="button"
              onClick={() => onNavigate('contact')}
              className="link-underline font-serif text-[clamp(1.3rem,1.9vw,1.65rem)] font-normal not-italic text-[#F2F1EE]/85 transition-colors hover:text-white cursor-pointer"
            >
              Contact
            </button>
          </nav>

          <div className="mt-7 flex items-center justify-center gap-6 lg:mt-10 lg:flex-col lg:items-end lg:gap-2.5">
            <a
              href={INSTAGRAM}
              target="_blank"
              rel="noreferrer"
              className="link-underline font-sans text-[13px] tracking-wide text-[#F2F1EE]/70 transition-colors hover:text-white"
            >
              Instagram
            </a>
            <a
              href="https://www.linkedin.com/"
              target="_blank"
              rel="noreferrer"
              className="link-underline font-sans text-[13px] tracking-wide text-[#F2F1EE]/70 transition-colors hover:text-white"
            >
              LinkedIn
            </a>
            <a
              href="https://x.com/"
              target="_blank"
              rel="noreferrer"
              className="link-underline font-sans text-[13px] tracking-wide text-[#F2F1EE]/70 transition-colors hover:text-white"
            >
              X
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
