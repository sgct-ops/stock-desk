# stock-desk

Carbontree's daily **continue-selling** stock report desk. Upload the day's `.md` report, get a unique code for it, track reports by date, consolidate a date range into unique product sizes, and print a one-page A4 summary for Karan.

Built with **Next.js 15** and **Firebase** (Google sign-in + Firestore). Hosted on **Vercel**.

- [What the report is for](#what-the-report-is-for)
- [Report rules](#report-rules)
- [How the app works](#how-the-app-works)
- [Who can see what](#who-can-see-what)
- [Setup](#setup)
- [Firestore security rules](#firestore-security-rules)
- [Report file format](#report-file-format)
- [Code map](#code-map)

---

# What the report is for

## Stock Report Guidelines

### Objective

Get Shopify's **"continue selling when out of stock"** setting right on every product, every day.

The setting goes wrong in two ways, and each one costs money:

- **🟢 Should be selling, but isn't.** A product is sold out, stock is arriving within 7 days, and "continue selling" is OFF. Customers leave and we lose sales for no reason. These should be switched **ON**.
- **🔴 Is selling, but shouldn't be.** "Continue selling" is ON and the product is out of stock, but no stock is coming within 7 days (no PO, or the PO is late). Customers pay for something we can't ship soon. These should be switched **OFF**.

The report finds both cases every morning so they can be fixed the same day.

### Who it's for

| Person | What they use it for |
|---|---|
| **Shantanu** | Uploads the day's report, reviews it and adds notes |
| **Kabir** | Reviews the report with Shantanu through the day and adds notes |
| **Karan** | Reads a one-page printable summary |

### When

- The report is ready **by 11:00 am every day**.
- It covers stock arriving from **today to 7 days ahead**.

### What a good report does

1. **Leads with the action.** Top of the page: how many sizes to switch ON, how many to switch OFF, how many to watch.
2. **Shows only what matters.** Products that are always 0 stock on the website (SlowFlow, Grant Thornton, 360 ONE, Printstop) are skipped so the list stays short.
3. **Is honest about timing.** A PO date isn't the same as stock arriving. Every PO carries a "likely in 7 days?" flag based on where it really is in production.
4. **Flags late POs.** Anything past its promised date is marked LATE, so the delay is visible.
5. **Checks quantity, not just dates.** It says whether the incoming PO covers the orders we already owe plus a week of sales.
6. **Suggests what to make next.** When fabric is arriving, it lists the styles that fabric can be used for. These are suggestions only.
7. **Names data problems.** If a source is out of date or doesn't match (e.g. Zoho not recording receipts), the report says so.

### What the report is not

- It **does not change anything in Shopify**. Every switch is made by a person after review.
- It's not a full stock or reorder plan. It only covers the continue-selling setting and the next 7 days.

### Where it lives

- **Stock Desk** (this app): report history by code and date, Shantanu / Kabir / Karan views, shared notes, consolidation.
- **Daily .md file:** `stock-report-YYYY-MM-DD.md`, uploaded to the page on the Shantanu tab.

### Related

- [Report rules](#report-rules): the exact rules that decide which basket each product goes in.

---

# Report rules

## Stock Report Rules

These rules decide which products go into the daily "continue selling" report and which basket each one lands in. Last updated: 24 Sep 2026.

### 1. What gets checked

- Only **active** Shopify products.
- Only variants (size/colour) where Shopify **tracks inventory**.
- Stock is read at the **Kolkata (Rajdanga) location**.

### 2. What gets skipped

These are never included in the report:

- **SlowFlow** products
- **Grant Thornton** products
- **360 ONE** products
- **Printstop** products
- Bundles and multi-packs ("Pack of 2", "Pack of 3", "Bundle")
- Service items: "Alteration" and "Customization Product"
- Untracked items

These products always show 0 stock on the website by design, so listing them adds noise. The match looks at the product name, variant name, vendor and tags, and ignores capitals and spaces ("SlowFlow", "Slowflow" and "Slow Flow" are all caught).

The report's Data notes say how many products were skipped that day.

### 3. When a size counts as low / out of stock

A size is low when its available stock is **at or below the threshold**:

> Threshold = the higher of **5 units** or **3 days of sales**

Daily sales rate = 60% weight on the last 7 days + 40% weight on the last 30 days:

> rate = 0.6 × (units sold in 7 days ÷ 7) + 0.4 × (units sold in 30 days ÷ 30)

Negative stock means orders have been taken that can't be shipped yet. That number is the **shortfall**.

### 4. When a PO counts as "arriving within 7 days"

- The window is **today to today + 7 days**.
- The ETA comes from **Carbonwork's Style Dashboard** (the team keeps it current), not the Zoho delivery date.
- The PO must include **that exact size**. A PO for S–3XL doesn't count for 6XL.
- The PO must not already be received. Zoho doesn't record receipts reliably, so received status comes from Carbonwork.

### 5. "Stock likely in 7 days?" flag

Worked out again on every run, from the production stage in Carbonwork:

| Stage | Flag |
|---|---|
| Dispatch, Packing, Finishing | **Likely** |
| Stitching | **Maybe** |
| Cutting, Trims, Fabric or earlier | **Unlikely** |

The report also notes a Carbonwork **"No fabric"** warning and how many days the PO has already slipped.

### 6. The baskets

| Basket | Continue selling | Stock | PO within 7 days | Action |
|---|---|---|---|---|
| 🟢 **Basket 1** | OFF | Low / out | Yes, for that size | Switch **ON** |
| 🔴 **Basket 2** | ON | Low / out | No (none, or not in time) | Switch **OFF** |
| ⚠️ **Watch** | ON | Low / out | Yes, but flag is **Unlikely** | Keep an eye on it; switch OFF if it slips again |
| ✅ **Correctly set** | ON | Low / out | Yes, flag is Likely | No action |

### 7. LATE flag

A PO is flagged **LATE** when its Zoho delivery date has passed and the goods haven't been received. LATE items still go into Basket 2 when the Carbonwork ETA is more than 7 days away.

### 8. PO quantity vs backlog

For every size with a PO due, the report checks:

- **Covers backlog + 7 days of sales:** PO qty ≥ shortfall + 7 days of sales
- **Covers backlog only:** PO qty ≥ shortfall
- **SHORT:** PO qty < shortfall

### 9. Matching products across systems

Products are matched by **name**, not SKU: product line + colour + size.

- "Carbon Heavyweight T-Shirt" and "Carbon Heavyweight Melange T-Shirt" are the same line.
- Zoho's "Bamboo Lounge V-Neck T-Shirt" is Shopify's "UltraSoft Bamboo V-Neck Tee".
- XXL and 2XL are the same size.

### 10. Fabric suggestions

- The report checks Carbonwork's **Fabric orders** for fabric arriving within 7 days.
- If fabric is arriving, it lists the styles that can be made from it (taken from the fabric's Output tab), e.g. 3D2 Chalk → Heavyweight Tee Chalk and Heavyweight Polo Chalk.
- These are suggestions only.

### 11. What the report does not do

- It **never changes Shopify settings**. It only reports.
- Any switch ON/OFF is done by a person, after approval.

### 12. Sources

| Data | Source |
|---|---|
| Stock, continue-selling setting, sales | Shopify |
| PO line items (size-level quantities) | Zoho Inventory |
| PO ETAs, production stage, received status, fabric | Carbonwork |

---

# How the app works

| Page | What you can do |
|---|---|
| **Reports** (`/`) | Upload a report `.md` (Shantanu). Filter by date: Today, Last 5 / 7 / 30 days, or any From–To. See every report with its basket counts. |
| **Report** (`/report/?code=240926-01`) | The report in the tabs your login allows (see below), shared notes, download the original `.md`, print Karan's one-page A4 sheet. |
| **Consolidate** (`/consolidate/?from=…&to=…`) | Merge every report in a date range into **unique product + size** rows (Shantanu). Duplicates are removed; the latest report decides basket and stock. Shows days seen, first seen and basket history. Download the consolidated `.md` or print it for Karan. |

### Report codes

`DDMMYY-NN`: the report's date plus its upload number for that date.

- 24 Sep 2026, first upload → **`240926-01`**
- A second upload for the same date → **`240926-02`**. Nothing is overwritten.

The date comes from `date:` in the file's front matter (or `YYYY-MM-DD` in the file name). The number is handed out in a Firestore transaction on `counters/{DDMMYY}`, and the security rules only accept a report whose code matches its date and the counter, so codes can't be skipped, reused or guessed. Deleting a report never frees its number.

### Consolidation

- Unique key = product name + size (case, ™ and spacing ignored; XXL = 2XL).
- When a size appears in several reports, the **most recent** report wins for basket, stock and PO details.
- "Use only the latest upload for each day" (on by default) ignores earlier `-01`, `-02` uploads when a day has a later one.
- The page shows how many product-size rows were read, how many **duplicates were removed**, how many sizes are unique, which sizes changed basket, and which dropped out before the last report.

# Who can see what

| Signed in as | Sees |
|---|---|
| `shantanu@carbontree.com` | Reports list with **upload**, **Consolidate**, and the **Shantanu** and **Karan** tabs on each report. Can delete reports he uploaded. |
| `kabir@carbontree.com` | Reports list (read-only) and the **Kabir** tab on each report. Can add notes. |
| Any other @carbontree.com account | A "No access yet" screen asking them to speak to shantanu@carbontree.com. |
| Anyone else | Can't sign in (Google sign-in is limited to @carbontree.com). |

The app hides screens by role (`lib/roles.ts`); the **Firestore rules enforce the same access on the data**, so the limits hold even outside the app. To give someone access, add their email in both `lib/roles.ts` and `firestore.rules`, then redeploy both.

# Setup

### 1. Firebase console (project `stock-desk-001`)

1. **Authentication → Sign-in method → Google → Enable.**
2. **Authentication → Settings → Authorized domains:** add your Vercel domain(s), e.g. `stock-desk.vercel.app` and any custom domain. (`localhost` is there by default.)
3. **Firestore Database → Create database** in **production mode**.
4. **Publish the rules** in `firestore.rules` (next section). Until you do, the access limits above are not active on the database.

### 2. Environment variables

The app reads its Firebase settings only from environment variables. Nothing is hardcoded. Set these in **Vercel → Project → Settings → Environment Variables** (and in `.env.local` for local development; see `.env.example`):

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase console → Project settings → Your apps → Web app |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | same |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | same |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | same |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | same |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | same |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | same (optional; enables Analytics) |
| `NEXT_PUBLIC_ALLOWED_DOMAIN` | optional; defaults to `carbontree.com` |

These are Firebase **web client** settings. They end up in the browser by design, so they identify the project but don't grant access. Access is controlled by the Firestore rules and Google sign-in. Redeploy on Vercel after changing them.

### 3. Local development

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3000
npm test                     # report codes + consolidation
```

### 4. Deploy

- **App:** push to `main`; Vercel builds and deploys it.
- **Rules:** either paste `firestore.rules` into Firebase console → Firestore → Rules → Publish, or run:

```bash
npx firebase-tools login
npm run deploy:rules -- --project stock-desk-001
```

# Firestore security rules

`firestore.rules` is the source of truth. In short:

| Data | Read | Create | Update | Delete |
|---|---|---|---|---|
| `reports/{code}` | Shantanu, Kabir | Shantanu, only with the next code for that date, known fields only, server timestamp, himself as uploader | Nobody (reports are a record) | Shantanu, own uploads |
| `reports/{code}/notes/{id}` | Shantanu, Kabir | Shantanu, Kabir, as themselves, on an existing report, ≤ 2,000 characters | Author, text only | Author |
| `counters/{DDMMYY}` | Shantanu | Only together with that date's `-01` report | Only +1, together with the matching report | Nobody |
| Anything else | Nobody | Nobody | Nobody | Nobody |

All access also requires a verified Google-account email.

Test the rules locally with the Firestore emulator (needs Java 11+):

```bash
npm run test:rules
```

`tests/rules.test.ts` checks around 30 cases: uploads and code numbering, skipped/reused/mismatched codes, edits, who can read, notes, deletes, and unknown collections.

# Report file format

See `samples/stock-report-2026-09-24.md`. Front matter (`date`, `window`, `sources`), then:

| Section heading | Table columns |
|---|---|
| `## Basket 1 — switch ON` | Product, Sizes, Stock, PO, ETA, Stage, Likely, PO qty |
| `## Basket 2 — switch OFF` | Product, Sizes, Stock, Sold 30d, Short, Next PO, Flag |
| `## Watch — PO due but at risk` | Product, Sizes, Stock, PO, ETA, Stage, Likely, Risk |
| `## Correctly set — no action` | Product, Sizes, Stock, PO, ETA, Stage, Likely, Note |
| `## Summary`, `## Fabric`, `## Data notes` | Bullet lists |

`Sizes` and `Stock` are comma-separated lists in the same order (`S, M, L` / `11, -8, -6`).

### Data model

```
reports/{code}              code, date (YYYY-MM-DD), seq, title, md, fileName,
                            stats {on, off, watch, ok: {products, sizes}, short},
                            uploadedAt, uploadedBy {uid, name, email}
reports/{code}/notes/{id}   text, at, by {uid, name, email}
counters/{DDMMYY}           next
```

# Code map

```
app/page.tsx              Reports: upload, date filter, list
app/report/page.tsx       One report: role-based tabs, notes, print
app/consolidate/page.tsx  Date-range consolidation and export
components/Auth.tsx       Google sign-in, role lookup, "No access yet" screen
lib/roles.ts              Who sees which tabs and actions
lib/render.ts             Markdown parsing, screen report, Karan print sheet
lib/consolidate.ts        Duplicate removal and consolidated .md
lib/reports.ts            Firestore reads/writes, upload transaction
lib/codes.ts              DDMMYY-NN codes
firestore.rules           Access rules (the real protection)
tests/                    Consolidation tests and Firestore rules tests
docs/                     reportrules.md, reportguidelines.md
```
