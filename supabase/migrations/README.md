# Supabase Cloud Migration Workflow (No CLI)

This project uses SQL migration files stored in `supabase/migrations/`.

## How to apply migrations in Supabase Cloud

1. Open Supabase Dashboard -> SQL Editor.
2. Run migration files in timestamp order when they apply to your environment.
3. Keep each file committed in git.

## Current files

- `20260422190500_init.sql`: full baseline schema for a brand-new database.
- `20260422191500_existing_db_security_sync.sql`: safe sync for existing databases (RLS/policies/trigger).

## Which file should I run?

- Brand-new Supabase project (empty DB):
  1. Run `20260422190500_init.sql`
  2. Then run later migrations (including `20260422191500_existing_db_security_sync.sql`)

- Existing Supabase project with tables already present:
  1. Skip `20260422190500_init.sql`
  2. Run `20260422191500_existing_db_security_sync.sql`
  3. Then run all future migrations in order

## Naming convention

Use UTC timestamp + short name:

`YYYYMMDDHHMMSS_description.sql`

Example:

`20260423103000_add_reviews_index.sql`
