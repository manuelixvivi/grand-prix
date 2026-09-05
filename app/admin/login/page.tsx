'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ShieldAlert, Lock, Loader2, Eye, EyeOff } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || '/admin'

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Akses ditolak. Password salah.')
        setPassword('')
      } else {
        router.push(from)
        router.refresh()
      }
    } catch {
      setError('Koneksi gagal. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0c0c0c] border border-[#222] p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Top telemetry line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#e10600]" />

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#1a0a0a] border border-[#e10600]/40 mx-auto flex items-center justify-center mb-4 rounded-sm">
            <Lock className="w-7 h-7 text-[#e10600]" />
          </div>
          <p className="font-racing text-xs text-white/40 tracking-[0.4em] uppercase">
            RESTRICTED ACCESS
          </p>
          <h1 className="font-racing text-2xl font-bold text-white tracking-widest mt-1">
            RACE CONTROL AUTH
          </h1>
          <p className="font-racing text-xs text-white/30 tracking-wider mt-1">
            ASPIRE GRAND PRIX — CAWU 3 : 2026
          </p>
        </div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-3 bg-red-950/40 border border-red-800 text-red-300 flex items-center gap-3 text-xs font-racing tracking-wider"
          >
            <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-500" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-racing text-xs text-white/50 tracking-widest mb-2 uppercase">
              Admin Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoFocus
                disabled={loading}
                className="w-full bg-[#141414] border border-[#2a2a2a] px-4 py-3 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-[#e10600] transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-[#e10600] hover:bg-[#b00000] disabled:opacity-40 disabled:cursor-not-allowed text-white font-racing font-bold tracking-widest text-sm py-3.5 uppercase transition-all duration-200 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                VERIFYING...
              </>
            ) : (
              'ENTER RACE CONTROL'
            )}
          </button>
        </form>

        {/* Security watermark */}
        <div className="mt-8 pt-6 border-t border-[#1a1a1a] text-center">
          <p className="font-racing text-[10px] text-white/20 tracking-widest uppercase">
            AUTHORIZED PERSONNEL ONLY • ACCESS MONITORED
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute inset-0 speed-lines opacity-20" />

      <Suspense
        fallback={
          <div className="text-white font-racing tracking-widest animate-pulse">
            LOADING SECURITY GATEWAY...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  )
}
