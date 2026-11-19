import { IMG } from './images'

export const NAV = [
  { label: 'Arrival', href: '#act-arrival' },
  { label: 'Selected Works', href: '#act-works' },
  { label: 'The Craft', href: '#act-craft' },
  { label: 'Contact', href: '#act-finale' },
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
    category: 'AI Voice Agent · Automation',
    year: '2026',
    kind: 'Concept',
    summary: 'A conversational voice receptionist that qualifies, schedules, and escalates with human warmth.',
    overview:
      'A studio exploration into how an AI voice agent can sound unhurried and natural: subtle turn-taking, bilingual fluency, and direct booking into live operational calendars.',
    scope: ['Conversation design', 'Voice persona', 'Workflow automation', 'Ops dashboard'],
    image: IMG.micDark,
    gallery: [IMG.micDark, IMG.micStudio, IMG.headphones],
  },
  {
    slug: 'aether-pavilion',
    name: 'Aether Pavilion',
    category: 'Architectural CGI · Spatial Film',
    year: '2026',
    kind: 'Studio project',
    summary: 'Brutalist limestone and diffused morning light choreographed for a private cultural foundation.',
    overview:
      'Full-CG architectural visualization and real-time lighting study exploring how shadow, mist, and stone texture guide quiet contemplation.',
    scope: ['Architectural CGI', 'Lighting direction', 'Film sequence', 'Soundscape'],
    image: IMG.architecture,
    gallery: [IMG.architecture, IMG.house, IMG.marble],
  },
  {
    slug: 'monolith-chrono',
    name: 'Monolith Chrono',
    category: 'Product CGI · Interactive WebGL',
    year: '2025',
    kind: 'Studio project',
    summary: 'Micro-mechanical horology rendered at 60fps in the browser with physical material shaders.',
    overview:
      'An interactive product flagship where visitors inspect brushed titanium, sapphire reflections, and real-time movement mechanics directly in WebGL.',
    scope: ['Product CGI', 'Three.js shaders', 'Art direction', 'Web flagship'],
    image: IMG.watch,
    gallery: [IMG.watch, IMG.sphere, IMG.render],
  },
  {
    slug: 'vesper-atelier',
    name: 'Vesper Atelier',
    category: 'Brand World · Digital Flagship',
    year: '2025',
    kind: 'Studio project',
    summary: 'An editorial identity and tactile digital flagship for a bespoke lighting house.',
    overview:
      'A cohesive visual world spanning kinetic typography, still-life photography direction, and a restraint-driven e-commerce experience.',
    scope: ['Brand identity', 'Still-life direction', 'Design system', 'Frontend engineering'],
    image: IMG.sageLamp,
    gallery: [IMG.sageLamp, IMG.swatches, IMG.chair],
  },
]

export const ARC_CARDS: { id: string; label: string }[] = [
  { id: IMG.catNoir, label: 'Brand motif' },
  { id: IMG.watch, label: 'Product CGI' },
  { id: IMG.architecture, label: 'Spatial study' },
  { id: IMG.shapes, label: 'Form study' },
  { id: IMG.swatches, label: 'Identity study' },
  { id: IMG.micDark, label: 'Voice agent' },
  { id: IMG.sageLamp, label: 'Light study' },
  { id: IMG.marble, label: 'Still life' },
]
