import { MotionConfig } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActArrival,
  ActBlackoutProjects,
  ActFinale,
  ActHowWeBuildRoad,
  ActWhatWeBuild,
} from './components/Acts'
import CinemaHUD from './components/CinemaHUD'
import IntroCurtain from './components/IntroCurtain'
import LaserCursor from './components/LaserCursor'
import { ContactDrawer, ProjectDrawer, Showreel } from './components/Overlays'
import { ContactPage, ProjectsPage, type RouteId, StudioPage } from './components/Pages'
import SplashCursor from './components/SplashCursor'
import { playClick, playPurr, setSoundEnabled } from './lib/audio'
import type { Project } from './lib/data'
import { scrollToTarget, startSmoothScroll } from './lib/smooth'
import { UIContext } from './lib/ui'
import { mountBilli } from './mascot'
import InkMenuCanvas from './three/InkMenuCanvas'
import WorldCanvas from './three/WorldCanvas'

export default function App() {
  const [route, setRoute] = useState<RouteId>('home')
  const [pageWash, setPageWash] = useState(false)
  const [contact, setContact] = useState(false)
  const [reel, setReel] = useState(false)
  const [project, setProject] = useState<Project | null>(null)
  const [soundOn, setSoundOn] = useState(false)
  const [laserOn, setLaserOn] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuHover, setMenuHover] = useState(false)
  const navTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const stopScroll = startSmoothScroll()
    mountBilli({ onPet: playPurr })
    return stopScroll
  }, [])

  // Keep Billi visible throughout Home (including resting on the footer logo), hidden on sub-pages
  useEffect(() => {
    const catCanvas = document.querySelector('canvas.billi') as HTMLCanvasElement | null
    if (!catCanvas) return
    catCanvas.style.visibility = route === 'home' ? 'visible' : 'hidden'
  }, [route])

  // Ink-on-cotton page transition whenever navigating between pages
  const navigate = useCallback((target: RouteId, hash?: string) => {
    playClick()
    if (navTimerRef.current) window.clearTimeout(navTimerRef.current)
    setPageWash(true)
    navTimerRef.current = window.setTimeout(() => {
      setRoute(target)
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
      window.setTimeout(() => {
        setPageWash(false)
        if (hash) {
          window.setTimeout(() => scrollToTarget(hash), 360)
        }
      }, 120)
    }, 460)
  }, [])

  const closeContact = useCallback(() => setContact(false), [])
  const closeReel = useCallback(() => setReel(false), [])
  const closeProject = useCallback(() => setProject(null), [])
  const handleReady = useCallback(() => setSceneReady(true), [])

  const toggleSound = useCallback(() => {
    setSoundOn((prev) => {
      const next = !prev
      setSoundEnabled(next)
      if (next) playClick()
      return next
    })
  }, [])

  const toggleLaser = useCallback(() => {
    setLaserOn((prev) => {
      playClick()
      return !prev
    })
  }, [])

  const ui = useMemo(
    () => ({
      openContact: () => navigate('contact'),
      openReel: () => {
        playClick()
        setReel(true)
      },
      openProject: (p: Project) => {
        playClick()
        setProject(p)
      },
      soundOn,
      toggleSound,
      laserOn,
      toggleLaser,
    }),
    [navigate, soundOn, toggleSound, laserOn, toggleLaser],
  )

  return (
    <MotionConfig reducedMotion="user">
      <UIContext.Provider value={ui}>
        <IntroCurtain />
        <LaserCursor />
        <SplashCursor
          rainbow={false}
          size={1}
          force={1}
          swirl={3}
          trail={1}
          clickSplash
          colorSpeed={1}
          intensity={1}
          momentum={1}
          shading={1}
          glow={0}
          quality="high"
          intro
          contained={false}
        />

        {/* Thick plain grey + hover breathing floral petals + idle random blooms */}
        <WorldCanvas onReady={handleReady} />

        {/* Cotton-ink shader: top-right Menu hover/open + page-shift wash + scroll blackout */}
        <InkMenuCanvas
          menuHover={menuHover}
          menuOpen={menuOpen}
          pageWash={pageWash}
          isHome={route === 'home'}
        />

        {/* Initial depth-of-field blur-to-focus & fine grain */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[5] transition-[backdrop-filter] duration-[1400ms] ease-out"
          style={{
            backdropFilter: sceneReady ? 'blur(0px)' : 'blur(10px)',
          }}
        />
        <div aria-hidden className="grain pointer-events-none fixed inset-0 z-[80] opacity-40" />

        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-ink focus:px-4 focus:py-2 focus:text-ivory"
        >
          Skip to content
        </a>

        <CinemaHUD
          route={route}
          onNavigate={navigate}
          menuOpen={menuOpen}
          menuHover={menuHover}
          setMenuOpen={setMenuOpen}
          setMenuHover={setMenuHover}
        />

        {route === 'home' && (
          <>
            <main id="main" className="relative z-20">
              <ActArrival />
              <ActWhatWeBuild onNavigate={navigate} />
              <ActHowWeBuildRoad />
              <ActBlackoutProjects onNavigate={navigate} />
            </main>
            <ActFinale onNavigate={navigate} />
          </>
        )}

        {route === 'projects' && <ProjectsPage onNavigate={navigate} />}
        {route === 'studio' && <StudioPage onNavigate={navigate} />}
        {route === 'contact' && <ContactPage onNavigate={navigate} />}

        <Showreel open={reel} onClose={closeReel} />
        <ContactDrawer open={contact} onClose={closeContact} />
        <ProjectDrawer project={project} onClose={closeProject} onContact={ui.openContact} />
      </UIContext.Provider>
    </MotionConfig>
  )
}
