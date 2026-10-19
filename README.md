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

### Next

1. **Stripe keys.** Add the sandbox secret key (`sk_test_…`, from the
   Stripe Dashboard → Developers → API keys) to `.env` as
   `STRIPE_SECRET_KEY`. Set `NEXT_PUBLIC_SERVER_URL=http://localhost:3000`.
2. **Admin user.** Open `/admin` and create the first admin user.
3. **Events collection.** Name, description, date and time, venue, image,
   and a list of ticket types, each with a name and a price in cents. Public
   read access, editing for logged-in admins only. Run
   `npm run generate:types` afterwards.
4. **Orders collection.** Event, ticket type, quantity, amount, customer
   email, Stripe session id, status (`pending` / `paid`). Not publicly
   readable.
5. **Public pages** in `src/app/(frontend)`: a list of upcoming events and a
   page per event with its ticket types and a Buy button. Replace the
   template's placeholder home page.
6. **Checkout.** A server route that looks up the price in Payload, creates
   a pending order and a Stripe Checkout Session, then redirects to Stripe.
   Add success and cancel pages.
7. **Webhook.** `/api/stripe/webhook`: verify the signature with
   `STRIPE_WEBHOOK_SECRET`, and on `checkout.session.completed` mark the
   order paid, once only. Test locally with
   `stripe listen --forward-to localhost:3000/api/stripe/webhook`, which
   prints the webhook secret to use.
8. **Seed content.** Three or four events in the admin panel.
9. **Deploy** to Vercel with the same environment values, and register the
   deployed webhook URL in the Stripe Dashboard.

### Template leftovers to tidy

- `docker-compose.yml` is set up for MongoDB; this project uses Neon
  Postgres. Delete it or switch it to Postgres if Docker is ever wanted.
- `package.json` test scripts call `pnpm`; this project uses npm.
