import { describe, expect, it } from 'vitest'

import { stripeLines } from '@/lib/stripe-lines'

describe('stripeLines', () => {
  it('groups guests into one line per ticket type', () => {
    expect(
      stripeLines([
        { ticketType: 'Standard', price: 1000 },
        { ticketType: 'VIP', price: 2500 },
        { ticketType: 'VIP', price: 2500 },
      ]),
    ).toEqual([
      { ticketType: 'Standard', price: 1000, quantity: 1 },
      { ticketType: 'VIP', price: 2500, quantity: 2 },
    ])
  })

  it('keeps two ticket types with the same name but different prices apart, so the total matches', () => {
    const guests = [
      { ticketType: 'Adult', price: 1000 },
      { ticketType: 'Adult', price: 1500 },
    ]
    const lines = stripeLines(guests)
    const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0)
    expect(total).toBe(2500)
  })
})
