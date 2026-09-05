'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RaceSession, EventCategory, EventCategoryCandidate } from '@/lib/supabase/types'

export interface RaceStateData {
  session: RaceSession | null
  category: (EventCategory & { candidates: EventCategoryCandidate[] }) | null
  isConnected: boolean
  isLoading: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any

export function useRaceSession(eventCategoryId: string | null) {
  const supabase = createClient() as AnySupabase
  const [data, setData] = useState<RaceStateData>({
    session: null,
    category: null,
    isConnected: false,
    isLoading: true,
  })
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchSession = useCallback(async (categoryId: string) => {
    const [sessionRes, categoryRes] = await Promise.all([
      supabase
        .from('race_sessions')
        .select('*')
        .eq('event_category_id', categoryId)
        .maybeSingle(),
      supabase
        .from('event_categories')
        .select('*, candidates:event_category_candidates(*)')
        .eq('id', categoryId)
        .single(),
    ])

    const categoryData = categoryRes.data as (EventCategory & { candidates: EventCategoryCandidate[] }) | null

    setData((prev) => ({
      ...prev,
      session: (sessionRes.data as RaceSession | null) ?? null,
      category: categoryData
        ? {
            ...categoryData,
            candidates: categoryData.candidates.sort(
              (a: EventCategoryCandidate, b: EventCategoryCandidate) => a.display_order - b.display_order
            ),
          }
        : null,
      isLoading: false,
    }))
  }, [supabase])

  useEffect(() => {
    if (!eventCategoryId) {
      setData((prev) => ({ ...prev, isLoading: false }))
      return
    }

    fetchSession(eventCategoryId)

    const channel = supabase
      .channel(`race_session_${eventCategoryId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'race_sessions',
          filter: `event_category_id=eq.${eventCategoryId}`,
        },
        (payload: { eventType: string; new: RaceSession }) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setData((prev) => ({
              ...prev,
              session: payload.new,
            }))
          }
        }
      )
      .subscribe((status: string) => {
        setData((prev) => ({
          ...prev,
          isConnected: status === 'SUBSCRIBED',
        }))
      })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
    }
  }, [eventCategoryId, fetchSession, supabase])

  return data
}

export function useActiveEvent() {
  const supabase = createClient() as AnySupabase
  const [event, setEvent] = useState<{ id: string; name: string; current_category_id: string | null } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('events')
        .select('id, name, current_category_id')
        .eq('status', 'LIVE')
        .limit(1)
        .maybeSingle()
      setEvent(data as { id: string; name: string; current_category_id: string | null } | null)
      setIsLoading(false)
    }
    fetch()

    const channel = supabase
      .channel('active_event')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events' }, () => {
        fetch()
      })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [supabase])

  return { event, isLoading }
}
