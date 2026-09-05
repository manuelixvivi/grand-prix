'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { LapResult, EventCategoryCandidate } from '@/lib/supabase/types'

export type LapResultWithCandidate = LapResult & { candidate: EventCategoryCandidate }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any

export function useLapResults(lapId: string | null) {
  const supabase = createClient() as AnySupabase
  const [results, setResults] = useState<LapResultWithCandidate[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchResults = useCallback(async (id: string) => {
    setIsLoading(true)
    const { data } = await supabase
      .from('lap_results')
      .select('*, candidate:event_category_candidates(*)')
      .eq('lap_id', id)
      .order('position', { ascending: true })
    setResults((data as LapResultWithCandidate[]) ?? [])
    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    if (!lapId) return
    fetchResults(lapId)

    const channel = supabase
      .channel(`lap_results_${lapId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lap_results',
        filter: `lap_id=eq.${lapId}`,
      }, () => fetchResults(lapId))
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [lapId, fetchResults, supabase])

  return { results, isLoading }
}

export function useCurrentLap(eventCategoryId: string | null, lapNumber: number) {
  const supabase = createClient() as AnySupabase
  const [lap, setLap] = useState<{ id: string; status: string; voting_ends_at: string | null } | null>(null)

  useEffect(() => {
    if (!eventCategoryId) {
      setLap(null)
      return
    }
    setLap(null)

    async function fetch() {
      const { data } = await supabase
        .from('laps')
        .select('id, status, voting_ends_at')
        .eq('event_category_id', eventCategoryId!)
        .eq('lap_number', lapNumber)
        .maybeSingle()
      if (data) {
        setLap(data as { id: string; status: string; voting_ends_at: string | null })
      }
    }
    fetch()

    const channel = supabase
      .channel(`lap_${eventCategoryId}_${lapNumber}_${Date.now()}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'laps',
        filter: `event_category_id=eq.${eventCategoryId}`,
      }, () => fetch())
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [eventCategoryId, lapNumber, supabase])

  return lap
}

export function useVoteCounts(lapId: string | null) {
  const supabase = createClient() as AnySupabase
  const [counts, setCounts] = useState<Record<string, number>>({})

  const fetch = useCallback(async (id: string) => {
    const { data } = await supabase
      .from('votes')
      .select('candidate_id')
      .eq('lap_id', id)
    if (!data) return
    const c: Record<string, number> = {}
    ;(data as { candidate_id: string }[]).forEach((v) => { c[v.candidate_id] = (c[v.candidate_id] ?? 0) + 1 })
    setCounts(c)
  }, [supabase])

  useEffect(() => {
    if (!lapId) return
    fetch(lapId)
    const channel = supabase
      .channel(`votes_${lapId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'votes',
        filter: `lap_id=eq.${lapId}`,
      }, () => fetch(lapId))
      .subscribe()
    return () => { channel.unsubscribe() }
  }, [lapId, fetch, supabase])

  return counts
}
