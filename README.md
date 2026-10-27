# Learn Space booking and back office

The staff back office and the booking platform. The marketing website lives in its own repository.

```
apps/
  backoffice/      Staff back office: Next.js, Google sign-in, per-section access (port 4400)
  booking/         Booking app for customers: spaces, schedule, booking and payment (port 4500)
packages/
  auth-staff/      Staff identities and back-office access ("backoffice" schema)
  auth-customers/  Customer sign-in (Google or emailed code); holds no data, the app passes its tables in
  bookings/        Customers, spaces, prices, bookings and notifications ("booking" schema)
  email/           Sending email, with one adapter per provider (Gmail, Brevo, Mailpit, console), and templates
  chat/            Team chat posts, with one adapter per provider (Slack webhook, console)
  storage/         File storage, with one adapter per provider (S3/R2, local disk, memory)
```

## Getting started

```bash
npm install
npm run db:migrate     # create/update the tables (needs a local Postgres, see below)
npm run db:seed        # sample spaces, services and prices
npm run dev:backoffice # http://localhost:4400
npm run dev:booking    # http://localhost:4500
```

The back office expects a local Postgres on port 5432 with a database called `learnspace`
(`createdb learnspace`). To use something else, set `DATABASE_POOLED_URL` in `apps/backoffice/.env.local`.

Before pushing: `npm run verify` (type checks, lint and builds for every app, plus formatting).

## Back office

### Signing in (no passwords)

Staff sign in with their Learn Space Google account, and that is the only way in: no passwords, no emailed
codes, locally or in production. Only addresses on `ALLOWED_EMAIL_DOMAINS` get in, and that is checked on
every sign-in and every request.

To set up Google sign-in, create an OAuth client in the Google Cloud console (APIs & Services → Credentials
→ OAuth client ID → Web application) with the redirect URI `<BETTER_AUTH_URL>/api/auth/callback/google`,
then copy `apps/backoffice/.env.example` to `apps/backoffice/.env.local` and fill it in.

Google sign-in works locally too: add `http://localhost:4400/api/auth/callback/google` to the OAuth client's
redirect URIs.

### Access (RBAC)

The back office is one app with sections: **Website**, **Bookings**, **Projects** and **Team & access**.
Each person has a role per section:

| Role    | Can                            |
| ------- | ------------------------------ |
| Viewer  | See everything in the section  |
| Editor  | Add and change things          |
| Manager | Everything, including deleting |

No role means the section is hidden and its pages refuse access. Every page and action checks the role on
the server (`requireSection()` in `apps/backoffice/src/lib/viewer.ts`).

The first admins come from `BOOTSTRAP_ADMIN_EMAILS`: they become managers of every section the first time
they sign in. After that, managers of **Team & access** give everyone else access from that screen,
including people who haven't signed in yet. There is always at least one team manager, and you can't
remove your own.

To add a section: add it to `sectionEnum` in `packages/auth-staff/src/schema.ts`, run `npm run db:generate` and
`npm run db:migrate`, then add it to `SECTIONS` in `apps/backoffice/src/lib/sections.ts`.

Other data sources (the website's content, other projects) are plugged into the back office as sections
when they are needed.

## Identity: separate and detachable

Staff and booking customers are separate groups, each in its own Postgres schema with its own connection setting:

| Who                 | Sign-in package           | Data lives in                                | Schema       | Connection                                            |
| ------------------- | ------------------------- | -------------------------------------------- | ------------ | ----------------------------------------------------- |
| Staff (back office) | `packages/auth-staff`     | `packages/auth-staff`                        | `backoffice` | `STAFF_DATABASE_POOLED_URL` → `DATABASE_POOLED_URL`   |
| Booking customers   | `packages/auth-customers` | `packages/bookings` (with spaces, bookings…) | `booking`    | `BOOKING_DATABASE_POOLED_URL` → `DATABASE_POOLED_URL` |

Customers are booking customers, so their accounts live with the booking data: `packages/bookings` owns the
`customer*` tables and hands them to the reusable sign-in package (a future marketplace would pass its own).
With nothing set, everything shares one database.

Rules that keep them apart and movable:

- A staff account and a customer account are never the same record, and their cookies have different
  prefixes. Someone who is both has two accounts.
- Apps never query identity tables or import the auth library directly; they use the package's exports
  (`@learnspace/auth-staff`, `/next`, `/client`).
- App data refers to a staff member by their ID as plain text, with no foreign keys into the `backoffice` schema.
- Each package keeps its migration history inside its own schema.

So moving staff (or customers) to another database is: copy that schema, set its connection URL.

## Database connections (Neon)

Neon gives each database two connection strings. Use each for one job:

| Variable              | Neon URL                         | Used by                                                  |
| --------------------- | -------------------------------- | -------------------------------------------------------- |
| `DATABASE_POOLED_URL` | Pooled (host contains `-pooler`) | The running apps (many short-lived connections)          |
| `DATABASE_DIRECT_URL` | Direct                           | `npm run db:migrate`, Drizzle Studio, `pg_dump`/restores |

Run migrations from your machine or CI with the direct URL set:
`DATABASE_DIRECT_URL=postgres://… npm run db:migrate`.

## Deploying

Migrations run on the host, during **each app's** build: `npm run db:migrate:deploy` applies any new migrations
before `next build`, whichever app changed, but only when `DATABASE_DIRECT_URL` (Neon's direct URL) is set for that
build. Set it on both apps, for production (Neon `main`) and for the `staging` branch (Neon `staging`) only. A
Postgres lock lets one build migrate while the other waits and then finds nothing to do. A failed migration fails
the build, so new code never goes live against an out-of-date database.

Hosting for the back office and booking app is being decided (Cloudflare Workers is being evaluated).
