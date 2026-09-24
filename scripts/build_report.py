#!/usr/bin/env python3
"""
Stock Desk daily report builder.

Turns raw pulls from Shopify, Zoho and Carbonwork into the day's Stock Desk report
(.md), applying every rule in reportrules.md. Deterministic: same inputs, same report.

Inputs (all in one folder, default ./raw):
  shopify_variants_*.json   Shopify GraphQL productVariants pages (each {data:{productVariants:{nodes:[...]}}})
  sales_7d.json, sales_30d.json   ShopifyQL results ({rows:[[product_title, variant_title, units], ...]})
  zoho_lines.csv            po,item_name,qty,qty_received   (open style POs due soon; item_name "Product (Colour) - Size")
  zoho_pos.json             optional: Zoho list_purchase_orders result, for LATE flags (delivery_date per PO number)
  carbonwork_styles.json    [{name, po, vendor, eta, orig, step, slip, nofabric}]  from the Style Dashboard
  carbonwork_fabric.json    optional: [{fabric, colour, po, eta, stage, kg_left}]  from PO Tracker fabric orders

Usage:
  python3 build_report.py --raw ./raw --date 2026-09-24 --seq 1 --out ./out
Prints a JSON summary; writes stockdeskDDMMYY-NN.md.
"""
import argparse, csv, datetime as dt, glob, json, math, os, re, sys
from collections import defaultdict, OrderedDict

# ---------------------------------------------------------------- rules (reportrules.md)
SKIP_PATTERNS = [r'slow\s*flow', r'grant\s*thornton', r'360\s*one', r'print\s*stop']
SKIP_RE = re.compile('|'.join(SKIP_PATTERNS), re.I)
SERVICE_PREFIX = ('Alteration', 'Customization')
BUNDLE_RE = re.compile(r'pack of|bundle', re.I)
MIN_LOW = 5                 # low stock = available <= max(5, 3 days of sales)
COVER_DAYS = 3
WINDOW_DAYS = 7
LIKELY = {'dispatch': 'Likely', 'packing': 'Likely', 'finishing': 'Likely', 'stitching': 'Maybe'}

def daily_rate(u7, u30): return 0.6 * u7 / 7 + 0.4 * u30 / 30
def likely(step): return LIKELY.get((step or '').strip().lower(), 'Unlikely')

# ---------------------------------------------------------------- naming
def fam(title):
    t = (title or '').lower()
    if 'heavyweight' in t and ('t-shirt' in t or 'tee' in t) and not any(x in t for x in ('v-neck', 'oversized', 'full sleeve', 'polo')): return 'HWT'
    if 'heavyweight polo' in t or ('polo' in t and 'sorona' in t and 'placket' not in t): return 'HWP'
    if 'v-neck' in t and 'bamboo' in t: return 'BVN'
    if 'heavyweight v-neck' in t: return 'HVN'
    if 'lounge pant' in t: return 'BLP'
    if "women" in t and 'bamboo' in t and ('t-shirt' in t or 'tee' in t): return 'WBT'
    if 'bamboo tee' in t or ('bamboo' in t and 't-shirt' in t): return 'BT'
    if 'lightweight' in t: return 'LWT'
    if 'full sleeve' in t and 'sorona' in t: return 'SFS'
    if 'sleeveless jacket' in t: return 'JKT-W' if 'women' in t else 'JKT-M'
    return None

def split_name(name):
    """'Product (Colour) - Size' -> (base, colour, size)"""
    m = re.match(r'(.*?)\s*\(([^)]+)\)\s*(?:-\s*(.+))?$', (name or '').strip())
    return (m.group(1), m.group(2).strip(), (m.group(3) or '').strip()) if m else (name, '', '')

def norm_size(s): return (s or '').strip().upper().replace('XXL', '2XL') if (s or '').strip().upper() != 'XXXL' else '3XL'
def short_product(title):
    t = re.sub(r'\s*[–-]\s*Sorona™?|\s*[–-]\s*Organic Cotton', '', title)
    return t.replace('Carbon Heavyweight Melange T-Shirt', 'Heavyweight Melange T-Shirt').replace('Organic Cotton Men', 'Men')

# ---------------------------------------------------------------- load
def load_json(p, default=None):
    if not os.path.exists(p): return default
    with open(p, encoding='utf-8') as f: return json.load(f)

def load_variants(raw):
    rows = []
    for p in sorted(glob.glob(os.path.join(raw, 'shopify_variants_*.json'))):
        d = load_json(p)
        nodes = (d.get('data', d).get('productVariants', {}) or {}).get('nodes', [])
        for n in nodes:
            prod = n.get('product') or {}
            inv = n.get('inventoryItem') or {}
            lv = ((inv.get('inventoryLevels') or {}).get('nodes') or [])
            q = {x['name']: x['quantity'] for x in (lv[0]['quantities'] if lv else [])}
            rows.append(dict(
                product=prod.get('title', ''), status=prod.get('status', 'ACTIVE'),
                vendor=prod.get('vendor', '') or '', tags=' '.join(prod.get('tags', []) or []),
                size=n.get('title', ''), policy=n.get('inventoryPolicy', 'DENY'),
                available=q.get('available', n.get('inventoryQuantity') or 0), committed=q.get('committed', 0),
                tracked=inv.get('tracked', True)))
    return rows

def load_sales(p):
    d = load_json(p, {'rows': []})
    out = {}
    for r in d.get('rows', []):
        out[(r[0].strip(), norm_size(r[1]))] = int(float(r[2] or 0))
    return out

def load_zoho_lines(p):
    q = defaultdict(int)
    if not os.path.exists(p): return q
    for r in csv.DictReader(open(p, encoding='utf-8')):
        base, col, size = split_name(r['item_name'])
        po = str(r['po']).replace('CT26/PO/', '').strip()
        q[(po, fam(base), col.lower(), norm_size(size))] += int(float(r['qty'] or 0)) - int(float(r.get('qty_received') or 0))
    return q

def load_zoho_dates(p):
    d = load_json(p)
    if not d: return {}
    pos = d.get('data', d).get('purchaseorders', d if isinstance(d, list) else [])
    return {str(x['purchaseorder_number']).replace('CT26/PO/', ''): x.get('delivery_date') or '' for x in pos}

def parse_day(s, year):
    s = (s or '').strip()
    m = re.match(r'(\d{1,2})\s*([A-Za-z]{3})', s)
    if m:
        mon = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].index(m.group(2).lower()) + 1
        return dt.date(year, mon, int(m.group(1)))
    try: return dt.date.fromisoformat(s[:10])
    except Exception: return None

ABBR = {'HWT': 'Carbon Heavyweight T-shirt – Sorona™', 'HWP': 'Heavyweight Polo – Sorona™'}
# Which styles each fabric feeds (from Carbonwork's fabric Output tab). Extend as you learn more.
FABRIC_STYLES = {'3D2': 'Heavyweight Tee, Heavyweight Polo'}

def load_styles(p, colours, year):
    """Carbonwork Style Dashboard cards -> style lines with family + colour split off the name.
    Accepts objects {name, po, vendor, eta, step, slip, nofabric} or compact rows
    [name, po, vendor, eta, step, slip, nofabric] (names may start with HWT / HWP)."""
    out, unmatched = [], []
    cols = sorted(colours, key=len, reverse=True)
    for c in load_json(p, []):
        if isinstance(c, list):
            c = dict(zip(['name', 'po', 'vendor', 'eta', 'step', 'slip', 'nofabric'], c + [None] * 7))
        name = re.sub(r'\s+', ' ', c.get('name') or '').strip()
        head = name.split(' ', 1)[0]
        if head in ABBR: name = ABBR[head] + name[len(head):]
        f = fam(name)
        colour = next((k for k in cols if name.lower().endswith(k.lower())), None)
        eta = parse_day(c.get('eta'), year)
        if not f or not colour or not eta:
            if not re.search(r'sample|label|sticker|tag|trim', name, re.I): unmatched.append(name)
            continue
        out.append(dict(fam=f, colour=colour.lower(), colour_disp=colour, po=str(c.get('po') or '').replace('CT26/PO/', ''),
                        vendor=c.get('vendor') or '', eta=eta, step=c.get('step') or '', slip=int(c.get('slip') or 0),
                        nofabric=bool(c.get('nofabric'))))
    return out, unmatched

def load_fabric(p):
    """Carbonwork fabric order cards: objects {fabric, po, colour, stage, eta, late} or rows [fabric, po, colour, stage, eta, late]."""
    out = []
    for c in load_json(p, []):
        if isinstance(c, list): c = dict(zip(['fabric', 'po', 'colour', 'stage', 'eta', 'late'], c + [None] * 6))
        if c.get('eta'): out.append(c)
    return out

# ---------------------------------------------------------------- build
def build(raw, date, seq):
    today = dt.date.fromisoformat(date); horizon = today + dt.timedelta(days=WINDOW_DAYS)
    variants = load_variants(raw)
    s7, s30 = load_sales(os.path.join(raw, 'sales_7d.json')), load_sales(os.path.join(raw, 'sales_30d.json'))
    zq = load_zoho_lines(os.path.join(raw, 'zoho_lines.csv'))
    zdates = load_zoho_dates(os.path.join(raw, 'zoho_pos.json'))
    colours = {split_name(v['product'])[1] for v in variants if split_name(v['product'])[1]}
    styles, unmatched_styles = load_styles(os.path.join(raw, 'carbonwork_styles.json'), colours, today.year)
    fabric = load_fabric(os.path.join(raw, 'carbonwork_fabric.json'))
    zoho_pos_with_lines = {k[0] for k in zq}

    skipped = defaultdict(set); checked = 0; low = []
    for v in variants:
        hay = ' '.join([v['product'], v['size'], v['vendor'], v['tags']])
        if v['status'] != 'ACTIVE' or not v['tracked']: continue
        if v['product'].startswith(SERVICE_PREFIX) or BUNDLE_RE.search(v['product']): continue
        if SKIP_RE.search(hay): skipped[SKIP_RE.search(hay).group(0).lower().replace(' ', '')].add(v['product']); continue
        checked += 1
        base, colour, _ = split_name(v['product']); f = fam(base); size = norm_size(v['size'])
        u7 = s7.get((v['product'].strip(), size), 0); u30 = s30.get((v['product'].strip(), size), 0)
        rate = daily_rate(u7, u30); thr = max(MIN_LOW, math.ceil(COVER_DAYS * rate)); av = v['available']
        if av > thr: continue
        same = [s for s in styles if f and s['fam'] == f and s['colour'] == colour.lower()]
        def carries(s):  # PO includes this size (or Zoho lines unknown for that PO)
            return zq.get((s['po'], f, colour.lower(), size), 0) > 0 or s['po'] not in zoho_pos_with_lines
        near = [s for s in same if today <= s['eta'] <= horizon and carries(s)]
        later = sorted([s for s in same if s['eta'] > horizon and carries(s)], key=lambda s: s['eta'])
        inq = sum(zq.get((s['po'], f, colour.lower(), size), 0) for s in near)
        short = max(0, -av)
        need7 = math.ceil(rate * 7)
        low.append(dict(product=v['product'], size=size, policy=v['policy'], stock=av, u30=u30, rate=rate,
                        near=near, later=later, inq=inq, short=short, need7=need7))

    def basket(r):
        if r['policy'] == 'DENY': return 'on' if r['near'] else None
        if not r['near']: return 'off'
        return 'ok' if any(likely(s['step']) != 'Unlikely' for s in r['near']) else 'watch'
    groups = {k: OrderedDict() for k in ('on', 'off', 'watch', 'ok')}
    for r in low:
        b = basket(r)
        if b: groups[b].setdefault(r['product'], []).append(r)

    order = ['XS','S','M','L','XL','2XL','3XL','4XL','5XL','6XL','7XL']
    so = lambda s: order.index(s) if s in order else 99
    def po_label(s): return f"PO/{s['po']} {s['vendor']}".strip()
    def cover(rs):
        tot = sum(r['inq'] for r in rs); need = sum(r['short'] + r['need7'] for r in rs); sh = sum(r['short'] for r in rs)
        return tot, ('covers backlog + 7 days of sales' if tot >= need else 'covers backlog only' if tot >= sh else 'SHORT of backlog')
    def late_flag(r):
        nxt = r['later'][0] if r['later'] else None
        if not nxt: return 'None', 'NO PO'
        zd = zdates.get(nxt['po'], '')
        is_late = bool(zd) and zd < date
        lbl = f"PO/{nxt['po']} · {nxt['eta'].strftime('%-d %b')} · {nxt['step']}"
        return lbl, (f"LATE {(today - dt.date.fromisoformat(zd)).days}d" if is_late else 'LATER')

    rows = {k: [] for k in groups}
    for k, g in groups.items():
        for prod, rs in g.items():
            rs.sort(key=lambda r: so(r['size']))
            base = dict(product=short_product(prod), sizes=', '.join(r['size'] for r in rs), stock=', '.join(str(r['stock']) for r in rs),
                        u30=sum(r['u30'] for r in rs), short=sum(r['short'] for r in rs))
            if k == 'off':
                lbl, flag = late_flag(rs[0]); base.update(next_po=lbl, flag=flag)
            else:
                s = sorted(rs[0]['near'], key=lambda s: s['eta'])[0]
                tot, cov = cover(rs)
                base.update(po=po_label(s), eta=s['eta'].strftime('%-d %b'), stage=s['step'], likely=likely(s['step']), qty=tot, cover=cov,
                            risk='; '.join(filter(None, [f"{s['step']} with {(s['eta'] - today).days} days left" if likely(s['step']) == 'Unlikely' else '',
                                                        f"already {s['slip']} days behind" if s['slip'] else '', 'Carbonwork shows "No fabric"' if s['nofabric'] else ''])))
            rows[k].append(base)
    rows['off'].sort(key=lambda r: (-r['u30'], -r['short']))

    count = lambda k: (len(rows[k]), sum(len(r['sizes'].split(', ')) for r in rows[k]))
    stats = {k: count(k) for k in rows}; short_total = sum(r['short'] for r in rows['off'])
    fabric_soon = [f for f in fabric if (parse_day(f.get('eta'), today.year) or dt.date.max) <= horizon]
    fabric_next = sorted([f for f in fabric if parse_day(f.get('eta'), today.year) and parse_day(f.get('eta'), today.year) > horizon],
                         key=lambda f: parse_day(f.get('eta'), today.year))[:3]
    code = today.strftime('%d%m%y') + f'-{seq:02d}'
    skip_prod = sum(len(v) for v in skipped.values())

    # ---------------------------------------------------------------- markdown
    L = []; A = L.append
    A('---'); A('report: continue-selling'); A(f'date: {date}'); A(f'code: {code}')
    A(f'generated: {dt.datetime.now().strftime("%Y-%m-%d %H:%M")} IST'); A('sources: Shopify, Zoho Inventory, Carbonwork')
    A(f"window: {today.strftime('%-d %b')} – {horizon.strftime('%-d %b')}"); A('---'); A('')
    A(f"# Stock report · {today.strftime('%a %-d %b %Y')}"); A('')
    A('## Summary'); A('')
    p = lambda n, w: f"{n} {w}{'' if n == 1 else 's'}"
    A(f"- **Switch ON:** {p(stats['on'][0], 'product')}, {p(stats['on'][1], 'size')}.")
    A(f"- **Switch OFF:** {p(stats['off'][0], 'product')}, {p(stats['off'][1], 'size')}." + (f" **{short_total} orders already can't ship.**" if short_total else ''))
    A(f"- **Watch:** {p(stats['watch'][0], 'product')}, {p(stats['watch'][1], 'size')}. A PO is due within 7 days but probably won't make it.")
    A(f"- **Correctly set:** {p(stats['ok'][0], 'product')}, {p(stats['ok'][1], 'size')}.")
    A(f"- {'No fabric PO arrives in the next 7 days.' if not fabric_soon else p(len(fabric_soon), 'fabric PO') + ' arrive in the next 7 days (see Fabric).'}"); A('')

    def table(title, head, keys, rs):
        A(f'## {title}'); A('')
        if not rs: A('None today.'); A(''); return
        A('| ' + ' | '.join(head) + ' |'); A('|' + '---|' * len(head))
        for r in rs: A('| ' + ' | '.join(str(r.get(k, '')).replace('|', '/') for k in keys) + ' |')
        A('')
    table('Basket 1 — switch ON', ['Product','Sizes','Stock','PO','ETA','Stage','Likely','PO qty'], ['product','sizes','stock','po','eta','stage','likely','qty'], rows['on'])
    table('Basket 2 — switch OFF', ['Product','Sizes','Stock','Sold 30d','Short','Next PO','Flag'], ['product','sizes','stock','u30','short','next_po','flag'], rows['off'])
    table('Watch — PO due but at risk', ['Product','Sizes','Stock','PO','ETA','Stage','Likely','Risk'], ['product','sizes','stock','po','eta','stage','likely','risk'], rows['watch'])
    for r in rows['ok']: r['note'] = f"{r['qty']} pcs; {r['cover']}"
    table('Correctly set — no action', ['Product','Sizes','Stock','PO','ETA','Stage','Likely','Note'], ['product','sizes','stock','po','eta','stage','likely','note'], rows['ok'])

    A('## Fabric'); A('')
    feeds = lambda f: f" Feeds: {FABRIC_STYLES[f.get('fabric')]}." if f.get('fabric') in FABRIC_STYLES else ''
    if fabric_soon:
        for f in fabric_soon: A(f"- **{f.get('fabric','')} {f.get('colour','')}** ({f.get('po','')}): est. {f.get('eta','')}, {f.get('stage','')}.{feeds(f)} Suggestion only.")
    else:
        A(f"- No fabric PO arrives in the next 7 days ({len(fabric)} open fabric lines).")
        for f in fabric_next: A(f"- Next: **{f.get('fabric','')} {f.get('colour','')}** ({f.get('po','')}), est. {f.get('eta','')}, {f.get('stage','')}{', ' + f['late'] if f.get('late') else ''}.{feeds(f)}")
    A('')
    A('## Data notes'); A('')
    A(f"- Checked {checked} tracked variants; {len(low)} were at or below the low-stock threshold.")
    if skip_prod: A(f"- Skipped by rule: {skip_prod} products ({', '.join(f'{k} {len(v)}' for k, v in sorted(skipped.items()))}). SlowFlow, Grant Thornton, 360 ONE and Printstop are always 0 stock on the website.")
    A('- ETAs and received status come from Carbonwork; Zoho does not record receipts reliably.')
    A(f"- Low stock = {MIN_LOW} or fewer left, or less than {COVER_DAYS} days of sales, whichever is higher.")
    if unmatched_styles: A(f"- Carbonwork style lines not matched to a Shopify product: {', '.join(sorted(set(unmatched_styles))[:8])}.")
    if not zq: A('- Zoho line items missing: PO quantities not checked.')
    A('')
    md = '\n'.join(L)
    summary = dict(code=code, date=date, checked=checked, low=len(low), skipped_products=skip_prod,
                   on=stats['on'], off=stats['off'], watch=stats['watch'], ok=stats['ok'], short=short_total,
                   unmatched_styles=sorted(set(unmatched_styles)))
    return md, summary

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--raw', default='raw'); ap.add_argument('--date', default=dt.date.today().isoformat())
    ap.add_argument('--seq', type=int, default=1); ap.add_argument('--out', default='.')
    a = ap.parse_args()
    md, s = build(a.raw, a.date, a.seq)
    os.makedirs(a.out, exist_ok=True)
    path = os.path.join(a.out, f"stockdesk{s['code']}.md")
    open(path, 'w', encoding='utf-8').write(md)
    s['file'] = path
    print(json.dumps(s, indent=1))

if __name__ == '__main__': main()
