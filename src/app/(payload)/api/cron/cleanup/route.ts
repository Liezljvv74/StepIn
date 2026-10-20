import config from '@payload-config'
import { getPayload } from 'payload'

import { deleteExpired } from '@/lib/delete-expired'

// Called daily by Vercel Cron (vercel.json), which sends CRON_SECRET as a bearer token.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  const payload = await getPayload({ config })
  const deleted = await deleteExpired(payload)
  payload.logger.info(`Clean-up deleted ${deleted.bookings} bookings, ${deleted.orders} unpaid orders`)
  return Response.json(deleted)
}
