import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { EMAIL, NAV } from '../lib/data'
import { lockScroll, scrollToTarget } from '../lib/smooth'
import { useUI } from '../lib/ui'
import { Button, EASE, Logo, Magnetic } from './primitives'

export default function Nav() {
  const { openContact } = useUI()
  const { scrollY } = useScroll()
  const [hidden, setHidden] = useState(false)
  const [solid, setSolid] = useState(false)
  const [open, setOpen] = useState(false)

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0
    setSolid(y > 40)
    setHidden(y > 400 && y > prev && !open)
  })

  useEffect(() => {
    lockScroll(open)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open])

  // Over the hero photograph (top of page) and in the open menu, the bar reads in ivory.
  const light = open || !solid

  const go = (href: string) => {
    setOpen(false)
    setTimeout(() => scrollToTarget(href), open ? 350 : 0)
  }

  return (
    <>
      <motion.header
        initial={{ y: -90 }}
        animate={{ y: hidden ? -90 : 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        className={`fixed inset-x-0 top-0 ${open ? 'z-[60]' : 'z-50'} transition-[background-color,border-color] duration-500 ${
          solid && !open ? 'border-b border-ink/10 bg-ivory' : 'border-b border-transparent'
        }`}
      >
        <nav className="shell flex h-[72px] items-center justify-between" aria-label="Primary">
          <a href="#top" onClick={(e) => (e.preventDefault(), go('#top'))} aria-label="Blurrycat Studio — home" className="relative z-[60]">
            <Logo tone={light ? 'ivory' : 'ink'} />
          </a>

          <ul className="hidden items-center gap-10 md:flex">
            {NAV.map((n) => (
              <li key={n.href}>
                <a
                  href={n.href}
                  onClick={(e) => (e.preventDefault(), go(n.href))}
                  className={`link-underline font-display text-[14px] font-medium transition-colors ${light ? 'text-ivory/85 hover:text-ivory' : 'text-ink/80 hover:text-ink'}`}
                >
                  {n.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <Magnetic>
                <Button onClick={openContact} variant={light ? 'ivory' : 'ink'} icon={<ArrowUpRight size={16} />} className="h-11">
                  Start a project
                </Button>
              </Magnetic>
            </div>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              className={`relative z-[60] grid h-11 w-11 place-items-center border md:hidden ${light ? 'border-ivory/30 text-ivory' : 'border-ink/20 text-ink'}`}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.75, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-[55] flex flex-col bg-ink px-5 pb-8 pt-28 text-ivory sm:px-8 md:hidden"
          >
            <ul className="flex flex-col">
              {NAV.map((n, i) => (
                <motion.li
                  key={n.href}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.06, duration: 0.8, ease: EASE }}
                  className="border-b border-ivory/10"
                >
                  <a
                    href={n.href}
                    onClick={(e) => (e.preventDefault(), go(n.href))}
                    className="flex items-baseline justify-between py-4 font-display text-[44px] font-semibold tracking-[-0.04em]"
                  >
                    {n.label}
                    <span className="label text-fog">0{i + 1}</span>
                  </a>
                </motion.li>
              ))}
            </ul>
            <div className="mt-auto space-y-6">
              <Button variant="accent" onClick={() => (setOpen(false), openContact())} icon={<ArrowUpRight size={16} />} className="w-full justify-between">
                Start a project
              </Button>
              <div className="flex justify-between text-sm text-fog">
                <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
                <span>Lucknow, IN</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
