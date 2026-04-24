# Supabase Cloud Migration Workflow (No CLI)

This project uses SQL migration files stored in `supabase/migrations/`.

## How to apply migrations in Supabase Cloud

1. Open Supabase Dashboard -> SQL Editor.
2. Run migration files in timestamp order when they apply to your environment.
3. Keep each file committed in git.

## Current files

- `20260422190500_init.sql`: full baseline schema for a brand-new database.
- `20260422191500_existing_db_security_sync.sql`: safe sync for existing databases (RLS/policies/trigger).
- `20260422194000_membership_and_invites.sql`: invite-only membership/admin model.
- `20260422201500_magic_link_invite_gate.sql`: legacy RPC gate for magic-link request flow.
- `20260422213000_agenda_poll_first.sql`: agenda v2 (poll-first) tables/RLS/finalization RPC.
- `20260422221000_drop_legacy_planner_tables.sql`: drops legacy planner tables.
- `20260422224000_visit_attendees_admin_management.sql`: admin attendee add/remove policies.
- `20260423182000_pizzerias_google_metadata.sql`: Google Places metadata on `pizzerias`.
- `20260424102000_visits_scheduled_at_and_admin_update.sql`: event datetime (`scheduled_at`) + admin visit update policy.
- `20260424113000_pizza_of_night_single_tag.sql`: single "foto della serata" per event + assignment RPC.

## Which file should I run?

- Brand-new Supabase project (empty DB):
  1. Run `20260422190500_init.sql`
  2. Then run later migrations (including `20260422191500_existing_db_security_sync.sql`)

- Existing Supabase project with tables already present:
  1. Skip `20260422190500_init.sql`
  2. Run `20260422191500_existing_db_security_sync.sql`
  3. Then run all future migrations in order

## Notes

- Always run files in timestamp order.
- New migrations introduced after April 24, 2026:
  - `20260424102000_visits_scheduled_at_and_admin_update.sql`
  - `20260424113000_pizza_of_night_single_tag.sql`

## Naming convention

Use UTC timestamp + short name:

`YYYYMMDDHHMMSS_description.sql`

Example:

`20260423103000_add_reviews_index.sql`
