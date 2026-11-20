let ctx: AudioContext | null = null
let enabled = false
let ambientOsc: OscillatorNode | null = null
let ambientGain: GainNode | null = null

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return null
    ctx = new AudioCtx()
  }
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
  return ctx
}

export function setSoundEnabled(next: boolean) {
  enabled = next
  const c = ensureCtx()
  if (!c) return

  if (next) {
    if (!ambientOsc) {
      const osc = c.createOscillator()
      const filter = c.createBiquadFilter()
      const gain = c.createGain()

      osc.type = 'sine'
      osc.frequency.value = 55
      filter.type = 'lowpass'
      filter.frequency.value = 140
      gain.gain.setValueAtTime(0.0001, c.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.025, c.currentTime + 1.2)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(c.destination)
      osc.start()

      ambientOsc = osc
      ambientGain = gain
    } else if (ambientGain) {
      ambientGain.gain.cancelScheduledValues(c.currentTime)
      ambientGain.gain.exponentialRampToValueAtTime(0.025, c.currentTime + 0.6)
    }
  } else if (ambientGain) {
    ambientGain.gain.cancelScheduledValues(c.currentTime)
    ambientGain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.4)
  }
}

export function playClick() {
  if (!enabled) return
  const c = ensureCtx()
  if (!c) return
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(520, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(180, c.currentTime + 0.045)
  gain.gain.setValueAtTime(0.04, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.05)
  osc.connect(gain)
  gain.connect(c.destination)
  osc.start()
  osc.stop(c.currentTime + 0.055)
}

export function playPurr() {
  if (!enabled) return
  const c = ensureCtx()
  if (!c) return

  const now = c.currentTime
  const osc = c.createOscillator()
  const lfo = c.createOscillator()
  const lfoGain = c.createGain()
  const master = c.createGain()

  osc.type = 'sawtooth'
  osc.frequency.value = 48
  lfo.type = 'sine'
  lfo.frequency.value = 24
  lfoGain.gain.value = 0.03

  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 180

  master.gain.setValueAtTime(0.0001, now)
  master.gain.exponentialRampToValueAtTime(0.05, now + 0.15)
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.95)

  lfo.connect(lfoGain)
  lfoGain.connect(master.gain)
  osc.connect(filter)
  filter.connect(master)
  master.connect(c.destination)

  osc.start(now)
  lfo.start(now)
  osc.stop(now + 1.0)
  lfo.stop(now + 1.0)
}
