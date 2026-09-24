import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeCode, parseCode, dayKey } from '../lib/codes';
import { consolidate, toMarkdown } from '../lib/consolidate';
import { parseMd, stats } from '../lib/render';

// Codes: DDMMYY-NN
assert.equal(dayKey('2026-09-24'), '240926');
assert.equal(makeCode('2026-09-24', 1), '240926-01');
assert.equal(makeCode('2026-09-24', 12), '240926-12');
assert.deepEqual(parseCode('240926-02'), { date: '2026-09-24', seq: 2 });

const md1 = readFileSync('samples/stock-report-2026-09-24.md', 'utf8');
// Day 2: same report, but Bamboo V-Neck has moved to "Correctly set" and one new OFF row appears.
const md2 = md1.replace('date: 2026-09-24', 'date: 2026-09-25')
  .replace('| Organic Cotton Gym Tank (Carbon Black) | S, M, L, XL | 0, 0, 0, 0 | 0 | 0 | None | NO PO |',
           '| Organic Cotton Gym Tank (Carbon Black) | S, M, L, XL | 0, 0, 0, 0 | 0 | 0 | None | NO PO |\n| UltraSoft Bamboo Tee (Plum) | M | -2 | 40 | 2 | None | NO PO |');
const r = (code: string, date: string, seq: number, md: string) => ({ code, date, seq, md, title: '', fileName: '', stats: {} as any, uploadedAt: 0, uploadedBy: { uid: 'u', name: 'n', email: '' } });
const reps = [r('240926-01', '2026-09-24', 1, md1), r('250926-01', '2026-09-25', 1, md2)];

const one = stats(parseMd(md1));
const single = consolidate([reps[0]]);
const sizes1 = one.on.sizes + one.off.sizes + one.watch.sizes + one.ok.sizes;
assert.equal(single.items.length, sizes1, 'one report: every size is unique');
assert.equal(single.duplicates, 0);

const c = consolidate(reps);
assert.equal(c.occurrences, sizes1 * 2 + 1);
assert.equal(c.items.length, sizes1 + 1, 'two days: only the new size is added');
assert.equal(c.duplicates, sizes1, 'every repeated size counted once as a duplicate');
const plum = c.items.find((i) => i.product.includes('Plum'))!;
assert.equal(plum.days.length, 1);
const chalkM = c.items.find((i) => i.product === 'Carbon Heavyweight T-Shirt (Chalk)' && i.size === 'M')!;
assert.deepEqual(chalkM.days, ['2026-09-24', '2026-09-25']);
assert.equal(chalkM.lastCode, '250926-01');

// Round trip: the consolidated .md parses back with the same unique size counts.
const out = toMarkdown(c, '2026-09-24', '2026-09-25');
const back = stats(parseMd(out));
assert.equal(back.on.sizes + back.off.sizes + back.watch.sizes + back.ok.sizes, c.items.length);
console.log('ok —', c.items.length, 'unique of', c.occurrences, 'rows,', c.duplicates, 'duplicates removed');
