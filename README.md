# StepIn

StepIn sells tickets to events. The owner manages events, ticket prices,
tables and bookings in an admin panel. Customers pick an event, name each
guest, choose a ticket type for each one and pay through Stripe Checkout.

- **Live site:** <https://stepin-virid.vercel.app>
- **Admin panel:** <https://stepin-virid.vercel.app/admin>
- **Payments:** Stripe **sandbox** only (test keys, test cards, no real money)

Built with Payload CMS 3 inside Next.js 16, Postgres on Neon, Stripe Checkout,
and hosted on Vercel.

## What StepIn sells

Tickets to the owner's events: dances, dinners, functions. Each event has a
name, description, date and time, venue, an optional image, and one or more
**ticket types** (for example *Standard* and *VIP*), each with its own price.
A purchase is for 1–10 guests, and every guest is named and has their own
ticket type.

## Using StepIn (for the owner)

Log in at `/admin`. On a new database the first visit shows **Create first
user**; that account is the admin login from then on. Nothing in the admin
needs a code change or a redeploy: the public site reads from the database on
every visit, so a published change is live straight away.

### Events

1. **Events → Create New.**
2. Fill in name and description; under them the web address (slug), date and
   time, and optionally an image; the venue is in the sidebar.
3. **Ticket types:** a name and a price in euros (`25.00`, or `25,00`;
   minimum `0.50`). Add as many as needed.
4. **Table plan** (optional): one line per kind of table: shape (long, round,
   square), number of tables, seats per table. Line one takes the low table
   numbers. No lines means the room is not laid out yet and sales are not
   limited.
5. **Publish changes** puts the event on the site. **Save Draft** keeps it
   hidden and does not change the live room.

The web address (slug) is made from the name and the date on every save, for
example `mandjiedans-2026-10-31`, so the same event can run on many dates. Type
your own to override it; it is then kept. Empty it to go back to the generated
one.

**Repeat:** to run an event again, enter **Repeat: number of times** in the
sidebar (1–52), choose **Repeat every** day, week or month, and save. That many
copies are made on later dates at the same local time, with the same ticket
types, table plan and status (draft or published). Monthly keeps the day of the
month, or the month's last day when it is shorter. This replaces Payload's
Duplicate.

Shrinking a table plan while guests sit at the tables it would remove is
refused with a message naming the tables and guests. Tick **Confirm: remove
tables where guests are seated** and publish again to go ahead; those guests
become unseated.

Deleting an event deletes its bookings too. Its orders are kept and still show
the event's name and date.

### Bookings

**Bookings** lists every party coming to an event, both phone bookings and
online purchases.

- **Phone booking:** party name, telephone (required), and the guests. Each
  guest has a status (*Paid*, *Pay at venue*, *Not paying*, *Cancelled*), a
  table, a ticket type and a price in euros. A new party is seated
  automatically at the table with the least room to spare that still fits
  them, or across neighbouring tables if none fits. Seats held by online
  buyers who are still paying are left free for them.
- **Online booking:** created automatically when Stripe confirms a payment,
  with the guests' names, all *Paid*, and the buyer's phone from Stripe.
  It shows the buyer's email, amount (in euros) and paid status from its order (in the
  list and the sidebar); the order itself stays under **Orders**.
- **Cancel one guest:** set their status to *Cancelled*; the seat is freed.
- **Cancel the whole booking:** tick **Cancel the whole booking** and save.
  Parties whose guests are all cancelled leave the list.
- **Needs seating** is ticked on any party with a guest who has no table, so
  they can be found and placed.

### Orders

**Orders** is the payment record for online purchases: guests, amount, buyer
email and phone, Stripe session, and status (*pending* or *paid*). An order is
marked paid only by Stripe's verified webhook, never by the success page.

### FAQ

**FAQs** holds the questions on the public `/faq` page (linked in the footer).
Write a question and its answer, then **Publish**; drafts stay hidden. Drag
rows in the list to change their order.

### Privacy policy

The text of `/privacy` is edited in `/admin` under **Globals → Privacy
policy**. Saving publishes it straight away and updates its "Last updated"
date. Keep it true to what StepIn does (see "Personal data (GDPR)").

## Buying tickets (for customers)

1. Open an event and choose how many guests (1–10).
2. Type each guest's name and pick their ticket type.
3. **Buy tickets** holds those seats for 31 minutes and opens Stripe Checkout,
   which also asks for a phone number.
4. After paying, the success page shows **Thank you for Stepping In :-)** once Stripe has
   confirmed the payment (refresh if it says it is still confirming).

When every seat is taken or being paid for, the event page shows **Sold out**.
An abandoned payment page expires after 31 minutes and its seats are free
again.

**Test cards (sandbox):** `4242 4242 4242 4242` succeeds; `4000 0000 0000 0002`
is declined. Use any future expiry date and any CVC.

## Personal data (GDPR)

The privacy policy is at `/privacy`, edited in `/admin` (Privacy policy),
linked in the footer and under **Buy tickets**. It promises:

- **Bookings** deleted within 30 days after the event, **unpaid orders**
  within 30 days, **paid orders** kept as long as tax law requires. A daily
  Vercel cron (`vercel.json`, `/api/cron/cleanup`) deletes bookings whose event
  was more than 29 days ago and unpaid orders older than 29 days
  (`src/lib/delete-expired.ts`). Paid orders and events are not touched.
- A reply to data requests within one month.

**Handling a data request** (someone emails asking for their data or to have
it deleted):

1. In `/admin`, search **Orders** by email and **Bookings** by phone or name.
2. **Copy:** send them what you found (a screenshot or the fields copied into
   the email).
3. **Delete:** delete their orders; each order's booking is deleted with it.
   Delete phone bookings in **Bookings**. A paid order the law says you must
   keep stays, and you tell them so.
4. Stripe keeps its own copy of the payment; point them to Stripe's privacy
   policy for that.

If data leaks, follow `SECURITY.md`.

## How payment works

- Prices come from the database on the server. The browser only sends the
  event, the guests' names and the ticket types they chose.
- Money is stored in integer cents, as Stripe's `unit_amount` is. The admin
  shows and accepts euros (`300.10`) and converts (`src/components/Euros.tsx`).
- An order becomes paid only from the `checkout.session.completed` webhook
  (or `checkout.session.async_payment_succeeded`) with a verified signature
  (`STRIPE_WEBHOOK_SECRET`).
- The webhook is idempotent: a delivery repeated, even at the same moment,
  never creates a second booking. If the booking cannot be created, the
  webhook answers with an error so Stripe delivers it again.
- Seats are counted and held under a per-event database lock, so two buyers
  cannot take the same last seats.

## Running it locally

You need Node 20+, access to the Neon project **StepIn**, and the
[Stripe CLI](https://docs.stripe.com/stripe-cli) logged in to the sandbox.

1. `npm install`
2. Create `.env` from `.env.example` (it is never committed):

   | Variable | What it is |
   |---|---|
   | `DATABASE_URL` | Neon **dev** branch, pooled connection |
   | `DATABASE_URL_UNPOOLED` | Neon **dev** branch, direct connection |
   | `PAYLOAD_SECRET` | Any long random string |
   | `STRIPE_SECRET_KEY` | Stripe sandbox secret key (`sk_test_…`) |
   | `STRIPE_WEBHOOK_SECRET` | The `whsec_…` that `stripe listen` prints |
   | `NEXT_PUBLIC_SERVER_URL` | `http://localhost:3000` |
   | `BLOB_READ_WRITE_TOKEN` | Image storage; `vercel env pull` writes it to `.env.local` |
   | `RESEND_API_KEY` | Resend key for admin emails (password reset). Empty: the email is printed in the dev server log |
   | `CRON_SECRET` | Any long random string; Vercel Cron sends it to the clean-up route |
   | `EMAIL_FROM` | Sender address on a domain verified in Resend. Empty: `onboarding@resend.dev`, which only delivers to your own Resend account's email |

   `neon connection-string dev` (pooled with `--pooled`) prints the database
   values.
3. Run the app and the webhook forwarding in two terminals:

   ```bash
   npm run dev
   stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded --forward-to localhost:3000/api/stripe/webhook
   ```

4. Open <http://localhost:3000> for the site and <http://localhost:3000/admin>
   for the admin panel.

Local work uses the Neon **dev** branch, so it never touches live data.

## Tests

```bash
npm run test:unit   # seating rules and Stripe line grouping (no database)
npm run test:int    # Payload, bookings, checkout and webhook against the dev database
npm test            # both
```

The integration tests create and delete their own events, bookings and orders
on the dev branch. Test reports are in [`Reports/`](Reports):
`StepIn-Development-Test-Report.xlsx` (every check made while building, with
fixes) and `StepIn-Functionality-Test-Report.xlsx` (feature tests).

## Deployment

- **Vercel project** `stepin`, connected to
  <https://github.com/Liezljvv74/StepIn>. Pushes to `main` deploy production;
  other branches get preview deployments.
- Functions run in `fra1` (Frankfurt, `vercel.json`), next to the database.
- **Environment variables on Vercel:** `DATABASE_URL`,
  `DATABASE_URL_UNPOOLED`, `PAYLOAD_SECRET`, `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`,
  `EMAIL_FROM` and `CRON_SECRET`. The database, Payload
  and Stripe values are stored as sensitive (hidden) values. Checkout uses Vercel's own address when
  `NEXT_PUBLIC_SERVER_URL` is not set.
- **Stripe webhook** for production:
  `https://stepin-virid.vercel.app/api/stripe/webhook`, events
  `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
- **Images** are stored in the Vercel Blob store `stepin-media`.
- **Databases:** production uses the Neon branch **main**; local development
  and previews use **dev**.
- **Schema changes** reach production as Payload migrations in
  `src/migrations/`:
  1. After changing a collection, run `npm run payload migrate:create <name>`
     and commit the files it writes.
  2. Test it on a throwaway copy of production:
     `neon branches create --name migrate-check --parent main`, run
     `npm run payload migrate` with `DATABASE_URL` set to that branch's direct
     connection string, check the result, then delete the branch.
  3. Merging to `main` deploys production; the production build
     (`npm run vercel-build`) runs `payload migrate` before building.
- Previews are behind Vercel login, so Stripe cannot reach their webhook and
  purchases there stay pending. Test payments on production or locally.

## Project structure

| Path | What it holds |
|---|---|
| `src/collections/` | `Events`, `Bookings`, `Orders`, `Media`, `Users` |
| `src/collections/hooks/` | Table plans, booking seating and summaries, paid order → booking |
| `src/lib/seating.ts` | Seating rules (pure functions) |
| `src/lib/event-seats.ts` | The one place seats are counted, plus the per-event lock |
| `src/lib/reserve-seats.ts` | Checks a purchase and holds its seats |
| `src/app/(frontend)/` | Public site: event list, event page and buy form, success page |
| `src/app/(payload)/api/stripe/webhook/route.ts` | Stripe webhook |
| `src/migrations/` | Database migrations |
| `tests/unit`, `tests/int` | Automated tests |
| `docs/superpowers/` | Design and build plan for the venue-management features |
| `Reports/` | Test reports |
| `CLAUDE.md` | Project brief and the payment rules for AI agents |

## Built with agent skills

The Payload skills (`payload`, `cms-migration`, in `.claude/skills/`) and the
Stripe plugin for Claude Code were installed before any app code was written.
`CLAUDE.md` tells agents to use them for collections, hooks, Checkout and
webhooks.

## What comes next

StepIn is gaining the venue-management features of the owner's earlier diary
app. Design: `docs/superpowers/specs/2026-10-19-venue-management-design.md`.

| Phase | What | State |
|---|---|---|
| 0 | Separate dev and production databases, migrations (PR #3) | **Live** |
| 1 | Bookings, table plans, seating, per-guest checkout with seat hold (PR #4) | **Live** |
| 2 | Expenses per event and an event dashboard: seating, seats left, bookings, money still to collect, expenses, income, profit | Next |
| 3 | Settings, defaults for new events, repeat events, regular guests | Planned |
| 4 | CSV reports and the door list (Excel, printable page, CSV) | Planned |
| 5 | Automatic close and clean-up of past events (orders are kept). Daily deletion of old bookings and unpaid orders is live (PR #8) | Planned |

### Picking up (status on 2026-10-20)

- **Where things stand:** `main` is live at <https://stepin-virid.vercel.app>
  with Phases 0 and 1, and its migrations have run on production. No branches
  or pull requests are open.
- **Next step:** write the build plan for Phase 2 from the design document
  (sections "Data", "Admin screens: Event dashboard"), save it under
  `docs/superpowers/plans/`, then build it on a new branch with a pull request.
  The Phase 0/1 plan in that folder shows the format.
- **Before you start:**
  1. `git pull` on `main`.
  2. Start the two terminals from "Running it locally" (the dev server and
     `stripe listen`).
  3. Run `npm test` and expect 40 passing.
- **Check on the live site:** make one purchase with guest names (card
  `4242 4242 4242 4242`) and see it under **Bookings** in `/admin`. The two
  online bookings named "Guest 1" came from orders made before names were
  asked for; rename them or leave them.
- **Working rules:**
  - Stop the dev server before switching git branches. When the code changes
    under it, Payload offers to delete tables from the dev database; never
    answer `y`.
  - Every change goes on a branch with a pull request.
  - A change to a collection needs a migration (see "Deployment").
- **Small follow-ups found in review** (not blocking):
  - Keep a few minutes' margin between the end of the seat hold and Stripe's
    expiry, so a last-second payment can't lose its seats.
  - Refuse lowering seats per table below the guests already seated there.
  - Use the event's own slug for Stripe's cancel link, not the one from the
    form.
  - Turn an out-of-range event id at checkout into a polite refusal.
  - Make the tamper test expect the exact refusal.
  - Stop the Phase 1 migration from calling live app code.

## Known issues

- `npm run lint` fails with an ESLint configuration error inherited from the
  Payload template; it does not affect the build or the tests.
- Some template files are not used by StepIn: `docker-compose.yml` (set up for
  MongoDB), `Dockerfile`, `test.env` and the Playwright tests in `tests/e2e`.
