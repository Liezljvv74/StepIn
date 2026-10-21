# StepIn

StepIn sells tickets to events. The owner manages events, ticket prices,
tables and bookings in an admin panel. Customers pick an event, name each
guest, choose a ticket type for each one and pay through Stripe Checkout.

- **Live site:** <https://stepin-virid.vercel.app>
- **Admin panel:** <https://stepin-virid.vercel.app/admin> (also the **Admin** link in the site's footer)
- **Payments:** Stripe **sandbox** only (test keys, test cards, no real money)

Built with Payload CMS 3 inside Next.js 16, Postgres on Neon, Stripe Checkout,
and hosted on Vercel.

## What StepIn sells

Tickets to the owner's events: dances, dinners, functions. Each event has a
name, description, date and time, venue, an optional image, and one or more
**ticket types** (for example *Standard* and *VIP*), each with its own price.
A purchase is for any number of guests, up to the seats left (no limit when
the event has no table plan), and every guest is named and has their own
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
5. **Publish changes** puts the event (and its table plan) on the site.
   **Save Draft** stores changes without showing them: a new event stays
   hidden, and a published one keeps its live version and room until you
   publish.

The web address (slug) is made from the name and the date as you type them (and
again on save), for example `mandjiedans-2026-10-31`, so the same event can run on many dates. Type
your own to override it; it is then kept. Empty it to go back to the generated
one.

**Repeat:** to run an event again, enter **Repeat: number of times** in the
sidebar (1–52), choose **Repeat every** day, week or month (default week), and
save. That many copies are made on later dates at the same local time, with the
same description, venue, image, ticket types, table plan and status (draft or
published), each with its own dated web address. Editing one copy later does
not change the others. Monthly keeps the day of the month, or the month's last
day when it is shorter. This replaces Payload's Duplicate.

Publishing a smaller table plan while guests sit at the tables it would remove
is refused with a message naming those tables and how many guests sit there.
Tick **Confirm: remove
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
  them, or else across the closest run of tables with at least two of them per
  table; a party that cannot be seated whole is left unseated and marked
  **Needs seating**. Seats held by online buyers who are still paying are left
  free for them.
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

**FAQs** holds the questions on the public `/faq` page (the **FAQ** link at the top of every page).
Write a question and its answer, then **Publish**; drafts stay hidden. Drag
rows in the list to change their order.

### Privacy policy

The text of `/privacy` is edited in `/admin` under **Globals → Privacy
policy**. Saving publishes it straight away and updates its "Last updated"
date. Keep it true to what StepIn does (see "Personal data (GDPR)").

## Buying tickets (for customers)

1. Open an event and type how many guests. The form shows how many seats are
   left, and a bigger number becomes that number.
2. Type each guest's name and pick their ticket type.
3. **Buy tickets** holds those seats for 31 minutes and opens Stripe Checkout,
   which also asks for a phone number.
4. After paying, the success page shows **Thank you for Stepping In :-)** once Stripe has
   confirmed the payment (refresh if it says it is still confirming).

The home page lists upcoming events only. When every seat is taken or being
paid for, the event page shows **Sold out**; a past event shows "This event has
already taken place."
An abandoned payment page expires after 31 minutes and its seats are free
again.

**Test cards (sandbox):** `4242 4242 4242 4242` succeeds; `4000 0000 0000 0002`
is declined. Use any future expiry date and any CVC.

## Personal data (GDPR)

The privacy policy is at `/privacy`, edited in `/admin` (Privacy policy),
linked in the footer and under **Buy tickets**. It promises:

- **Bookings** deleted within 30 days after the event, **unpaid orders**
  within 30 days, **paid orders** (with the buyer's email and phone and the
  guest names) kept as long as tax law requires, then deleted by hand in
  `/admin`. A daily
  Vercel cron at 03:00 UTC (`vercel.json`, `/api/cron/cleanup`, protected by
  `CRON_SECRET`) deletes bookings whose event was more than 29 days ago and
  unpaid orders older than 29 days, up to 200 of each per run; any rest goes
  the next day (`src/lib/delete-expired.ts`). Paid orders and events are not
  touched.
- A reply to data requests within one month.

**Handling a data request** (someone emails asking for their data or to have
it deleted):

1. In `/admin`, find their **Orders** with **Filters → Email** (the search box
   only matches the order number), and their **Bookings** by searching the
   party name or phone number.
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
  shows and accepts euros (`300.10`) and converts (`src/components/Euros.tsx`,
  `src/lib/format.ts`).
- An order becomes paid only from the `checkout.session.completed` webhook
  (or `checkout.session.async_payment_succeeded`) with a verified signature
  (`STRIPE_WEBHOOK_SECRET`), and only when Stripe's total equals the order's
  amount.
- The webhook is idempotent: a delivery repeated, even at the same moment,
  never creates a second booking. If the booking cannot be created, the
  webhook answers with an error so Stripe delivers it again.
- Seats are counted and held under a per-event database lock, so two buyers
  cannot take the same last seats.

## Running it locally

You need Node 20.18.1 or later, access to the Neon project **StepIn**, and the
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
   | `NEXT_PUBLIC_SERVER_URL` | `http://localhost:3000` (Stripe return links and password-reset links) |
   | `BLOB_READ_WRITE_TOKEN` | Image storage on Vercel Blob; `vercel env pull` writes it to `.env.local`. Empty: uploads go to the local `media/` folder |
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
npm run test:unit   # seating, repeat dates, euro/cent conversion, Stripe line grouping (no database; 22 tests)
npm run test:int    # bookings, table plans, slug and repeat, checkout (including large parties), webhook, clean-up, FAQs against the dev database (33 tests)
npm test            # both (55 tests)
npm run test:e2e    # browser tests against the dev server on http://localhost:3000 (not part of npm test)
```

The browser tests cover the admin pages, the event form (slug while typing,
editable Repeat and confirm fields), the booking form (Cancel the whole
booking) and the buy form (any number of guests up to the seats left).

The integration tests create and delete their own events, bookings and orders
on the dev branch. Test reports are in [`Reports/`](Reports):
`StepIn-Development-Test-Report.xlsx` (every check made while building, with
fixes) and `StepIn-Functionality-Test-Report.xlsx` (feature tests), both from
19 Oct 2026 and covering Phases 0–1, and
`StepIn-Development-Test-Report-2026-10-20.xlsx` (every check on 20 Oct, PRs
#7–#19, and the 54 automated tests).

## Deployment

- **Vercel project** `stepin`, connected to
  <https://github.com/Liezljvv74/StepIn>. Pushes to `main` deploy production;
  other branches get preview deployments.
- Functions run in `fra1` (Frankfurt, `vercel.json`), next to the database.
- A commit that changes only Markdown files, `docs/` or `Reports/` is not
  built (`ignoreCommand` in `vercel.json`); the last deployment stays live.
- **Environment variables on Vercel:** `DATABASE_URL`,
  `DATABASE_URL_UNPOOLED`, `PAYLOAD_SECRET`, `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`,
  `EMAIL_FROM` and `CRON_SECRET`. The database, Payload
  and Stripe values are stored as sensitive (hidden) values. When
  `NEXT_PUBLIC_SERVER_URL` is not set, Stripe's return links and
  password-reset links use the production domain on production and the
  deployment's own address on previews.
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
     (`npm run vercel-build`) runs `payload migrate` over
     `DATABASE_URL_UNPOOLED` before building (preview builds do not migrate).
- Previews are behind Vercel login, so Stripe cannot reach their webhook and
  purchases there stay pending. Test payments on production or locally.

## Project structure

| Path | What it holds |
|---|---|
| `src/collections/` | `Events`, `Bookings`, `Orders`, `Faqs`, `Media`, `Users` |
| `src/collections/hooks/` | Table plans, repeat events, booking seating and summaries, paid order → booking |
| `src/lib/seating.ts` | Seating rules (pure functions) |
| `src/lib/event-seats.ts` | The one place seats are counted, plus the per-event lock |
| `src/lib/reserve-seats.ts` | Checks a purchase and holds its seats |
| `src/app/(frontend)/` | Public site: event list, event page and buy form, success page, FAQ, privacy policy |
| `src/app/(payload)/api/stripe/webhook/route.ts` | Stripe webhook |
| `src/app/(payload)/api/cron/cleanup/route.ts` | Daily clean-up (Vercel Cron) |
| `src/globals/` | Privacy policy (editable in the admin) and its first text |
| `src/lib/delete-expired.ts` | What the daily clean-up deletes |
| `src/lib/repeat.ts` | Dates for repeated events |
| `src/lib/format.ts`, `src/components/Euros.tsx` | Prices, dates, euro ↔ cents in the admin |
| `src/lib/slug.ts`, `src/components/Slug.tsx` | An event's web address: made on save, shown while typing in the admin |
| `SECURITY.md` | What to do about a data leak |
| `src/migrations/` | Database migrations |
| `tests/unit`, `tests/int`, `tests/e2e` | Automated tests (e2e: Playwright, in a browser) |
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
| 3 | Settings, defaults for new events, regular guests. Repeat events are done (PR #17, without expenses or regulars) | Planned |
| 4 | CSV reports and the door list (Excel, printable page, CSV) | Planned |
| 5 | Automatic close and clean-up of past events (orders are kept). Daily deletion of old bookings and unpaid orders is live (PR #8) | Planned |

### Picking up (status on 2026-10-21)

- **Where things stand:** `main` is live at <https://stepin-virid.vercel.app>
  with Phases 0 and 1, the FAQ, the editable privacy policy, the daily
  clean-up, Resend emails, euro prices, the event form with automatic slug and
  Repeat, and everything up to PR #24. No pull requests are open. The latest:
  #21 (no build for docs-only commits), #22 (`brag-output/` ignored), #23
  (slug shown while typing; Repeat, Confirm and Cancel fields editable again)
  and #24 (any number of guests, up to the seats left; one line per guest).
- **Course submission:** the `submission` remote
  (`TuringCollegeSubmissions/lfouri-AFA.BAI.4.7`) is StepIn's `main` plus the
  course's `408.md`. After merging here, merge `main` into its `main` and push.
- **Next step:** write the build plan
  for Phase 2 from the design document (sections "Data (added)" and "Admin
  screens" → "Event dashboard"), save it under
  `docs/superpowers/plans/`, then build it on a new branch with a pull request.
  The Phase 0/1 plan in that folder shows the format.
- **Before you start:**
  1. `git pull` on `main`.
  2. Start the two terminals from "Running it locally" (the dev server and
     `stripe listen`).
  3. Run `npm test` and expect 55 passing (22 unit, 33 integration).
- **Check on the live site:** make one purchase with guest names (card
  `4242 4242 4242 4242`) and see it under **Bookings** in `/admin`. The two
  online bookings named "Guest 1" came from orders made before names were
  asked for; rename them or leave them.
- **Working rules:**
  - Stop the dev server before switching git branches. When the code changes
    under it, Payload offers to delete tables from the dev database; never
    answer `y`.
  - On Windows, stopping `npm run dev` can leave Next's server running on
    port 3000. A leftover server gives false 500 errors after a branch
    switch; stop it before starting a new one.
  - Every change goes on a branch with a pull request.
  - A change to a collection needs a migration (see "Deployment").
  - Payload makes a `virtual` field read-only in the admin unless it has
    `admin: { readOnly: false }`. Fields staff fill in (Repeat, Confirm, Cancel
    the whole booking) need it.
- **Small follow-ups found in review** (not blocking):
  - Keep a few minutes' margin between the end of the seat hold and Stripe's
    expiry, so a last-second payment can't lose its seats.
  - Refuse lowering seats per table below the guests already seated there.
  - Use the event's own slug for Stripe's cancel link, not the one from the
    form.
  - Turn an out-of-range event id at checkout into a polite refusal.
  - Make the tamper test expect the exact refusal.
  - Stop the Phase 1 and privacy-policy migrations from calling live app code.

## Known issues

- `npm run lint` passes with two warnings: event images use a plain `<img>`
  rather than `next/image` (which would need the Blob host configured).
- The Playwright tests in `tests/e2e` (`npm run test:e2e`) are not part of
  `npm test`. The admin and event-form ones create and delete a
  `dev@payloadcms.com` user in the dev database. The buy-form test only
  checks the seats-left cap when the first upcoming dev event has a table plan.
