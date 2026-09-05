'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { useRaceSession, useActiveEvent } from '@/hooks/useRaceSession'
import { useLapResults, useCurrentLap } from '@/hooks/useLapResults'
import { StartingLights } from '@/components/StartingLights'
import { ConnectionStatus, FlagBanner, LapCounter } from '@/components/RaceUI'
import { formatTime, getPointsForPosition } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { RaceSession } from '@/lib/supabase/types'

// ---- Result Reveal Component ----
function ResultReveal({ lapId, categoryId, state }: { lapId: string | null; categoryId: string; state: string }) {
  const { results } = useLapResults(lapId)
  const [revealed, setRevealed] = useState<number[]>([])

  useEffect(() => {
    if (state !== 'RESULT_REVEAL' && state !== 'LAP_COMPLETE' && state !== 'FINAL_RESULTS' && state !== 'PODIUM') {
      setRevealed([])
      return
    }
    if (results.length === 0) return
    // Reveal from last (lowest) to first place
    const sorted = [...results].sort((a, b) => b.position - a.position)
    sorted.forEach((r, i) => {
      setTimeout(() => {
        setRevealed((prev) => [...prev, r.position])
      }, i * 1200)
    })
  }, [state, results])

  if (!['RESULT_REVEAL', 'LAP_COMPLETE', 'FINAL_RESULTS', 'PODIUM', 'CHEQUERED_FLAG'].includes(state)) return null
  if (results.length === 0) return (
    <div className="flex items-center justify-center h-40">
      <p className="font-racing text-white/40 tracking-widest animate-pulse">CALCULATING RESULTS...</p>
    </div>
  )

  const sorted = [...results].sort((a, b) => a.position - b.position)

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="flex flex-col gap-3">
        <AnimatePresence>
          {sorted.map((r) => {
            const isRevealed = revealed.includes(r.position)
            const isP1 = r.position === 1
            return (
              <motion.div
                key={r.candidate_id}
                initial={{ opacity: 0, x: -60, scale: 0.95 }}
                animate={isRevealed ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: -60, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className={`flex items-center gap-4 p-4 border ${
                  isP1
                    ? 'bg-[#ffd700]/10 border-[#ffd700]/50'
                    : r.position === 2
                    ? 'bg-[#c0c0c0]/10 border-[#c0c0c0]/30'
                    : r.position === 3
                    ? 'bg-[#cd7f32]/10 border-[#cd7f32]/30'
                    : 'bg-[#111] border-[#222]'
                }`}
              >
                <span
                  className={`font-racing text-3xl font-bold w-12 text-center ${
                    isP1 ? 'text-[#ffd700]' : r.position === 2 ? 'text-[#c0c0c0]' : r.position === 3 ? 'text-[#cd7f32]' : 'text-white/50'
                  }`}
                >
                  P{r.position}
                </span>
                <div className="flex-1">
                  <p className={`font-racing text-2xl font-bold tracking-wider ${isP1 ? 'text-[#ffd700]' : 'text-white'}`}>
                    {r.candidate?.name ?? '—'}
                  </p>
                  <p className="font-racing text-xs text-white/40 tracking-widest">
                    {r.vote_count} VOTE{r.vote_count !== 1 ? 'S' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-racing text-xl font-bold ${isP1 ? 'text-[#ffd700]' : 'text-white/70'}`}>
                    +{r.points_earned} PTS
                  </p>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ---- Podium Component ----
function PodiumCeremony({ lapId, categoryName }: { lapId: string | null; categoryName: string }) {
  const { results } = useLapResults(lapId)
  const confettiRef = useRef(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (results.length === 0) return
    setStep(0)
    const t1 = setTimeout(() => setStep(1), 1500)
    const t2 = setTimeout(() => setStep(2), 4000)
    const t3 = setTimeout(() => {
      setStep(3)
      if (!confettiRef.current) {
        confettiRef.current = true
        confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } })
        setTimeout(() => confetti({ particleCount: 100, spread: 70, origin: { y: 0.5, x: 0.3 } }), 800)
        setTimeout(() => confetti({ particleCount: 100, spread: 70, origin: { y: 0.5, x: 0.7 } }), 1200)
      }
    }, 7000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [results])

  if (results.length === 0) return null

  const p1 = results.find((r) => r.position === 1)
  const p2 = results.find((r) => r.position === 2)
  const p3 = results.find((r) => r.position === 3)

  const podiumItems = [
    { result: p2, label: 'SECOND PLACE', emoji: '🥈', height: 'h-40', color: 'text-[#c0c0c0]', step: 1 },
    { result: p1, label: 'FIRST PLACE', emoji: '🥇', height: 'h-56', color: 'text-[#ffd700]', step: 3 },
    { result: p3, label: 'THIRD PLACE', emoji: '🥉', height: 'h-28', color: 'text-[#cd7f32]', step: 2 },
  ]

  return (
    <div className="w-full max-w-2xl mx-auto">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-racing text-2xl text-center text-white/60 tracking-[0.3em] mb-12"
      >
        {categoryName.toUpperCase()} — PODIUM
      </motion.h2>

      <div className="flex items-end justify-center gap-4">
        {podiumItems.map(({ result, label, emoji, height, color, step: revealStep }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 40 }}
            animate={step >= revealStep ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="flex flex-col items-center"
          >
            <div className="text-center mb-3">
              <p className="text-3xl mb-1">{emoji}</p>
              <p className={`font-racing text-2xl font-bold ${color} tracking-wider`}>
                {result?.candidate?.name ?? '—'}
              </p>
              <p className="font-racing text-xs text-white/40 tracking-widest mt-1">{label}</p>
              <p className={`font-racing text-lg font-bold ${color} mt-1`}>
                {result?.points_earned ?? 0} PTS
              </p>
            </div>
            <div className={`${height} w-28 flex items-center justify-center font-racing text-4xl font-bold text-white/10 bg-[#1a1a1a] border-t-2 ${color.replace('text-', 'border-')}`}>
              {revealStep === 3 ? 'P1' : revealStep === 1 ? 'P2' : 'P3'}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ---- Championship Standings ----
function ChampionshipStandings({ eventId }: { eventId: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const [standings, setStandings] = useState<Array<{ name: string; total: number; rank: number }>>([])

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('championship_points')
        .select('total_points, candidate:event_category_candidates(name)')
        .eq('event_id', eventId)
        .order('total_points', { ascending: false })
      if (!data) return
      const grouped: Record<string, number> = {}
      data.forEach((row: { total_points: number; candidate: { name: string } | null }) => {
        const name = (row.candidate as { name: string } | null)?.name ?? 'Unknown'
        grouped[name] = (grouped[name] ?? 0) + row.total_points
      })
      const sorted = Object.entries(grouped)
        .sort((a, b) => b[1] - a[1])
        .map(([name, total], i) => ({ name, total, rank: i + 1 }))
      setStandings(sorted)
    }
    fetch()
  }, [eventId, supabase])

  if (standings.length === 0) return null

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h3 className="font-racing text-lg text-white/40 tracking-[0.3em] mb-4 text-center">CHAMPIONSHIP STANDINGS</h3>
      <div className="flex flex-col gap-2">
        {standings.slice(0, 10).map((s) => (
          <div key={s.name} className="flex items-center gap-3 p-3 bg-[#111] border border-[#222]">
            <span className="font-racing text-lg font-bold text-white/40 w-6 text-center">P{s.rank}</span>
            <span className="font-racing text-lg font-bold text-white flex-1 tracking-wide">{s.name}</span>
            <span className="font-racing text-lg font-bold text-[#ffd700]">{s.total} PTS</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Voting Open Timer ----
function VotingTimer({ votingEndsAt, duration }: { votingEndsAt: string | null; duration: number }) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  useEffect(() => {
    if (!votingEndsAt) return
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(votingEndsAt).getTime() - Date.now()) / 1000))
      setTimeLeft(diff)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [votingEndsAt])

  if (timeLeft === null) return null
  return (
    <div className="text-center">
      <motion.div
        key={timeLeft}
        initial={{ scale: 1.1, opacity: 0.8 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`font-racing text-8xl font-bold tabular-nums ${timeLeft <= 10 ? 'text-[#e10600] animate-pulse' : 'text-white'}`}
      >
        {formatTime(timeLeft)}
      </motion.div>
      <div className="w-full max-w-xs mx-auto bg-[#1a1a1a] h-2 mt-4 rounded overflow-hidden">
        <motion.div
          className="h-full bg-[#e10600]"
          animate={{ width: `${(timeLeft / duration) * 100}%` }}
          transition={{ duration: 1 }}
        />
      </div>
    </div>
  )
}

// ---- MAIN PODIUM PAGE ----
export default function PodiumPage() {
  const { event, isLoading: eventLoading } = useActiveEvent()
  const categoryId = event?.current_category_id ?? null
  const { session, category, isConnected, isLoading: sessionLoading } = useRaceSession(categoryId)
  const lap = useCurrentLap(categoryId, session?.current_lap_number ?? 1)

  if (eventLoading || sessionLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="font-racing text-white/30 text-2xl tracking-widest animate-pulse">CONNECTING TO RACE CONTROL...</div>
      </div>
    )
  }

  const state = session?.state ?? 'IDLE'
  const flag = session?.flag ?? 'NONE'

  return (
    <main className="min-h-screen bg-black relative overflow-hidden flex flex-col">
      {/* Top accent */}
      <div className="h-1 bg-[#e10600]" />

      {/* Header */}
      <div className="bg-[#0a0a0a] border-b border-[#1a1a1a] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-racing text-xs text-white/30 tracking-[0.4em]">CLASS GRAND PRIX 2026</span>
          {category && (
            <span className="font-racing text-sm font-bold text-white tracking-wider">{category.name.toUpperCase()}</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {session && category && (
            <LapCounter current={session.current_lap_number} total={category.lap_count} />
          )}
          <ConnectionStatus isConnected={isConnected} />
        </div>
      </div>

      {/* Flag banner */}
      <AnimatePresence>
        {flag !== 'NONE' && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
          >
            <FlagBanner flag={flag} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-8 bg-grid">
        <AnimatePresence mode="wait">
          {/* IDLE */}
          {state === 'IDLE' && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
              <p className="font-racing text-8xl font-bold text-white/10 tracking-widest">CLASS</p>
              <p className="font-racing text-8xl font-bold text-[#e10600]/20 tracking-widest">GRAND PRIX</p>
              <p className="font-racing text-2xl text-white/30 tracking-[0.5em] mt-6">STANDING BY</p>
            </motion.div>
          )}

          {/* READY + LIGHTS sequence */}
          {['READY','LIGHTS_1','LIGHTS_2','LIGHTS_3','LIGHTS_4','LIGHTS_5','LIGHTS_OUT'].includes(state) && (
            <motion.div key="lights" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center flex flex-col items-center gap-8">
              {session && (
                <p className="font-racing text-2xl text-white/50 tracking-[0.3em]">
                  LAP {session.current_lap_number} — {session.current_lap_number === (category?.lap_count ?? 3) ? 'FINAL LAP' : `LAP ${session.current_lap_number}`}
                </p>
              )}
              <StartingLights state={state as RaceSession['state']} />
            </motion.div>
          )}

          {/* VOTING */}
          {state === 'VOTING' && (
            <motion.div key="voting" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center w-full max-w-lg">
              <p className="font-racing text-2xl text-[#00d26a] tracking-[0.4em] mb-4">🟢 VOTING OPEN</p>
              <VotingTimer
                votingEndsAt={lap?.voting_ends_at ?? null}
                duration={category?.voting_duration_seconds ?? 30}
              />
              <p className="font-racing text-lg text-white/40 tracking-widest mt-6">SCAN QR CODE TO VOTE ON YOUR PHONE</p>
            </motion.div>
          )}

          {/* VOTING CLOSED */}
          {state === 'VOTING_CLOSED' && (
            <motion.div key="closed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
              <motion.p
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="font-racing text-6xl font-bold text-[#e10600] tracking-widest"
              >
                VOTING CLOSED
              </motion.p>
              <p className="font-racing text-xl text-white/40 tracking-widest mt-4">Calculating results...</p>
            </motion.div>
          )}

          {/* RESULT REVEAL / LAP COMPLETE */}
          {['RESULT_REVEAL', 'LAP_COMPLETE'].includes(state) && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex flex-col items-center gap-6">
              <p className="font-racing text-3xl font-bold text-white tracking-widest">
                LAP {session?.current_lap_number} RESULTS
              </p>
              <ResultReveal lapId={lap?.id ?? null} categoryId={categoryId!} state={state} />
            </motion.div>
          )}

          {/* FINAL RESULTS */}
          {state === 'FINAL_RESULTS' && (
            <motion.div key="final" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex flex-col items-center gap-6">
              <p className="font-racing text-3xl font-bold text-[#ffd700] tracking-widest text-glow-yellow">FINAL CLASSIFICATION</p>
              <ResultReveal lapId={lap?.id ?? null} categoryId={categoryId!} state={state} />
            </motion.div>
          )}

          {/* PODIUM */}
          {(state === 'PODIUM' || state === 'CHEQUERED_FLAG') && (
            <motion.div key="podium" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex flex-col items-center gap-8">
              {state === 'CHEQUERED_FLAG' && (
                <motion.p
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="font-racing text-4xl font-bold text-white tracking-[0.3em] text-center"
                >
                  🏁 RACE COMPLETE
                </motion.p>
              )}
              <PodiumCeremony lapId={lap?.id ?? null} categoryName={category?.name ?? ''} />
              {event && <ChampionshipStandings eventId={event.id} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom bar */}
      <div className="h-1 bg-[#e10600]" />
    </main>
  )
}
