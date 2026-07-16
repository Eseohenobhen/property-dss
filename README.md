# PropertyDSS — Maintenance Fund Allocation Decision Support System

A web-based **Decision Support System (DSS)** that helps property managers allocate
limited maintenance funds effectively. It ranks maintenance requests using a
weighted multi-criteria model and recommends, within a given budget, which
requests to fund — transparently and consistently.

This repository contains a clean **three-tier architecture**:

```
┌──────────────────────┐      HTTP/JSON      ┌───────────────────────┐      SQL      ┌────────────────┐
│  frontend/ (Next.js) │  ───────────────►   │  backend/ (Node.js +  │  ──────────►  │  PostgreSQL    │
│  React UI            │  ◄───────────────   │  Express REST API)    │  ◄──────────  │  (local/hosted)│
└──────────────────────┘                     │  + DSS engine         │               └────────────────┘
                                              └───────────────────────┘
```

> Architecture, ERD, DFD, sequence and DSS-algorithm diagrams (Mermaid) are in
> [`docs/diagrams.md`](docs/diagrams.md).

| Layer | Folder | Tech | Maps to objective |
|-------|--------|------|-------------------|
| Presentation | `frontend/` | Next.js (App Router) + React | — |
| Application / logic | `backend/` | Node.js + Express + Prisma | 2 (data mgmt), 3 (decision rules), 4 (DSS module) |
| Data | PostgreSQL | Prisma ORM | 2 (stores property & maintenance data) |

> The previous vanilla HTML/CSS/JS version is preserved under `legacy/` for reference.

---

## How it maps to the project objectives

1. **Analyse the current allocation process** — modelled as: log requests → score by priority → match against a budget → record allocation + audit trail.
2. **Store & manage property and maintenance data** — seven related tables (`users`, `properties`, `property_assignments`, `maintenance_requests`, `maintenance_funds`, `fund_allocations`, `fund_adjustments`) via Prisma/PostgreSQL.
3. **Decision rules for prioritising maintenance** — a weighted multi-criteria score (see below) computed server-side in `backend/src/services/dss.js`.
4. **Decision support module for optimal allocation** — `recommendAllocation()` walks ranked requests and recommends which to fund within the available budget, with a reason for each.
5. **Evaluate accuracy/efficiency/usability** — the engine is pure, testable logic with an automated test suite (`cd backend && npm test`); the API is consistent JSON; the UI is responsive and role-aware.

---

## The decision model

Each request is scored 1–10 on three criteria, with cost as a penalty and a
category boost reflecting the domain hierarchy:

```
score = (urgency × 0.35) + (impact × 0.30) + (assetImportance × 0.20)
        − (costScore × 0.15) + categoryBoost
```

**Category hierarchy:** Roofing (+2.0) > Structural (+1.8) > Electrical (+1.5) >
Plumbing (+1.2) > Security (+1.0) > HVAC (+0.8) > Flooring/Landscaping (0) > Painting (−0.5).

So a roof leak outranks a paint job even at equal urgency. The model lives in one
file (`backend/src/services/dss.js`) so it is easy to explain and adjust.

A Manager doesn't fill in `urgency` / `impact` / `assetImportance` directly — they
pick a plain-language **severity** (Low/Medium/High/Critical) and an optional
**safety hazard** flag, and the server derives the same three inputs from that
(`scoreInputsFromSeverity`) before scoring. An Admin can still set the numeric
inputs directly.

---

## Roles

Managers are **scoped to the properties they're assigned to** (via an
admin-managed `property_assignments` table) — every list, dashboard, fund and
report a manager sees is filtered down to just those properties.

| Action | Manager | Admin |
|--------|:-------:|:-----:|
| View dashboard, requests, funds & reports (assigned properties only for Manager) | ✅ | ✅ |
| Log a maintenance request (assigned property only for Manager) | ✅ | ✅ |
| Add / edit / delete properties | ❌ | ✅ |
| Assign / unassign managers to a property | ❌ | ✅ |
| Edit / delete a request, or reject it with a reason | ❌ | ✅ |
| Add / edit / delete funds | ❌ | ✅ |
| Allocate funds to a request | ❌ | ✅ |
| Adjust an already-released allocation (with a reason) | ❌ | ✅ |

> **Registration creates Manager accounts.** Admin accounts are created
> by the database seed, not through the public sign-up form — this keeps the
> role-based access control from being bypassed. A freshly registered Manager
> isn't assigned to any property until an Admin assigns one from the
> Properties page. Use the seeded admin below to demonstrate the full workflow.

---

## Prerequisites

- **Node.js 18+** (tested on Node 20/22) and npm
- A **PostgreSQL** database. Two easy options:
  - **Local Postgres** (e.g. Homebrew `postgresql@14`) — used on the original dev machine.
  - **[Neon](https://neon.tech)** — free hosted Postgres, no install needed.

> **Already configured on this machine:** a local database `property_dss` was created
> (owner `bigdreams`) and `backend/.env` is filled in with
> `postgresql://bigdreams@localhost:5432/property_dss`. The schema is pushed and the
> demo data is seeded — so you can skip to `npm run dev` in each folder. The steps
> below are for setting it up from scratch elsewhere.

---

## Quick start (this machine — already configured)

The local database, `.env` files, schema and demo data are already in place here.
You only need to start the two servers, in **two terminals**:

```bash
# Terminal 1 — API on http://localhost:4000
cd backend && npm run dev

# Terminal 2 — app on http://localhost:3000
cd frontend && npm run dev
```

Then open <http://localhost:3000> and sign in with the **admin account created by
your seed** (the email and password you configured — see
[Accounts & seeding](#accounts--seeding) below).

> If logins fail or data looks wrong, re-seed a clean dataset:
> `cd backend && npm run seed`.

### First-run checklist

1. `cd backend && npm run dev` → visit <http://localhost:4000/health>, expect `{"status":"ok",...}`.
2. `cd frontend && npm run dev` → open <http://localhost:3000>.
3. Sign in as **admin** → Dashboard shows KPIs and a ranked priority queue.
4. Go to **Funds**, click a fund → the DSS recommendation lists FUND / DEFER per request.
5. As admin, **Allocate** a recommended request, or **Mark deferred** one that doesn't fit.
6. Open **Reports** → the allocation appears in the audit trail and deferred items in their list.
7. Run the engine tests: `cd backend && npm test` (should report all passing).

---

## Setting up from scratch (a different machine or a hosted DB)

### 1. Get a database URL

- **Local PostgreSQL** (e.g. Homebrew `postgresql@14`): create a database and use
  `postgresql://YOUR_USER@localhost:5432/property_dss?schema=public`.
- **[Neon](https://neon.tech)** (free hosted): create a project and copy the
  connection string — `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`.

### 2. Backend

```bash
cd backend
cp .env.example .env          # then edit .env
#   DATABASE_URL = your local or Neon connection string
#   JWT_SECRET   = any long random string
#   SEED_*       = the admin/manager credentials the seed should create

cp prisma/seed.example.js prisma/seed.js   # the runnable seed (git-ignored)

npm install
npm run prisma:push           # creates the tables in your database
npm run seed                  # creates the admin account + sample data
npm run dev                   # API on http://localhost:4000
```

### 3. Frontend

In a **second terminal**:

```bash
cd frontend
cp .env.local.example .env.local   # default points at http://localhost:4000/api
npm install
npm run dev                        # app on http://localhost:3000
```

Open <http://localhost:3000>, sign in with the admin account you seeded, and explore.

---

## Accounts & seeding

- **Public sign-up creates Manager accounts only**, and a new Manager starts
  unassigned to any property — an Admin must assign one from the Properties page
  before that manager can see or log anything. This is enforced server-side, so
  the role-based access control can't be bypassed from the browser.
- **The admin account is created by the database seed**, not through the UI. The
  seed reads its credentials from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (and
  the manager equivalents) in `backend/.env`, so **no passwords are committed to
  this repository**.
- The runnable seed (`prisma/seed.js`) is intentionally **git-ignored**. Copy it
  from the template and run it:

  ```bash
  cd backend
  cp prisma/seed.example.js prisma/seed.js
  npm run seed
  ```

- Change the seeded passwords after first login.

---

## Running the tests

The decision engine has an automated test suite (Node's built-in test runner — no
extra installs):

```bash
cd backend && npm test
```

It verifies the scoring formula, the ranking order, and the budget-aware
allocation against hand-checked values — evidence for the "accuracy" evaluation.

---

## Project layout

```
property-dss/
├─ backend/
│  ├─ prisma/
│  │  ├─ schema.prisma        # data model (7 tables)
│  │  └─ seed.js              # demo data
│  └─ src/
│     ├─ services/dss.js      # ⭐ the decision engine
│     ├─ services/access.js   # manager → assigned-property scoping
│     ├─ controllers/         # request handlers
│     ├─ routes/              # REST endpoints
│     ├─ middleware/          # JWT auth, role guards, error handling
│     └─ server.js            # entry point
├─ frontend/
│  ├─ app/                    # Next.js App Router pages
│  │  ├─ login/               # auth page
│  │  ├─ print/               # printable general/property/request reports
│  │  └─ (app)/               # dashboard, properties (+ detail), requests,
│  │                          # funds, recommendations (manager), reports
│  ├─ components/             # Sidebar, Modal, Badges, BarChart
│  └─ lib/                    # api client, auth context, formatting
└─ legacy/                    # original vanilla HTML/CSS/JS version
```

---

## API reference (all under `/api`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | — | Create a Manager account (unassigned to any property) |
| POST | `/auth/login` | — | Sign in, returns a JWT |
| GET | `/auth/me` | token | Current user |
| GET/POST | `/properties` | token / admin | List / create properties (Manager sees only assigned) |
| GET/PUT/DELETE | `/properties/:id` | token / admin | Read / update / delete |
| GET | `/properties/:id/managers` | admin | List managers assigned to a property |
| POST | `/properties/:id/managers` | admin | Assign a manager to a property |
| DELETE | `/properties/:id/managers/:managerId` | admin | Unassign a manager from a property |
| GET/POST | `/requests` | token | List / create requests (auto-scored); Manager limited to their assigned property |
| GET | `/requests/ranked` | token | Requests ranked by the DSS |
| PUT | `/requests/:id` | admin | Update a request (rescored) |
| POST | `/requests/:id/reject` | admin | Reject a request with a reason |
| DELETE | `/requests/:id` | admin | Delete a request |
| GET/POST | `/funds` | token / admin | List / create funds (Manager sees only assigned property's funds) |
| GET | `/funds/:id/recommendation` | token | **DSS allocation recommendation** |
| GET/POST | `/allocations` | token / admin | Audit trail / commit an allocation |
| PATCH | `/allocations/:id/adjust` | admin | Adjust an already-released allocation, with a reason |
| GET | `/users` | admin | List user accounts (e.g. to pick a manager to assign) |
| GET | `/stats/dashboard` | token | Dashboard KPIs (scoped for Manager) |
| GET | `/stats/reports` | token | Report analytics (scoped for Manager) |

---

## Troubleshooting

- **"Cannot reach the server"** in the UI → the backend isn't running, or `NEXT_PUBLIC_API_URL` in `frontend/.env.local` doesn't match the backend port.
- **Prisma can't connect** → check `DATABASE_URL` and that you included `?sslmode=require` for Neon.
- **Login fails right after seeding** → make sure `npm run seed` finished without errors.
