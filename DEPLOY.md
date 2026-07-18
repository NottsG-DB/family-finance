# Family Finance — Deployment Guide

Everything you need to go from this folder to a live app at a Vercel URL.
Estimated time: 30–45 minutes.

---

## Step 1 — Create a Supabase project

1. Go to https://supabase.com and sign in (or create a free account)
2. Click **New project**
3. Name it `family-finance`, choose a strong database password, pick the London region
4. Wait ~2 minutes for it to provision

---

## Step 2 — Create the database tables

In your Supabase project, go to **SQL Editor** and run this entire script:

```sql
-- Transactions (from imported bank statements)
create table transactions (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  description text not null,
  amount numeric(10,2) not null,
  balance numeric(10,2),
  reference text unique,
  account text,
  type text check (type in ('debit','credit')),
  category text,
  subcategory text,
  reviewed boolean default false,
  created_at timestamptz default now()
);

-- Categorisation rules (learned from your confirmations)
create table categorisation_rules (
  id uuid default gen_random_uuid() primary key,
  merchant_pattern text unique not null,
  category text not null,
  subcategory text not null,
  confidence numeric(3,2) default 1.0,
  created_at timestamptz default now()
);

-- Goals
create table goals (
  id text primary key,
  name text not null,
  emoji text default '⭐',
  target numeric(10,2) default 0,
  saved numeric(10,2) default 0,
  monthly numeric(10,2) default 0,
  priority text default 'medium',
  ongoing boolean default false,
  priority_order int default 99,
  created_at timestamptz default now()
);

-- Mortgage parts (editable)
create table mortgage_parts (
  id int primary key,
  label text,
  balance numeric(10,2),
  rate numeric(6,4),
  fixed_until date,
  term_years numeric(5,2),
  updated_at timestamptz default now()
);

-- Insert your mortgage data
insert into mortgage_parts (id, label, balance, rate, fixed_until, term_years) values
  (1, 'Part 1', 30885.54, 0.0159, '2029-03-02', 11),
  (2, 'Part 2', 14687.98, 0.0414, '2029-01-10', 2.5),
  (3, 'Part 3', 16929.76, 0.0379, '2030-01-02', 13.25),
  (4, 'Part 4', 90734.78, 0.0379, '2030-01-02', 11.75);

-- Settings (pension, ISA balances, etc)
create table settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

-- Accounts (savings pots, credit cards)
create table accounts (
  id text primary key,
  name text not null,
  type text,
  balance numeric(10,2),
  updated_at timestamptz default now()
);

-- Row Level Security — authenticated users only
alter table transactions enable row level security;
alter table categorisation_rules enable row level security;
alter table goals enable row level security;
alter table mortgage_parts enable row level security;
alter table settings enable row level security;
alter table accounts enable row level security;

create policy "Authenticated users can do everything" on transactions for all using (auth.role() = 'authenticated');
create policy "Authenticated users can do everything" on categorisation_rules for all using (auth.role() = 'authenticated');
create policy "Authenticated users can do everything" on goals for all using (auth.role() = 'authenticated');
create policy "Authenticated users can do everything" on mortgage_parts for all using (auth.role() = 'authenticated');
create policy "Authenticated users can do everything" on settings for all using (auth.role() = 'authenticated');
create policy "Authenticated users can do everything" on accounts for all using (auth.role() = 'authenticated');
```

Click **Run**. You should see "Success" with no errors.

---

## Step 3 — Enable Google login

1. In Supabase, go to **Authentication → Providers**
2. Find **Google** and toggle it on
3. You'll need a Google OAuth client ID and secret. To get these:
   - Go to https://console.cloud.google.com
   - Create a new project (or use an existing one)
   - Go to **APIs & Services → Credentials**
   - Click **Create credentials → OAuth client ID**
   - Choose **Web application**
   - Under **Authorised redirect URIs**, add:
     `https://your-project-id.supabase.co/auth/v1/callback`
     (replace `your-project-id` with your actual Supabase project ID)
   - Copy the **Client ID** and **Client secret** back into Supabase
4. Save

---

## Step 4 — Get your Supabase keys

In Supabase, go to **Settings → API**. You need:
- **Project URL** — looks like `https://abcdefgh.supabase.co`
- **anon public key** — the long string under "Project API keys"

Keep these handy for the next steps.

---

## Step 5 — Push to GitHub

```bash
# In the familyfinance folder
git init
git add .
git commit -m "Initial commit — family finance app"

# Create a new private repo on GitHub called family-finance
# Then connect and push:
git remote add origin https://github.com/YOUR_USERNAME/family-finance.git
git branch -M main
git push -u origin main
```

---

## Step 6 — Deploy on Vercel

1. Go to https://vercel.com and sign in
2. Click **Add New → Project**
3. Import your `family-finance` GitHub repo
4. Vercel will auto-detect it as a Create React App project
5. Before clicking **Deploy**, click **Environment Variables** and add:

| Name | Value |
|---|---|
| `REACT_APP_SUPABASE_URL` | Your Supabase project URL |
| `REACT_APP_SUPABASE_ANON_KEY` | Your Supabase anon key |

6. Click **Deploy**
7. Wait ~2 minutes. You'll get a URL like `family-finance-abc123.vercel.app`

---

## Step 7 — Add your Vercel URL to Supabase

1. Back in Supabase, go to **Authentication → URL Configuration**
2. Set **Site URL** to your Vercel URL (e.g. `https://family-finance-abc123.vercel.app`)
3. Under **Redirect URLs**, add the same URL
4. Also go back to Google Cloud Console and add your Vercel URL to **Authorised JavaScript origins**

---

## Step 8 — Test it

1. Open your Vercel URL
2. Click **Sign in with Google**
3. Sign in with your Google account
4. You should see the dashboard

To add Claire:
- She just visits the URL and signs in with her Google account
- Both of you will see the same data (shared household view)

---

## Step 9 — Set it up as a home screen app (optional but recommended)

**iPhone:**
- Open the app URL in Safari
- Tap the Share button → **Add to Home Screen**
- It'll behave like a native app

**Android:**
- Open in Chrome
- Tap the menu → **Add to Home screen**

---

## Updating the app

Any time you make changes:
```bash
git add .
git commit -m "Description of change"
git push
```

Vercel auto-deploys on every push. Live in ~2 minutes.

---

## Troubleshooting

**Google login not working:**
- Double-check the redirect URI in Google Cloud Console matches exactly: `https://your-project-id.supabase.co/auth/v1/callback`
- Make sure the Vercel URL is in the Supabase redirect URLs list

**Transactions not saving:**
- Check the browser console for errors
- Verify the Supabase environment variables are set correctly in Vercel

**App shows blank after login:**
- Check Vercel deployment logs for build errors
- Make sure both env variables are present

---

## What's in the app

| Page | What it does |
|---|---|
| Overview | Monthly cashflow, A/B/C categories, recent transactions |
| Mortgage | All 4 parts, renewal alerts, Part 2 clearance tracker |
| Position | Pension + ISA retirement projections, net position |
| Goals | Life goals tracker with monthly allocation |
| What if | Cash flow and tax scenario modelling |
| Import | Upload Santander XLS or credit card CSV with 3-tier review |
