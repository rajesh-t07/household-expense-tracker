# 🏠 Household Expense Tracker – Full Build Prompt

## Overview
Build a production-ready MVP web app called **Household Expense Tracker**.

This app allows married couples (or households) to track monthly expenses together using a **chatbot-style question-and-answer interface**.  
The UI should feel like a guided conversation, not traditional forms.

---

## 🎯 Core Goals
- A household can have multiple members.
- Members can add expenses and view monthly summaries.
- Expenses can be recorded as:
  - Simple total
  - Itemized line-items
- Authentication via **Google OAuth**
- Database: **MongoDB**
- Primary UX: **Chat-style guided flow**

---

## 🧰 Tech Stack
Use these defaults unless there is a strong reason not to:
- Next.js (App Router) + TypeScript
- Tailwind CSS
- MongoDB (Mongoose preferred)
- Auth.js (NextAuth) with Google provider
- Zod for validation
- React Hook Form (optional)

---

## 🧠 UX Architecture – Chatbot Flow Engine
- Chat UI with assistant/user bubbles
- One question at a time
- Inputs rendered as widgets (text, number, date, select, buttons)
- Deterministic flow (no LLM)
- Persist conversation state (DB + optional localStorage)
- Must survive page refresh

---

## 🔐 Authentication
- Google OAuth login
- Create user record on first login:
  - id, name, email, avatar, createdAt

---

## 🏠 Households
- Create household
- Join via invite link
- Multiple households per user
- Select active household

Household fields:
- name
- currency
- createdBy
- members[]
- inviteToken
- createdAt

---

## 💵 Expense Model
Collection: expenses

Fields:
- householdId
- date
- merchant
- category
- paymentMethod (optional)
- notes (optional)
- subtotal
- taxTotal
- total
- createdByUserId
- createdAt
- items[] (optional):
  - name
  - quantity
  - unitPrice
  - lineTotal

Rules:
- totals ≥ 0
- quantities ≥ 1
- Server computes totals
- Only household members can modify expenses

---

## 📊 Categories
Groceries, Dining, Utilities, Rent/Mortgage, Transportation, Health, Shopping, Entertainment, Kids, Other

---

## 💬 Conversation Scripts

### First Login
Assistant: “Welcome! Let’s set up your household expense tracker.”  
Assistant: “Create a new tracker or join a shared one?”

Buttons: Create new | Join shared

### Add Expense (Summary)
- Ask month
- Ask simple vs itemized
- Collect details step-by-step
- Show confirmation
- Save and continue

---

## 📊 Dashboard
- Monthly total
- Category breakdown
- Expense list
- Chat prompt actions

---

## 📁 Routes
- /households
- /h/[householdId]/dashboard
- /h/[householdId]/chat
- /h/[householdId]/expenses/[expenseId]
- /h/[householdId]/settings

---

## 📤 Export
- Export monthly expenses to CSV

---

## 🚫 Do Not Add
- Budgeting
- Splitting
- OCR
- AI suggestions
- Notifications

---

## 📦 Deliverables
- Full repo
- .env.example
- Setup instructions
- Optional seed script
