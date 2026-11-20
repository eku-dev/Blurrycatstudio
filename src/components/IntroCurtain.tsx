import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { reducedMotion } from '../lib/smooth'
import { BrandCrest, EASE } from './primitives'

export default function IntroCurtain({ onComplete }: { onComplete?: () => void }) {
  const [visible, setVisible] = useState(() => !reducedMotion())

  useEffect(() => {
    if (!visible) {
      onComplete?.()
      return
    }
    const timer = window.setTimeout(() => {
      setVisible(false)
      onComplete?.()
    }, 1250)
    return () => window.clearTimeout(timer)
  }, [visible, onComplete])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          aria-hidden
          onClick={() => {
            setVisible(false)
            onComplete?.()
          }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.7, ease: EASE } }}
          className="fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center gap-6 bg-[#C9CACD] text-[#161618]"
        >
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE }}
            className="flex flex-col items-center gap-4"
          >
            <BrandCrest className="h-9 w-8 text-[#161618]" />
            <span className="font-serif text-[11px] uppercase tracking-[0.28em] text-[#161618]/80">
              BLURRYCAT STUDIOS AI
            </span>
          </motion.div>

          <div className="h-[1px] w-28 overflow-hidden bg-[#161618]/15">
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '0%' }}
              transition={{ duration: 1.0, ease: EASE }}
              className="h-full w-full bg-[#161618]"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
