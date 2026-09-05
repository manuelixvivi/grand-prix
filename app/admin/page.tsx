'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRaceSession } from '@/hooks/useRaceSession'
import { useCurrentLap, useVoteCounts } from '@/hooks/useLapResults'
import { ConnectionStatus, LapCounter, RaceStatusBadge, FlagBanner } from '@/components/RaceUI'
import type { Event, EventCategory, EventCategoryCandidate } from '@/lib/supabase/types'
import {
  Play, Flag, StopCircle, Lock, Eye, SkipForward, Trophy, RotateCcw,
  AlertTriangle, ChevronRight, Settings, Loader2, CheckCircle2
} from 'lucide-react'

// ---- Confirmation Dialog ----
function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#111] border border-[#333] p-6 max-w-sm w-full"
      >
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0" />
          <p className="font-racing text-white tracking-wider">{message}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-[#333] text-white/60 font-racing tracking-wider py-2 hover:border-white/40 transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-[#e10600] text-white font-racing tracking-wider py-2 hover:bg-[#b00000] transition-colors"
          >
            CONFIRM
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ---- Admin Button ----
function AdminButton({
  onClick,
  disabled,
  variant = 'default',
  loading = false,
  icon: Icon,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'primary' | 'danger' | 'yellow' | 'ghost'
  loading?: boolean
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  const variants = {
    default: 'bg-[#1a1a1a] border-[#333] text-white hover:border-[#555]',
    primary: 'bg-[#e10600] border-[#e10600] text-white hover:bg-[#b00000]',
    danger: 'bg-red-900/30 border-red-700 text-red-300 hover:bg-red-900/50',
    yellow: 'bg-yellow-900/30 border-yellow-700 text-yellow-300 hover:bg-yellow-900/50',
    ghost: 'bg-transparent border-[#222] text-white/40 hover:text-white hover:border-[#444]',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center justify-center gap-2 border px-4 py-3 font-racing tracking-wider text-sm font-bold uppercase transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed w-full ${variants[variant]}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : Icon ? <Icon className="w-4 h-4" /> : null}
      {children}
    </button>
  )
}

// ---- Event Selector ----
function EventSelector({ onSelect }: { onSelect: (event: Event, category: EventCategory & { candidates: EventCategoryCandidate[] }) => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const [events, setEvents] = useState<(Event & { event_categories: (EventCategory & { candidates: EventCategoryCandidate[] })[] })[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('events')
        .select('*, event_categories(*, candidates:event_category_candidates(*))')
        .in('status', ['READY', 'LIVE', 'DRAFT'])
        .order('created_at', { ascending: false })
      setEvents((data as typeof events) ?? [])
      setLoading(false)
    }
    fetch()
  }, [supabase])

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="w-6 h-6 text-[#e10600] animate-spin" />
    </div>
  )

  return (
    <div className="space-y-4">
      <h2 className="font-racing text-lg text-white/60 tracking-widest">SELECT EVENT & CATEGORY</h2>
      {events.map((event) => (
        <div key={event.id} className="border border-[#222] bg-[#0a0a0a]">
          <button
            onClick={() => setSelectedEvent(selectedEvent === event.id ? null : event.id)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-[#111] transition-colors"
          >
            <div>
              <p className="font-racing text-base font-bold text-white tracking-wider">{event.name}</p>
              <p className="font-racing text-xs text-white/40 tracking-widest">{event.status} • {event.event_categories.length} CATEGORIES</p>
            </div>
            <ChevronRight className={`w-4 h-4 text-white/30 transition-transform ${selectedEvent === event.id ? 'rotate-90' : ''}`} />
          </button>
          <AnimatePresence>
            {selectedEvent === event.id && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <div className="border-t border-[#222] divide-y divide-[#111]">
                  {event.event_categories
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => onSelect(event, cat)}
                        className="w-full flex items-center gap-3 px-6 py-3 text-left hover:bg-[#e10600]/10 transition-colors"
                      >
                        <span className="text-lg">{cat.icon}</span>
                        <div className="flex-1">
                          <p className="font-racing text-sm font-bold text-white tracking-wider">{cat.name}</p>
                          <p className="font-racing text-xs text-white/30">{cat.candidates.length} candidates • {cat.lap_count} laps</p>
                        </div>
                        {cat.status === 'COMPLETED' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        <ChevronRight className="w-4 h-4 text-white/20" />
                      </button>
                    ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
      {events.length === 0 && (
        <div className="text-center py-8">
          <p className="font-racing text-white/30 tracking-widest">NO EVENTS FOUND</p>
          <Link href="/admin/events/new" className="font-racing text-xs text-[#e10600] tracking-wider mt-2 block hover:underline">
            CREATE EVENT →
          </Link>
        </div>
      )}
    </div>
  )
}

// ---- Live Vote Bar ----
function LiveVoteBar({ counts, candidates, total }: { counts: Record<string, number>; candidates: EventCategoryCandidate[]; total: number }) {
  return (
    <div className="space-y-2">
      {candidates.map((c) => {
        const count = counts[c.id] ?? 0
        const pct = total > 0 ? (count / total) * 100 : 0
        return (
          <div key={c.id} className="flex items-center gap-3">
            <span className="font-racing text-xs text-white/60 w-20 truncate">{c.name}</span>
            <div className="flex-1 bg-[#1a1a1a] h-2 rounded overflow-hidden">
              <motion.div
                className="h-full bg-[#e10600]"
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="font-racing text-xs text-white/60 w-6 text-right">{count}</span>
          </div>
        )
      })}
      <p className="font-racing text-xs text-white/30 tracking-widest text-right">TOTAL: {total} VOTES</p>
    </div>
  )
}

// ---- MAIN ADMIN PAGE ----
export default function AdminPage() {
  const supabase = createClient()
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<(EventCategory & { candidates: EventCategoryCandidate[] }) | null>(null)
  const [confirm, setConfirm] = useState<{ message: string; action: () => void } | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const categoryId = selectedCategory?.id ?? null
  const { session, isConnected, isLoading } = useRaceSession(categoryId)
  const lap = useCurrentLap(categoryId, session?.current_lap_number ?? 1)
  const voteCounts = useVoteCounts(lap?.id ?? null)
  const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const callAction = useCallback(async (action: string, extra: Record<string, unknown> = {}) => {
    setActionLoading(action)
    try {
      const res = await fetch('/api/race', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          sessionId: session?.id,
          eventId: selectedEvent?.id,
          categoryId: selectedCategory?.id,
          lapId: lap?.id,
          lapNumber: session?.current_lap_number,
          totalLaps: selectedCategory?.lap_count,
          ...extra,
        }),
      })
      const data = await res.json()
      if (!res.ok) showToast(`Error: ${data.error}`)
      else showToast(`✓ ${action.replace('_', ' ')}`)
    } catch {
      showToast('Network error')
    } finally {
      setActionLoading(null)
    }
  }, [session, selectedEvent, selectedCategory, lap])

  const requireConfirm = (message: string, action: () => void) => {
    setConfirm({ message, action })
  }

  const state = session?.state ?? 'IDLE'
  const flag = session?.flag ?? 'NONE'

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top bar */}
      <div className="h-1 bg-[#e10600]" />
      <div className="bg-[#0a0a0a] border-b border-[#1a1a1a] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-racing font-bold text-lg text-white tracking-widest">RACE CONTROL</span>
          <span className="font-racing text-xs text-white/30 tracking-widest">CLASS GRAND PRIX 2026</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/events" className="font-racing text-xs text-white/40 hover:text-white tracking-widest flex items-center gap-1">
            <Settings className="w-3 h-3" /> MANAGE
          </Link>
          <ConnectionStatus isConnected={isConnected} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* No event selected */}
        {!selectedCategory ? (
          <EventSelector
            onSelect={(event, category) => {
              setSelectedEvent(event)
              setSelectedCategory(category)
            }}
          />
        ) : (
          <>
            {/* Current context */}
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-racing text-xs text-white/30 tracking-widest">EVENT</p>
                  <p className="font-racing text-base font-bold text-white tracking-wider">{selectedEvent?.name}</p>
                </div>
                <button
                  onClick={() => { setSelectedCategory(null); setSelectedEvent(null) }}
                  className="font-racing text-xs text-white/30 hover:text-white tracking-widest"
                >
                  CHANGE
                </button>
              </div>
              <div className="border-t border-[#1a1a1a] pt-3">
                <p className="font-racing text-xs text-white/30 tracking-widest">CATEGORY</p>
                <p className="font-racing text-xl font-bold text-white tracking-wider">{selectedCategory.name}</p>
                <p className="font-racing text-xs text-white/40 mt-1">{selectedCategory.candidates.length} candidates • {selectedCategory.lap_count} laps • {selectedCategory.voting_duration_seconds}s voting</p>
              </div>

              {session && (
                <div className="border-t border-[#1a1a1a] pt-3 flex items-center justify-between">
                  <LapCounter current={session.current_lap_number} total={selectedCategory.lap_count} />
                  <RaceStatusBadge state={state} />
                </div>
              )}
            </div>

            {/* Flag banner */}
            <FlagBanner flag={flag} />

            {/* Controls */}
            <div className="space-y-3">
              <p className="font-racing text-xs text-white/30 tracking-[0.3em]">RACE CONTROLS</p>

              {/* Start Race */}
              {['IDLE', 'READY'].includes(state) && !session && (
                <AdminButton
                  variant="primary"
                  icon={Play}
                  onClick={() => callAction('START_RACE')}
                  loading={actionLoading === 'START_RACE'}
                >
                  START RACE
                </AdminButton>
              )}
              {state === 'IDLE' && session && (
                <AdminButton
                  variant="primary"
                  icon={Play}
                  onClick={() => callAction('START_RACE')}
                  loading={actionLoading === 'START_RACE'}
                >
                  RESTART RACE
                </AdminButton>
              )}

              {/* During lights */}
              {['LIGHTS_1','LIGHTS_2','LIGHTS_3','LIGHTS_4','LIGHTS_5','LIGHTS_OUT','READY'].includes(state) && (
                <div className="grid grid-cols-2 gap-3">
                  <AdminButton
                    variant="yellow"
                    icon={Flag}
                    onClick={() => callAction('SET_FLAG', { flag: 'YELLOW' })}
                    loading={actionLoading === 'SET_FLAG'}
                  >
                    YELLOW FLAG
                  </AdminButton>
                  <AdminButton
                    variant="danger"
                    icon={StopCircle}
                    onClick={() => callAction('SET_FLAG', { flag: 'RED' })}
                    loading={actionLoading === 'SET_FLAG'}
                  >
                    RED FLAG
                  </AdminButton>
                </div>
              )}

              {/* During voting */}
              {state === 'VOTING' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <AdminButton
                      variant="yellow"
                      icon={Flag}
                      onClick={() => callAction('SET_FLAG', { flag: 'YELLOW' })}
                      loading={actionLoading === 'SET_FLAG'}
                    >
                      YELLOW FLAG
                    </AdminButton>
                    <AdminButton
                      variant="danger"
                      icon={StopCircle}
                      onClick={() => callAction('SET_FLAG', { flag: 'RED' })}
                      loading={actionLoading === 'SET_FLAG'}
                    >
                      RED FLAG
                    </AdminButton>
                  </div>
                  <AdminButton
                    variant="danger"
                    icon={Lock}
                    onClick={() => callAction('CLOSE_VOTING')}
                    loading={actionLoading === 'CLOSE_VOTING'}
                  >
                    CLOSE VOTING
                  </AdminButton>
                </div>
              )}

              {/* After voting closed */}
              {state === 'VOTING_CLOSED' && (
                <AdminButton
                  variant="primary"
                  icon={Eye}
                  onClick={() => callAction('REVEAL_RESULT', { eventId: selectedEvent?.id })}
                  loading={actionLoading === 'REVEAL_RESULT'}
                >
                  REVEAL RESULT
                </AdminButton>
              )}

              {/* After result reveal */}
              {['RESULT_REVEAL', 'LAP_COMPLETE'].includes(state) && (
                <AdminButton
                  variant="primary"
                  icon={SkipForward}
                  onClick={() => callAction('NEXT_LAP')}
                  loading={actionLoading === 'NEXT_LAP'}
                >
                  NEXT LAP →
                </AdminButton>
              )}

              {/* Final results */}
              {state === 'FINAL_RESULTS' && (
                <AdminButton
                  variant="primary"
                  icon={Trophy}
                  onClick={() => callAction('SHOW_PODIUM')}
                  loading={actionLoading === 'SHOW_PODIUM'}
                >
                  🏆 SHOW PODIUM
                </AdminButton>
              )}

              {/* Podium */}
              {(state === 'PODIUM' || state === 'CHEQUERED_FLAG') && (
                <AdminButton
                  variant="danger"
                  icon={Flag}
                  onClick={() => callAction('END_RACE')}
                  loading={actionLoading === 'END_RACE'}
                >
                  🏁 END RACE
                </AdminButton>
              )}

              {/* Reset lap (destructive) */}
              {session && !['IDLE', 'CHEQUERED_FLAG'].includes(state) && (
                <AdminButton
                  variant="ghost"
                  icon={RotateCcw}
                  onClick={() =>
                    requireConfirm('Reset current lap? This will delete all votes for this lap.', () =>
                      callAction('RESET_LAP')
                    )
                  }
                >
                  RESET LAP
                </AdminButton>
              )}
            </div>

            {/* Live vote counts (only show to admin during voting) */}
            {state === 'VOTING' && selectedCategory.candidates.length > 0 && (
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-4">
                <p className="font-racing text-xs text-white/30 tracking-[0.3em] mb-3">LIVE VOTES</p>
                <LiveVoteBar
                  counts={voteCounts}
                  candidates={selectedCategory.candidates}
                  total={totalVotes}
                />
              </div>
            )}

            {/* Quick nav */}
            <div className="border-t border-[#111] pt-4 flex gap-4">
              <Link href="/podium" target="_blank" className="font-racing text-xs text-white/30 hover:text-white tracking-widest">
                OPEN BIG SCREEN ↗
              </Link>
              <Link href="/vote" target="_blank" className="font-racing text-xs text-white/30 hover:text-white tracking-widest">
                VOTER PAGE ↗
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Confirm dialog */}
      <AnimatePresence>
        {confirm && (
          <ConfirmDialog
            message={confirm.message}
            onConfirm={() => { confirm.action(); setConfirm(null) }}
            onCancel={() => setConfirm(null)}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-[#333] px-6 py-3 font-racing tracking-wider text-white text-sm z-50"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
