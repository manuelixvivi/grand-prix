'use client'

import { cn } from '@/lib/utils'

interface ConnectionStatusProps {
  isConnected: boolean
  className?: string
}

export function ConnectionStatus({ isConnected, className }: ConnectionStatusProps) {
  return (
    <div className={cn('flex items-center gap-2 text-xs font-racing tracking-widest', className)}>
      <span
        className={cn(
          'w-2 h-2 rounded-full',
          isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-bounce'
        )}
      />
      <span className={isConnected ? 'text-green-400' : 'text-yellow-400'}>
        {isConnected ? 'LIVE' : 'RECONNECTING'}
      </span>
    </div>
  )
}

interface FlagBannerProps {
  flag: string
  className?: string
}

export function FlagBanner({ flag, className }: FlagBannerProps) {
  if (flag === 'NONE') return null
  const config = {
    GREEN: { label: '🟢 GREEN FLAG', color: 'bg-green-500/20 border-green-500 text-green-400' },
    YELLOW: { label: '🟡 YELLOW FLAG', color: 'bg-yellow-500/20 border-yellow-500 text-yellow-400' },
    RED: { label: '🔴 RED FLAG', color: 'bg-red-500/20 border-red-500 text-red-400' },
    CHEQUERED: { label: '🏁 CHEQUERED FLAG', color: 'bg-white/20 border-white text-white' },
  }
  const c = config[flag as keyof typeof config]
  if (!c) return null
  return (
    <div className={cn('border px-4 py-2 text-sm font-racing tracking-widest font-bold text-center', c.color, className)}>
      {c.label}
    </div>
  )
}

interface LapCounterProps {
  current: number
  total: number
  className?: string
}

export function LapCounter({ current, total, className }: LapCounterProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            'w-3 h-3 rounded-full border',
            i < current
              ? 'bg-[#e10600] border-[#e10600]'
              : i === current - 1
              ? 'bg-[#e10600]/60 border-[#e10600] animate-pulse'
              : 'bg-transparent border-white/20'
          )}
        />
      ))}
      <span className="font-racing text-sm text-white/60 tracking-wider">
        LAP {current} / {total}
      </span>
    </div>
  )
}

interface RaceStatusBadgeProps {
  state: string
  className?: string
}

export function RaceStatusBadge({ state, className }: RaceStatusBadgeProps) {
  const config: Record<string, { label: string; color: string }> = {
    IDLE: { label: 'IDLE', color: 'bg-white/10 text-white/50 border-white/20' },
    READY: { label: '🚦 READY', color: 'bg-white/10 text-white border-white/40' },
    LIGHTS_1: { label: '🔴 LIGHTS 1', color: 'bg-red-900/40 text-red-300 border-red-800' },
    LIGHTS_2: { label: '🔴 LIGHTS 2', color: 'bg-red-900/40 text-red-300 border-red-800' },
    LIGHTS_3: { label: '🔴 LIGHTS 3', color: 'bg-red-900/40 text-red-300 border-red-800' },
    LIGHTS_4: { label: '🔴 LIGHTS 4', color: 'bg-red-900/40 text-red-300 border-red-800' },
    LIGHTS_5: { label: '🔴 LIGHTS OUT SOON', color: 'bg-red-500/40 text-red-200 border-red-500' },
    LIGHTS_OUT: { label: '💡 LIGHTS OUT!', color: 'bg-green-900/40 text-green-300 border-green-800' },
    VOTING: { label: '🟢 VOTING OPEN', color: 'bg-green-900/40 text-green-300 border-green-700' },
    VOTING_CLOSED: { label: '🔴 VOTING CLOSED', color: 'bg-red-900/40 text-red-300 border-red-800' },
    RESULT_REVEAL: { label: '📊 RESULTS', color: 'bg-yellow-900/40 text-yellow-300 border-yellow-800' },
    LAP_COMPLETE: { label: '✅ LAP COMPLETE', color: 'bg-blue-900/40 text-blue-300 border-blue-800' },
    FINAL_RESULTS: { label: '🏆 FINAL RESULTS', color: 'bg-yellow-900/40 text-yellow-300 border-yellow-700' },
    PODIUM: { label: '🏆 PODIUM', color: 'bg-yellow-500/30 text-yellow-200 border-yellow-500 animate-pulse' },
    CHEQUERED_FLAG: { label: '🏁 RACE COMPLETE', color: 'bg-white/20 text-white border-white' },
  }
  const c = config[state] ?? { label: state, color: 'bg-white/10 text-white border-white/20' }
  return (
    <span className={cn('border px-3 py-1 text-xs font-racing tracking-widest font-bold', c.color, className)}>
      {c.label}
    </span>
  )
}
