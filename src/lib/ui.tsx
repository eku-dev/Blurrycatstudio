import { createContext, useContext } from 'react'
import type { Project } from './data'

export type UI = {
  openContact: () => void
  openReel: () => void
  openProject: (p: Project) => void
}

export const UIContext = createContext<UI>({ openContact() {}, openReel() {}, openProject() {} })
export const useUI = () => useContext(UIContext)
