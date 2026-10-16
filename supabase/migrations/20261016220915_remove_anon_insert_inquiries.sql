/*
# Remove public INSERT policy on inquiries

## Purpose
The submit-inquiry edge function now writes to the inquiries table using the
service role key, which bypasses RLS. The public anon INSERT policy is no longer
needed and should be removed so that anonymous visitors cannot insert rows
directly through the REST API, bypassing server-side validation.

## Changes
1. Drop the `anon_insert_inquiries` INSERT policy (was TO anon, authenticated).
2. Revoke INSERT privilege from the `anon` role so it cannot write directly.
3. Revoke SELECT, UPDATE, DELETE from `anon` (already restricted by policy,
   but tighten at the grant level too so there is no ambiguity).

## Security After Changes
- `anon` role: no INSERT, SELECT, UPDATE, or DELETE on inquiries.
  The public can only submit through the edge function, which validates input.
- `authenticated` role: SELECT, UPDATE, DELETE via existing policies
  (for team access through the Supabase dashboard).
- The service role (used by the edge function) bypasses RLS entirely.
*/

-- Drop the public INSERT policy
DROP POLICY IF EXISTS "anon_insert_inquiries" ON inquiries;

-- Revoke all direct table privileges from anon so it has no path to the data
REVOKE INSERT, SELECT, UPDATE, DELETE ON inquiries FROM anon;

-- Keep authenticated privileges intact (team dashboard access)
-- authenticated already has SELECT/UPDATE/DELETE via existing policies
