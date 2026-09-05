'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { CategoryTemplate } from '@/lib/supabase/types'
import { ArrowLeft, Plus, Edit2, Trash2, Copy, Loader2, X, Save, ChevronDown, ChevronUp } from 'lucide-react'

type TemplateWithCandidates = CategoryTemplate & { candidates: { id: string; name: string; display_order: number }[] }

export default function CategoryLibraryPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const [templates, setTemplates] = useState<TemplateWithCandidates[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState({ name: '', description: '', icon: '🏆', default_lap_count: 3, default_voting_duration_seconds: 30 })
  const [candidates, setCandidates] = useState<{ id?: string; name: string }[]>([])
  const [newCandidate, setNewCandidate] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from('category_templates')
      .select('*, candidates:category_template_candidates(*)')
      .order('name')
    setTemplates((data as TemplateWithCandidates[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchTemplates() }, [])

  const openNew = () => {
    setForm({ name: '', description: '', icon: '🏆', default_lap_count: 3, default_voting_duration_seconds: 30 })
    setCandidates([])
    setEditingId('new')
  }

  const openEdit = (t: TemplateWithCandidates) => {
    setForm({ name: t.name, description: t.description ?? '', icon: t.icon ?? '🏆', default_lap_count: t.default_lap_count, default_voting_duration_seconds: t.default_voting_duration_seconds })
    setCandidates(t.candidates.sort((a, b) => a.display_order - b.display_order).map((c) => ({ id: c.id, name: c.name })))
    setEditingId(t.id)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editingId === 'new') {
        const { data: t } = await supabase
          .from('category_templates')
          .insert({ name: form.name, description: form.description, icon: form.icon, default_lap_count: form.default_lap_count, default_voting_duration_seconds: form.default_voting_duration_seconds, is_active: true })
          .select().single()
        if (t && candidates.length > 0) {
          await supabase.from('category_template_candidates').insert(
            candidates.map((c, i) => ({ template_id: t.id, name: c.name, display_order: i + 1 }))
          )
        }
        showToast('Template created')
      } else {
        await supabase.from('category_templates').update({ name: form.name, description: form.description, icon: form.icon, default_lap_count: form.default_lap_count, default_voting_duration_seconds: form.default_voting_duration_seconds }).eq('id', editingId!)

        // Sync candidates: delete all and re-insert
        await supabase.from('category_template_candidates').delete().eq('template_id', editingId!)
        if (candidates.length > 0) {
          await supabase.from('category_template_candidates').insert(
            candidates.map((c, i) => ({ template_id: editingId!, name: c.name, display_order: i + 1 }))
          )
        }
        showToast('Template updated')
      }
      await fetchTemplates()
      setEditingId(null)
    } catch { showToast('Error saving') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template? This cannot be undone.')) return
    await supabase.from('category_templates').delete().eq('id', id)
    await fetchTemplates()
    showToast('Template deleted')
  }

  const handleDuplicate = async (t: TemplateWithCandidates) => {
    const { data: copy } = await supabase
      .from('category_templates')
      .insert({ name: `${t.name} — Copy`, description: t.description, icon: t.icon, default_lap_count: t.default_lap_count, default_voting_duration_seconds: t.default_voting_duration_seconds })
      .select().single()
    if (copy && t.candidates.length > 0) {
      await supabase.from('category_template_candidates').insert(
        t.candidates.map((c) => ({ template_id: copy.id, name: c.name, display_order: c.display_order }))
      )
    }
    await fetchTemplates()
    showToast('Template duplicated')
  }

  const ICONS = ['🏆', '🌪️', '🗣️', '😴', '⭐', '😂', '🤫', '🏃', '💬', '🔥', '🎭', '🎯', '🧠', '💤', '😎']

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="h-1 bg-[#e10600]" />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin/events" className="text-white/40 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
            <div>
              <p className="font-racing text-xs text-white/30 tracking-[0.4em]">ADMIN</p>
              <h1 className="font-racing text-2xl font-bold text-white tracking-widest">CATEGORY LIBRARY</h1>
            </div>
          </div>
          <button onClick={openNew} className="flex items-center gap-2 bg-[#e10600] hover:bg-[#b00000] text-white font-racing text-sm tracking-widest px-4 py-2 transition-colors">
            <Plus className="w-4 h-4" /> NEW
          </button>
        </div>

        {/* Edit/New form */}
        <AnimatePresence>
          {editingId && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-[#0a0a0a] border border-[#e10600]/30 p-5 mb-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <p className="font-racing text-sm text-white tracking-widest">{editingId === 'new' ? 'NEW TEMPLATE' : 'EDIT TEMPLATE'}</p>
                <button onClick={() => setEditingId(null)} className="text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              {/* Icon picker */}
              <div>
                <label className="font-racing text-xs text-white/30 tracking-widest block mb-2">ICON</label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map((ico) => (
                    <button key={ico} onClick={() => setForm((p) => ({ ...p, icon: ico }))}
                      className={`text-xl p-2 border transition-colors ${form.icon === ico ? 'border-[#e10600] bg-[#e10600]/10' : 'border-[#222] hover:border-[#444]'}`}>
                      {ico}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="font-racing text-xs text-white/30 tracking-widest block mb-1">NAME</label>
                  <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full bg-[#111] border border-[#222] text-white font-racing px-3 py-2 focus:border-[#e10600] outline-none"
                    placeholder="Most Chaotic Driver" />
                </div>
                <div>
                  <label className="font-racing text-xs text-white/30 tracking-widest block mb-1">DESCRIPTION</label>
                  <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    className="w-full bg-[#111] border border-[#222] text-white font-racing px-3 py-2 focus:border-[#e10600] outline-none"
                    placeholder="The driver most likely to create chaos" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-racing text-xs text-white/30 tracking-widest block mb-1">DEFAULT LAPS</label>
                    <input type="number" min={1} max={10} value={form.default_lap_count}
                      onChange={(e) => setForm((p) => ({ ...p, default_lap_count: parseInt(e.target.value) }))}
                      className="w-full bg-[#111] border border-[#222] text-white font-racing px-3 py-2 focus:border-[#e10600] outline-none" />
                  </div>
                  <div>
                    <label className="font-racing text-xs text-white/30 tracking-widest block mb-1">DEFAULT DURATION (S)</label>
                    <input type="number" min={10} max={300} value={form.default_voting_duration_seconds}
                      onChange={(e) => setForm((p) => ({ ...p, default_voting_duration_seconds: parseInt(e.target.value) }))}
                      className="w-full bg-[#111] border border-[#222] text-white font-racing px-3 py-2 focus:border-[#e10600] outline-none" />
                  </div>
                </div>
              </div>

              {/* Default candidates */}
              <div>
                <label className="font-racing text-xs text-white/30 tracking-widest block mb-2">DEFAULT CANDIDATES</label>
                <div className="space-y-1 mb-2">
                  {candidates.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 bg-[#111] border border-[#1a1a1a] px-3 py-2">
                      <span className="font-racing text-sm text-white flex-1">{c.name}</span>
                      <button onClick={() => setCandidates((p) => p.filter((_, j) => j !== i))} className="text-white/20 hover:text-[#e10600]"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={newCandidate} onChange={(e) => setNewCandidate(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && newCandidate.trim()) { setCandidates((p) => [...p, { name: newCandidate.trim() }]); setNewCandidate('') } }}
                    placeholder="Add default candidate..."
                    className="flex-1 bg-[#111] border border-[#222] text-white font-racing px-3 py-2 text-sm focus:border-[#e10600] outline-none" />
                  <button onClick={() => { if (newCandidate.trim()) { setCandidates((p) => [...p, { name: newCandidate.trim() }]); setNewCandidate('') } }}
                    className="bg-[#222] hover:bg-[#333] border border-[#333] text-white px-3 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button onClick={handleSave} disabled={!form.name || saving}
                className="w-full bg-[#e10600] hover:bg-[#b00000] disabled:opacity-30 text-white font-racing tracking-widest py-3 flex items-center justify-center gap-2 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                SAVE TEMPLATE
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Templates list */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-[#e10600] animate-spin" /></div>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#0a0a0a] border border-[#1a1a1a]">
                <div className="flex items-center gap-3 p-4">
                  <span className="text-xl">{t.icon}</span>
                  <div className="flex-1">
                    <p className="font-racing font-bold text-white tracking-wider">{t.name}</p>
                    <p className="font-racing text-xs text-white/30">
                      {t.candidates.length} candidates · {t.default_lap_count} laps · {t.default_voting_duration_seconds}s
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleDuplicate(t)} className="p-2 text-white/20 hover:text-white transition-colors" title="Duplicate"><Copy className="w-4 h-4" /></button>
                    <button onClick={() => openEdit(t)} className="p-2 text-white/20 hover:text-white transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(t.id)} className="p-2 text-white/20 hover:text-[#e10600] transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {t.candidates.length > 0 && (
                  <div className="px-4 pb-3 flex flex-wrap gap-1">
                    {t.candidates.map((c) => (
                      <span key={c.id} className="font-racing text-xs bg-[#111] border border-[#1a1a1a] px-2 py-0.5 text-white/30">{c.name}</span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
            {templates.length === 0 && (
              <div className="text-center py-16 border border-dashed border-[#222]">
                <p className="font-racing text-white/30 tracking-widest mb-3">NO TEMPLATES YET</p>
                <button onClick={openNew} className="font-racing text-xs text-[#e10600] tracking-widest hover:underline">CREATE YOUR FIRST TEMPLATE →</button>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-[#333] px-6 py-3 font-racing tracking-wider text-white text-sm z-50">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
