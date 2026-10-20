# Security and data breaches

Report a security problem or a data leak to Liezl Fourie,
<liezl.fourie@amplivine.world>.

## If personal data may have leaked

1. **Stop it.** Rotate every key that could be involved, in its own dashboard,
   then update it on Vercel and redeploy:
   - `PAYLOAD_SECRET` (logs every admin out)
   - `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`
   - the Neon database password (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`)
   - `RESEND_API_KEY`
   - `BLOB_READ_WRITE_TOKEN`

   Change the admin passwords in `/admin`.
2. **Find out what happened.** Check the Vercel logs and the Neon dashboard:
   what was exposed, whose data, since when.
3. **Write it down** in the log below, even if you decide nobody has to be told.
4. **Tell the regulator within 72 hours** of finding out (GDPR Art. 33),
   unless the leak is unlikely to harm anyone. Use your country's data
   protection authority; its website has a breach form.
5. **Tell the people affected** without delay if the risk to them is high
   (Art. 34), for example if names with phone numbers or emails leaked.

Neon branches copied from production (such as `migrate-check`) hold real
personal data too: delete them as soon as you are done with them.

## Breach log

| Date found | What happened | Data and people affected | What was done | Regulator told? |
|---|---|---|---|---|
| | | | | |
