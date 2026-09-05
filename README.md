# 🏁 Class Grand Prix 2026

A live race & voting web application for class events, styled like a Formula 1 broadcast.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion |
| Database | Supabase (PostgreSQL) |
| Realtime | Supabase Realtime |
| Deployment | Vercel |

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/manuelixvivi/grand-prix.git
cd class-grand-prix
npm install
```

### 2. Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the entire `supabase/schema.sql` file
3. This will create all tables, RLS policies, realtime subscriptions, and seed demo data

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Pages

| Route | Purpose | Who Uses It |
|---|---|---|
| `/` | Landing page | Everyone |
| `/vote` | Voting page | Students (mobile) |
| `/podium` | Big screen display | TV / Projector |
| `/admin` | Race Control | Admin (desktop) |
| `/admin/events` | Event management | Admin |
| `/admin/events/new` | Create new event | Admin |
| `/admin/events/[id]` | Configure event | Admin |
| `/admin/categories` | Category Library | Admin |

---

## How to Run an Event

1. **Create categories** in `/admin/categories` (Category Library)
2. **Create event** in `/admin/events/new`, select categories from library
3. **Configure candidates** in `/admin/events/[id]` for each category
4. **Set event READY** from the event detail page
5. **Go to `/admin`**, select your event & first category
6. **Click START RACE** — lights sequence runs automatically
7. After LIGHTS OUT — voting opens automatically
8. **Students vote** at `/vote` on their phones
9. **Click CLOSE VOTING** to end the lap
10. **Click REVEAL RESULT** to show cinematic results on `/podium`
11. **Click NEXT LAP** to continue (or SHOW PODIUM after final lap)

---

## Race State Machine

```
IDLE → READY → LIGHTS_1 → LIGHTS_2 → LIGHTS_3 → LIGHTS_4 → LIGHTS_5
→ LIGHTS_OUT → VOTING → VOTING_CLOSED → RESULT_REVEAL → LAP_COMPLETE
→ [next lap...] → FINAL_RESULTS → PODIUM → CHEQUERED_FLAG
```

## Scoring System

| Position | Points |
|---|---|
| P1 | 25 |
| P2 | 18 |
| P3 | 15 |
| P4 | 12 |
| P5 | 10 |
| P6 | 8 |
| P7 | 6 |
| P8 | 4 |
| P9 | 2 |
| P10 | 1 |

---

## Category Library System

The app uses a 3-level data model for reusability:

```
CATEGORY LIBRARY (Templates)
        │
        │ activate → copy to event
        ▼
EVENT CATEGORIES (Event-specific instances)
        │
        │ run
        ▼
RACE / LAP / VOTING (Live data)
```

This means you can reuse the same category templates across multiple events (2026, 2027, etc.) without re-entering data. Just create a new event, select from the library, customize candidates if needed, and run.

---

## Deploy to Vercel

```bash
npm run build   # verify build passes
vercel deploy
```

Set environment variables in your Vercel project dashboard.

---

## Demo Data

The SQL schema includes seed data with:
- 1 demo event: **Class Grand Prix 2026**
- 5 category templates with default candidates (Kevin, Manuel, Andrew, Jason, Daniel)
- 1 event category ready to run: **Most Chaotic Driver**

---

## Connection Status

All pages show connection status:
- 🟢 **LIVE** — Realtime connected
- 🟡 **RECONNECTING** — Temporary disconnection
