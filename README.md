# StepIn

A ticketed event page. The owner edits events and ticket prices in the Payload
admin panel; customers buy tickets through Stripe Checkout (sandbox). See
[`CLAUDE.md`](CLAUDE.md) for the full brief and the payment rules.

## Running it

```bash
npm install
npm run dev        # http://localhost:3000, admin at /admin
```

`.env` is not committed. It needs the values listed in `.env.example`. The
database values come from Neon: in a fresh clone, run `neon link` (project
**StepIn**) to pull `DATABASE_URL` into `.env`.

## Status

### Done

- **Project created** from Payload's blank template (Payload 3.91, Next.js,
  npm). Collections so far: `Users` (admin login) and `Media` (uploads).
- **Database:** Neon Postgres project **StepIn** (`fancy-hall-63560516`,
  region `aws-eu-central-1`), linked through `.neon`. Payload has created its
  tables there. `/admin` loads, and the API refuses requests without a login.
- **Skills:** the Payload skills (`payload`, `cms-migration`) are installed in
  `.claude/skills/`; the Stripe plugin is installed for Claude Code.
- **CLAUDE.md** describes the project: a ticketed event page, the CMS half and
  the payment half, and the rules for the payment.
- **GitHub:** pushed to <https://github.com/Liezljvv74/StepIn>.
- **Stripe keys:** sandbox `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_SERVER_URL`
  are in `.env`.
- **Events collection** (`src/collections/Events.ts`): name, slug (name +
  date, e.g. `mandjiedans-2026-10-31`, so repeat dates get their own page),
  description, date and time, venue, image, and ticket types (name and price
  in cents). Drafts are on: the public sees published events only; editing
  needs a login.
- **Orders collection** (`src/collections/Orders.ts`): event, ticket type,
  quantity, amount in cents, email, Stripe session id, status
  (`pending` / `paid`). Admins only over the API.
- **Public pages:** upcoming events at `/`, one page per event at
  `/events/<slug>` with ticket types and a Buy form.
- **Checkout** (`src/app/(frontend)/events/[slug]/checkout.ts`): a Server
  Action reads the price from Payload, creates a pending order and a Stripe
  Checkout Session, and redirects to Stripe. Cancel returns to the event page;
  `/success` shows what the webhook has recorded.
- **Webhook** (`src/app/(payload)/api/stripe/webhook/route.ts`): verifies the
  signature; on `checkout.session.completed` (or
  `async_payment_succeeded`) with `payment_status: paid` it checks the amount
  and moves the order from `pending` to `paid`. A repeated delivery changes
  nothing.
- **Tested end to end** with a temporary event: paid 2 × VIP with card 4242
  on Stripe Checkout, sent the signed event twice. A bad signature returned
  400, and the order became `paid` once with the right amount and email.

### Venue management (from StepIn_Old)

Design: `docs/superpowers/specs/2026-10-19-venue-management-design.md`.

- **Phase 1, bookings and tables (done):**
  - Events have a table plan (shape, number of tables, seats each). It becomes
    numbered tables when the event is published.
  - **Bookings** in the admin: party, telephone and guests, each guest with a
    status, table, ticket type and price. Parties are seated automatically by
    the old app's rule. Cancel one guest or the whole booking. "Needs seating"
    marks parties with an unseated guest.
  - Online checkout asks for each guest's name and ticket type, and holds the
    seats for 31 minutes while the buyer pays. The event page says **Sold out**
    when the room is full.
  - When Stripe confirms payment, the order becomes a booking of paid guests
    (`src/collections/hooks/createBookingFromOrder.ts`).
  - Seat counting lives in one place: `src/lib/event-seats.ts`.
- **Next:** Phase 2, expenses and the event dashboard.

Tests: `npm run test:unit` (seating rules) and `npm run test:int`
(against the dev database).

### Deployment (Vercel)

- Vercel project **stepin** (team `liezl`), connected to the GitHub repo:
  pushes to `main` deploy to production, other branches get previews.
- Functions run in `fra1` (`vercel.json`), next to the Neon database.
- Environment values on Vercel: `DATABASE_URL`, `PAYLOAD_SECRET`,
  `STRIPE_SECRET_KEY`, `BLOB_READ_WRITE_TOKEN`, and the production
  `STRIPE_WEBHOOK_SECRET`. `NEXT_PUBLIC_SERVER_URL` is not set there; checkout
  falls back to Vercel's own URL.
- Images are stored in the Vercel Blob store **stepin-media**. Locally the
  token comes from `.env.local` (`vercel env pull`).
- **Databases.** Production uses the Neon branch **main**. Local development
  and Vercel previews use the branch **dev** (a copy of main made on
  2026-10-19), so local work never touches live data. `.env` points at dev;
  `.neon` names it.
- **Schema changes go through migrations.** Locally, Payload pushes schema
  changes to dev automatically. Before a PR that changes a collection:
  1. `npm run payload migrate:create <name>` and commit the files it writes
     in `src/migrations/`.
  2. Test it on a throwaway branch of main:
     `neon branches create --name migrate-check --parent main`, run
     `npm run payload migrate` with `DATABASE_URL` set to that branch's
     direct connection string, check, then delete the branch.
  3. Merging deploys production, and the production build
     (`npm run vercel-build`) runs `payload migrate` over
     `DATABASE_URL_UNPOOLED` before building.
- Preview deployments are behind Vercel login, so Stripe cannot reach their
  webhook; orders bought on a preview stay `pending`. Test payments on
  production or locally with `stripe listen`.

### Running purchases locally

Keep two terminals open:

```bash
npm run dev
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded --forward-to localhost:3000/api/stripe/webhook
```

The `whsec_…` that `stripe listen` prints is `STRIPE_WEBHOOK_SECRET` in
`.env`; it stays the same between runs.

### Template leftovers to tidy

- `docker-compose.yml` is set up for MongoDB; this project uses Neon
  Postgres. Delete it or switch it to Postgres if Docker is ever wanted.
- `package.json` test scripts call `pnpm`; this project uses npm.
- `npm run lint` fails with an ESLint config error from the template.
