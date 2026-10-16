/*
# Lock down inquiries table from all client roles

## Purpose
The previous migration removed anon INSERT but left SELECT/UPDATE/DELETE
policies on the `authenticated` role. If project sign-up is enabled, any
self-registered user could read, modify, or delete private inquiries through
the public REST API. This migration removes all client-accessible policies
and revokes all direct table privileges from both `anon` and `authenticated`.

## After changes
- `anon` role: no privileges on inquiries (already done, reasserted here).
- `authenticated` role: no privileges on inquiries.
- RLS remains enabled — the table is deny-by-default for all client roles.
- The `service_role` (used by the submit-inquiry edge function) bypasses RLS,
  so the public form continues to work.
- The `postgres` / `service_role` used by Bolt's owner dashboard bypasses RLS,
  so records remain visible there.
*/

-- Drop all remaining policies
DROP POLICY IF EXISTS "auth_select_inquiries" ON inquiries;
DROP POLICY IF EXISTS "auth_update_inquiries" ON inquiries;
DROP POLICY IF EXISTS "auth_delete_inquiries" ON inquiries;

-- Revoke all direct table privileges from both client roles
REVOKE SELECT, INSERT, UPDATE, DELETE ON inquiries FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON inquiries FROM authenticated;

-- RLS stays enabled (deny-by-default with no policies = no client access)
-- ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY; -- already enabled
