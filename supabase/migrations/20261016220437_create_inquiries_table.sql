/*
# Create inquiries table (single-tenant, no auth)

## Purpose
Stores inquiry form submissions from the RegForward AI landing page.
The form is public (no sign-in), so this is a single-tenant table where
the anon-key frontend inserts rows and the RegForward team reads them
through the Supabase dashboard.

## New Tables
- `inquiries`
  - `id` (uuid, primary key, auto-generated)
  - `name` (text, not null) — submitter's full name
  - `email` (text, not null) — submitter's work email
  - `organization` (text, nullable) — submitter's organization
  - `audience` (text, not null) — "consultant", "practice", or "other"
  - `service` (text, not null, default 'general') — primary service of interest
  - `services` (text array, nullable) — all selected services of interest
  - `timing` (text, nullable) — when they want to engage
  - `profile_url` (text, nullable) — optional website/profile URL
  - `message` (text, nullable) — nonconfidential description of needs
  - `created_at` (timestamptz, default now()) — when the inquiry was submitted

## Security
- Row Level Security enabled on `inquiries`.
- INSERT allowed for anon + authenticated (public form submissions).
- SELECT/UPDATE/DELETE restricted to authenticated users only (the RegForward
  team via the Supabase dashboard), so anonymous visitors cannot read, modify,
  or delete other people's inquiries.

## Important Notes
1. The frontend uses the anon key to INSERT. The INSERT policy must list
   `anon` or submissions will fail silently.
2. SELECT is restricted to `authenticated` to protect inquiry data. The
   dashboard uses the service role key (which bypasses RLS), so team members
   can always read submissions regardless of these policies.
3. The `services` column is a text array to store multiple selected services.
*/

CREATE TABLE IF NOT EXISTS inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  organization text,
  audience text NOT NULL,
  service text NOT NULL DEFAULT 'general',
  services text[],
  timing text,
  profile_url text,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- INSERT: public form submissions (anon + authenticated)
DROP POLICY IF EXISTS "anon_insert_inquiries" ON inquiries;
CREATE POLICY "anon_insert_inquiries"
  ON inquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- SELECT: only authenticated users (team via dashboard)
DROP POLICY IF EXISTS "auth_select_inquiries" ON inquiries;
CREATE POLICY "auth_select_inquiries"
  ON inquiries FOR SELECT
  TO authenticated
  USING (true);

-- UPDATE: only authenticated users
DROP POLICY IF EXISTS "auth_update_inquiries" ON inquiries;
CREATE POLICY "auth_update_inquiries"
  ON inquiries FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

-- DELETE: only authenticated users
DROP POLICY IF EXISTS "auth_delete_inquiries" ON inquiries;
CREATE POLICY "auth_delete_inquiries"
  ON inquiries FOR DELETE
  TO authenticated
  USING (true);

-- Index for sorting by most recent
CREATE INDEX IF NOT EXISTS inquiries_created_at_idx ON inquiries (created_at DESC);