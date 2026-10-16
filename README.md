# RegForward AI

Source for the RegForward AI website at [regforwardai.com](https://regforwardai.com). Bolt hosts the published site and manages its database.

## Run locally

Install dependencies with `npm install`, then run `npm run dev`. `npm run build` creates the static output in `dist/`.

The inquiry form needs the Bolt project's public `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` values in a local `.env` file. Bolt provides these values in its project settings. `.env` is ignored by Git and must not be committed.

## Inquiry handling

The public form calls the Bolt Database `submit-inquiry` server function. That function validates and stores the inquiry, then sends an owner notification with Resend from and to `contact@regforwardai.com`. Its `RESEND_API_KEY` is stored in Bolt's secret store, not in this repository.

The `inquiries` table has row level security enabled and no direct access for anonymous or generic authenticated users. Only the server function's service role and Bolt's owner dashboard can access the records. The migrations in `supabase/migrations/` show the setup and subsequent access restrictions in order.

The published form and notification were tested on October 16, 2026. The test submission appeared in Bolt Database and its notification arrived in the contact mailbox.

## Publishing

Changes pushed to GitHub do not automatically update the Bolt deployment. Publish updates from the Bolt project and check the live form after any backend change. The `public/_redirects` file sends the `regforward.ai` aliases to the primary domain.
