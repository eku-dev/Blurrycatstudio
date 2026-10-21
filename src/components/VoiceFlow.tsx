import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import {
  siAirtable,
  siCalendly,
  siClaude,
  siDeepgram,
  siElevenlabs,
  siGooglecalendar,
  siGooglesheets,
  siHubspot,
  siLivekit,
  siMake,
  siN8n,
  siWhatsapp,
  siZapier,
} from 'simple-icons'

type Brand = { name: string; path?: string; mono?: string }

// Official marks from Simple Icons. Vapi and OpenAI aren't in that set, so they use a
// neutral monogram tile — drop in their official SVGs from each brand's press kit.
const B = {
  vapi: { name: 'Vapi', mono: 'V' },
  openai: { name: 'OpenAI', mono: 'AI' },
  n8n: { name: 'n8n', path: siN8n.path },
  eleven: { name: 'ElevenLabs', path: siElevenlabs.path },
  claude: { name: 'Claude', path: siClaude.path },
  deepgram: { name: 'Deepgram', path: siDeepgram.path },
  livekit: { name: 'LiveKit', path: siLivekit.path },
  hubspot: { name: 'HubSpot', path: siHubspot.path },
  gcal: { name: 'Google Calendar', path: siGooglecalendar.path },
  whatsapp: { name: 'WhatsApp', path: siWhatsapp.path },
  make: { name: 'Make', path: siMake.path },
  zapier: { name: 'Zapier', path: siZapier.path },
  airtable: { name: 'Airtable', path: siAirtable.path },
  sheets: { name: 'Google Sheets', path: siGooglesheets.path },
  calendly: { name: 'Calendly', path: siCalendly.path },
} satisfies Record<string, Brand>

/** Brand mark drawn into a 24×24 box at (x,y), for use inside an SVG. */
function Mark({ b, x, y, size = 24, color = 'currentColor' }: { b: Brand; x: number; y: number; size?: number; color?: string }) {
  if (b.path)
    return (
      <svg x={x} y={y} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <path d={b.path} fill={color} />
      </svg>
    )
  return (
    <g aria-hidden>
      <rect x={x} y={y} width={size} height={size} rx={size * 0.22} fill="none" stroke={color} strokeWidth="1.4" />
      <text x={x + size / 2} y={y + size / 2 + 4} textAnchor="middle" fontSize={b.mono!.length > 1 ? 9 : 12} fontWeight="700" fontFamily="Manrope" fill={color}>
        {b.mono}
      </text>
    </g>
  )
}

/* ─────────── n8n-style workflow graph ─────────── */

type Node = { id: string; x: number; y: number; w?: number; b: Brand; label: string; sub?: string; trigger?: boolean; accent?: boolean }

const NODES: Node[] = [
  { id: 'call', x: 18, y: 92, b: B.vapi, label: 'Incoming call', sub: 'Vapi', trigger: true },
  { id: 'hook', x: 132, y: 92, b: B.n8n, label: 'Webhook', sub: 'n8n' },
  { id: 'agent', x: 246, y: 84, w: 132, b: B.openai, label: 'AI Agent', sub: 'Tools agent', accent: true },
  { id: 'if', x: 430, y: 92, b: B.n8n, label: 'Qualified?', sub: 'If' },
  { id: 'crm', x: 548, y: 30, b: B.hubspot, label: 'Create deal', sub: 'HubSpot' },
  { id: 'cal', x: 548, y: 154, b: B.gcal, label: 'Book meeting', sub: 'Calendar' },
]
// sub-nodes hanging under the agent (n8n draws these as round, dashed connections)
const SUBS: { id: string; x: number; b: Brand; label: string }[] = [
  { id: 'model', x: 236, b: B.claude, label: 'Model' },
  { id: 'voice', x: 296, b: B.eleven, label: 'Voice' },
  { id: 'stt', x: 356, b: B.deepgram, label: 'Transcribe' },
]

const S = 56 // node size
const nodeW = (n: Node) => n.w ?? S
const outP = (n: Node) => [n.x + nodeW(n), n.y + S / 2] as const
const inP = (n: Node) => [n.x, n.y + S / 2] as const
const byId = (id: string) => NODES.find((n) => n.id === id)!
const curve = ([x1, y1]: readonly [number, number], [x2, y2]: readonly [number, number]) => {
  const dx = Math.max(30, (x2 - x1) * 0.5)
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`
}
const EDGES = [
  ['call', 'hook'],
  ['hook', 'agent'],
  ['agent', 'if'],
  ['if', 'crm'],
  ['if', 'cal'],
].map(([a, b]) => ({ id: `${a}-${b}`, d: curve(outP(byId(a)), inP(byId(b))) }))

/* Execution timeline — each element appears at a step, like watching an n8n run. */
const AT: Record<string, number> = { call: 1, hook: 3, agent: 5, if: 11, crm: 13, cal: 15 }
const EDGE_AT: Record<string, number> = { 'call-hook': 2, 'hook-agent': 4, 'agent-if': 10, 'if-crm': 12, 'if-cal': 14 }
const SUB_AT: Record<string, number> = { model: 6, voice: 7, stt: 8 }
const THINK = 9
const DONE = 16
const DURATIONS = [600, 600, 450, 600, 450, 650, 320, 320, 320, 2000, 450, 650, 450, 650, 450, 650, 700, 2800]
const STATUS: [number, string][] = [
  [1, 'Trigger fired · incoming call'],
  [3, 'Webhook received'],
  [5, 'AI Agent · loading tools'],
  [THINK, 'AI Agent · speaking with caller'],
  [10, 'Qualifying lead'],
  [12, 'Creating deal in HubSpot'],
  [14, 'Booking meeting in Calendar'],
  [DONE, 'Execution succeeded'],
]
const statusFor = (step: number) => [...STATUS].reverse().find(([s]) => step >= s)?.[1] ?? 'Waiting for call…'
const activeNode = (step: number) => {
  if (step >= DONE) return null
  let id: string | null = null
  for (const [k, v] of Object.entries(AT)) if (step >= v && (id === null || v > AT[id])) id = k
  return id
}

/** Drives the looping execution. Pauses when `play` is false; shows the finished state for reduced motion. */
export function useFlowTimeline(play: boolean) {
  const reduce = useReducedMotion()
  const [step, setStep] = useState(0)
  const [loop, setLoop] = useState(0)
  useEffect(() => {
    if (reduce || !play) return
    const t = setTimeout(() => {
      const n = (step + 1) % DURATIONS.length
      if (n === 0) setLoop((l) => l + 1)
      setStep(n)
    }, DURATIONS[step])
    return () => clearTimeout(t)
  }, [step, play, reduce])
  return { step: reduce ? DURATIONS.length - 1 : step, loop }
}

const pop = { transformBox: 'fill-box', transformOrigin: 'center' } as const

function Check({ x, y }: { x: number; y: number }) {
  return (
    <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }} style={pop}>
      <circle cx={x} cy={y} r="7" fill="#9CA697" />
      <path d={`M${x - 3},${y} l2,2.2 l4,-4.4`} fill="none" stroke="#171816" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </motion.g>
  )
}

export function FlowStatus({ step }: { step: number }) {
  const done = step >= DONE
  return (
    <span className="label flex min-w-0 items-center gap-2 text-[10px] text-fog">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 motion-reduce:hidden ${done ? 'bg-sage' : 'animate-ping bg-coral'}`} />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${done ? 'bg-sage' : 'bg-coral'}`} />
      </span>
      <AnimatePresence mode="wait">
        <motion.span key={statusFor(step)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }} className="truncate">
          {statusFor(step)}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export function VoiceFlow({ step, loop, className = '' }: { step: number; loop: number; className?: string }) {
  const agent = byId('agent')
  const subY = 210
  const active = activeNode(step)
  const thinking = step === THINK

  return (
    <svg
      viewBox="0 0 622 262"
      className={className}
      role="img"
      aria-label="Voice agent workflow: an incoming Vapi call triggers an n8n webhook, an AI agent using Claude, ElevenLabs and Deepgram handles the conversation, then qualified leads go to HubSpot and meetings to Google Calendar."
    >
      <defs>
        <pattern id="dots" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.9" fill="#F5F3EE" opacity="0.09" />
        </pattern>
      </defs>
      <rect width="622" height="262" fill="url(#dots)" />

      {/* connections draw in as the execution reaches them */}
      {EDGES.map((e) => {
        const on = step >= EDGE_AT[e.id]
        return (
          <g key={e.id}>
            <motion.path
              d={e.d}
              fill="none"
              stroke={on && step >= DONE ? '#9CA697' : '#F5F3EE'}
              strokeOpacity={on ? 0.5 : 0}
              strokeWidth="1.5"
              initial={false}
              animate={{ pathLength: on ? 1 : 0 }}
              transition={{ duration: on ? 0.45 : 0.3, ease: 'easeInOut' }}
            />
            {on && (
              <circle key={`${e.id}-${loop}`} r="3.2" fill="#E5533D">
                <animateMotion dur="1.4s" repeatCount="indefinite" path={e.d} />
              </circle>
            )}
          </g>
        )
      })}
      <motion.text initial={false} animate={{ opacity: step >= AT.crm ? 1 : 0 }} x="500" y="76" fontSize="8.5" fontFamily="Inter" fill="#A9A69E" letterSpacing="1">TRUE</motion.text>
      <motion.text initial={false} animate={{ opacity: step >= AT.cal ? 1 : 0 }} x="500" y="196" fontSize="8.5" fontFamily="Inter" fill="#A9A69E" letterSpacing="1">FALSE</motion.text>

      {/* sub-node connections — dashes flow while the agent is talking */}
      {SUBS.map((s) => (
        <motion.path
          key={s.id}
          d={`M${s.x + 20},${subY} C${s.x + 20},${subY - 30} ${agent.x + agent.w! / 2},${agent.y + S + 30} ${agent.x + agent.w! / 2},${agent.y + S}`}
          fill="none"
          stroke={thinking ? '#E5533D' : '#F5F3EE'}
          strokeDasharray="3 4"
          initial={false}
          animate={{ opacity: step >= SUB_AT[s.id] ? (thinking ? 0.9 : 0.3) : 0, strokeDashoffset: thinking ? [0, -28] : 0 }}
          transition={{ opacity: { duration: 0.3 }, strokeDashoffset: { duration: 0.9, repeat: thinking ? Infinity : 0, ease: 'linear' } }}
        />
      ))}

      {/* nodes */}
      {NODES.map((n) => {
        const w = nodeW(n)
        const shown = step >= AT[n.id]
        const isActive = active === n.id
        const done = shown && (step >= DONE || (active !== null && AT[n.id] < AT[active]))
        const stroke = isActive ? '#E5533D' : done ? '#9CA697' : '#F5F3EE'
        const strokeOpacity = isActive || done ? 1 : 0.18
        return (
          <motion.g
            key={n.id}
            initial={false}
            animate={{ opacity: shown ? 1 : 0, scale: shown ? 1 : 0.6 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            style={pop}
          >
            {isActive && (
              <motion.rect
                x={n.x - 5}
                y={n.y - 5}
                width={w + 10}
                height={S + 10}
                rx={13}
                fill="none"
                stroke="#E5533D"
                animate={{ opacity: [0.7, 0, 0.7] }}
                transition={{ duration: thinking && n.accent ? 0.8 : 1.4, repeat: Infinity }}
              />
            )}
            {n.trigger ? (
              <path
                d={`M${n.x},${n.y} h${S} v${S} h-${S} a${S / 2},${S / 2} 0 0 1 0,-${S}`}
                fill="#2B2C28"
                stroke={stroke}
                strokeOpacity={strokeOpacity}
                strokeWidth={isActive || done ? 1.5 : 1}
              />
            ) : (
              <rect
                x={n.x}
                y={n.y}
                width={w}
                height={S}
                rx={9}
                fill={n.accent ? '#E5533D' : '#2B2C28'}
                stroke={n.accent ? (done ? '#9CA697' : '#E5533D') : stroke}
                strokeOpacity={n.accent ? 1 : strokeOpacity}
                strokeWidth={isActive || done ? 1.5 : 1}
              />
            )}
            {n.accent ? (
              <>
                <Mark b={n.b} x={n.x + 14} y={n.y + 16} color="#171816" />
                <text x={n.x + 48} y={n.y + 26} fontSize="12" fontWeight="700" fontFamily="Manrope" fill="#171816">
                  AI Agent
                </text>
                {thinking ? (
                  <g>
                    {[0, 1, 2, 3, 4, 5, 6].map((k) => (
                      <motion.rect
                        key={k}
                        x={n.x + 48 + k * 6}
                        width="3"
                        rx="1.5"
                        fill="#171816"
                        initial={{ height: 3, y: n.y + 36 }}
                        animate={{ height: [3, 10 + (k % 3) * 3, 3], y: [n.y + 37, n.y + 31 - (k % 3) * 1.5, n.y + 37] }}
                        transition={{ duration: 0.7, repeat: Infinity, delay: k * 0.08 }}
                      />
                    ))}
                  </g>
                ) : (
                  <text x={n.x + 48} y={n.y + 40} fontSize="9" fontFamily="Inter" fill="#171816" opacity="0.7">
                    {step >= DONE ? 'Call handled' : 'Tools agent'}
                  </text>
                )}
              </>
            ) : (
              <Mark b={n.b} x={n.x + (w - 24) / 2} y={n.y + 16} color="#F5F3EE" />
            )}
            {n.id !== 'call' && <rect x={n.x - 3} y={n.y + S / 2 - 5} width="6" height="10" rx="1" fill="#A9A69E" />}
            {!['crm', 'cal'].includes(n.id) && <circle cx={n.x + w} cy={n.y + S / 2} r="4" fill="#A9A69E" />}
            {!n.accent && (
              <>
                <text x={n.x + w / 2} y={n.y + S + 15} textAnchor="middle" fontSize="10" fontWeight="600" fontFamily="Manrope" fill="#F5F3EE">
                  {n.label}
                </text>
                <text x={n.x + w / 2} y={n.y + S + 27} textAnchor="middle" fontSize="8.5" fontFamily="Inter" fill="#A9A69E">
                  {n.sub}
                </text>
              </>
            )}
            {done && <Check x={n.x + w - 2} y={n.y + 2} />}
          </motion.g>
        )
      })}

      {/* sub-nodes drop in under the agent */}
      {SUBS.map((s) => {
        const shown = step >= SUB_AT[s.id]
        return (
          <motion.g key={s.id} initial={false} animate={{ opacity: shown ? 1 : 0, y: shown ? 0 : -14 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }}>
            <circle cx={s.x + 20} cy={subY + 18} r="18" fill="#2B2C28" stroke={thinking ? '#E5533D' : '#F5F3EE'} strokeOpacity={thinking ? 0.9 : 0.18} />
            <Mark b={s.b} x={s.x + 11} y={subY + 9} size={18} color="#F5F3EE" />
            <text x={s.x + 20} y={subY + 50} textAnchor="middle" fontSize="8.5" fontFamily="Inter" fill="#A9A69E">
              {s.label}
            </text>
          </motion.g>
        )
      })}
    </svg>
  )
}

/* ─────────── tool marquee ─────────── */

const STACK: Brand[] = [B.eleven, B.vapi, B.n8n, B.openai, B.claude, B.deepgram, B.livekit, B.hubspot, B.gcal, B.whatsapp, B.make, B.zapier, B.airtable, B.sheets, B.calendly]

function Chip({ b }: { b: Brand }) {
  return (
    <span className="flex shrink-0 items-center gap-6 pr-6">
      <span className="flex items-center gap-2.5 whitespace-nowrap font-display text-[19px] font-semibold tracking-[-0.03em] text-ivory">
        {b.path ? (
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
            <path d={b.path} fill="currentColor" />
          </svg>
        ) : (
          <span className="grid h-[18px] min-w-[18px] place-items-center rounded-[4px] border border-current px-0.5 text-[9px] font-bold">{b.mono}</span>
        )}
        {b.name}
      </span>
      <span className="inline-block h-2 w-2 rotate-45 bg-coral" aria-hidden />
    </span>
  )
}

export function StackMarquee() {
  return (
    <div className="relative overflow-hidden border-t border-ivory/10 py-4 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      <p className="sr-only">Tools we build with: {STACK.map((b) => b.name).join(', ')}.</p>
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]" aria-hidden>
        {[...STACK, ...STACK].map((b, i) => (
          <Chip key={i} b={b} />
        ))}
      </div>
    </div>
  )
}
