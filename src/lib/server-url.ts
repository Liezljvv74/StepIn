// Locally from .env; on Vercel the production domain, or the deployment's own URL on previews.
export const serverUrl =
  process.env.NEXT_PUBLIC_SERVER_URL ??
  `https://${process.env.VERCEL_ENV === 'production' ? process.env.VERCEL_PROJECT_PRODUCTION_URL : process.env.VERCEL_URL}`
