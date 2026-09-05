'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Event, EventCategory } from '@/lib/supabase/types'
import { Plus, ArrowLeft, Play, Archive, Eye, ChevronRight, Loader2 } from 'lucide-react'

type EventWithCategories = Event & { event_categories: EventCategory[] }

export default function EventsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const [events, setEvents] = useState<EventWithCategories[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('events')
        .select('*, event_categories(*)')
        .order('created_at', { ascending: false })
      setEvents((data as EventWithCategories[]) ?? [])
      setLoading(false)
    }
    fetch()
  }, [supabase])

  const statusColors: Record<string, string> = {
    DRAFT: 'text-white/40 border-white/10',
    READY: 'text-blue-400 border-blue-800',
    LIVE: 'text-green-400 border-green-700 animate-pulse',
    COMPLETED: 'text-white/30 border-white/10',
    ARCHIVED: 'text-white/20 border-white/5',
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="h-1 bg-[#e10600]" />
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-white/40 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <p className="font-racing text-xs text-white/30 tracking-[0.4em]">ADMIN</p>
              <h1 className="font-racing text-2xl font-bold text-white tracking-widest">EVENTS</h1>
            </div>
          </div>
          <Link href="/admin/events/new">
            <button className="flex items-center gap-2 bg-[#e10600] hover:bg-[#b00000] text-white font-racing text-sm tracking-widest px-4 py-2 transition-colors">
              <Plus className="w-4 h-4" /> NEW EVENT
            </button>
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-[#e10600] animate-spin" /></div>
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-racing text-white/30 tracking-widest mb-4">NO EVENTS YET</p>
            <Link href="/admin/events/new">
              <button className="font-racing text-sm text-[#e10600] tracking-widest hover:underline">CREATE YOUR FIRST EVENT →</button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#333] transition-colors"
              >
                <div className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="font-racing text-base font-bold text-white tracking-wider">{event.name}</h2>
                      <span className={`font-racing text-xs border px-2 py-0.5 tracking-widest ${statusColors[event.status] ?? ''}`}>
                        {event.status}
                      </span>
                    </div>
                    <p className="font-racing text-xs text-white/30 tracking-wider">
                      {event.year} • {event.event_categories.length} categories
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {event.status === 'READY' && (
                      <Link href="/admin">
                        <button className="flex items-center gap-1 bg-[#e10600]/20 border border-[#e10600]/40 text-[#e10600] font-racing text-xs px-3 py-1.5 tracking-widest hover:bg-[#e10600]/30 transition-colors">
                          <Play className="w-3 h-3" /> RUN
                        </button>
                      </Link>
                    )}
                    <Link href={`/admin/events/${event.id}`}>
                      <button className="flex items-center gap-1 text-white/30 hover:text-white font-racing text-xs px-3 py-1.5 border border-[#1a1a1a] hover:border-[#333] tracking-widest transition-colors">
                        <Eye className="w-3 h-3" /> VIEW
                      </button>
                    </Link>
                  </div>
                </div>

                {/* Category pills */}
                {event.event_categories.length > 0 && (
                  <div className="px-4 pb-3 flex flex-wrap gap-2">
                    {event.event_categories.slice(0, 5).map((cat) => (
                      <span key={cat.id} className="font-racing text-xs bg-[#111] border border-[#222] px-2 py-0.5 text-white/40 tracking-wider">
                        {cat.name}
                      </span>
                    ))}
                    {event.event_categories.length > 5 && (
                      <span className="font-racing text-xs text-white/20 tracking-wider">+{event.event_categories.length - 5} more</span>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Nav */}
        <div className="mt-8 pt-4 border-t border-[#111] flex gap-6">
          <Link href="/admin/categories" className="font-racing text-xs text-white/30 hover:text-white tracking-widest">
            CATEGORY LIBRARY →
          </Link>
        </div>
      </div>
    </div>
  )
}
