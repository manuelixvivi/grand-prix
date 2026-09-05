'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { getVoterId, formatTime } from '@/lib/utils'
import { useRaceSession, useActiveEvent } from '@/hooks/useRaceSession'
import { useCurrentLap } from '@/hooks/useLapResults'
import { ConnectionStatus, LapCounter, RaceStatusBadge } from '@/components/RaceUI'
import { StartingLights } from '@/components/StartingLights'
import { useGridPresence } from '@/hooks/useGridPresence'
import type { RaceSession } from '@/lib/supabase/types'
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react'

export default function VotePage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const voterId = typeof window !== 'undefined' ? getVoterId() : ''

  const { event, isLoading: eventLoading } = useActiveEvent()
  const categoryId = event?.current_category_id ?? null
  const { session, category, isConnected, isLoading: sessionLoading } = useRaceSession(categoryId)
  const lap = useCurrentLap(categoryId, session?.current_lap_number ?? 1)
  const { onlineCount, isEligible } = useGridPresence(categoryId, voterId, session?.started_at, session?.state)

  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null)
  const [hasVoted, setHasVoted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  // Check if already voted for this lap
  useEffect(() => {
    if (!lap?.id || !voterId) return
    async function checkVote() {
      const { data } = await supabase
        .from('votes')
        .select('id')
        .eq('lap_id', lap!.id)
        .eq('voter_id', voterId)
        .maybeSingle()
      if (data) setHasVoted(true)
      else setHasVoted(false)
    }
    checkVote()
  }, [lap?.id, voterId, supabase, lap])

  // Reset voted status when lap changes
  useEffect(() => {
    setHasVoted(false)
    setSelectedCandidate(null)
    setError(null)
  }, [session?.current_lap_number])

  // Countdown timer (server-authoritative via voting_ends_at)
  useEffect(() => {
    if (!lap?.voting_ends_at || session?.state !== 'VOTING') {
      setTimeLeft(null)
      return
    }
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(lap.voting_ends_at!).getTime() - Date.now()) / 1000))
      setTimeLeft(diff)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [lap?.voting_ends_at, session?.state])

  const handleVote = useCallback(async () => {
    if (!isEligible) {
      setError('Mode Penonton: Anda bergabung setelah balapan dimulai.')
      return
    }
    if (!selectedCandidate || !lap?.id || !categoryId || !voterId) return
    setIsSubmitting(true)
    setError(null)
    try {
      const { error: voteError } = await supabase.from('votes').insert({
        lap_id: lap.id,
        event_category_id: categoryId,
        candidate_id: selectedCandidate,
        voter_id: voterId,
      })
      if (voteError) {
        if (voteError.code === '23505') {
          setError('You have already voted for this lap.')
          setHasVoted(true)
        } else {
          setError('Failed to submit vote. Please try again.')
        }
      } else {
        setHasVoted(true)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedCandidate, lap?.id, categoryId, voterId, isEligible, supabase])

  const isVotingOpen = session?.state === 'VOTING'
  const isLoading = eventLoading || sessionLoading

  // --- Render States ---

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#e10600] animate-spin" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-4xl">🏁</div>
        <h1 className="font-racing text-2xl font-bold text-white tracking-widest">NO ACTIVE EVENT</h1>
        <p className="text-white/40 font-racing tracking-wider">Waiting for race to start...</p>
        <div className="mt-8 w-2 h-2 rounded-full bg-[#e10600] animate-ping" />
      </div>
    )
  }

  if (!session || !category) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-4xl">🚦</div>
        <h1 className="font-racing text-2xl font-bold text-white tracking-widest">RACE NOT STARTED</h1>
        <p className="text-white/40 font-racing tracking-wider">Stand by for Race Control...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-black relative">
      {/* Top bar */}
      <div className="h-1 bg-[#e10600]" />
      <div className="bg-[#111] border-b border-[#222] px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-racing text-xs text-white/40 tracking-widest">ASPIRE GRAND PRIX — CAWU 3 : 2026</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="font-racing text-sm font-bold text-white tracking-wider">{category.name}</p>
            {isEligible ? (
              <span className="font-racing text-[10px] px-1.5 py-0.5 bg-green-950/60 border border-green-800 text-green-400 rounded">
                GRID ON
              </span>
            ) : (
              <span className="font-racing text-[10px] px-1.5 py-0.5 bg-yellow-950/60 border border-yellow-800 text-yellow-400 rounded">
                SPECTATOR
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-green-400 font-racing text-xs bg-green-950/40 px-2 py-1 border border-green-800/50 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span>👥 {onlineCount}</span>
          </div>
          <LapCounter current={session.current_lap_number} total={category.lap_count} />
          <ConnectionStatus isConnected={isConnected} />
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Race state badge */}
        <div className="flex justify-center mb-6">
          <RaceStatusBadge state={session.state} />
        </div>

        {/* Not voting state messages */}
        <AnimatePresence mode="wait">
          {!isVotingOpen && !hasVoted && (
            <motion.div
              key={session.state}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-12"
            >
              {['LIGHTS_1','LIGHTS_2','LIGHTS_3','LIGHTS_4','LIGHTS_5','LIGHTS_OUT','READY'].includes(session.state) && (
                <div className="flex flex-col items-center gap-6 py-6">
                  <p className="font-racing text-xs text-white/40 tracking-[0.3em]">STARTING SEQUENCE</p>
                  <StartingLights state={session.state as RaceSession['state']} />
                </div>
              )}
              {session.state === 'VOTING_CLOSED' && (
                <>
                  <div className="text-5xl mb-4">🔴</div>
                  <p className="font-racing text-xl font-bold text-[#e10600] tracking-widest">VOTING CLOSED</p>
                  <p className="font-racing text-sm text-white/40 tracking-wider mt-2">Results incoming...</p>
                </>
              )}
              {['RESULT_REVEAL', 'LAP_COMPLETE', 'FINAL_RESULTS', 'PODIUM', 'CHEQUERED_FLAG'].includes(session.state) && (
                <>
                  <div className="text-5xl mb-4">📊</div>
                  <p className="font-racing text-xl font-bold text-white tracking-widest">CHECK THE BIG SCREEN</p>
                  <p className="font-racing text-sm text-white/40 tracking-wider mt-2">Results are being revealed</p>
                </>
              )}
              {session.state === 'IDLE' && (
                <>
                  <div className="text-5xl mb-4">⏳</div>
                  <p className="font-racing text-xl font-bold text-white/50 tracking-widest">WAITING</p>
                  <p className="font-racing text-sm text-white/30 tracking-wider mt-2">Stand by...</p>
                </>
              )}
            </motion.div>
          )}

          {/* Voted confirmation */}
          {hasVoted && (
            <motion.div
              key="voted"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
              </motion.div>
              <p className="font-racing text-2xl font-bold text-green-400 tracking-widest">VOTE LOCKED</p>
              <p className="font-racing text-sm text-white/50 tracking-wider mt-2">Suara kamu berhasil dicatat.</p>
              {session.current_lap_number < category.lap_count ? (
                <p className="font-racing text-xs text-white/30 tracking-wider mt-4">
                  Kamu bisa voting lagi pada LAP {session.current_lap_number + 1}
                </p>
              ) : (
                <p className="font-racing text-xs text-yellow-400/70 tracking-wider mt-4">
                  🏁 Lap terakhir selesai! Hasil podium segera diumumkan di layar utama.
                </p>
              )}
            </motion.div>
          )}

          {/* Voting form */}
          {isVotingOpen && !hasVoted && (
            <motion.div
              key="voting"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {/* Timer */}
              {timeLeft !== null && (
                <div className="text-center mb-6">
                  <motion.div
                    key={timeLeft}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`font-racing text-5xl font-bold tabular-nums ${
                      timeLeft <= 10 ? 'text-[#e10600] animate-pulse' : 'text-white'
                    }`}
                  >
                    {formatTime(timeLeft)}
                  </motion.div>
                  <div className="w-full bg-[#1a1a1a] h-1 mt-3 rounded overflow-hidden">
                    <div
                      className="h-full bg-[#e10600] transition-all duration-1000"
                      style={{ width: `${timeLeft !== null ? (timeLeft / (category.voting_duration_seconds || 30)) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Spectator notice */}
              {!isEligible && (
                <div className="mb-5 p-4 bg-yellow-950/40 border border-yellow-600/60 rounded text-yellow-200 text-left">
                  <div className="flex items-center gap-2 font-racing font-bold text-sm text-yellow-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>MODE PENONTON (SPECTATOR)</span>
                  </div>
                  <p className="font-racing text-xs text-yellow-200/80 mt-1.5 leading-relaxed">
                    Sesi balapan sudah dimulai sebelum Anda bergabung. Hanya siswa yang berada di grid sebelum start yang berhak memilih.
                  </p>
                </div>
              )}

              {/* Category */}
              <div className="mb-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="font-racing text-xs text-[#e10600] font-bold tracking-[0.2em] border border-[#e10600]/40 px-3 py-1 uppercase bg-[#e10600]/10">
                    LAP {session.current_lap_number} / {category.lap_count}
                  </span>
                  {session.current_lap_number === category.lap_count && (
                    <span className="font-racing text-xs text-yellow-400 font-bold tracking-[0.2em] border border-yellow-500/40 px-2.5 py-1 uppercase bg-yellow-500/10">
                      🏁 FINAL LAP
                    </span>
                  )}
                </div>
                <p className="font-racing text-xs text-white/40 tracking-[0.3em] uppercase">CURRENT CATEGORY</p>
                <h2 className="font-racing text-xl font-bold text-white tracking-wider mt-1">{category.name.toUpperCase()}</h2>
              </div>

              {/* Candidates */}
              <div className="flex flex-col gap-3 mb-6">
                {category.candidates.map((candidate, i) => (
                  <motion.button
                    key={candidate.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    disabled={!isEligible}
                    onClick={() => isEligible && setSelectedCandidate(candidate.id)}
                    className={`w-full text-left p-4 border transition-all duration-200 flex items-center gap-4 ${
                      !isEligible
                        ? 'bg-[#0f0f0f] border-[#222] text-white/30 cursor-not-allowed opacity-50'
                        : selectedCandidate === candidate.id
                        ? 'bg-[#e10600]/20 border-[#e10600] text-white'
                        : 'bg-[#111] border-[#222] text-white/70 hover:border-[#444] hover:text-white'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedCandidate === candidate.id
                          ? 'border-[#e10600] bg-[#e10600]'
                          : 'border-white/30'
                      }`}
                    >
                      {selectedCandidate === candidate.id && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="font-racing text-lg font-semibold tracking-wider">{candidate.name}</span>
                    <span className="ml-auto font-racing text-xs text-white/30 tracking-wider">
                      P{i + 1}
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm mb-4 p-3 bg-red-900/20 border border-red-900">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="font-racing tracking-wider">{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleVote}
                disabled={!isEligible || !selectedCandidate || isSubmitting}
                className="w-full bg-[#e10600] hover:bg-[#b00000] disabled:opacity-30 disabled:cursor-not-allowed text-white font-racing font-bold text-lg tracking-widest uppercase py-4 transition-all duration-200 flex items-center justify-center gap-3"
              >
                {!isEligible ? (
                  'GRID DITUTUP — HANYA PENONTON'
                ) : isSubmitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> SUBMITTING...</>
                ) : (
                  'SUBMIT VOTE'
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}
