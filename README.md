# Household Expense Tracker (MVP)

Chat-first household expense tracker built with Next.js, Tailwind, MongoDB, and Auth.js Google OAuth.

## Features
- Google OAuth login and first-login user provisioning
- Create/join households via invite token
- Multi-household listing and navigation
- Chat-style guided expense entry (simple total or itemized)
- Conversation state persistence (DB + localStorage)
- Monthly dashboard with totals, category breakdown, and expense list
- Expense detail pages
- Monthly CSV export

## Routes
- `/households`
- `/h/[householdId]/dashboard`
- `/h/[householdId]/chat`
- `/h/[householdId]/expenses/[expenseId]`
- `/h/[householdId]/settings`

## Setup
1. Copy env values:
   ```bash
   cp .env.example .env.local
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run app:
   ```bash
   npm run dev
   ```
4. Optional seed data:
   ```bash
   npm run seed
   ```

## Notes
- Server computes subtotal/tax/total for expenses.
- Access control enforces that only household members can read/write expense data.
- The chat flow is deterministic and asks one question at a time.
