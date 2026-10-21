import Lenis from 'lenis'
import Snap from 'lenis/snap'

let lenis: Lenis | null = null
let snap: Snap | null = null

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Section snapping only where every section genuinely fits one screen.
const snapMQ = () => window.matchMedia('(min-width: 1024px) and (min-height: 620px)')

const docTop = (el: Element) => el.getBoundingClientRect().top + window.scrollY

/** One snap point per full-screen section, one per slide of pinned sections, and the page end. */
function buildSnaps() {
  snap?.destroy()
  snap = null
  if (!lenis || !snapMQ().matches) return
  // Gentle settling: scrolling stays free, and only once the user pauses near a section
  // edge does the page glide the rest of the way. Never forces a jump mid-gesture.
  snap = new Snap(lenis, {
    type: 'proximity',
    distanceThreshold: '22%',
    debounce: 420,
    duration: 1.1,
    easing: (t) => 1 - Math.pow(1 - t, 4),
  })

  document.querySelectorAll<HTMLElement>('[data-snap]').forEach((el) => snap!.add(Math.round(docTop(el))))

  // Pinned sections: progress 0.05 → 0.95 maps across the slides (see Process).
  document.querySelectorAll<HTMLElement>('[data-snap-steps]').forEach((el) => {
    const n = Number(el.dataset.snapSteps)
    const range = el.offsetHeight - window.innerHeight
    const top = docTop(el)
    for (let i = 0; i < n; i++) snap!.add(Math.round(top + range * (0.05 + (0.9 * i) / (n - 1))))
  })

  if (document.querySelector('[data-snap-end]'))
    snap.add(Math.round(document.documentElement.scrollHeight - window.innerHeight))
}

export function startSmoothScroll() {
  if (reducedMotion()) return () => {}
  lenis = new Lenis({ lerp: 0.075, wheelMultiplier: 0.9, touchMultiplier: 1 })
  let raf = 0
  const loop = (t: number) => {
    lenis?.raf(t)
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  let timer = 0
  const rebuild = () => {
    clearTimeout(timer)
    timer = window.setTimeout(buildSnaps, 250)
  }
  rebuild()
  window.addEventListener('resize', rebuild)
  window.addEventListener('load', rebuild)
  document.fonts?.ready.then(rebuild)

  return () => {
    cancelAnimationFrame(raf)
    clearTimeout(timer)
    window.removeEventListener('resize', rebuild)
    window.removeEventListener('load', rebuild)
    snap?.destroy()
    snap = null
    lenis?.destroy()
    lenis = null
  }
}

export function scrollToTarget(target: string | number) {
  if (lenis) {
    lenis.scrollTo(target, { offset: 0, duration: 1.4 })
    return
  }
  if (typeof target === 'number') window.scrollTo({ top: target })
  else document.querySelector(target)?.scrollIntoView()
}

export const lockScroll = (lock: boolean) => {
  if (lock) lenis?.stop()
  else lenis?.start()
  document.documentElement.style.overflow = lock ? 'hidden' : ''
}
