# StepIn: venue management from StepIn_Old, added to the Payload app

Date: 2026-10-19
Status: approved for build ("Build as you listed")

> **Status (2026-10-20):** Phases 0–1 were built as designed (PRs #3, #4). Since
> then the build differs from the text below:
> - **Repeat** is "Repeat: number of times" (1–52) plus Day/Week/Month on any
>   save, with no custom dates, and copies carry no expenses or regulars
>   (PR #17).
> - **Clean-up** deletes bookings 29 days after the event and unpaid orders
>   after 29 days, at most 200 of each per day, and never deletes events.
>   Retention is fixed, not a Setting (PRs #8, #13).
> - **Seat hold** is 31 minutes.
> - **Phone bookings:** automatic seating leaves online holds free (PR #13).
> - **Admin link** is in the footer (PR #15).
> - **Not built:** Settings, Regulars, expenses, dashboard, new-event defaults,
>   exports.
> - **Added outside this spec:** FAQ, editable privacy policy, booking payment
>   columns, euro price inputs, Resend emails.
>
> The text below is the original design; the code and README are the reference.


## Intent

StepIn sells tickets online today: the owner manages events in Payload's admin
at `/admin`, and customers pay through Stripe Checkout. The owner also ran a
separate, browser-only app (`../StepIn_Old`, spec in `../StepIn_Old/stepin.md`)
that replaced a paper diary: phone bookings, table seating, who has paid,
expenses, a per-event dashboard, regular guests, door lists, auto-close.

This project brings those functions into this Payload app so there is one
system. **Nothing that exists is removed or rewritten; everything is added.**
Online purchases and phone bookings end up in the same bookings list and draw
on the same seats.

## Goals

1. Everything the old app did (as listed below) is available in this app.
2. An online purchase becomes a **paid booking** with named guests, seated
   automatically, and online sales stop when the room is full.
3. The owner works in Payload's admin panel; only what Payload cannot do is
   hand-built.

## Non-goals

- Re-creating the old app's custom screens, their layout rules (compact guest
  lines, two parties abreast, the custom-dates calendar's keyboard model,
  Enter-to-next-line typing). Payload's admin forms replace them.
- Browser storage (IndexedDB), the export-folder picker, the JSON backup and
  import, GitHub Pages, static export. Neon holds the data now.
- A currency setting. Currency stays EUR (`src/lib/format.ts`), as Stripe uses.
- "Delete everything" from the old Settings.
- Automatic Stripe refunds. Cancelling an online guest frees the seat; any
  refund is done by hand in the Stripe Dashboard.
- A visual floor plan (also out of scope in the old app).

## Anti-goals (would make this a failure even if it works)

- Breaking or weakening the payment rules in `CLAUDE.md`: prices from Payload
  on the server, integer cents, paid only from the signed webhook, idempotent
  webhook. A webhook delivered twice must not create two bookings.
- Losing payment records: Orders are never deleted by the clean-up.
- Changing how existing pages, collections or checkout behave beyond what is
  listed here.

## Constraints

- Payload 3.91 in Next.js 16 (App Router), Postgres on Neon, Stripe sandbox,
  deployed on Vercel (Hobby plan: cron at most once a day).
- **Separate databases (Neon review).** Local development and Vercel
  previews use a Neon branch **dev**; production keeps **main**. Schema
  changes reach production only as Payload migration files committed with the
  phase's PR, run by the production build over the direct
  (`DATABASE_URL_UNPOOLED`) connection. Each migration is tested on a
  throwaway Neon branch of main before merging. Dev keeps Payload's schema
  push.
- Built in phases, one PR per phase, each deployable on its own.
- Money in integer cents throughout, as both apps already do.

## Behaviour

The old spec `../StepIn_Old/stepin.md` is the authority for *behaviour* (what
the numbers mean, how seating and regulars work). Its *screen* rules are not
carried over. Where this document differs from it, this document wins.

### Data (added)

- **Event** (existing collection) gains:
  - a **table plan**: lines of shape (long/round/square), number of tables,
    seats per table (default from Settings). The plan generates the event's
    **tables** (number, seats, shape). Re-saving reconciles as in the old app:
    the lowest-numbered tables are kept, the surplus is dropped and its guests
    unseated, new tables are numbered past the highest number ever used. The
    save that would drop tables is refused with a message naming the tables
    and how many guests it would unseat, until a **Confirm** box is ticked.
  - **expenses**: description, amount (cents), provider, paid, notes.
  - no stored "closed" flag: an event is closed once its date + 48 hours has
    passed, worked out where needed.
  - on create only: a **repeat** choice (never, daily, weekly, monthly ×
    count up to 52, or a list of custom dates), as fields that are not saved
    (`virtual`), acted on in `afterChange` on create. Each form starts on
    Never.
  - ticket types stay as they are (name + price); they play the role of the
    old app's ticket prices.
- **Booking** (new collection): event, party name, telephone (required),
  source (`phone` | `online`), order (for online bookings, unique), and
  **guests**: name, status (`paid` | `pay_at_venue` | `not_paying` |
  `cancelled`), table number (nullable), ticket type name, price (cents),
  regular (a relationship to Regulars). Telephone is required for `phone`
  bookings only. Admin-only. The booking also stores a summary worked out on
  every save (has a live guest, has an unseated live guest, guests not
  cancelled), so Payload's own list filters and columns give the amber
  marking and hide all-cancelled parties.
- **Regular** (new collection): name, telephone, table number. Ticking a
  guest as regular creates/links the Regular; deleting a Regular clears the
  link on every guest through the database's own foreign key.
- **Settings** (new global): retention days (default 14, 0 allowed), seats a
  new table starts with (default 10), name of the regulars party (default
  "Regular"), and the **remembered expense lines** (description, amount) for
  the dropdown on the next event; removing a row deletes it for good.
- **Order** (existing) gains: its **guests** (name, ticket type, price), a
  copy of the **event name and date** at purchase, the buyer's phone, and
  **holdUntil** (when its seat hold ends). Its
  `event` relationship becomes optional so the order survives the event's
  deletion. Existing orders are backfilled with the event name and date.

### Online purchase → paid booking

- The event page form becomes a list of guests: quantity (1–10), then one row
  per guest with **name** and **ticket type**. The server prices each guest
  from Payload; Stripe shows one line per ticket type ("VIP × 2").
- Stripe Checkout collects the buyer's phone.
- When the webhook marks the order paid, an Orders `afterChange` hook (status
  `pending` to `paid`, sharing the operation's `req`, so the same transaction)
  creates a Booking: party name = first guest's name, telephone = buyer's
  phone, source `online`, every guest `paid` at their price, seated by the old
  app's rule (the table with least room to spare that still fits the party;
  split across tables if no single one fits, as `planSplitSeating` does). The
  booking's unique `order` makes a concurrent duplicate delivery fail and roll
  back; the route returns an error so Stripe retries, finds the order paid,
  and does nothing. The amount check stays, against the server-side sum of the
  guests' prices.
- **Seat hold:** pressing Buy reserves the seats. Seats available = room
  seats − guests not cancelled − guests on **pending orders whose hold has not
  ended**. The checkout action takes a per-event lock
  (`pg_advisory_xact_lock(event id)`) around the count and the pending order,
  so two buyers cannot take the same last seat. The Stripe session expires
  after 30 minutes (Stripe's minimum) and `holdUntil` is set to the same time,
  so an abandoned checkout frees its seats with no clean-up job.
- **Sold out:** the event page shows "Sold out" at 0 ("All seats are taken or
  being paid for right now, try again in a few minutes"), offers at most the
  remaining seats, and checkout refuses more than are left. An event with no
  tables laid out has no limit (the room is not planned yet). Phone bookings
  in the admin are not limited; the owner may overbook by hand.
- **One counting function** (`src/lib/seating.ts` or similar) reads every
  booking of an event (`pagination: false`) and is the only source for seats
  available, the dashboard and exports, so Payload's default page size of 10
  can never give a wrong figure.

### Admin screens

- **Bookings**: list per event, party with its guests edited together.
  Cancel booking (all guests `cancelled`, seats freed) and cancel a single
  guest. Adding a guest to a party with nobody seated seats them by the rule
  above. Parties with an unseated live guest are marked (amber) in the list;
  parties whose guests are all cancelled are hidden from the default list;
  cancelled guests are listed with their party.
- **Event dashboard**: a custom view on each event in the admin, showing in
  this order: (1) seating — each table with seats, free seats and who sits
  there, plus who is unseated, linking to their bookings; (2) seats still
  available; (3) number of bookings; (4) still to collect (`pay_at_venue`);
  (5) expenses total; (6) expected income (`paid` + `pay_at_venue`);
  (7) expected profit (6 − 5). Online guests count as `paid`.
- **New event** (Payload `defaultValue` functions): dated a week after the
  most recently saved event, on its times; expenses start as a copy of the previous event's; the regulars arrive
  as one party (named from Settings) at their table numbers where the new room
  has them, unpaid (`pay_at_venue`), on the cheapest ticket type. Regulars
  cancelled on the previous event still come. With a repeat chosen, the run of
  events is created with the same plan, ticket types, expenses and regulars.
  Monthly keeps the day of month, falling back to the month's last day.
- **Regulars** and **Settings** as described in the old spec, in Payload's
  admin.
- An **Admin** link on the public site already exists (PR #2).

### Exports (admin-only download links)

- Reports: CSV of guests, tables, expenses for the chosen events (current and
  future by default, or all), event name and date on each row.
- Door list per event: tick box, table, guest name, paid ("yes", blank for pay
  at venue, "no charge" for not paying); cancelled guests left off. As Excel
  (SpreadsheetML `.xls`), a self-contained printable HTML page that remembers
  ticks in the browser, or CSV. Reuse `../StepIn_Old/lib/data-transfer.ts`.

### Auto-close and clean-up

- A daily Vercel cron calls one secured route (`CRON_SECRET`) that deletes
  events whose date is older than 48 hours + retention days: their bookings
  first, then the events (expenses go with the event). **Orders are kept**:
  their `event` link is cleared by the database and they carry the event name
  and date. Payload's jobs queue is not used (it does not auto-run on
  serverless). Shortening retention in Settings is refused with the list of
  events it would delete until a **Confirm** box is ticked.
- Closed events are not on the public site and cannot be bought.

## Calls made after the builder check (not asked of the owner)

- **Drafts.** Seating, sold-out, the dashboard and the webhook read the
  **published** event. A table plan reconciles (tables dropped, guests
  unseated) when it is published, not on a draft save. Events created by a
  repeat are created with the same status as the event they came from; they
  are not linked afterwards. Bookings,
  expenses and regulars may be attached to a draft event (admin-only data).
- **Existing paid orders.** Phase 1 turns every existing paid order into an
  `online` booking: guests named "Guest 1…n", all `paid` at the order's ticket
  price, no phone, seated by the rule. It is part of Phase 1's migration, so
  it runs once on production when that migration runs.
- **When an online party cannot be seated together.** The old rule is kept
  unchanged (`pickTableForParty`, then `planSplitSeating`): a party is seated
  whole or not at all. If neither fits, the whole party is left unseated and
  marked amber for the owner to place by hand.

## Phases (one PR each)

0. Neon dev branch, baseline migration, production build runs migrations.
1. Bookings & tables: Booking collection, table plan on events, online
   purchase → paid booking with guest names and per-guest ticket types,
   seat hold and sold-out, order snapshot fields, backfill of existing orders.
2. Expenses & dashboard: expenses on events, the dashboard view.
3. Settings global (with remembered expense lines), new-event defaults,
   repeat events, regulars.
4. Exports.
5. Auto-close and clean-up.

## Left to the builder

- Field-level layout in the admin, list columns, how amber marking is shown.
- Whether tables are stored as an array on the event or computed from the plan
  plus a stored "highest number used".
- Collection hooks vs. Server Actions vs. custom endpoints for each operation,
  provided the payment rules hold.
- How much of `StepIn_Old/lib/*.ts` is copied versus rewritten; copied logic
  keeps its behaviour.
- One small automated check per money or seating path (webhook idempotency,
  seating rule, dashboard sums).
