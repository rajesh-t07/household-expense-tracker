# Household Expense Tracker

Chat-first household expense tracker built with Next.js, Tailwind, MongoDB, and Auth.js Google OAuth.

## Features
- Google OAuth sign-in with first-login user provisioning
- Create or join households via invite token or invite URL
- Multi-household per user
- Chat-style guided expense entry (simple total or itemized line items)
- Conversation state persistence (DB + localStorage)
- Monthly dashboard with totals, category breakdown, and expense list
- Expense detail pages
- Monthly CSV export
- Household settings (view members, copy invite link, leave household)
- 9 smoke tests via Vitest

## Routes
- `/` — landing
- `/auth/signin` — Google OAuth sign-in
- `/households` — list your households, create new, or join via token/URL (auto-fills from `?invite=…`)
- `/h/[householdId]/dashboard` — monthly summary
- `/h/[householdId]/chat` — chat-style expense entry
- `/h/[householdId]/expenses/[expenseId]` — expense detail
- `/h/[householdId]/settings` — household settings (members, invite link, leave)

## Setup

### 1. Copy env values
```bash
cp .env.example .env.local
```

### 2. Generate `AUTH_SECRET`
```bash
openssl rand -base64 32
```
Paste the output into `AUTH_SECRET` in `.env.local`.

### 3. Configure Google OAuth
1. Go to https://console.cloud.google.com/
2. Create or select a project.
3. **APIs & Services → OAuth consent screen** — configure the consent screen (User type: External is fine for local dev).
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
5. Application type: **Web application**
6. **Authorized JavaScript origins**: `http://localhost:3000`
7. **Authorized redirect URIs**: `http://localhost:3000/api/auth/callback/google`
8. Copy the **Client ID** and **Client Secret** into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`.

### 4. Start MongoDB
Any local or remote MongoDB works. Update `MONGODB_URI` in `.env.local` to point at it. For a quick local instance:
```bash
docker run -d --name ht-mongo -p 27017:27017 mongo:7
```

### 5. Install + run
```bash
npm install
npm run dev
```
Open http://localhost:3000.

### 6. Optional: seed demo data
```bash
npm run seed
```
This creates a demo user (`demo@example.com`), a demo household, and 1 expense. Tests use a separate `household-tracker-test` database automatically.

## Tests

```bash
npm test           # run once
npm run test:watch # watch mode
```

9 smoke tests cover the validator (`expenseInputSchema` simple/itemized rules) and chat state schema, plus the seed script's clear-then-reseed behavior. Tests connect to a separate `household-tracker-test` database on the same MongoDB instance, so dev data is safe.

## Sharing an invite

Settings page (`/h/[householdId]/settings`) shows an invite URL of the form:
```
http://localhost:3000/households?invite=<token>
```
Share that link. When the recipient clicks it (and signs in if prompted), the token is auto-filled into the Join form on `/households`.

## Troubleshooting

### `MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017`
MongoDB isn't running, or `MONGODB_URI` is wrong. For local MongoDB:
```bash
docker run -d --name ht-mongo -p 27017:27017 mongo:7
```
For MongoDB Atlas, ensure your IP is whitelisted under **Network Access** and the connection string includes the database user credentials.

### Google OAuth: `redirect_uri_mismatch` or `invalid_client`
- Confirm the Authorized redirect URI in Google Cloud Console is **exactly** `http://localhost:3000/api/auth/callback/google` — no trailing slash, exact port, exact protocol.
- Confirm `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local` match the Google Cloud credentials. Restart `npm run dev` after changing env.

### NextAuth: `Missing AUTH_SECRET` or session errors
Generate a real secret with `openssl rand -base64 32` and paste it into `AUTH_SECRET` in `.env.local`. Restart the dev server after env changes.

### `npm run dev` 500s with `Cannot find module './NNN.js'` from webpack-runtime
Stale `.next/` cache after a file change. Restart with:
```bash
rm -rf .next && npm run dev
```

### Tests fail with `MONGODB_URI` undefined
Tests load `.env.local` via `tests/setup.ts`. Make sure `.env.local` exists at the project root with `MONGODB_URI` and `MONGODB_DB` defined.

## Notes
- Server computes `subtotal` / `taxTotal` / `total` for expenses; the client never trusts client-computed totals.
- Access control: only household members can read or write their household's data.
- The chat flow is deterministic and asks one question at a time.
- Settings page lets members view the household, copy the invite link, and leave. The sole remaining member can't leave (would orphan the household).