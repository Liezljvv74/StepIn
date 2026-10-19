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
        </header>
        <main>{children}</main>
      </body>
    </html>
  )
}
