# Stock Report Rules

These rules decide which products go into the daily "continue selling" report and which basket each one lands in. Last updated: 24 Sep 2026.

## 1. What gets checked

- Only **active** Shopify products.
- Only variants (size/colour) where Shopify **tracks inventory**.
- Stock is read at the **Kolkata (Rajdanga) location**.

## 2. What gets skipped

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

## 3. When a size counts as low / out of stock

A size is low when its available stock is **at or below the threshold**:

> Threshold = the higher of **5 units** or **3 days of sales**

Daily sales rate = 60% weight on the last 7 days + 40% weight on the last 30 days:

> rate = 0.6 × (units sold in 7 days ÷ 7) + 0.4 × (units sold in 30 days ÷ 30)

Negative stock means orders have been taken that can't be shipped yet. That number is the **shortfall**.

## 4. When a PO counts as "arriving within 7 days"

- The window is **today to today + 7 days**.
- The ETA comes from **Carbonwork's Style Dashboard** (the team keeps it current), not the Zoho delivery date.
- The PO must include **that exact size**. A PO for S–3XL doesn't count for 6XL.
- The PO must not already be received. Zoho doesn't record receipts reliably, so received status comes from Carbonwork.

## 5. "Stock likely in 7 days?" flag

Worked out again on every run, from the production stage in Carbonwork:

| Stage | Flag |
|---|---|
| Dispatch, Packing, Finishing | **Likely** |
| Stitching | **Maybe** |
| Cutting, Trims, Fabric or earlier | **Unlikely** |

The report also notes a Carbonwork **"No fabric"** warning and how many days the PO has already slipped.

## 6. The baskets

| Basket | Continue selling | Stock | PO within 7 days | Action |
|---|---|---|---|---|
| 🟢 **Basket 1** | OFF | Low / out | Yes, for that size | Switch **ON** |
| 🔴 **Basket 2** | ON | Low / out | No (none, or not in time) | Switch **OFF** |
| ⚠️ **Watch** | ON | Low / out | Yes, but flag is **Unlikely** | Keep an eye on it; switch OFF if it slips again |
| ✅ **Correctly set** | ON | Low / out | Yes, flag is Likely | No action |

## 7. LATE flag

A PO is flagged **LATE** when its Zoho delivery date has passed and the goods haven't been received. LATE items still go into Basket 2 when the Carbonwork ETA is more than 7 days away.

## 8. PO quantity vs backlog

For every size with a PO due, the report checks:

- **Covers backlog + 7 days of sales:** PO qty ≥ shortfall + 7 days of sales
- **Covers backlog only:** PO qty ≥ shortfall
- **SHORT:** PO qty < shortfall

## 9. Matching products across systems

Products are matched by **name**, not SKU: product line + colour + size.

- "Carbon Heavyweight T-Shirt" and "Carbon Heavyweight Melange T-Shirt" are the same line.
- Zoho's "Bamboo Lounge V-Neck T-Shirt" is Shopify's "UltraSoft Bamboo V-Neck Tee".
- XXL and 2XL are the same size.

## 10. Fabric suggestions

- The report checks Carbonwork's **Fabric orders** for fabric arriving within 7 days.
- If fabric is arriving, it lists the styles that can be made from it (taken from the fabric's Output tab), e.g. 3D2 Chalk → Heavyweight Tee Chalk and Heavyweight Polo Chalk.
- These are suggestions only.

## 11. What the report does not do

- It **never changes Shopify settings**. It only reports.
- Any switch ON/OFF is done by a person, after approval.

## 12. Sources

| Data | Source |
|---|---|
| Stock, continue-selling setting, sales | Shopify |
| PO line items (size-level quantities) | Zoho Inventory |
| PO ETAs, production stage, received status, fabric | Carbonwork |
