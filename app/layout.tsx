import type { Metadata } from 'next'
import { Inter, Rajdhani } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-rajdhani',
})

export const metadata: Metadata = {
  title: 'Aspire Grand Prix — CAWU 3 : 2026',
  description: 'Aspire Grand Prix — The Ultimate Championship',
  keywords: ['aspire grand prix', 'grand prix', 'voting', 'championship'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${rajdhani.variable} font-sans bg-black text-white antialiased`}>
        {children}
      </body>
    </html>
  )
}
