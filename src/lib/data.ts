import { IMG } from './images'

export const NAV = [
  { label: 'Work', href: '#work' },
  { label: 'Services', href: '#services' },
  { label: 'Studio', href: '#process' },
  { label: 'Journal', href: '#journal' },
]

export const EMAIL = 'hello@blurrycatstudio.com'

export type Project = {
  slug: string
  name: string
  category: string
  year: string
  kind: 'Studio project' | 'Concept'
  summary: string
  overview: string
  scope: string[]
  image: string
  gallery: string[]
}

export const PROJECTS: Project[] = [
  {
    slug: 'front-desk',
    name: 'Front Desk',
    category: 'AI voice agent · Automation',
    year: '2026',
    kind: 'Concept',
    summary: 'An exploration of a voice receptionist that books, qualifies and hands off — with the warmth of a person.',
    overview:
      'A studio concept exploring how a voice agent can sound unhurried and human: natural turn-taking, clear escalation to staff, and a booking flow that writes straight into existing calendars and CRMs.',
    scope: ['Conversation design', 'Voice persona', 'Workflow automation', 'Ops dashboard concept'],
    image: IMG.micDark,
    gallery: [IMG.micDark, IMG.micStudio, IMG.headphones],
  },
]

export const ARC_CARDS: { id: string; label: string }[] = [
  { id: IMG.catNoir, label: 'Brand motif' },
  { id: IMG.watch, label: 'Product CGI' },
  { id: IMG.architecture, label: 'Spatial study' },
  { id: IMG.shoeRed, label: 'Product render' },
  { id: IMG.swatches, label: 'Identity study' },
  { id: IMG.micDark, label: 'Voice agent' },
  { id: IMG.sageLamp, label: 'Light study' },
  { id: IMG.sunglasses, label: 'Still life' },
  { id: IMG.house, label: 'Architectural CGI' },
  { id: IMG.polaroid, label: 'Product render' },
  { id: IMG.chair, label: 'Object study' },
  { id: IMG.catTable, label: 'Brand motif' },
  { id: IMG.shoeWhite, label: 'Product CGI' },
  { id: IMG.towers, label: 'Spatial study' },
  { id: IMG.yellowChair, label: 'Interior visual' },
  { id: IMG.drafting, label: 'Process' },
]
