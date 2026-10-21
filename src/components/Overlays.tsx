import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Pause, Play, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { EMAIL, type Project } from '../lib/data'
import { IMG, img } from '../lib/images'
import { lockScroll } from '../lib/smooth'
import { Button, EASE } from './primitives'

function useOverlay(open: boolean, onClose: () => void) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    lockScroll(true)
    const prev = document.activeElement as HTMLElement | null
    setTimeout(() => closeRef.current?.focus(), 50)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => {
      lockScroll(false)
      window.removeEventListener('keydown', esc)
      prev?.focus?.()
    }
  }, [open, onClose])
  return closeRef
}

function CloseBtn({ onClick, innerRef, dark }: { onClick: () => void; innerRef: React.Ref<HTMLButtonElement>; dark?: boolean }) {
  return (
    <button
      ref={innerRef}
      type="button"
      onClick={onClick}
      aria-label="Close"
      className={`grid h-11 w-11 place-items-center border transition-colors ${dark ? 'border-ivory/25 text-ivory hover:bg-ivory hover:text-ink' : 'border-ink/20 hover:bg-ink hover:text-ivory'}`}
    >
      <X size={18} />
    </button>
  )
}

/* ───────────── Showreel ───────────── */

const REEL = [
  { id: IMG.catNoir, t: 'Brand motif', s: 'Art direction' },
  { id: IMG.watch, t: 'Product CGI', s: 'Product visualisation' },
  { id: IMG.swatches, t: 'Identity study', s: 'Digital design' },
  { id: IMG.micDark, t: 'Front Desk', s: 'Voice agent concept' },
  { id: IMG.architecture, t: 'Spatial study', s: 'Architectural visual' },
  { id: IMG.render, t: 'Product render', s: '3D & CGI' },
]
const DUR = 3600

export function Showreel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useOverlay(open, onClose)
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(true)

  useEffect(() => {
    if (!open) {
      setI(0)
      setPlaying(true)
      return
    }
    if (!playing) return
    const t = setTimeout(() => setI((x) => (x + 1) % REEL.length), DUR)
    return () => clearTimeout(t)
  }, [open, i, playing])

  const f = REEL[i]
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Studio showreel"
          initial={{ clipPath: 'inset(50% 0 50% 0)' }}
          animate={{ clipPath: 'inset(0% 0 0% 0)' }}
          exit={{ clipPath: 'inset(50% 0 50% 0)' }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[80] overflow-hidden bg-ink text-ivory"
        >
          <AnimatePresence mode="sync">
            <motion.img
              key={f.id}
              src={img(f.id, 1800)}
              alt=""
              initial={{ opacity: 0, scale: 1.12 }}
              animate={{ opacity: 0.85, scale: 1.0 }}
              exit={{ opacity: 0 }}
              transition={{ opacity: { duration: 0.9 }, scale: { duration: DUR / 1000 + 1, ease: 'linear' } }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-ink/50" />

          <div className="shell relative flex h-full flex-col py-6">
            <div className="flex items-center justify-between">
              <span className="label text-ivory/80">Studio reel — 2026 preview cut</span>
              <CloseBtn onClick={onClose} innerRef={closeRef} dark />
            </div>

            <div className="mt-auto">
              <AnimatePresence mode="wait">
                <motion.div key={f.t + i} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.7, ease: EASE }}>
                  <p className="label text-coral">
                    {String(i + 1).padStart(2, '0')} — {f.s}
                  </p>
                  <p className="mt-3 font-display text-[clamp(3rem,10vw,10rem)] font-semibold leading-[0.85] tracking-[-0.06em]">{f.t}</p>
                </motion.div>
              </AnimatePresence>

              <div className="mt-10 flex items-center gap-5">
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  aria-label={playing ? 'Pause' : 'Play'}
                  className="grid h-11 w-11 shrink-0 place-items-center bg-coral text-ink"
                >
                  {playing ? <Pause size={16} className="fill-current" /> : <Play size={16} className="fill-current" />}
                </button>
                <div className="grid flex-1 grid-cols-6 gap-1.5">
                  {REEL.map((r, k) => (
                    <button key={r.id} type="button" onClick={() => setI(k)} aria-label={`Go to ${r.t}`} className="h-6">
                      <span className="block h-[2px] overflow-hidden bg-ivory/20">
                        <motion.span
                          key={`${i}-${playing}`}
                          className="block h-full bg-ivory"
                          initial={{ width: k < i ? '100%' : '0%' }}
                          animate={{ width: k < i ? '100%' : k === i && playing ? '100%' : k === i ? '50%' : '0%' }}
                          transition={{ duration: k === i && playing ? DUR / 1000 : 0, ease: 'linear' }}
                        />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ───────────── Side drawer (contact + project) ───────────── */

function Drawer({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: (close: ReactNode) => ReactNode }) {
  const closeRef = useOverlay(open, onClose)
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            className="fixed inset-0 z-[70] bg-ink/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
            data-lenis-prevent
            className="fixed inset-y-0 right-0 z-[75] w-full max-w-[640px] overflow-y-auto bg-ivory text-ink"
          >
            {children(<CloseBtn onClick={onClose} innerRef={closeRef} />)}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

const TYPES = ['AI Systems', '3D & CGI', 'Voice Agents', 'Digital Design', 'Not sure yet']
const BUDGETS = ['Under ₹5L', '₹5L – ₹15L', '₹15L – ₹40L', '₹40L +', 'Let’s discuss']

export function ContactDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [types, setTypes] = useState<string[]>([])
  const [budget, setBudget] = useState(BUDGETS[4])
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (open) setSent(false)
  }, [open])

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const body = [
      `Name: ${fd.get('name')}`,
      `Email: ${fd.get('email')}`,
      `Company: ${fd.get('company') || '—'}`,
      `Interested in: ${types.join(', ') || '—'}`,
      `Budget: ${budget}`,
      '',
      String(fd.get('message')),
    ].join('\n')
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(`New project — ${fd.get('name')}`)}&body=${encodeURIComponent(body)}`
    setSent(true)
  }

  const field = 'w-full border-b border-ink/25 bg-transparent py-3 text-[16px] outline-none transition-colors placeholder:text-ink/35 focus:border-ink'

  return (
    <Drawer open={open} onClose={onClose} label="Start a project">
      {(close) => (
        <div className="flex min-h-full flex-col p-6 sm:p-10">
          <div className="flex items-center justify-between">
            <span className="label text-mute">New project</span>
            {close}
          </div>
          <h2 className="mt-10 font-display text-[clamp(2.2rem,5vw,3.4rem)] font-semibold leading-[0.95] tracking-[-0.05em]">
            Tell us about <span className="serif">your idea.</span>
          </h2>
          <p className="mt-4 max-w-[44ch] text-[15px] text-ink/70">We reply to every message within two working days.</p>

          {sent ? (
            <div className="mt-12 border-t border-ink/15 pt-8">
              <p className="font-display text-2xl font-semibold tracking-[-0.03em]">Your email app should now be open.</p>
              <p className="mt-3 text-[15px] text-ink/70">
                If nothing happened, write to us directly at{' '}
                <a className="link-underline text-ink" href={`mailto:${EMAIL}`}>
                  {EMAIL}
                </a>
                .
              </p>
              <Button className="mt-8" onClick={onClose}>
                Back to site
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-10 space-y-8">
              <fieldset>
                <legend className="label mb-4 text-mute">I’m interested in</legend>
                <div className="flex flex-wrap gap-2">
                  {TYPES.map((t) => {
                    const on = types.includes(t)
                    return (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setTypes((x) => (on ? x.filter((y) => y !== t) : [...x, t]))}
                        className={`border px-3.5 py-2 text-[14px] transition-colors ${on ? 'border-ink bg-ink text-ivory' : 'border-ink/20 hover:border-ink'}`}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
              <div className="grid gap-6 sm:grid-cols-2">
                <label className="block">
                  <span className="label text-mute">Name *</span>
                  <input required name="name" autoComplete="name" className={field} placeholder="Your name" />
                </label>
                <label className="block">
                  <span className="label text-mute">Email *</span>
                  <input required type="email" name="email" autoComplete="email" className={field} placeholder="you@company.com" />
                </label>
              </div>
              <label className="block">
                <span className="label text-mute">Company</span>
                <input name="company" autoComplete="organization" className={field} placeholder="Optional" />
              </label>
              <fieldset>
                <legend className="label mb-4 text-mute">Budget</legend>
                <div className="flex flex-wrap gap-2">
                  {BUDGETS.map((b) => (
                    <button
                      key={b}
                      type="button"
                      aria-pressed={budget === b}
                      onClick={() => setBudget(b)}
                      className={`border px-3.5 py-2 text-[14px] transition-colors ${budget === b ? 'border-coral bg-coral text-ink' : 'border-ink/20 hover:border-ink'}`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="block">
                <span className="label text-mute">Project details *</span>
                <textarea required name="message" rows={4} className={`${field} resize-none`} placeholder="What are you making, and by when?" />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <p className="text-[13px] text-mute">Opens your email app with this message.</p>
                <button
                  type="submit"
                  className="group relative inline-flex h-14 items-center gap-3 overflow-hidden bg-ink px-8 font-display text-[15px] font-semibold text-ivory transition-colors duration-500 hover:text-ink"
                >
                  <span className="absolute inset-0 origin-bottom scale-y-0 bg-coral transition-transform duration-500 group-hover:scale-y-100" />
                  <span className="relative">Send enquiry</span>
                  <ArrowUpRight size={16} className="relative" />
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </Drawer>
  )
}

export function ProjectDrawer({ project, onClose, onContact }: { project: Project | null; onClose: () => void; onContact: () => void }) {
  return (
    <Drawer open={!!project} onClose={onClose} label={project ? `${project.name} project` : 'Project'}>
      {(close) =>
        project && (
          <div className="pb-10">
            <div className="flex items-center justify-between p-6 sm:px-10">
              <span className="label text-mute">
                {project.kind} — {project.year}
              </span>
              {close}
            </div>
            <div className="px-6 sm:px-10">
              <h2 className="font-display text-[clamp(2.8rem,7vw,4.6rem)] font-semibold leading-[0.9] tracking-[-0.055em]">{project.name}</h2>
              <p className="label mt-4 text-mute">{project.category}</p>
            </div>
            <img src={img(project.gallery[0], 1300)} alt={`${project.name} key visual`} className="mt-8 aspect-[16/10] w-full object-cover" />
            <div className="grid gap-10 px-6 pt-10 sm:grid-cols-[1fr_180px] sm:px-10">
              <p className="text-[17px] leading-relaxed text-ink/80">{project.overview}</p>
              <div>
                <p className="label mb-3 text-mute">Scope</p>
                <ul className="space-y-1.5 text-[14px]">
                  {project.scope.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-px bg-ink/10">
              {project.gallery.slice(1).map((g) => (
                <img key={g} src={img(g, 700)} alt="" loading="lazy" className="aspect-square w-full object-cover" />
              ))}
            </div>
            <div className="mx-6 mt-10 border-t border-ink/15 pt-8 sm:mx-10">
              <p className="text-[14px] text-mute">Full case study coming soon. Imagery shown is representative.</p>
              <Button className="mt-6" onClick={onContact} icon={<ArrowUpRight size={16} />}>
                Start a similar project
              </Button>
            </div>
          </div>
        )
      }
    </Drawer>
  )
}
