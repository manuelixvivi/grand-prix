'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { getActiveLightCount } from '@/lib/utils'
import type { RaceState } from '@/lib/supabase/types'

interface StartingLightsProps {
  state: RaceState
}

export function StartingLights({ state }: StartingLightsProps) {
  const activeCount = getActiveLightCount(state)
  const isLightsOut = state === 'LIGHTS_OUT'
  const showLights = ['READY', 'LIGHTS_1', 'LIGHTS_2', 'LIGHTS_3', 'LIGHTS_4', 'LIGHTS_5', 'LIGHTS_OUT'].includes(state)

  if (!showLights) return null

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Light pods */}
      <div className="flex gap-4 sm:gap-6">
        {[1, 2, 3, 4, 5].map((n) => {
          const isOn = !isLightsOut && activeCount >= n
          return (
            <motion.div
              key={n}
              className="flex flex-col gap-2"
            >
              {/* Light housing */}
              <div className="w-12 h-16 sm:w-16 sm:h-20 bg-[#1a1a1a] border border-[#333] rounded-sm flex flex-col items-center justify-center gap-2 relative">
                {/* Glow effect when on */}
                {isOn && (
                  <motion.div
                    className="absolute inset-0 rounded-sm"
                    animate={{
                      boxShadow: [
                        '0 0 20px rgba(225,6,0,0.4)',
                        '0 0 40px rgba(225,6,0,0.8)',
                        '0 0 20px rgba(225,6,0,0.4)',
                      ],
                    }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                )}
                {/* The bulb */}
                <motion.div
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2"
                  initial={false}
                  animate={
                    isLightsOut
                      ? { backgroundColor: '#111', borderColor: '#333', boxShadow: 'none', opacity: 0.3 }
                      : isOn
                      ? {
                          backgroundColor: '#e10600',
                          borderColor: '#ff4444',
                          boxShadow: '0 0 20px #e10600, 0 0 40px #e10600',
                          opacity: 1,
                        }
                      : {
                          backgroundColor: '#1a0000',
                          borderColor: '#3a1a1a',
                          boxShadow: 'none',
                          opacity: 1,
                        }
                  }
                  transition={
                    isLightsOut
                      ? { duration: 0.1 }
                      : isOn
                      ? { duration: 0.3, ease: 'easeOut' }
                      : { duration: 0.2 }
                  }
                />
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* State label */}
      <AnimatePresence mode="wait">
        {isLightsOut ? (
          <motion.div
            key="lights-out"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="text-center"
          >
            <p className="font-racing text-5xl sm:text-7xl font-bold text-white text-glow-red tracking-widest">
              LIGHTS OUT!
            </p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="font-racing text-xl text-[#e10600] tracking-widest mt-2"
            >
              🟢 VOTING IS NOW OPEN
            </motion.p>
          </motion.div>
        ) : state === 'READY' ? (
          <motion.p
            key="get-ready"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-racing text-2xl sm:text-3xl font-bold text-white/60 tracking-[0.3em]"
          >
            GET READY
          </motion.p>
        ) : (
          <motion.p
            key="lights-count"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-racing text-xl text-white/40 tracking-widest"
          >
            {activeCount} / 5 LIGHTS
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
