import { parseMd, sizeList, stockList, num } from './render';
import type { Report } from './types';

export type Basket = 'on' | 'off' | 'watch' | 'ok';
export const BASKETS: Basket[] = ['on', 'off', 'watch', 'ok'];

/** One product + size, seen across one or more reports. */
export type Item = {
  key: string;
  product: string;
  size: string;
  basket: Basket;          // basket in the most recent report it appeared in
  stock: string;           // stock in that report
  row: Record<string, string>; // that report's full table row
  firstSeen: string;       // date
  lastSeen: string;        // date
  lastCode: string;
  days: string[];          // distinct dates it appeared
  codes: string[];         // every report code it appeared in
  history: Basket[];       // basket per appearance, oldest first
};

export type Consolidated = {
  reports: Report[];
  dates: string[];
  items: Item[];
  occurrences: number;     // product-size rows across all reports
  duplicates: number;      // occurrences - unique items
  byBasket: Record<Basket, Item[]>;
  moved: Item[];           // changed basket during the period
  resolved: Item[];        // not in the latest report of the period
};

const norm = (s: string) => s.toLowerCase().replace(/[™®]/g, '').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
const normSize = (s: string) => s.trim().toUpperCase().replace(/^XXL$/, '2XL');

/**
 * Merge reports into unique product+size items. When the same size appears in several
 * reports (duplicates), the latest report wins for basket, stock and row details, and
 * the item keeps a record of every day it was seen.
 */
export function consolidate(reports: Report[]): Consolidated {
  const sorted = [...reports].sort((a, b) => a.date.localeCompare(b.date) || a.seq - b.seq);
  const map = new Map<string, Item>();
  let occurrences = 0;
  for (const r of sorted) {
    const rep = parseMd(r.md);
    for (const s of rep.sections) {
      if (!BASKETS.includes(s.kind)) continue;
      for (const row of s.rows as Record<string, string>[]) {
        const sizes: string[] = sizeList(row);
        const stock: string[] = stockList(row);
        sizes.forEach((size, i) => {
          occurrences++;
          const key = norm(row.product || '') + '|' + normSize(size);
          const prev = map.get(key);
          const st = stock.length === sizes.length ? stock[i] : (row.stock || '');
          if (!prev) {
            map.set(key, { key, product: row.product, size: normSize(size), basket: s.kind, stock: st, row, firstSeen: r.date, lastSeen: r.date, lastCode: r.code, days: [r.date], codes: [r.code], history: [s.kind] });
          } else {
            prev.basket = s.kind; prev.stock = st; prev.row = row; prev.product = row.product;
            prev.lastSeen = r.date; prev.lastCode = r.code;
            if (!prev.days.includes(r.date)) prev.days.push(r.date);
            if (!prev.codes.includes(r.code)) prev.codes.push(r.code);
            prev.history.push(s.kind);
          }
        });
      }
    }
  }
  const items = [...map.values()];
  const lastDate = sorted.length ? sorted[sorted.length - 1].date : '';
  const byBasket = { on: [], off: [], watch: [], ok: [] } as Record<Basket, Item[]>;
  items.forEach((it) => byBasket[it.basket].push(it));
  for (const k of BASKETS) byBasket[k].sort((a, b) => b.days.length - a.days.length || a.product.localeCompare(b.product) || a.size.localeCompare(b.size));
  return {
    reports: sorted,
    dates: [...new Set(sorted.map((r) => r.date))],
    items,
    occurrences,
    duplicates: occurrences - items.length,
    byBasket,
    moved: items.filter((it) => new Set(it.history).size > 1),
    resolved: items.filter((it) => it.lastSeen < lastDate),
  };
}

const LABEL: Record<Basket, string> = { on: 'Basket 1 — switch ON', off: 'Basket 2 — switch OFF', watch: 'Watch — PO due but at risk', ok: 'Correctly set — no action' };

/** Group unique items back into one row per product (per basket) and write a report .md
 *  in the same format as the daily file, with extra "Seen" and "Last report" columns. */
export function toMarkdown(c: Consolidated, from: string, to: string): string {
  const head = ['---', 'report: continue-selling-consolidated', `date: ${to}`, `from: ${from}`, `to: ${to}`, `window: ${from} to ${to}`, `reports: ${c.reports.map((r) => r.code).join(', ')}`, 'sources: Shopify, Zoho Inventory, Carbonwork', '---', ''];
  const lines: string[] = [...head, `# Consolidated stock report · ${from} to ${to}`, '', '## Summary', '',
    `- ${c.reports.length} reports over ${c.dates.length} days: ${c.occurrences} product-size rows, **${c.duplicates} duplicates removed**, ${c.items.length} unique.`,
    `- Latest basket wins when a size appears on more than one day.`,
    `- ${c.moved.length} sizes changed basket during the period; ${c.resolved.length} dropped out before the last report.`, ''];
  const cols: Record<Basket, string[]> = {
    on: ['PO', 'ETA', 'Stage', 'Likely', 'PO qty'],
    off: ['Sold 30d', 'Short', 'Next PO', 'Flag'],
    watch: ['PO', 'ETA', 'Stage', 'Likely', 'Risk'],
    ok: ['PO', 'ETA', 'Stage', 'Likely', 'Note'],
  };
  for (const k of BASKETS) {
    const groups = new Map<string, Item[]>();
    c.byBasket[k].forEach((it) => { const g = it.product + '|' + it.lastCode; if (!groups.has(g)) groups.set(g, []); groups.get(g)!.push(it); });
    if (!groups.size) continue;
    lines.push(`## ${LABEL[k]}`, '', `| Product | Sizes | Stock | ${cols[k].join(' | ')} | Seen | Last report |`, `|${'---|'.repeat(cols[k].length + 5)}`);
    for (const list of groups.values()) {
      const r = list[0].row; const seen = Math.max(...list.map((x) => x.days.length));
      lines.push(`| ${list[0].product} | ${list.map((x) => x.size).join(', ')} | ${list.map((x) => x.stock).join(', ')} | ${cols[k].map((col) => (r[col.toLowerCase()] ?? '').replace(/\|/g, '/')).join(' | ')} | ${seen} of ${c.dates.length} days | ${list[0].lastCode} |`);
    }
    lines.push('');
  }
  lines.push('## Data notes', '', `- Built from reports ${c.reports.map((r) => r.code).join(', ')}.`, '- Unique on product + size. Where a size appeared more than once, the most recent report is used.', '');
  return lines.join('\n');
}

export const shortfallTotal = (c: Consolidated) => c.byBasket.off.reduce((a, it) => a + Math.max(0, -num(it.stock)), 0);
