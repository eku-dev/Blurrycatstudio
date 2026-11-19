import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { useEffect, useState } from 'react'
import { lockScroll, scrollToTarget } from '../lib/smooth'
import type { RouteId } from './Pages'
import { BrandCrest, EASE } from './primitives'

interface CinemaHUDProps {
  route: RouteId
  onNavigate: (r: RouteId, hash?: string) => void
  menuOpen: boolean
  menuHover: boolean
  setMenuOpen: (v: boolean | ((prev: boolean) => boolean)) => void
  setMenuHover: (v: boolean) => void
}

type MenuItem = {
  id: string
  prefix?: string
  label: string
  suffix?: string
  route: RouteId
  hash?: string
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'studio-home',
    prefix: 'Innovative Crafts',
    label: 'Studio',
    route: 'home',
  },
  {
    id: 'about',
    prefix: 'The Ethos of',
    label: 'Blurrycat',
    suffix: 'AI',
    route: 'studio',
  },
  {
    id: 'build',
    prefix: 'Voice, CGI &',
    label: 'What we build',
    route: 'home',
    hash: '#act-build',
  },
  {
    id: 'process',
    prefix: 'Calm Process ·',
    label: 'How we build',
    route: 'home',
    hash: '#act-process',
  },
  {
    id: 'projects',
    prefix: 'Selected',
    label: 'Projects',
    suffix: '(5)',
    route: 'projects',
  },
]

export default function CinemaHUD({
  route,
  onNavigate,
  menuOpen,
  menuHover,
  setMenuOpen,
  setMenuHover,
}: CinemaHUDProps) {
  const { scrollYProgress } = useScroll()
  const [progress, setProgress] = useState(0)
  const [overDarkSection, setOverDarkSection] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  useMotionValueEvent(scrollYProgress, 'change', (v) => setProgress(v))

  useEffect(() => {
    const checkDark = () => {
      if (route === 'projects' || route === 'contact') {
        setOverDarkSection(true)
        return
      }
      if (route === 'studio') {
        setOverDarkSection(false)
        return
      }
      const blackout = document.getElementById('act-blackout')
      if (!blackout) {
        setOverDarkSection(false)
        return
      }
      const rect = blackout.getBoundingClientRect()
      setOverDarkSection(rect.top < window.innerHeight * 0.45)
    }
    checkDark()
    window.addEventListener('scroll', checkDark, { passive: true })
    window.addEventListener('resize', checkDark, { passive: true })
    return () => {
      window.removeEventListener('scroll', checkDark)
      window.removeEventListener('resize', checkDark)
    }
  }, [route])

  useEffect(() => {
    lockScroll(menuOpen)
    if (!menuOpen) setHoveredItem(null)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen, setMenuOpen])

  const goRoute = (target: RouteId, hash?: string) => {
    setMenuOpen(false)
    setMenuHover(false)
    setHoveredItem(null)
    if (target === route && hash) {
      setTimeout(() => scrollToTarget(hash), 340)
    } else {
      onNavigate(target, hash)
    }
  }

  const inkLight = menuOpen || menuHover || overDarkSection

  return (
    <>
      {/* ── Top Bar: ONLY ONE button — Menu + custom BC Crest in top-right corner ── */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-end px-6 py-6 sm:px-10 sm:py-7">
        <button
          type="button"
          onMouseEnter={() => setMenuHover(true)}
          onMouseLeave={() => setMenuHover(false)}
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          className={`pointer-events-auto inline-flex items-center gap-3 px-2 py-1 font-sans text-[12px] font-medium tracking-wide transition-colors duration-500 cursor-pointer ${
            inkLight ? 'text-[#ECEBE8]' : 'text-[#161618]'
          }`}
        >
          <span>{menuOpen ? 'Close' : 'Menu'}</span>
          <BrandCrest className="h-[20px] w-[17px]" />
        </button>
      </header>

      {/* ── Bottom-right Circular Scroll Progress Ring (home light sections only) ── */}
      <div
        className="pointer-events-none fixed bottom-6 right-6 z-40 hidden items-center transition-opacity duration-500 sm:flex sm:bottom-7 sm:right-10"
        style={{
          opacity: route === 'home' && !menuOpen && progress > 0.03 && !overDarkSection ? 1 : 0,
        }}
      >
        <svg viewBox="0 0 36 36" className="h-8 w-8 -rotate-90" aria-hidden>
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke="rgba(22,22,24,0.14)"
            strokeWidth="1.4"
          />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke="#161618"
            strokeWidth="1.4"
            strokeDasharray={94.25}
            strokeDashoffset={94.25 * (1 - Math.max(0.06, progress))}
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* ── Full-Screen Black Ink Menu Content with Hover Word Expansion ── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.14, ease: EASE }}
            className="fixed inset-0 z-[55] flex flex-col items-center justify-center px-6 text-center text-[#EAE9E6]"
          >
            <nav aria-label="Main navigation" className="flex flex-col items-center">
              <ul className="space-y-2 sm:space-y-2.5">
                {MENU_ITEMS.map((item, i) => {
                  const isActive = hoveredItem === item.id
                  const isDimmed = hoveredItem !== null && !isActive

                  return (
                    <motion.li
                      key={item.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.55, delay: 0.2 + i * 0.05, ease: EASE }}
                    >
                      <button
                        type="button"
                        onMouseEnter={() => setHoveredItem(item.id)}
                        onMouseLeave={() => setHoveredItem(null)}
                        onFocus={() => setHoveredItem(item.id)}
                        onBlur={() => setHoveredItem(null)}
                        onClick={() => goRoute(item.route, item.hash)}
                        className={`inline-flex flex-wrap items-baseline justify-center font-serif text-[clamp(1.65rem,5.5vw,3.25rem)] font-normal leading-[1.28] tracking-[-0.01em] transition-opacity duration-500 cursor-pointer ${
                          isDimmed ? 'opacity-30' : 'opacity-100'
                        }`}
                      >
                        {/* Prefix words expanding smoothly on hover */}
                        {item.prefix && (
                          <span
                            className="inline-block overflow-hidden align-baseline italic text-[#EAE9E6]/75 transition-all duration-700 ease-[var(--ease-expo)]"
                            style={{
                              maxWidth: isActive ? '420px' : '0px',
                              opacity: isActive ? 1 : 0,
                              marginRight: isActive ? '0.28em' : '0px',
                              filter: isActive ? 'blur(0px)' : 'blur(6px)',
                            }}
                          >
                            {item.prefix}
                          </span>
                        )}

                        <span className="text-[#F5F4F0] transition-colors duration-300">
                          {item.label}
                        </span>

                        {/* Suffix words expanding smoothly on hover */}
                        {item.suffix && (
                          <span
                            className="inline-block overflow-hidden align-baseline italic text-[#EAE9E6]/75 transition-all duration-700 ease-[var(--ease-expo)]"
                            style={{
                              maxWidth: isActive ? '260px' : '0px',
                              opacity: isActive ? 1 : 0,
                              marginLeft: isActive ? '0.28em' : '0px',
                              filter: isActive ? 'blur(0px)' : 'blur(6px)',
                            }}
                          >
                            {item.suffix}
                          </span>
                        )}
                      </button>
                    </motion.li>
                  )
                })}
              </ul>

              <motion.button
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, delay: 0.48, ease: EASE }}
                onClick={() => goRoute('contact')}
                className="link-underline mt-14 font-sans text-[13px] font-normal tracking-wide text-[#EAE9E6]/80 transition-colors hover:text-white cursor-pointer"
              >
                Contact us
              </motion.button>
            </nav>

            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
              onClick={() => goRoute('projects')}
              className="link-underline absolute bottom-7 left-6 inline-flex items-center gap-2 font-sans text-[12px] font-normal text-[#EAE9E6]/75 transition-colors hover:text-white sm:left-10 cursor-pointer"
            >
              <span>See all projects</span>
              <span aria-hidden>→</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
