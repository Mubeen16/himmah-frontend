import type { Metadata } from 'next'
import { Noto_Sans_Arabic } from 'next/font/google'
import './globals.css'

const notoArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500'],
  variable: '--font-arabic',
})

/** Resolves relative metadata URLs (icons, manifest) on Vercel and locally. */
function metadataBaseUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) {
    return new URL(explicit.endsWith('/') ? explicit.slice(0, -1) : explicit)
  }
  if (process.env.VERCEL_URL) {
    return new URL(`https://${process.env.VERCEL_URL}`)
  }
  return new URL('http://localhost:3000')
}

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl(),
  title: 'Himmah',
  description: 'A personal OS for people serious about who they are becoming.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
  themeColor: '#0f0f0f',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Himmah',
  },
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
