'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Monitor, Smartphone } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="relative min-h-screen bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid opacity-60" />
      
      {/* Speed lines */}
      <div className="absolute inset-0 speed-lines" />
      
      {/* Red accent line top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#e10600]" />
      
      {/* Red accent line bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#e10600]" />

      {/* Checkered corners */}
      <div className="absolute top-1 left-0 w-24 h-6 checkered opacity-30" />
      <div className="absolute top-1 right-0 w-24 h-6 checkered opacity-30" />
      <div className="absolute bottom-1 left-0 w-24 h-6 checkered opacity-30" />
      <div className="absolute bottom-1 right-0 w-24 h-6 checkered opacity-30" />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-4xl mx-auto">
        {/* Year / Season badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <span className="font-racing text-sm tracking-[0.4em] text-[#e10600] font-semibold uppercase border border-[#e10600]/30 px-4 py-1.5 rounded-sm">
            CAWU 3 : 2026
          </span>
        </motion.div>

        {/* Main title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-2"
        >
          <h1 className="font-racing text-7xl sm:text-8xl md:text-9xl font-bold tracking-tight leading-none text-white">
            ASPIRE
          </h1>
          <h1 className="font-racing text-7xl sm:text-8xl md:text-9xl font-bold tracking-tight leading-none text-[#e10600] text-glow-red">
            GRAND PRIX
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="font-racing text-xl sm:text-2xl tracking-[0.5em] text-white/60 uppercase mt-4 mb-12"
        >
          THE GRID IS READY
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="flex flex-col sm:flex-row gap-4 w-full max-w-md"
        >
          <Link href="/vote" className="flex-1">
            <button className="w-full group relative bg-[#e10600] hover:bg-[#b00000] text-white font-racing font-bold text-lg tracking-widest uppercase px-8 py-4 transition-all duration-200 flex items-center justify-center gap-3">
              <Smartphone className="w-5 h-5" />
              ENTER RACE
              <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </Link>
          <Link href="/podium" className="flex-1">
            <button className="w-full group relative bg-transparent border border-white/30 hover:border-white text-white font-racing font-bold text-lg tracking-widest uppercase px-8 py-4 transition-all duration-200 flex items-center justify-center gap-3">
              <Monitor className="w-5 h-5" />
              BIG SCREEN
            </button>
          </Link>
        </motion.div>

        {/* Season status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="mt-16 flex items-center gap-2 text-white/30 text-xs font-racing tracking-[0.3em] uppercase"
        >
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>OFFICIAL BROADCAST SYSTEM</span>
        </motion.div>
      </div>
    </main>
  )
}
