# Stock Report Guidelines

## Objective

Get Shopify's **"continue selling when out of stock"** setting right on every product, every day.

The setting goes wrong in two ways, and each one costs money:

- **🟢 Should be selling, but isn't.** A product is sold out, stock is arriving within 7 days, and "continue selling" is OFF. Customers leave and we lose sales for no reason. These should be switched **ON**.
- **🔴 Is selling, but shouldn't be.** "Continue selling" is ON and the product is out of stock, but no stock is coming within 7 days (no PO, or the PO is late). Customers pay for something we can't ship soon. These should be switched **OFF**.

The report finds both cases every morning so they can be fixed the same day.

## Who it's for

| Person | What they use it for |
|---|---|
| **Shantanu** | Uploads the day's report, reviews it and adds notes |
| **Kabir** | Reviews the report with Shantanu through the day and adds notes |
| **Karan** | Reads a one-page printable summary |

## When

- The report is ready **by 11:00 am every day**.
- It covers stock arriving from **today to 7 days ahead**.

## What a good report does

1. **Leads with the action.** Top of the page: how many sizes to switch ON, how many to switch OFF, how many to watch.
2. **Shows only what matters.** Products that are always 0 stock on the website (SlowFlow, Grant Thornton, 360 ONE, Printstop) are skipped so the list stays short.
3. **Is honest about timing.** A PO date isn't the same as stock arriving. Every PO carries a "likely in 7 days?" flag based on where it really is in production.
4. **Flags late POs.** Anything past its promised date is marked LATE, so the delay is visible.
5. **Checks quantity, not just dates.** It says whether the incoming PO covers the orders we already owe plus a week of sales.
6. **Suggests what to make next.** When fabric is arriving, it lists the styles that fabric can be used for. These are suggestions only.
7. **Names data problems.** If a source is out of date or doesn't match (e.g. Zoho not recording receipts), the report says so.

## What the report is not

- It **does not change anything in Shopify**. Every switch is made by a person after review.
- It's not a full stock or reorder plan. It only covers the continue-selling setting and the next 7 days.

## Where it lives

- **Stock Desk page** (claude.ai artifact): Shantanu, Kabir and Karan tabs, with report history and shared notes.
- **Daily .md file:** `stock-report-YYYY-MM-DD.md`, uploaded to the page on the Shantanu tab.

## Related

- `reportrules.md`: the exact rules that decide which basket each product goes in.
