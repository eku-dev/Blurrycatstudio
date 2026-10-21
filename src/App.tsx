import { MotionConfig } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FinalCTA, Footer } from './components/Closing'
import Hero from './components/Hero'
import Nav from './components/Nav'
import { ContactDrawer, ProjectDrawer, Showreel } from './components/Overlays'
// import Projects from './components/Projects'
import Services from './components/Services'
import { Journal, Process } from './components/Studio'
import WorkArc from './components/WorkArc'
import type { Project } from './lib/data'
import { startSmoothScroll } from './lib/smooth'
import { UIContext } from './lib/ui'

export default function App() {
  const [contact, setContact] = useState(false)
  const [reel, setReel] = useState(false)
  const [project, setProject] = useState<Project | null>(null)

  useEffect(() => startSmoothScroll(), [])

  const closeContact = useCallback(() => setContact(false), [])
  const closeReel = useCallback(() => setReel(false), [])
  const closeProject = useCallback(() => setProject(null), [])

  const ui = useMemo(
    () => ({
      openContact: () => {
        setProject(null)
        setContact(true)
      },
      openReel: () => setReel(true),
      openProject: (p: Project) => setProject(p),
    }),
    [],
  )

  return (
    <MotionConfig reducedMotion="user">
      <UIContext.Provider value={ui}>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-ink focus:px-4 focus:py-2 focus:text-ivory">
          Skip to content
        </a>
        <Nav />
        <main id="main">
          <Hero />
          <Process />
          <WorkArc />
          <Services />
          {/* Hidden for now — re-enable when real case studies and studio copy are ready.
          <Projects />
          <Philosophy />
          */}
          <Journal />
          <FinalCTA />
        </main>
        <Footer />
        <Showreel open={reel} onClose={closeReel} />
        <ContactDrawer open={contact} onClose={closeContact} />
        <ProjectDrawer project={project} onClose={closeProject} onContact={ui.openContact} />
      </UIContext.Provider>
    </MotionConfig>
  )
}
