// One Stripe line per ticket type, e.g. "VIP × 2". Grouped by name and price
// together, so two types that share a name can never make Stripe's total
// differ from the order's amount.
export function stripeLines(guests: { ticketType: string; price: number }[]) {
  const lines = new Map<string, { ticketType: string; price: number; quantity: number }>()
  for (const g of guests) {
    const key = `${g.ticketType}\u0000${g.price}`
    const line = lines.get(key) ?? { ticketType: g.ticketType, price: g.price, quantity: 0 }
    line.quantity += 1
    lines.set(key, line)
  }
  return [...lines.values()]
}
