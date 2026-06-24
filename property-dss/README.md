# PropertyDSS — Maintenance Fund Allocation System

A web-based Decision Support System for property maintenance fund allocation. Built with vanilla HTML/CSS/JS and Supabase as the backend.

---

## Features

- **Role-based access**: Managers can view property info and reports. Admins can create, edit, and delete everything.
- **DSS Priority Engine**: Automatically ranks maintenance requests using a weighted multi-criteria model: Urgency, Impact, Asset Importance, Cost, and **Category** (roofing outranks flooring by design).
- **Category priority hierarchy**: Roofing > Structural > Electrical > Plumbing > HVAC/Security > Flooring > Painting.
- **Budget-aware allocation**: The Funds page shows which requests can be afforded, in priority order, with a live running balance.
- **Full audit trail**: Every fund allocation is recorded with who allocated, when, and how much.
- **Reports**: Category breakdown charts, allocation history, deferred request lists.

---

## Project Structure

```
property-dss/
├── index.html              # Login / Register page
├── pages/
│   ├── dashboard.html      # Main dashboard
│   ├── properties.html     # Property management
│   ├── requests.html       # Maintenance requests
│   ├── funds.html          # Fund management & allocation
│   └── reports.html        # Reports & analytics
├── css/
│   └── main.css            # Full design system
├── js/
│   ├── supabase.js         # Supabase client (edit your credentials here)
│   ├── auth.js             # Login / Register
│   ├── ui.js               # Shared utilities, formatting, score engine
│   ├── dashboard.js
│   ├── properties.js
│   ├── requests.js
│   ├── funds.js
│   └── reports.js
├── setup.sql               # Run this in Supabase SQL Editor
└── README.md               # This file
```

---

## Step 1 — Supabase Setup

### 1.1 Create a Supabase project

1. Go to [https://supabase.com](https://supabase.com) and sign up / log in.
2. Click **New Project**.
3. Choose a name (e.g. `property-dss`), a strong database password, and the region closest to you (e.g. `eu-central-1` for West Africa).
4. Click **Create new project** and wait ~2 minutes for it to provision.

### 1.2 Run the database schema

1. In your project dashboard, click **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open the `setup.sql` file from this project, copy its entire contents, paste into the editor.
4. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`).
5. You should see `Success. No rows returned` at the bottom. All tables, functions, triggers, and RLS policies are now created.

### 1.3 Configure Auth

1. In Supabase, go to **Authentication → Providers**.
2. Make sure **Email** is enabled (it is by default).
3. **Optional**: To skip email confirmation during development, go to **Authentication → Email Templates** and turn off "Confirm email" under **Settings → Email Confirmations**. This lets you sign up and immediately sign in without confirming your email.

### 1.4 Get your API credentials

1. Go to **Project Settings → API** (the gear icon in the sidebar).
2. Copy:
   - **Project URL** — looks like `https://abcdefghijkl.supabase.co`
   - **anon / public key** — the long JWT string under "Project API keys"

---

## Step 2 — Configure the App

Open `js/supabase.js` and replace the two placeholder values:

```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';  // ← paste Project URL
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';                    // ← paste anon key
```

Save the file.

---

## Step 3 — Run Locally

No build step is needed. Just serve the files with any static server.

### Option A — VS Code Live Server (easiest)

1. Install the **Live Server** extension in VS Code.
2. Right-click `index.html` → **Open with Live Server**.
3. The browser opens at `http://127.0.0.1:5500`.

### Option B — Python

```bash
cd property-dss
python3 -m http.server 8080
```
Open `http://localhost:8080` in your browser.

### Option C — Node.js `serve`

```bash
npm install -g serve
cd property-dss
serve .
```

---

## Step 4 — First Use

1. Open the app and click **Register**.
2. Create your first **Admin** account (select "Admin" under Account type).
3. Sign in with that account.
4. You'll land on the Dashboard. From there:
   - Go to **Properties** → **+ Add Property** to create your first property.
   - Go to **Maintenance** → **+ New Request** to log a maintenance issue.
   - Go to **Funds** → **+ Add Fund** to set a budget for a property and period.
   - In the Funds page, select a fund → the DSS ranks pending requests and shows which ones can be afforded → click **Allocate**.
   - Go to **Reports** to see the full audit trail.

5. To test the Manager role, register a second account as **Manager**. That user will see all properties and reports, but the edit/add/delete buttons will be hidden.

---

## Step 5 — Deploy to Netlify

### Option A — Drag and Drop (quickest)

1. Go to [https://app.netlify.com](https://app.netlify.com) and log in.
2. Click **Add new site → Deploy manually**.
3. Drag the entire `property-dss` folder onto the drop area.
4. Netlify will deploy instantly and give you a URL like `https://your-site-name.netlify.app`.

### Option B — Netlify CLI

```bash
npm install -g netlify-cli
cd property-dss
netlify deploy --dir . --prod
```

### Setting Environment Variables on Netlify (optional, more secure)

Instead of hardcoding credentials in `supabase.js`, you can inject them at build time using a `netlify.toml` and a small build step. For a simple static site with no build tool, the easiest approach is to keep them in `supabase.js` — the anon key is designed to be public (it's secured by Row Level Security policies in Supabase, which this project has configured).

If you still want to use environment variables:

1. In Netlify → **Site configuration → Environment variables**, add:
   - `SUPABASE_URL` = your project URL
   - `SUPABASE_ANON_KEY` = your anon key

2. Add a `netlify.toml`:
   ```toml
   [build]
     publish = "."
   ```

3. Update `js/supabase.js` to read from `window.ENV_*` (already stubbed in), and use a build script to inject them — or just keep them hardcoded for a student project.

---

## Priority Score Formula

```
Score = (Urgency × 0.35)
      + (Impact × 0.30)
      + (Asset Importance × 0.20)
      - (Cost_normalized × 0.15)
      + Category_boost
```

**Category boosts:**

| Category    | Boost  |
|-------------|--------|
| Roofing     | +2.0   |
| Structural  | +1.8   |
| Electrical  | +1.5   |
| Plumbing    | +1.2   |
| Security    | +1.0   |
| HVAC        | +0.8   |
| Flooring    | 0.0    |
| Painting    | −0.5   |

This ensures a roof leak always outranks a floor scuff, even at equal urgency scores — directly reflecting the prioritisation hierarchy described in the project report (Chapter 2 literature review and Chapter 3 decision model).

---

## Roles Summary

| Action                         | Manager | Admin |
|-------------------------------|---------|-------|
| View properties                | ✅      | ✅    |
| View maintenance requests      | ✅      | ✅    |
| View fund balances             | ✅      | ✅    |
| View reports & audit trail     | ✅      | ✅    |
| Add / Edit / Delete properties | ❌      | ✅    |
| Add / Edit / Delete requests   | ❌      | ✅    |
| Add / Edit funds               | ❌      | ✅    |
| Allocate funds to requests     | ❌      | ✅    |

---

## Troubleshooting

**"Invalid API key" error on login:**  
Double-check the `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `js/supabase.js`.

**Registration succeeds but you can't log in:**  
Email confirmation may be enabled. Check your inbox, or disable email confirmation in Supabase Auth settings.

**Data doesn't appear / RLS errors:**  
Make sure you ran the full `setup.sql` including the RLS policy section. In Supabase → Table Editor, you can verify policies under each table's "Policies" tab.

**Netlify shows a blank page:**  
Make sure you dragged the `property-dss` folder itself (not its parent), so `index.html` is at the root of the deployment.
