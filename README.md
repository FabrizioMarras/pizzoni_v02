# Pizzoni 🍕

Invite-only social pizzeria review app built with Next.js 16 and Supabase.

## Implemented

- Magic-link auth with invite-only enforcement
- Profile editing (name, avatar URL, pizza emoji)
- Admin invite management
- Pizzeria CRUD (create + list)
- Visit CRUD (create + list + detail pages)
- Review submission with sub-scores and computed final score
- Leaderboard with city filter
- Photo upload to Cloudinary (unsigned preset) + gallery + pizza-of-the-night tag
- Next visit planner (upcoming visits, RSVP, suggestion poll with votes)
- Google Maps quick links from pizzerias/visits
- Calendar export (`.ics`) for upcoming visits
- Google Analytics hook (optional env var)

## Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- Supabase Auth + PostgreSQL + RLS
- Cloudinary for image hosting

## Setup

### 1. Install

```bash
npm install
```

### 2. Environment variables

Create `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
- `NEXT_PUBLIC_GA_ID` (optional)

### 3. Database migrations (Supabase Cloud, no CLI)

Migration files are in `supabase/migrations/`.

- New DB: run `20260422190500_init.sql`, then newer files in order.
- Existing DB: skip init and run `20260422191500_existing_db_security_sync.sql` then newer files.
- Run `20260422194000_membership_and_invites.sql` for invite/admin membership features.

### 4. Auth configuration in Supabase

- Site URL: `http://localhost:3000`
- Redirect URL: `http://localhost:3000/auth/callback`

Magic link email template should use token-hash callback format:

```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink&next=/">Sign in</a>
```

### 5. Run

```bash
npm run dev
```

### 6. Quality checks

```bash
npm run lint
npm run build
```
