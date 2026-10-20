import Link from 'next/link'
import React from 'react'
import './styles.css'

export const metadata = {
  description: 'Tickets for upcoming events.',
  title: 'StepIn',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en">
      <body>
        <header>
          <Link href="/">StepIn</Link>
          <a href="/admin" className="admin-link">
            Admin
          </a>
        </header>
        <main>{children}</main>
        <footer>
          <Link href="/privacy">Privacy</Link>
        </footer>
      </body>
    </html>
  )
}
