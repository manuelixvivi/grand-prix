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
  title: 'Class Grand Prix 2026',
  description: 'The Ultimate Class Championship',
  keywords: ['grand prix', 'voting', 'class', 'championship'],
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
