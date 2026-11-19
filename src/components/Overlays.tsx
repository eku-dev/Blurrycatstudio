import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Pause, Play, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
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

const REEL = [
  { id: IMG.catNoir, t: 'Brand motif', s: 'Art direction' },
  { id: IMG.watch, t: 'Monolith Chrono', s: 'Product CGI' },
  { id: IMG.micDark, t: 'Front Desk', s: 'AI Voice Agent' },
  { id: IMG.architecture, t: 'Aether Pavilion', s: 'Spatial film' },
  { id: IMG.sageLamp, t: 'Vesper Atelier', s: 'Light study' },
]

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
    const id = setInterval(() => setI((v) => (v + 1) % REEL.length), 3400)
    return () => clearInterval(id)
  }, [open, playing])

  const frame = REEL[i]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Studio Showreel"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex flex-col justify-between bg-[#050507]/96 p-5 text-ivory backdrop-blur-2xl sm:p-10"
        >
          <div className="flex items-center justify-between">
            <span className="label text-accent">Blurrycat Showreel · 2026</span>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close showreel"
              className="grid h-11 w-11 place-items-center border border-white/20 text-ivory transition-colors hover:bg-ivory hover:text-[#070709]"
            >
              <X size={18} />
            </button>
          </div>

          <div className="relative mx-auto my-6 aspect-[16/9] w-full max-w-5xl overflow-hidden border border-white/10 bg-black">
            <AnimatePresence mode="wait">
              <motion.img
                key={frame.id}
                src={img(frame.id, 1400)}
                alt={frame.t}
                initial={{ opacity: 0, scale: 1.06 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: EASE }}
                className="h-full w-full object-cover"
              />
            </AnimatePresence>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
              <div>
                <p className="label text-accent">{frame.s}</p>
                <p className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{frame.t}</p>
              </div>
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? 'Pause' : 'Play'}
                className="grid h-11 w-11 place-items-center border border-white/25 bg-black/50 text-ivory backdrop-blur-md hover:border-accent hover:text-accent"
              >
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-5xl gap-2">
            {REEL.map((r, idx) => (
              <button
                key={r.t}
                type="button"
                onClick={() => setI(idx)}
                className={`h-1 flex-1 transition-colors ${idx === i ? 'bg-accent' : 'bg-white/15 hover:bg-white/35'}`}
                aria-label={`Jump to ${r.t}`}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function ContactDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useOverlay(open, onClose)
  const [sent, setSent] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Start a project"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[70] flex justify-end bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.65, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-lg flex-col justify-between overflow-y-auto border-l border-[#161618]/15 bg-[#D4D5D8] p-6 text-[#161618] sm:p-10"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="label text-[#161618]/55">Inquire</span>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="grid h-10 w-10 place-items-center border border-[#161618]/20 text-[#161618] hover:bg-[#161618] hover:text-[#F2F2F0] cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <h2 className="mt-8 font-serif text-4xl font-normal not-italic tracking-[-0.02em]">
                Tell us what you&apos;re <span className="italic">building.</span>
              </h2>

              {sent ? (
                <div className="mt-10 border border-[#161618]/20 bg-[#161618]/[0.04] p-6">
                  <p className="font-display text-lg font-semibold text-[#161618]">Received.</p>
                  <p className="mt-2 text-sm text-[#161618]/70">
                    Thank you. You can also reach us directly at{' '}
                    <a href={`mailto:${EMAIL}`} className="text-[#161618] underline">
                      {EMAIL}
                    </a>
                    .
                  </p>
                </div>
              ) : (
                <form onSubmit={submit} className="mt-8 space-y-5">
                  <div>
                    <label className="label block text-[#161618]/55">Name</label>
                    <input
                      required
                      type="text"
                      placeholder="Your name"
                      className="mt-2 h-11 w-full border border-[#161618]/20 bg-[#C9CACD]/60 px-3.5 text-sm text-[#161618] placeholder:text-[#161618]/40 outline-none focus:border-[#161618]"
                    />
                  </div>
                  <div>
                    <label className="label block text-[#161618]/55">Email</label>
                    <input
                      required
                      type="email"
                      placeholder="you@company.com"
                      className="mt-2 h-11 w-full border border-[#161618]/20 bg-[#C9CACD]/60 px-3.5 text-sm text-[#161618] placeholder:text-[#161618]/40 outline-none focus:border-[#161618]"
                    />
                  </div>
                  <div>
                    <label className="label block text-[#161618]/55">Project brief</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="3D flagship, AI voice system, or brand direction..."
                      className="mt-2 w-full border border-[#161618]/20 bg-[#C9CACD]/60 p-3.5 text-sm text-[#161618] placeholder:text-[#161618]/40 outline-none focus:border-[#161618]"
                    />
                  </div>
                  <Button type="submit" variant="ink" icon={<ArrowUpRight size={15} />}>
                    Send inquiry
                  </Button>
                </form>
              )}
            </div>

            <p className="mt-8 text-xs text-[#161618]/50">
              {EMAIL} · Lucknow, India
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function ProjectDrawer({
  project,
  onClose,
  onContact,
}: {
  project: Project | null
  onClose: () => void
  onContact: () => void
}) {
  const closeRef = useOverlay(!!project, onClose)

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={project.name}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[70] flex justify-end bg-black/75 backdrop-blur-sm"
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.65, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full max-w-2xl overflow-y-auto border-l border-[#161618]/15 bg-[#D4D5D8] p-6 text-[#161618] sm:p-10"
          >
            <div className="flex items-center justify-between">
              <span className="label text-[#161618]/55">{project.category}</span>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-10 w-10 place-items-center border border-[#161618]/20 text-[#161618] hover:bg-[#161618] hover:text-[#F2F2F0] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <h2 className="mt-6 font-serif text-4xl font-normal not-italic tracking-[-0.02em]">
              {project.name}
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-[#161618]/72">{project.overview}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              {project.scope.map((s) => (
                <span key={s} className="border border-[#161618]/20 px-3 py-1 text-xs text-[#161618]/80">
                  {s}
                </span>
              ))}
            </div>

            <div className="mt-8 space-y-4">
              {project.gallery.map((g, idx) => (
                <img
                  key={g}
                  src={img(g, 1200)}
                  alt={`${project.name} frame ${idx + 1}`}
                  className="w-full border border-[#161618]/15 object-cover"
                />
              ))}
            </div>

            <div className="mt-10 border-t border-[#161618]/15 pt-8">
              <Button onClick={onContact} variant="ink" icon={<ArrowUpRight size={15} />}>
                Discuss a similar project
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
