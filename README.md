# Learn Space booking and back office

The staff back office and (soon) the booking platform. The marketing website lives in its own repository.

```
apps/
  backoffice/   Staff back office: Next.js, Google sign-in, per-section access
packages/
  auth-staff/   Staff identities and back-office access (own "staff" schema and connection)
```

The booking app (`apps/booking`) and its customer sign-in package come next.

## Getting started

```bash
npm install
npm run db:migrate     # create/update the tables (needs a local Postgres, see below)
npm run dev:backoffice # http://localhost:4400
```

The back office expects a local Postgres on port 5432 with a database called `learnspace`
(`createdb learnspace`). To use something else, set `DATABASE_URL` in `apps/backoffice/.env.local`.

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

Each group of users has its own identity package, its own Postgres schema and its own connection setting:

| Who                       | Package                   | Schema     | Connection                            |
| ------------------------- | ------------------------- | ---------- | ------------------------------------- |
| Staff (back office)       | `packages/auth-staff`     | `staff`    | `STAFF_DATABASE_URL` → `DATABASE_URL` |
| Booking customers (later) | `packages/auth-customers` | own schema | its own connection setting            |

Rules that keep them apart and movable:

- A staff account and a customer account are never the same record, and their cookies have different
  prefixes. Someone who is both has two accounts.
- Apps never query identity tables or import the auth library directly; they use the package's exports
  (`@learnspace/auth-staff`, `/next`, `/client`).
- App data refers to a person by their ID as plain text, with no foreign keys into an identity schema.
- Each package keeps its migration history inside its own schema.

So moving staff (or customers) to another database is: copy that schema, set its connection URL.

## Database connections (Neon)

Neon gives each database two connection strings. Use each for one job:

| Variable                | Neon URL                         | Used by                                                  |
| ----------------------- | -------------------------------- | -------------------------------------------------------- |
| `DATABASE_URL`          | Pooled (host contains `-pooler`) | The running apps (many short-lived connections)          |
| `DATABASE_URL_UNPOOLED` | Direct                           | `npm run db:migrate`, Drizzle Studio, `pg_dump`/restores |

Run migrations from your machine or CI with the direct URL set:
`DATABASE_URL_UNPOOLED=postgres://… npm run db:migrate`.

## Deploying

Production migrations run from `.github/workflows/migrate.yml` when a push to `main` changes
`packages/auth-staff/migrations/`. It needs a GitHub environment called `production` with the secret
`DATABASE_URL_UNPOOLED` (Neon's direct URL).

Hosting for the back office and booking app is being decided (Cloudflare Workers is being evaluated).
