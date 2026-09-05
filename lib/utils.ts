import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { RaceState } from './supabase/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getVoterId(): string {
  if (typeof window === 'undefined') return ''
  let voterId = localStorage.getItem('cgp_voter_id')
  if (!voterId) {
    voterId = 'voter_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
    localStorage.setItem('cgp_voter_id', voterId)
  }
  return voterId
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m > 0) return `${m}:${s.toString().padStart(2, '0')}`
  return s.toString().padStart(2, '0')
}

export function getPointsForPosition(position: number, scoringConfig?: Record<string, number>): number {
  if (scoringConfig && scoringConfig[position] !== undefined) {
    return scoringConfig[position]
  }
  const defaultScoring: Record<number, number> = {
    1: 25, 2: 18, 3: 15, 4: 12, 5: 10,
    6: 8, 7: 6, 8: 4, 9: 2, 10: 1,
  }
  return defaultScoring[position] ?? 0
}

export function getRaceStateLabel(state: RaceState): string {
  const labels: Record<RaceState, string> = {
    IDLE: 'IDLE',
    READY: 'READY',
    LIGHTS_1: 'LIGHTS — 1',
    LIGHTS_2: 'LIGHTS — 1 2',
    LIGHTS_3: 'LIGHTS — 1 2 3',
    LIGHTS_4: 'LIGHTS — 1 2 3 4',
    LIGHTS_5: 'LIGHTS — 1 2 3 4 5',
    LIGHTS_OUT: 'LIGHTS OUT!',
    VOTING: '🟢 VOTING OPEN',
    VOTING_CLOSED: '🔴 VOTING CLOSED',
    RESULT_REVEAL: 'RESULT REVEAL',
    LAP_COMPLETE: 'LAP COMPLETE',
    FINAL_RESULTS: 'FINAL RESULTS',
    PODIUM: '🏆 PODIUM',
    CHEQUERED_FLAG: '🏁 RACE COMPLETE',
  }
  return labels[state] ?? state
}

export function isVotingState(state: RaceState): boolean {
  return state === 'VOTING'
}

export function isLightsState(state: RaceState): boolean {
  return ['LIGHTS_1', 'LIGHTS_2', 'LIGHTS_3', 'LIGHTS_4', 'LIGHTS_5', 'LIGHTS_OUT'].includes(state)
}

export function getActiveLightCount(state: RaceState): number {
  const map: Partial<Record<RaceState, number>> = {
    LIGHTS_1: 1, LIGHTS_2: 2, LIGHTS_3: 3, LIGHTS_4: 4, LIGHTS_5: 5,
  }
  return map[state] ?? 0
}
