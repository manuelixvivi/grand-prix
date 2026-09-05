'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Event, EventCategory, EventCategoryCandidate, CategoryTemplate } from '@/lib/supabase/types'
import {
  ArrowLeft, Plus, Trash2, Save, Play, Loader2, GripVertical, X,
  Library, Sparkles, Check
} from 'lucide-react'

type CategoryWithCandidates = EventCategory & { candidates: EventCategoryCandidate[] }
type EventWithCategories = Event & { event_categories: CategoryWithCandidates[] }

const ICONS = ['🏆', '🌪️', '🗣️', '😴', '⭐', '😂', '🤫', '🏃', '💬', '🔥', '🎭', '🎯', '🧠', '💤', '😎']

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

  // New Category Modal / Form state
  const [showAddModal, setShowAddModal] = useState(false)
  const [showLibraryModal, setShowLibraryModal] = useState(false)
  const [libraryTemplates, setLibraryTemplates] = useState<(CategoryTemplate & { candidates: { name: string }[] })[]>([])
  const [loadingLibrary, setLoadingLibrary] = useState(false)

  const [newCatForm, setNewCatForm] = useState({
    name: '',
    description: '',
    icon: '🏆',
    lap_count: 3,
    voting_duration_seconds: 30,
  })
  const [newCatCandidates, setNewCatCandidates] = useState<string[]>([])
  const [candidateInput, setCandidateInput] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const fetchEvent = useCallback(async () => {
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
          .map((cat) => ({
            ...cat,
            candidates: cat.candidates.sort((a, b) => a.display_order - b.display_order),
          })),
      }
      setEvent(sorted as EventWithCategories)
    }
    setLoading(false)
  }, [id, supabase])

  useEffect(() => {
    fetchEvent()
  }, [fetchEvent])

  // Fetch Category Library
  const openLibraryModal = async () => {
    setShowLibraryModal(true)
    setLoadingLibrary(true)
    const { data } = await supabase
      .from('category_templates')
      .select('*, candidates:category_template_candidates(*)')
      .eq('is_active', true)
      .order('name')
    setLibraryTemplates((data as typeof libraryTemplates) ?? [])
    setLoadingLibrary(false)
  }

  // Import template from library
  const handleImportFromLibrary = async (template: typeof libraryTemplates[0]) => {
    setSaving(true)
    try {
      const display_order = (event?.event_categories?.length || 0) + 1
      const { data: cat } = await supabase
        .from('event_categories')
        .insert({
          event_id: id,
          template_id: template.id,
          name: template.name,
          description: template.description,
          icon: template.icon,
          lap_count: template.default_lap_count,
          voting_duration_seconds: template.default_voting_duration_seconds,
          scoring_config: template.scoring_config,
          display_order,
          status: 'PENDING',
        })
        .select()
        .single()

      if (cat && template.candidates?.length > 0) {
        const candidateInserts = template.candidates.map((c, j) => ({
          event_category_id: cat.id,
          name: c.name,
          display_order: j + 1,
        }))
        await supabase.from('event_category_candidates').insert(candidateInserts)
      }

      await fetchEvent()
      setShowLibraryModal(false)
      showToast(`✓ Kategori "${template.name}" berhasil diimport!`)
    } catch {
      showToast('Gagal mengimport kategori')
    } finally {
      setSaving(false)
    }
  }

  // Create brand new custom category directly in this event
  const handleCreateCustomCategory = async () => {
    if (!newCatForm.name.trim()) return
    setSaving(true)
    try {
      const display_order = (event?.event_categories?.length || 0) + 1
      const { data: newCat, error } = await supabase
        .from('event_categories')
        .insert({
          event_id: id,
          name: newCatForm.name.trim(),
          description: newCatForm.description.trim() || null,
          icon: newCatForm.icon || '🏆',
          lap_count: newCatForm.lap_count,
          voting_duration_seconds: newCatForm.voting_duration_seconds,
          scoring_config: { "1": 25, "2": 18, "3": 15, "4": 12, "5": 10, "6": 8, "7": 6, "8": 4, "9": 2, "10": 1 },
          display_order,
          status: 'PENDING',
        })
        .select()
        .single()

      if (error || !newCat) throw error || new Error('Gagal')

      // Insert candidates if any
      if (newCatCandidates.length > 0) {
        const candidateInserts = newCatCandidates.map((cName, i) => ({
          event_category_id: newCat.id,
          name: cName,
          display_order: i + 1,
        }))
        await supabase.from('event_category_candidates').insert(candidateInserts)
      }

      await fetchEvent()
      setShowAddModal(false)
      setNewCatForm({ name: '', description: '', icon: '🏆', lap_count: 3, voting_duration_seconds: 30 })
      setNewCatCandidates([])
      showToast(`✓ Kategori "${newCatForm.name}" berhasil dibuat!`)
    } catch {
      showToast('Gagal membuat kategori')
    } finally {
      setSaving(false)
    }
  }

  const addCandidateToNew = () => {
    if (!candidateInput.trim()) return
    setNewCatCandidates((prev) => [...prev, candidateInput.trim()])
    setCandidateInput('')
  }

  // Add candidate to existing editing category
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
      await fetchEvent()
    }
  }

  const removeCandidate = async (candidateId: string) => {
    await supabase.from('event_category_candidates').delete().eq('id', candidateId)
    setEditingCat((prev) => prev ? { ...prev, candidates: prev.candidates.filter((c) => c.id !== candidateId) } : null)
    await fetchEvent()
  }

  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (!confirm(`Hapus kategori "${catName}" dari event ini?`)) return
    await supabase.from('event_categories').delete().eq('id', catId)
    await fetchEvent()
    showToast('Kategori berhasil dihapus dari event')
  }

  const saveCategorySettings = async () => {
    if (!editingCat) return
    setSaving(true)
    await supabase.from('event_categories').update({
      name: editingCat.name,
      lap_count: editingCat.lap_count,
      voting_duration_seconds: editingCat.voting_duration_seconds,
    }).eq('id', editingCat.id)

    await fetchEvent()
    setSaving(false)
    setEditingCat(null)
    showToast('Perubahan kategori berhasil disimpan')
  }

  const setEventReady = async () => {
    await supabase.from('events').update({ status: 'READY' }).eq('id', id)
    setEvent((prev) => prev ? { ...prev, status: 'READY' } : null)
    showToast('Event siap dijalankan (READY)')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#e10600] animate-spin" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="font-racing text-white/40">Event tidak ditemukan</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="h-1 bg-[#e10600]" />
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin/events" className="text-white/40 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <p className="font-racing text-xs text-white/30 tracking-[0.4em]">{event.year}</p>
              <h1 className="font-racing text-2xl font-bold text-white tracking-wider">{event.name}</h1>
              <span className={`font-racing text-xs border px-2 py-0.5 mt-1 inline-block tracking-widest ${
                event.status === 'LIVE' ? 'text-green-400 border-green-700' :
                event.status === 'READY' ? 'text-blue-400 border-blue-700' :
                'text-white/30 border-white/10'
              }`}>{event.status}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {event.status === 'DRAFT' && (
              <button
                onClick={setEventReady}
                className="font-racing text-xs bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 tracking-widest transition-colors font-bold uppercase"
              >
                SET READY
              </button>
            )}
            <Link href="/admin">
              <button className="flex items-center gap-1.5 font-racing text-xs bg-[#e10600] hover:bg-[#b00000] text-white px-3.5 py-2 tracking-widest transition-colors font-bold uppercase">
                <Play className="w-3.5 h-3.5" /> RACE CONTROL
              </button>
            </Link>
          </div>
        </div>

        {/* Action Buttons: Add Custom Category or Import from Library */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 bg-[#e10600] hover:bg-[#b00000] text-white font-racing tracking-widest text-sm py-3 px-4 transition-colors font-bold uppercase"
          >
            <Plus className="w-4 h-4" /> BUAT KATEGORI SENDIRI
          </button>
          <button
            onClick={openLibraryModal}
            className="flex items-center justify-center gap-2 bg-[#111] hover:bg-[#1a1a1a] border border-[#333] hover:border-white/40 text-white/80 hover:text-white font-racing tracking-widest text-sm py-3 px-4 transition-colors font-bold uppercase"
          >
            <Library className="w-4 h-4 text-yellow-500" /> PILIH DARI LIBRARY
          </button>
        </div>

        {/* Categories Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-2">
            <p className="font-racing text-xs text-white/40 tracking-[0.3em] uppercase">
              DAFTAR KATEGORI EVENT ({event.event_categories.length})
            </p>
            <span className="font-racing text-xs text-white/30">Urutan balapan otomatis</span>
          </div>

          {event.event_categories.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[#222] bg-[#0a0a0a]">
              <Sparkles className="w-8 h-8 text-yellow-500/50 mx-auto mb-3" />
              <p className="font-racing text-white/50 text-base tracking-widest mb-1">BELUM ADA KATEGORI</p>
              <p className="font-racing text-xs text-white/30 tracking-wider mb-4">
                Klik tombol di atas untuk membuat kategori baru atau import dari Library.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="font-racing text-xs bg-[#e10600] text-white px-4 py-2 tracking-widest uppercase hover:bg-[#b00000]"
              >
                + Tambah Kategori Pertama
              </button>
            </div>
          ) : (
            event.event_categories.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#2a2a2a] transition-colors"
              >
                <div className="flex items-center gap-3 p-4">
                  <span className="font-racing text-sm text-white/30 w-6 text-center font-bold">
                    0{i + 1}
                  </span>
                  <span className="text-2xl">{cat.icon}</span>
                  <div className="flex-1">
                    <p className="font-racing font-bold text-white text-base tracking-wider">{cat.name}</p>
                    <p className="font-racing text-xs text-white/40 mt-0.5">
                      {cat.candidates.length} kandidat · {cat.lap_count} laps · {cat.voting_duration_seconds} detik
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingCat(editingCat?.id === cat.id ? null : cat)}
                      className="font-racing text-xs text-white/60 hover:text-white border border-[#222] hover:border-[#444] px-3 py-1.5 tracking-widest transition-colors font-bold uppercase"
                    >
                      {editingCat?.id === cat.id ? 'TUTUP' : 'EDIT'}
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      title="Hapus Kategori"
                      className="p-1.5 text-white/20 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Candidate tags summary */}
                {cat.candidates.length > 0 && editingCat?.id !== cat.id && (
                  <div className="px-4 pb-3 flex flex-wrap gap-1.5 border-t border-[#111] pt-2.5">
                    {cat.candidates.map((c) => (
                      <span key={c.id} className="font-racing text-xs bg-[#141414] border border-[#222] px-2.5 py-0.5 text-white/50">
                        {c.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Edit Panel for this Category */}
                <AnimatePresence>
                  {editingCat?.id === cat.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-[#1a1a1a] p-5 space-y-4 bg-[#080808]">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="font-racing text-xs text-white/40 tracking-widest block mb-1">NAMA KATEGORI</label>
                            <input
                              value={editingCat.name}
                              onChange={(e) => setEditingCat((p) => p ? { ...p, name: e.target.value } : null)}
                              className="w-full bg-[#111] border border-[#222] text-white font-racing px-3 py-2 text-sm focus:border-[#e10600] outline-none"
                            />
                          </div>
                          <div>
                            <label className="font-racing text-xs text-white/40 tracking-widest block mb-1">JUMLAH LAP</label>
                            <input
                              type="number" min={1} max={10}
                              value={editingCat.lap_count}
                              onChange={(e) => setEditingCat((p) => p ? { ...p, lap_count: parseInt(e.target.value) || 1 } : null)}
                              className="w-full bg-[#111] border border-[#222] text-white font-racing px-3 py-2 text-sm focus:border-[#e10600] outline-none"
                            />
                          </div>
                          <div>
                            <label className="font-racing text-xs text-white/40 tracking-widest block mb-1">DURASI VOTING (DETIK)</label>
                            <input
                              type="number" min={10} max={300}
                              value={editingCat.voting_duration_seconds}
                              onChange={(e) => setEditingCat((p) => p ? { ...p, voting_duration_seconds: parseInt(e.target.value) || 10 } : null)}
                              className="w-full bg-[#111] border border-[#222] text-white font-racing px-3 py-2 text-sm focus:border-[#e10600] outline-none"
                            />
                          </div>
                        </div>

                        {/* Candidates management */}
                        <div>
                          <p className="font-racing text-xs text-white/40 tracking-widest mb-2">DAFTAR KANDIDAT SISWA</p>
                          <div className="space-y-1.5 mb-3 max-h-48 overflow-y-auto pr-1">
                            {editingCat.candidates.map((c, idx) => (
                              <div key={c.id} className="flex items-center gap-2 bg-[#111] border border-[#1a1a1a] px-3 py-2">
                                <span className="font-racing text-xs text-white/30 w-5">P{idx + 1}</span>
                                <span className="font-racing text-sm text-white flex-1">{c.name}</span>
                                <button onClick={() => removeCandidate(c.id)} className="text-white/20 hover:text-red-500 transition-colors">
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
                              placeholder="Tambah nama siswa..."
                              className="flex-1 bg-[#111] border border-[#222] text-white font-racing px-3 py-2 text-sm focus:border-[#e10600] outline-none"
                            />
                            <button
                              onClick={addCandidate}
                              className="bg-[#222] hover:bg-[#333] border border-[#333] text-white px-4 py-2 font-racing text-xs tracking-wider transition-colors flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" /> TAMBAH
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={saveCategorySettings}
                          disabled={saving}
                          className="w-full bg-[#e10600] hover:bg-[#b00000] text-white font-racing tracking-widest py-2.5 flex items-center justify-center gap-2 transition-colors text-sm font-bold uppercase"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          SIMPAN PERUBAHAN
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* MODAL: Buat Kategori Baru Sendiri */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0e0e0e] border border-[#2a2a2a] p-6 max-w-lg w-full space-y-5 my-8 shadow-2xl relative"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#e10600]" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-racing text-xs text-[#e10600] tracking-[0.3em] uppercase">CUSTOM CATEGORY</p>
                  <h2 className="font-racing text-xl font-bold text-white tracking-wider">BUAT KATEGORI SENDIRI</h2>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-white/40 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Icon Picker */}
              <div>
                <label className="font-racing text-xs text-white/40 tracking-widest block mb-2">PILIH ICON</label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map((ico) => (
                    <button
                      key={ico}
                      type="button"
                      onClick={() => setNewCatForm((p) => ({ ...p, icon: ico }))}
                      className={`text-xl p-2 border transition-colors ${
                        newCatForm.icon === ico ? 'border-[#e10600] bg-[#e10600]/20 scale-110' : 'border-[#222] hover:border-[#444]'
                      }`}
                    >
                      {ico}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name & Description */}
              <div className="space-y-3">
                <div>
                  <label className="font-racing text-xs text-white/40 tracking-widest block mb-1">NAMA KATEGORI *</label>
                  <input
                    value={newCatForm.name}
                    onChange={(e) => setNewCatForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Contoh: Siswa Ter-Chaotic, Raja Tidur, dll"
                    className="w-full bg-[#141414] border border-[#2a2a2a] text-white font-racing px-4 py-2.5 text-sm focus:border-[#e10600] outline-none"
                  />
                </div>
                <div>
                  <label className="font-racing text-xs text-white/40 tracking-widest block mb-1">DESKRIPSI (OPSIONAL)</label>
                  <input
                    value={newCatForm.description}
                    onChange={(e) => setNewCatForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Deskripsi singkat kategori..."
                    className="w-full bg-[#141414] border border-[#2a2a2a] text-white font-racing px-4 py-2.5 text-sm focus:border-[#e10600] outline-none"
                  />
                </div>
              </div>

              {/* Laps & Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-racing text-xs text-white/40 tracking-widest block mb-1">JUMLAH LAP</label>
                  <input
                    type="number" min={1} max={10}
                    value={newCatForm.lap_count}
                    onChange={(e) => setNewCatForm((p) => ({ ...p, lap_count: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-[#141414] border border-[#2a2a2a] text-white font-racing px-3 py-2 text-sm focus:border-[#e10600] outline-none"
                  />
                </div>
                <div>
                  <label className="font-racing text-xs text-white/40 tracking-widest block mb-1">DURASI VOTING (DETIK)</label>
                  <input
                    type="number" min={10} max={300}
                    value={newCatForm.voting_duration_seconds}
                    onChange={(e) => setNewCatForm((p) => ({ ...p, voting_duration_seconds: parseInt(e.target.value) || 10 }))}
                    className="w-full bg-[#141414] border border-[#2a2a2a] text-white font-racing px-3 py-2 text-sm focus:border-[#e10600] outline-none"
                  />
                </div>
              </div>

              {/* Candidates */}
              <div>
                <label className="font-racing text-xs text-white/40 tracking-widest block mb-1.5">
                  KANDIDAT SISWA ({newCatCandidates.length})
                </label>
                <div className="space-y-1.5 mb-2 max-h-36 overflow-y-auto">
                  {newCatCandidates.map((cName, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-[#141414] border border-[#222] px-3 py-1.5">
                      <span className="font-racing text-xs text-white/30">P{idx + 1}</span>
                      <span className="font-racing text-sm text-white flex-1">{cName}</span>
                      <button
                        type="button"
                        onClick={() => setNewCatCandidates((p) => p.filter((_, j) => j !== idx))}
                        className="text-white/30 hover:text-red-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={candidateInput}
                    onChange={(e) => setCandidateInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addCandidateToNew()
                      }
                    }}
                    placeholder="Nama siswa/kandidat..."
                    className="flex-1 bg-[#141414] border border-[#2a2a2a] text-white font-racing px-3 py-2 text-sm focus:border-[#e10600] outline-none"
                  />
                  <button
                    type="button"
                    onClick={addCandidateToNew}
                    className="bg-[#222] hover:bg-[#333] border border-[#333] text-white px-3 py-2 font-racing text-xs uppercase"
                  >
                    Tambah
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-[#333] text-white/60 font-racing tracking-widest py-3 text-sm uppercase hover:border-white/40"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!newCatForm.name.trim() || saving}
                  onClick={handleCreateCustomCategory}
                  className="flex-1 bg-[#e10600] hover:bg-[#b00000] disabled:opacity-40 text-white font-racing tracking-widest py-3 text-sm uppercase font-bold flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  SIMPAN KATEGORI
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: Import dari Library */}
      <AnimatePresence>
        {showLibraryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowLibraryModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0e0e0e] border border-[#2a2a2a] p-6 max-w-lg w-full space-y-4 my-8 shadow-2xl relative"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#e10600]" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-racing text-xs text-yellow-500 tracking-[0.3em] uppercase">CATEGORY LIBRARY</p>
                  <h2 className="font-racing text-xl font-bold text-white tracking-wider">IMPORT DARI LIBRARY</h2>
                </div>
                <button onClick={() => setShowLibraryModal(false)} className="text-white/40 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingLibrary ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 text-[#e10600] animate-spin" />
                </div>
              ) : libraryTemplates.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-[#222]">
                  <p className="font-racing text-white/40 text-sm">Library kosong</p>
                  <Link href="/admin/categories" className="font-racing text-xs text-[#e10600] mt-2 block underline">
                    Buka Category Library →
                  </Link>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {libraryTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="p-3 bg-[#141414] border border-[#222] flex items-center justify-between hover:border-[#444] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{template.icon}</span>
                        <div>
                          <p className="font-racing font-bold text-white tracking-wider">{template.name}</p>
                          <p className="font-racing text-xs text-white/40">
                            {template.candidates?.length || 0} kandidat · {template.default_lap_count} laps · {template.default_voting_duration_seconds}s
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleImportFromLibrary(template)}
                        disabled={saving}
                        className="bg-[#e10600] hover:bg-[#b00000] text-white font-racing text-xs font-bold px-3 py-1.5 tracking-wider uppercase flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> IMPORT
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-[#1a1a1a] flex justify-between items-center">
                <Link
                  href="/admin/categories"
                  className="font-racing text-xs text-white/40 hover:text-white tracking-widest uppercase"
                >
                  Kelola Library →
                </Link>
                <button
                  type="button"
                  onClick={() => setShowLibraryModal(false)}
                  className="font-racing text-xs text-white/50 hover:text-white uppercase tracking-widest px-3 py-1"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-[#333] px-6 py-3 font-racing tracking-wider text-white text-sm z-50 shadow-2xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
