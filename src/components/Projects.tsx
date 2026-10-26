import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { useRef } from 'react'
import { PROJECTS, type Project } from '../lib/data'
import { img, srcSet } from '../lib/images'
import { useUI } from '../lib/ui'
import { Reveal } from './primitives'

function ProjectRow({ p, i }: { p: Project; i: number }) {
  const { openProject } = useUI()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['-8%', '8%'])
  const flip = i % 2 === 1

  return (
    <article ref={ref} className="grid gap-8 border-t border-ink/15 py-12 lg:grid-cols-12 lg:gap-10 lg:py-20">
      <div className={`flex flex-col lg:col-span-4 ${flip ? 'lg:order-2 lg:col-start-9' : ''}`}>
        <div className="flex items-center justify-between">
          <span className="label text-mute">0{i + 1} / 0{PROJECTS.length}</span>
          <span
            className={`label px-2 py-1 text-[10px] ${p.kind === 'Concept' ? 'border border-slate/40 text-slate' : 'bg-ink text-ivory'}`}
          >
            {p.kind}
          </span>
        </div>
        <h3 className="mt-8 font-display text-[clamp(2.6rem,5vw,4.8rem)] font-semibold leading-[0.9] tracking-[-0.055em]">{p.name}</h3>
        <p className="label mt-4 text-mute">
          {p.category} — {p.year}
        </p>
        <p className="mt-8 max-w-[38ch] text-[16px] leading-relaxed text-ink/75">{p.summary}</p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {p.scope.map((s) => (
            <li key={s} className="border border-ink/15 px-2.5 py-1 text-[12px] text-ink/70">
              {s}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => openProject(p)}
          className="group mt-auto inline-flex items-center gap-3 self-start pt-10 font-display text-[15px] font-semibold"
        >
          <span className="link-underline">View project</span>
          <span className="grid h-10 w-10 place-items-center border border-ink/20 transition-all duration-500 group-hover:rotate-45 group-hover:border-accent group-hover:bg-accent">
            <ArrowUpRight size={16} />
          </span>
        </button>
      </div>

      <button
        type="button"
        onClick={() => openProject(p)}
        aria-label={`Open ${p.name}`}
        className={`group relative block overflow-hidden bg-stone lg:col-span-8 ${flip ? 'lg:order-1' : ''}`}
      >
        <span className="relative block aspect-[4/3] overflow-hidden lg:aspect-[16/10]">
          <motion.img
            style={{ y }}
            src={img(p.image, 1400)}
            srcSet={srcSet(p.image, [700, 1200, 1800])}
            sizes="(min-width: 1024px) 60vw, 100vw"
            alt={`${p.name} — ${p.category}`}
            loading="lazy"
            decoding="async"
            className="absolute inset-[-9%] h-[118%] w-[118%] max-w-none object-cover transition-transform duration-[1.6s] ease-[var(--ease-expo)] group-hover:scale-[1.035]"
          />
          <span className="absolute inset-0 bg-ink/0 transition-colors duration-700 group-hover:bg-ink/10" />
          <span className="label absolute bottom-4 left-4 translate-y-3 bg-ivory px-3 py-2 text-[10px] text-ink opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
            View case — {p.name}
          </span>
        </span>
      </button>
    </article>
  )
}

export default function Projects() {
  return (
    <section id="projects" className="bg-ivory py-24 lg:py-32">
      <div className="shell">
        <Reveal className="mb-14 flex flex-wrap items-end justify-between gap-6 lg:mb-20">
          <h2 className="font-display text-[clamp(2rem,4vw,3.6rem)] font-semibold leading-none tracking-[-0.05em]">
            Projects <span className="serif text-mute">in focus</span>
          </h2>
          <p className="max-w-[44ch] text-[13px] leading-relaxed text-mute">
            “Concept” marks a self-initiated studio exploration. Imagery shown is representative.
          </p>
        </Reveal>
        {PROJECTS.map((p, i) => (
          <ProjectRow key={p.slug} p={p} i={i} />
        ))}
      </div>
    </section>
  )
}
