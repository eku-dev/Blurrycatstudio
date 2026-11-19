import { createContext, useContext } from 'react'
import type { Project } from './data'

export type UI = {
  openContact: () => void
  openReel: () => void
  openProject: (p: Project) => void
  soundOn: boolean
  toggleSound: () => void
  laserOn: boolean
  toggleLaser: () => void
}

export const UIContext = createContext<UI>({
  openContact() {},
  openReel() {},
  openProject() {},
  soundOn: false,
  toggleSound() {},
  laserOn: false,
  toggleLaser() {},
})

export const useUI = () => useContext(UIContext)

