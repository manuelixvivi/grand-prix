'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { CategoryTemplate } from '@/lib/supabase/types'
import { ArrowLeft, Loader2, Plus, Check } from 'lucide-react'

export default function NewEventPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const router = useRouter()
  const [templates, setTemplates] = useState<(CategoryTemplate & { candidates: { name: string }[] })[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [name, setName] = useState('Class Grand Prix 2026')
  const [year, setYear] = useState(2026)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('category_templates')
        .select('*, candidates:category_template_candidates(*)')
        .eq('is_active', true)
        .order('name')
      setTemplates((data as typeof templates) ?? [])
      setFetchLoading(false)
    }
    fetch()
  }, [supabase])

  const toggleTemplate = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleCreate = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      // Create event
      const { data: event } = await supabase
        .from('events')
        .insert({ name: name.trim(), year, description, status: 'DRAFT' })
        .select()
        .single()

      if (!event) throw new Error('Failed to create event')

      // Add selected categories from templates
      const selectedTemplates = templates.filter((t) => selected.has(t.id))
      for (let i = 0; i < selectedTemplates.length; i++) {
        const t = selectedTemplates[i]
        const { data: cat } = await supabase
          .from('event_categories')
          .insert({
            event_id: event.id,
            template_id: t.id,
            name: t.name,
            description: t.description,
            icon: t.icon,
            lap_count: t.default_lap_count,
            voting_duration_seconds: t.default_voting_duration_seconds,
            scoring_config: t.scoring_config,
            display_order: i + 1,
          })
          .select()
          .single()

        if (cat) {
          // Copy default candidates
          const candidateInserts = t.candidates.map((c, j) => ({
            event_category_id: cat.id,
            name: c.name,
            display_order: j + 1,
          }))
          if (candidateInserts.length > 0) {
            await supabase.from('event_category_candidates').insert(candidateInserts)
          }
        }
      }

      // Set event to READY
      await supabase.from('events').update({ status: 'READY' }).eq('id', event.id)
      router.push(`/admin/events/${event.id}`)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="h-1 bg-[#e10600]" />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/events" className="text-white/40 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="font-racing text-xs text-white/30 tracking-[0.4em]">ADMIN — EVENTS</p>
            <h1 className="font-racing text-2xl font-bold text-white tracking-widest">NEW EVENT</h1>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic info */}
          <div className="space-y-4">
            <p className="font-racing text-xs text-white/30 tracking-[0.3em]">EVENT DETAILS</p>
            <div>
              <label className="font-racing text-xs text-white/40 tracking-widest block mb-1">EVENT NAME</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#222] text-white font-racing px-4 py-3 focus:border-[#e10600] outline-none transition-colors tracking-wider"
                placeholder="Class Grand Prix 2026"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-racing text-xs text-white/40 tracking-widest block mb-1">YEAR</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="w-full bg-[#0a0a0a] border border-[#222] text-white font-racing px-4 py-3 focus:border-[#e10600] outline-none transition-colors"
                />
              </div>
              <div>
                <label className="font-racing text-xs text-white/40 tracking-widest block mb-1">DESCRIPTION (OPTIONAL)</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#222] text-white font-racing px-4 py-3 focus:border-[#e10600] outline-none transition-colors"
                  placeholder="Annual class championship"
                />
              </div>
            </div>
          </div>

          {/* Select categories */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-racing text-xs text-white/30 tracking-[0.3em]">SELECT CATEGORIES FROM LIBRARY</p>
              <span className="font-racing text-xs text-white/30">{selected.size} selected</span>
            </div>

            {fetchLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-[#e10600] animate-spin" /></div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-[#222]">
                <p className="font-racing text-white/30 text-sm tracking-widest">NO TEMPLATES IN LIBRARY</p>
                <Link href="/admin/categories/new" className="font-racing text-xs text-[#e10600] tracking-wider mt-2 block">
                  CREATE TEMPLATE →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => toggleTemplate(t.id)}
                    className={`w-full text-left p-4 border transition-all duration-150 flex items-center gap-4 ${
                      selected.has(t.id)
                        ? 'bg-[#e10600]/10 border-[#e10600]/50 text-white'
                        : 'bg-[#0a0a0a] border-[#1a1a1a] text-white/60 hover:border-[#333]'
                    }`}
                  >
                    <div className={`w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 ${
                      selected.has(t.id) ? 'border-[#e10600] bg-[#e10600]' : 'border-white/20'
                    }`}>
                      {selected.has(t.id) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-xl">{t.icon}</span>
                    <div className="flex-1">
                      <p className="font-racing font-bold tracking-wider">{t.name}</p>
                      <p className="font-racing text-xs text-white/30 mt-0.5">
                        {t.candidates.length} candidates · {t.default_lap_count} laps · {t.default_voting_duration_seconds}s
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Create button */}
          <button
            onClick={handleCreate}
            disabled={!name.trim() || loading}
            className="w-full bg-[#e10600] hover:bg-[#b00000] disabled:opacity-30 disabled:cursor-not-allowed text-white font-racing font-bold text-lg tracking-widest py-4 flex items-center justify-center gap-3 transition-colors"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            CREATE EVENT
          </button>
        </div>
      </div>
    </div>
  )
}
