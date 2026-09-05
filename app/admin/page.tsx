'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRaceSession } from '@/hooks/useRaceSession'
import { useCurrentLap, useVoteCounts } from '@/hooks/useLapResults'
import { useGridPresence } from '@/hooks/useGridPresence'
import { ConnectionStatus, LapCounter, RaceStatusBadge, FlagBanner } from '@/components/RaceUI'
import type { Event, EventCategory, EventCategoryCandidate } from '@/lib/supabase/types'
import {
  Play, Flag, StopCircle, Lock, Eye, SkipForward, Trophy, RotateCcw,
  AlertTriangle, ChevronRight, Settings, Loader2, CheckCircle2, LogOut, Sparkles, Users
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
  const [creatingDemo, setCreatingDemo] = useState(false)

  const fetchEvents = useCallback(async () => {
    const { data } = await supabase
      .from('events')
      .select('*, event_categories(*, candidates:event_category_candidates(*))')
      .in('status', ['READY', 'LIVE', 'DRAFT'])
      .order('created_at', { ascending: false })
    const evList = (data as typeof events) ?? []
    setEvents(evList)
    if (evList.length > 0 && !selectedEvent) {
      setSelectedEvent(evList[0].id)
    }
    setLoading(false)
  }, [supabase, selectedEvent])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handleCreateDemo = async () => {
    setCreatingDemo(true)
    try {
      const { data: newEv } = await supabase
        .from('events')
        .insert({
          name: 'Aspire Grand Prix 2026',
          year: 2026,
          description: 'Aspire Grand Prix CAWU 3 : 2026 Championship',
          status: 'READY',
        })
        .select()
        .single()

      if (newEv) {
        const categories = [
          { name: 'Most Chaotic Driver', icon: '🌪️', candidates: ['Kevin', 'Manuel', 'Andrew', 'Jason', 'Daniel'] },
          { name: 'Class Comedian', icon: '😂', candidates: ['Andrew', 'Jason', 'Kevin'] },
          { name: 'Sleepiest Driver', icon: '😴', candidates: ['Daniel', 'Kevin', 'Manuel'] },
        ]

        for (let i = 0; i < categories.length; i++) {
          const catDef = categories[i]
          const { data: newCat } = await supabase
            .from('event_categories')
            .insert({
              event_id: newEv.id,
              name: catDef.name,
              icon: catDef.icon,
              lap_count: 3,
              voting_duration_seconds: 30,
              display_order: i + 1,
              status: 'PENDING',
              scoring_config: { "1": 25, "2": 18, "3": 15, "4": 12, "5": 10 },
            })
            .select()
            .single()

          if (newCat) {
            await supabase.from('event_category_candidates').insert(
              catDef.candidates.map((cName, idx) => ({
                event_category_id: newCat.id,
                name: cName,
                display_order: idx + 1,
              }))
            )
          }
        }
      }
      await fetchEvents()
    } catch (e) {
      console.error(e)
    } finally {
      setCreatingDemo(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="w-6 h-6 text-[#e10600] animate-spin" />
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="bg-[#141414] border border-[#2a2a2a] p-4 text-center">
        <p className="font-racing text-xs text-[#e10600] tracking-[0.3em] font-bold uppercase mb-1">
          LANGKAH 1 DARI 2
        </p>
        <h2 className="font-racing text-lg font-bold text-white tracking-wider">
          PILIH KATEGORI UNTUK MEMULAI BALAPAN (START RACE)
        </h2>
        <p className="font-racing text-xs text-white/40 tracking-wider mt-1">
          Klik salah satu kategori di bawah ini, tombol START RACE akan langsung muncul
        </p>
      </div>

      {events.map((event) => (
        <div key={event.id} className="border border-[#222] bg-[#0a0a0a]">
          <button
            onClick={() => setSelectedEvent(selectedEvent === event.id ? null : event.id)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-[#111] transition-colors border-b border-[#1a1a1a]"
          >
            <div>
              <p className="font-racing text-base font-bold text-white tracking-wider">{event.name}</p>
              <p className="font-racing text-xs text-white/40 tracking-widest">{event.status} • {event.event_categories.length} KATEGORI</p>
            </div>
            <ChevronRight className={`w-4 h-4 text-white/30 transition-transform ${selectedEvent === event.id ? 'rotate-90' : ''}`} />
          </button>
          <AnimatePresence>
            {selectedEvent === event.id && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <div className="divide-y divide-[#141414]">
                  {event.event_categories
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((cat) => (
                      <div
                        key={cat.id}
                        className="w-full flex items-center justify-between p-4 hover:bg-[#e10600]/5 transition-colors gap-3"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-2xl">{cat.icon}</span>
                          <div>
                            <p className="font-racing text-base font-bold text-white tracking-wider">{cat.name}</p>
                            <p className="font-racing text-xs text-white/40">
                              {cat.candidates.length} kandidat · {cat.lap_count} laps · {cat.voting_duration_seconds}s
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => onSelect(event, cat)}
                          className="bg-[#e10600] hover:bg-[#b00000] text-white font-racing text-xs font-bold px-4 py-2.5 tracking-wider uppercase flex items-center gap-1.5 transition-colors flex-shrink-0"
                        >
                          <Play className="w-3 h-3 fill-current" /> PILIH & START
                        </button>
                      </div>
                    ))}
                  {event.event_categories.length === 0 && (
                    <div className="p-6 text-center">
                      <p className="font-racing text-xs text-white/40 mb-3">Belum ada kategori di event ini</p>
                      <Link
                        href={`/admin/events/${event.id}`}
                        className="font-racing text-xs bg-[#e10600] text-white px-4 py-2 inline-block font-bold tracking-wider uppercase hover:bg-[#b00000]"
                      >
                        + Tambah Kategori Sekarang
                      </Link>
                    </div>
                  )}
                  <div className="p-3 bg-[#0d0d0d] border-t border-[#1a1a1a] flex justify-between items-center">
                    <span className="font-racing text-xs text-white/30">Total {event.event_categories.length} Kategori</span>
                    <Link
                      href={`/admin/events/${event.id}`}
                      className="font-racing text-xs text-[#e10600] hover:underline tracking-wider flex items-center gap-1 font-bold uppercase"
                    >
                      + KELOLA / TAMBAH KATEGORI →
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}

      {events.length === 0 && (
        <div className="text-center py-12 border border-dashed border-[#222] bg-[#0a0a0a] p-6 space-y-4">
          <p className="font-racing text-white/40 tracking-widest text-base">BELUM ADA EVENT AKTIF DI DATABASE</p>
          <p className="font-racing text-xs text-white/30 max-w-md mx-auto">
            Klik tombol di bawah ini untuk membuat event otomatis beserta kategori & kandidat demo siap balapan:
          </p>
          <button
            onClick={handleCreateDemo}
            disabled={creatingDemo}
            className="bg-[#e10600] hover:bg-[#b00000] text-white font-racing text-xs font-bold px-6 py-3 tracking-widest uppercase transition-colors inline-flex items-center gap-2"
          >
            {creatingDemo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            ⚡ BUAT EVENT DEMO (ASPIRE GRAND PRIX)
          </button>
        </div>
      )}

      <div className="pt-2 flex items-center justify-between border-t border-[#1a1a1a]">
        <Link
          href="/admin/categories"
          className="font-racing text-xs text-yellow-500 hover:text-yellow-400 tracking-wider flex items-center gap-1 font-bold uppercase"
        >
          📂 CATEGORY LIBRARY →
        </Link>
        <Link
          href="/admin/events/new"
          className="font-racing text-xs text-[#e10600] hover:underline tracking-wider font-bold uppercase"
        >
          + BUAT EVENT BARU →
        </Link>
      </div>
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
  const { onlineCount } = useGridPresence(categoryId)
  const lap = useCurrentLap(categoryId, session?.current_lap_number ?? 1)
  const voteCounts = useVoteCounts(lap?.id ?? null)
  const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const updateCategoryLaps = async (newLaps: number) => {
    if (!selectedCategory || newLaps < 1 || newLaps > 10) return
    try {
      await (supabase.from('event_categories') as any).update({ lap_count: newLaps }).eq('id', selectedCategory.id)
      setSelectedCategory((prev) => (prev ? { ...prev, lap_count: newLaps } : null))
      showToast(`✓ Jumlah lap diubah menjadi ${newLaps} LAP`)
    } catch {
      showToast('Gagal mengubah jumlah lap')
    }
  }

  const updateCategoryDuration = async (newDuration: number) => {
    if (!selectedCategory) return
    try {
      await (supabase.from('event_categories') as any).update({ voting_duration_seconds: newDuration }).eq('id', selectedCategory.id)
      setSelectedCategory((prev) => (prev ? { ...prev, voting_duration_seconds: newDuration } : null))
      showToast(`✓ Durasi voting diubah menjadi ${newDuration} detik`)
    } catch {
      showToast('Gagal mengubah durasi voting')
    }
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

  const postRace = async (action: string, payload: Record<string, unknown> = {}) => {
    return fetch('/api/race', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    })
  }

  const handleStartRace = async () => {
    setActionLoading('START_RACE')
    try {
      const res = await postRace('START_RACE', {
        eventId: selectedEvent?.id,
        categoryId: selectedCategory?.id,
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(`Error: ${data.error}`)
        return
      }

      const activeSessionId = data.session?.id || session?.id
      showToast('🚦 1/5 Lampu Menyala...')

      await new Promise((r) => setTimeout(r, 800))
      await postRace('SET_STATE', { sessionId: activeSessionId, state: 'LIGHTS_2' })

      await new Promise((r) => setTimeout(r, 800))
      await postRace('SET_STATE', { sessionId: activeSessionId, state: 'LIGHTS_3' })

      await new Promise((r) => setTimeout(r, 800))
      await postRace('SET_STATE', { sessionId: activeSessionId, state: 'LIGHTS_4' })

      await new Promise((r) => setTimeout(r, 800))
      await postRace('SET_STATE', { sessionId: activeSessionId, state: 'LIGHTS_5' })

      await new Promise((r) => setTimeout(r, 1200))
      await postRace('SET_STATE', { sessionId: activeSessionId, state: 'LIGHTS_OUT', flag: 'GREEN' })

      await new Promise((r) => setTimeout(r, 1200))
      await postRace('OPEN_VOTING', { sessionId: activeSessionId, categoryId: selectedCategory?.id })
      showToast('🗳️ VOTING LAP 1 DIBUKA!')
    } catch {
      showToast('Gagal memulai race')
    } finally {
      setActionLoading(null)
    }
  }

  const handleNextLap = async () => {
    setActionLoading('NEXT_LAP')
    try {
      const res = await postRace('NEXT_LAP', {
        sessionId: session?.id,
        categoryId: selectedCategory?.id,
        lapNumber: session?.current_lap_number,
        totalLaps: selectedCategory?.lap_count,
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(`Error: ${data.error}`)
        return
      }

      if (data.done) {
        showToast('🏁 Semua lap selesai! Menampilkan hasil akhir.')
        return
      }

      const activeSessionId = session?.id
      showToast(`🚦 LAP ${data.nextLap} — 1/5 Lampu Menyala...`)

      await new Promise((r) => setTimeout(r, 800))
      await postRace('SET_STATE', { sessionId: activeSessionId, state: 'LIGHTS_2' })

      await new Promise((r) => setTimeout(r, 800))
      await postRace('SET_STATE', { sessionId: activeSessionId, state: 'LIGHTS_3' })

      await new Promise((r) => setTimeout(r, 800))
      await postRace('SET_STATE', { sessionId: activeSessionId, state: 'LIGHTS_4' })

      await new Promise((r) => setTimeout(r, 800))
      await postRace('SET_STATE', { sessionId: activeSessionId, state: 'LIGHTS_5' })

      await new Promise((r) => setTimeout(r, 1200))
      await postRace('SET_STATE', { sessionId: activeSessionId, state: 'LIGHTS_OUT', flag: 'GREEN' })

      await new Promise((r) => setTimeout(r, 1200))
      await postRace('OPEN_VOTING', { sessionId: activeSessionId, categoryId: selectedCategory?.id })
      showToast(`🗳️ VOTING LAP ${data.nextLap} DIBUKA!`)
    } catch {
      showToast('Gagal lanjut ke lap berikutnya')
    } finally {
      setActionLoading(null)
    }
  }

  const requireConfirm = (message: string, action: () => void) => {
    setConfirm({ message, action })
  }

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    window.location.href = '/'
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
          <span className="font-racing text-xs text-white/30 tracking-widest">ASPIRE GRAND PRIX — CAWU 3 : 2026</span>
        </div>
        <div className="flex items-center gap-3">
          {selectedCategory && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-950/40 border border-green-800/60 text-green-400 font-racing text-xs tracking-wider">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>{onlineCount} SISWA DI GRID</span>
            </div>
          )}
          <Link href="/admin/categories" className="font-racing text-xs text-yellow-500/80 hover:text-yellow-400 tracking-widest flex items-center gap-1">
            📁 LIBRARY
          </Link>
          <Link href="/admin/events" className="font-racing text-xs text-white/40 hover:text-white tracking-widest flex items-center gap-1">
            <Settings className="w-3 h-3" /> EVENTS
          </Link>
          <ConnectionStatus isConnected={isConnected} />
          <button
            onClick={handleLogout}
            title="Logout"
            className="font-racing text-xs text-red-400 hover:text-red-300 tracking-widest flex items-center gap-1 border border-red-900/60 px-2.5 py-1 bg-red-950/30 transition-colors ml-2"
          >
            <LogOut className="w-3 h-3" /> LOGOUT
          </button>
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

              {/* Quick Lap Count & Duration Adjuster for Admin */}
              <div className="border-t border-[#1a1a1a] pt-3 flex flex-wrap items-center justify-between gap-3 bg-[#0d0d0d] p-2.5 rounded-sm">
                <div className="flex items-center gap-2">
                  <span className="font-racing text-xs text-white/50 tracking-widest uppercase">JUMLAH LAP:</span>
                  <div className="flex items-center border border-[#333] bg-[#141414]">
                    <button
                      type="button"
                      disabled={selectedCategory.lap_count <= 1 || (session ? session.state !== 'IDLE' : false)}
                      onClick={() => updateCategoryLaps(selectedCategory.lap_count - 1)}
                      className="px-2.5 py-1 text-white/70 hover:text-white font-bold disabled:opacity-20 hover:bg-[#222]"
                    >
                      -
                    </button>
                    <span className="font-racing text-xs font-bold text-[#e10600] px-2.5 min-w-[54px] text-center">
                      {selectedCategory.lap_count} LAP
                    </span>
                    <button
                      type="button"
                      disabled={selectedCategory.lap_count >= 10 || (session ? session.state !== 'IDLE' : false)}
                      onClick={() => updateCategoryLaps(selectedCategory.lap_count + 1)}
                      className="px-2.5 py-1 text-white/70 hover:text-white font-bold disabled:opacity-20 hover:bg-[#222]"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-racing text-xs text-white/50 tracking-widest uppercase">DURASI:</span>
                  <select
                    value={selectedCategory.voting_duration_seconds}
                    disabled={session ? session.state !== 'IDLE' : false}
                    onChange={(e) => updateCategoryDuration(parseInt(e.target.value))}
                    className="bg-[#141414] border border-[#333] text-white font-racing text-xs px-2.5 py-1 outline-none focus:border-[#e10600] cursor-pointer"
                  >
                    <option value={15}>15s (Sprint)</option>
                    <option value={30}>30s (Standar)</option>
                    <option value={45}>45s</option>
                    <option value={60}>60s (1 Menit)</option>
                    <option value={90}>90s</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-[#1a1a1a] pt-3 flex items-center justify-between">
                {session ? (
                  <LapCounter current={session.current_lap_number} total={selectedCategory.lap_count} />
                ) : (
                  <span className="font-racing text-xs text-white/40 tracking-wider">STANDBY</span>
                )}
                <div className="flex items-center gap-3">
                  <span className="font-racing text-xs text-green-400 font-bold flex items-center gap-1.5 bg-green-950/40 border border-green-800/50 px-2.5 py-1 rounded-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                    👥 {onlineCount} PEMILIH DI GRID
                  </span>
                  {session && <RaceStatusBadge state={state} />}
                </div>
              </div>
            </div>

            {/* Flag banner */}
            <FlagBanner flag={flag} />

            {/* Controls */}
            <div className="space-y-3">
              <p className="font-racing text-xs text-white/30 tracking-[0.3em]">RACE CONTROLS</p>

              {/* Start Race: always available if idle, ready, ended, or no session */}
              {(!session || ['IDLE', 'READY', 'CHEQUERED_FLAG'].includes(state)) && (
                <div className="space-y-2">
                  <AdminButton
                    variant="primary"
                    icon={Play}
                    onClick={handleStartRace}
                    loading={actionLoading === 'START_RACE'}
                  >
                    {state === 'CHEQUERED_FLAG' ? '🏁 BALAPAN ULANG (RESTART RACE)' : '🏁 START RACE (MULAI BALAPAN)'}
                  </AdminButton>
                  <p className="text-center font-racing text-xs text-white/40 tracking-wider">
                    Lampu start F1 akan menyala otomatis di layar utama dan sesi voting dibuka
                  </p>
                </div>
              )}

              {/* During lights sequence */}
              {['LIGHTS_1','LIGHTS_2','LIGHTS_3','LIGHTS_4','LIGHTS_5','LIGHTS_OUT'].includes(state) && (
                <div className="space-y-3">
                  <div className="p-3.5 bg-red-950/40 border border-red-700 text-center animate-pulse">
                    <p className="font-racing text-sm text-red-300 font-bold tracking-widest">
                      🚦 LAMPU START SEDANG MENYALA...
                    </p>
                    <p className="font-racing text-xs text-white/50 tracking-wider mt-1">
                      Voting akan terbuka otomatis setelah lampu padam (Lights Out)
                    </p>
                  </div>
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
                  onClick={handleNextLap}
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
