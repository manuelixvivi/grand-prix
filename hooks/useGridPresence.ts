'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any

export function useGridPresence(
  categoryId: string | null,
  voterId?: string,
  sessionStartedAt?: string | null,
  sessionState?: string
) {
  const supabase = useMemo(() => createClient() as AnySupabase, [])
  const [onlineCount, setOnlineCount] = useState<number>(0)
  const [joinedAt, setJoinedAt] = useState<string | null>(null)
  const [isEligible, setIsEligible] = useState<boolean>(true)

  // 1. Manage local join timestamp for this category
  useEffect(() => {
    if (!categoryId || !voterId) return

    const storageKey = `cgp_grid_joined_${categoryId}_${voterId}`
    let storedJoinTime = localStorage.getItem(storageKey)

    const isRaceActive = sessionStartedAt && !['IDLE', 'READY'].includes(sessionState || '')

    if (!storedJoinTime) {
      const now = new Date().toISOString()
      localStorage.setItem(storageKey, now)
      storedJoinTime = now

      // If voter just joined for the first time AFTER race already started:
      if (isRaceActive && sessionStartedAt) {
        if (new Date(now).getTime() > new Date(sessionStartedAt).getTime()) {
          setIsEligible(false)
        }
      }
    } else {
      // Voter had already joined earlier: check eligibility against race start time
      if (isRaceActive && sessionStartedAt) {
        if (new Date(storedJoinTime).getTime() > new Date(sessionStartedAt).getTime()) {
          setIsEligible(false)
        } else {
          setIsEligible(true)
        }
      } else {
        setIsEligible(true)
      }
    }

    setJoinedAt(storedJoinTime)
  }, [categoryId, voterId, sessionStartedAt, sessionState])

  // 2. Realtime Presence Tracking
  useEffect(() => {
    if (!categoryId) return

    const presenceKey = voterId || `viewer_${Math.random().toString(36).substring(2, 9)}`
    const channel = supabase.channel(`grid_presence_${categoryId}`, {
      config: { presence: { key: presenceKey } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const totalUsers = Object.keys(state).length
        setOnlineCount(totalUsers)
      })
      .on('presence', { event: 'join' }, () => {
        const state = channel.presenceState()
        setOnlineCount(Object.keys(state).length)
      })
      .on('presence', { event: 'leave' }, () => {
        const state = channel.presenceState()
        setOnlineCount(Object.keys(state).length)
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            voter_id: voterId || 'viewer',
            joined_at: joinedAt || new Date().toISOString(),
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [categoryId, voterId, joinedAt, supabase])

  return { onlineCount, isEligible, joinedAt }
}
