import type { Metadata } from 'next'
import { Noto_Sans_Arabic } from 'next/font/google'
import './globals.css'

const notoArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500'],
  variable: '--font-arabic',
})

export const metadata: Metadata = {
  title: 'هِمَّة',
  description: 'your personal operating system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={notoArabic.variable}>
      <body>{children}</body>
    </html>
  )
}
