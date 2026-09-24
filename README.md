# stock-desk

Carbontree's daily **continue-selling** stock reports. Upload the day's `.md` report, get a unique code, track reports by date, consolidate a date range into unique product sizes, and print a one-page A4 summary for Karan.

Built with **Next.js 15** (static export) and **Firebase** (Auth + Firestore, optional Hosting).

## What it does

| Page | What you can do |
|---|---|
| **Reports** (`/`) | Upload a report `.md`. Filter by date range (Today, Last 5 / 7 / 30 days, or any From–To). See every report with its basket counts. |
| **Report** (`/report/?code=240926-01`) | Three tabs: **Shantanu** and **Kabir** (full report + shared notes) and **Karan** (one-page A4 print sheet with charts). Download the original `.md`. |
| **Consolidate** (`/consolidate/?from=…&to=…`) | Merge all reports in a date range into **unique product + size** rows. Duplicates are removed; the latest report decides the basket and stock. Shows days seen, first seen, and basket history. Download the consolidated `.md` or print it for Karan. |

### Report codes

`DDMMYY-NN` — the report's date plus its upload number for that date.

- 24 Sep 2026, first upload → **`240926-01`**
- A second upload for the same date → **`240926-02`** (nothing is overwritten)

The date comes from `date:` in the file's front matter (or `YYYY-MM-DD` in the file name). Numbers are handed out in a Firestore transaction (`counters/{DDMMYY}`), so two people uploading at once can't get the same code.

### Consolidation rules

- Unique key = product name + size (case, ™ and spacing ignored; XXL = 2XL).
- When a size appears in several reports, the **most recent** one wins for basket, stock and PO details.
- "Use only the latest upload for each day" (on by default) ignores earlier `-01`, `-02` uploads when a day has a later one.
- The result shows how many product-size rows were read, how many **duplicates were removed**, and how many sizes are unique.

## Setup

### 1. Firebase console (project `stock-desk-001`)

1. **Authentication → Sign-in method → Google → Enable.**
2. **Authentication → Settings → Authorized domains:** add the domain you host on (e.g. `stock-desk-001.web.app`; `localhost` is there by default).
3. **Firestore Database → Create database** (production mode).
4. Deploy the security rules in this repo (below). They only let verified **@carbontree.com** Google accounts read or write.

### 2. Run locally

```bash
npm install
cp .env.example .env.local   # optional: the defaults already point at stock-desk-001
npm run dev                  # http://localhost:3000
npm test                     # checks report codes and consolidation
```

### 3. Deploy (Firebase Hosting)

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules   # security rules
npm run deploy                           # builds to ./out and deploys hosting + rules
```

The app is a static export (`out/`), so Vercel, Netlify or any static host also works. Add that domain to Firebase's authorized domains.

## Report file format

See `samples/stock-report-2026-09-24.md`. Front matter (`date`, `window`, `sources`), then:

| Section heading | Table columns |
|---|---|
| `## Basket 1 — switch ON` | Product, Sizes, Stock, PO, ETA, Stage, Likely, PO qty |
| `## Basket 2 — switch OFF` | Product, Sizes, Stock, Sold 30d, Short, Next PO, Flag |
| `## Watch — PO due but at risk` | Product, Sizes, Stock, PO, ETA, Stage, Likely, Risk |
| `## Correctly set — no action` | Product, Sizes, Stock, PO, ETA, Stage, Likely, Note |
| `## Summary`, `## Fabric`, `## Data notes` | Bullet lists |

`Sizes` and `Stock` are comma-separated lists in the same order (`S, M, L` / `11, -8, -6`).

Rules and objective: [`docs/reportrules.md`](docs/reportrules.md), [`docs/reportguidelines.md`](docs/reportguidelines.md).

## Data model (Firestore)

```
reports/{code}              code, date (YYYY-MM-DD), seq, title, md, fileName,
                            stats {on, off, watch, ok: {products, sizes}, short},
                            uploadedAt, uploadedBy {uid, name, email}
reports/{code}/notes/{id}   text, at, by {uid, name, email}
counters/{DDMMYY}           next
```

Reports can't be edited after upload (upload a new version instead). Only the uploader can delete a report.

## Code map

```
app/page.tsx              Reports: upload, date filter, list
app/report/page.tsx       One report: Shantanu / Kabir / Karan tabs, notes, print
app/consolidate/page.tsx  Date-range consolidation and export
lib/render.ts             Markdown parsing, screen report and print sheet rendering
lib/consolidate.ts        Duplicate removal and consolidated .md
lib/reports.ts            Firestore reads/writes, upload transaction
lib/codes.ts              DDMMYY-NN codes
firestore.rules           Access: verified @carbontree.com accounts only
```
