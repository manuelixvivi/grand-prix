'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Event, EventCategory, EventCategoryCandidate } from '@/lib/supabase/types'
import { ArrowLeft, Plus, Trash2, Save, Play, Loader2, GripVertical, X } from 'lucide-react'

type CategoryWithCandidates = EventCategory & { candidates: EventCategoryCandidate[] }
type EventWithCategories = Event & { event_categories: CategoryWithCandidates[] }

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any

  const [event, setEvent] = useState<EventWithCategories | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingCat, setEditingCat] = useState<CategoryWithCandidates | null>(null)
  const [newCandidateName, setNewCandidateName] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('events')
        .select('*, event_categories(*, candidates:event_category_candidates(*))')
        .eq('id', id)
        .single()
      if (data) {
        const sorted = {
          ...data,
          event_categories: (data as EventWithCategories).event_categories
            .sort((a, b) => a.display_order - b.display_order)
            .map((cat) => ({ ...cat, candidates: cat.candidates.sort((a, b) => a.display_order - b.display_order) })),
        }
        setEvent(sorted as EventWithCategories)
      }
      setLoading(false)
    }
    fetch()
  }, [id, supabase])

  const addCandidate = async () => {
    if (!editingCat || !newCandidateName.trim()) return
    const order = editingCat.candidates.length + 1
    const { data } = await supabase
      .from('event_category_candidates')
      .insert({ event_category_id: editingCat.id, name: newCandidateName.trim(), display_order: order })
      .select()
      .single()
    if (data) {
      setEditingCat((prev) => prev ? { ...prev, candidates: [...prev.candidates, data] } : null)
      setNewCandidateName('')
    }
  }

  const removeCandidate = async (candidateId: string) => {
    await supabase.from('event_category_candidates').delete().eq('id', candidateId)
    setEditingCat((prev) => prev ? { ...prev, candidates: prev.candidates.filter((c) => c.id !== candidateId) } : null)
  }

  const saveCategorySettings = async () => {
    if (!editingCat) return
    setSaving(true)
    await supabase.from('event_categories').update({
      name: editingCat.name,
      lap_count: editingCat.lap_count,
      voting_duration_seconds: editingCat.voting_duration_seconds,
    }).eq('id', editingCat.id)
    // Reload event
    const { data } = await supabase
      .from('events')
      .select('*, event_categories(*, candidates:event_category_candidates(*))')
      .eq('id', id)
      .single()
    if (data) setEvent(data as EventWithCategories)
    setSaving(false)
    setEditingCat(null)
    showToast('Category saved')
  }

  const setEventReady = async () => {
    await supabase.from('events').update({ status: 'READY' }).eq('id', id)
    setEvent((prev) => prev ? { ...prev, status: 'READY' } : null)
    showToast('Event is now READY')
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-[#e10600] animate-spin" />
    </div>
  )
  if (!event) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="font-racing text-white/40">Event not found</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="h-1 bg-[#e10600]" />
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin/events" className="text-white/40 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
            <div>
              <p className="font-racing text-xs text-white/30 tracking-[0.4em]">{event.year}</p>
              <h1 className="font-racing text-xl font-bold text-white tracking-wider">{event.name}</h1>
              <span className={`font-racing text-xs border px-2 py-0.5 mt-1 inline-block tracking-widest ${
                event.status === 'LIVE' ? 'text-green-400 border-green-700' :
                event.status === 'READY' ? 'text-blue-400 border-blue-700' :
                'text-white/30 border-white/10'
              }`}>{event.status}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {event.status === 'DRAFT' && (
              <button onClick={setEventReady} className="font-racing text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 tracking-widest transition-colors">
                SET READY
              </button>
            )}
            {event.status === 'READY' && (
              <Link href="/admin">
                <button className="flex items-center gap-1 font-racing text-xs bg-[#e10600] hover:bg-[#b00000] text-white px-3 py-2 tracking-widest transition-colors">
                  <Play className="w-3 h-3" /> RUN EVENT
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-racing text-xs text-white/30 tracking-[0.3em]">CATEGORIES ({event.event_categories.length})</p>
          </div>

          {event.event_categories.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-[#0a0a0a] border border-[#1a1a1a]"
            >
              <div className="flex items-center gap-3 p-4">
                <GripVertical className="w-4 h-4 text-white/20" />
                <span className="text-xl">{cat.icon}</span>
                <div className="flex-1">
                  <p className="font-racing font-bold text-white tracking-wider">{cat.name}</p>
                  <p className="font-racing text-xs text-white/30 mt-0.5">
                    {cat.candidates.length} candidates · {cat.lap_count} laps · {cat.voting_duration_seconds}s
                  </p>
                </div>
                <button
                  onClick={() => setEditingCat(editingCat?.id === cat.id ? null : cat)}
                  className="font-racing text-xs text-white/40 hover:text-white border border-[#222] hover:border-[#444] px-3 py-1.5 tracking-widest transition-colors"
                >
                  {editingCat?.id === cat.id ? 'CLOSE' : 'EDIT'}
                </button>
              </div>

              {/* Edit panel */}
              <AnimatePresence>
                {editingCat?.id === cat.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-[#1a1a1a] p-4 space-y-4">
                      {/* Settings row */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="font-racing text-xs text-white/30 tracking-widest block mb-1">NAME</label>
                          <input
                            value={editingCat.name}
                            onChange={(e) => setEditingCat((p) => p ? { ...p, name: e.target.value } : null)}
                            className="w-full bg-[#111] border border-[#222] text-white font-racing px-3 py-2 text-sm focus:border-[#e10600] outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-racing text-xs text-white/30 tracking-widest block mb-1">LAPS</label>
                          <input
                            type="number" min={1} max={10}
                            value={editingCat.lap_count}
                            onChange={(e) => setEditingCat((p) => p ? { ...p, lap_count: parseInt(e.target.value) } : null)}
                            className="w-full bg-[#111] border border-[#222] text-white font-racing px-3 py-2 text-sm focus:border-[#e10600] outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-racing text-xs text-white/30 tracking-widest block mb-1">DURATION (S)</label>
                          <input
                            type="number" min={10} max={300}
                            value={editingCat.voting_duration_seconds}
                            onChange={(e) => setEditingCat((p) => p ? { ...p, voting_duration_seconds: parseInt(e.target.value) } : null)}
                            className="w-full bg-[#111] border border-[#222] text-white font-racing px-3 py-2 text-sm focus:border-[#e10600] outline-none"
                          />
                        </div>
                      </div>

                      {/* Candidates */}
                      <div>
                        <p className="font-racing text-xs text-white/30 tracking-widest mb-2">CANDIDATES</p>
                        <div className="space-y-1 mb-3">
                          {editingCat.candidates.map((c) => (
                            <div key={c.id} className="flex items-center gap-2 bg-[#111] border border-[#1a1a1a] px-3 py-2">
                              <span className="font-racing text-sm text-white flex-1">{c.name}</span>
                              <button onClick={() => removeCandidate(c.id)} className="text-white/20 hover:text-[#e10600] transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={newCandidateName}
                            onChange={(e) => setNewCandidateName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addCandidate()}
                            placeholder="Add candidate..."
                            className="flex-1 bg-[#111] border border-[#222] text-white font-racing px-3 py-2 text-sm focus:border-[#e10600] outline-none"
                          />
                          <button onClick={addCandidate} className="bg-[#222] hover:bg-[#333] border border-[#333] text-white px-3 py-2 transition-colors">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Save */}
                      <button
                        onClick={saveCategorySettings}
                        disabled={saving}
                        className="w-full bg-[#e10600] hover:bg-[#b00000] text-white font-racing tracking-widest py-2 flex items-center justify-center gap-2 transition-colors text-sm"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        SAVE CHANGES
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>

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
