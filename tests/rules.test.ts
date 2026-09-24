/* Firestore rules tests. Run with:  npm run test:rules   (starts the Firestore emulator; needs Java 11+) */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

const ts = () => firebase.firestore.FieldValue.serverTimestamp();
const google = (email: string, verified = true) => ({ email, email_verified: verified, firebase: { sign_in_provider: 'google.com' as const } });
const stats = { on: { products: 1, sizes: 6 }, off: { products: 6, sizes: 14 }, watch: { products: 2, sizes: 9 }, ok: { products: 3, sizes: 13 }, short: 9 };
const report = (code: string, date: string, seq: number, uid: string, email: string) => ({
  code, date, seq, title: 'Stock report', md: '# report', fileName: 'r.md', stats, uploadedAt: ts(), uploadedBy: { uid, name: 'Shantanu', email },
});

let env: RulesTestEnvironment;
const results: string[] = [];
async function t(name: string, fn: () => Promise<unknown>) { await fn(); results.push('✓ ' + name); }

(async () => {
  env = await initializeTestEnvironment({ projectId: 'stock-desk-rules-test', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
  const owner = env.authenticatedContext('u_shantanu', google('shantanu@carbontree.com')).firestore();
  const kabir = env.authenticatedContext('u_kabir', google('Kabir@carbontree.com')).firestore();
  const other = env.authenticatedContext('u_other', google('priyanka@carbontree.com')).firestore();
  const unverified = env.authenticatedContext('u_fake', google('shantanu@carbontree.com', false)).firestore();
  const anon = env.unauthenticatedContext().firestore();
  const upload = (db: firebase.firestore.Firestore, code: string, date: string, seq: number, counter: { next: number }, uid = 'u_shantanu', email = 'shantanu@carbontree.com') => {
    const b = db.batch();
    b.set(db.doc(`counters/${code.slice(0, 6)}`), counter);
    b.set(db.doc(`reports/${code}`), report(code, date, seq, uid, email));
    return b.commit();
  };

  await t('owner uploads first report of a day (240926-01)', () => assertSucceeds(upload(owner, '240926-01', '2026-09-24', 1, { next: 2 })));
  await t('owner uploads second report of the same day (240926-02)', () => assertSucceeds(upload(owner, '240926-02', '2026-09-24', 2, { next: 3 })));
  await t('report without moving the counter is refused', () => assertFails(owner.doc('reports/240926-03').set(report('240926-03', '2026-09-24', 3, 'u_shantanu', 'shantanu@carbontree.com'))));
  await t('skipping a number is refused', () => assertFails(upload(owner, '240926-05', '2026-09-24', 5, { next: 6 })));
  await t('code that does not match the date is refused', () => assertFails(upload(owner, '250926-01', '2026-09-24', 1, { next: 2 })));
  await t('reusing an existing code is refused', () => assertFails(upload(owner, '240926-02', '2026-09-24', 2, { next: 3 })));
  await t('counter cannot move on its own', () => assertFails(owner.doc('counters/240926').set({ next: 4 })));
  await t('uploading as someone else is refused', () => assertFails(upload(owner, '240926-03', '2026-09-24', 3, { next: 4 }, 'u_kabir', 'kabir@carbontree.com')));
  await t('extra fields are refused', async () => {
    const b = owner.batch(); b.set(owner.doc('counters/240926'), { next: 4 });
    b.set(owner.doc('reports/240926-03'), { ...report('240926-03', '2026-09-24', 3, 'u_shantanu', 'shantanu@carbontree.com'), admin: true });
    return assertFails(b.commit());
  });
  await t('reports cannot be edited', () => assertFails(owner.doc('reports/240926-01').update({ title: 'changed' })));

  await t('Kabir can read reports (email case ignored)', () => assertSucceeds(kabir.doc('reports/240926-01').get()));
  await t('Kabir cannot upload', () => assertFails(upload(kabir, '260926-01', '2026-09-26', 1, { next: 2 }, 'u_kabir', 'kabir@carbontree.com')));
  await t('Kabir cannot read counters', () => assertFails(kabir.doc('counters/240926').get()));
  await t('Kabir cannot delete', () => assertFails(kabir.doc('reports/240926-02').delete()));
  await t('other @carbontree.com accounts cannot read', () => assertFails(other.doc('reports/240926-01').get()));
  await t('other accounts cannot list', () => assertFails(other.collection('reports').get()));
  await t('unverified email is refused', () => assertFails(unverified.doc('reports/240926-01').get()));
  await t('signed-out visitors are refused', () => assertFails(anon.doc('reports/240926-01').get()));

  const note = (uid: string, name: string, email: string) => ({ text: 'Chicory M switched off', at: ts(), by: { uid, name, email } });
  await t('Kabir adds a note', () => assertSucceeds(kabir.doc('reports/240926-01/notes/n1').set(note('u_kabir', 'Kabir', 'kabir@carbontree.com'))));
  await t('Shantanu adds a note', () => assertSucceeds(owner.doc('reports/240926-01/notes/n2').set(note('u_shantanu', 'Shantanu', 'shantanu@carbontree.com'))));
  await t('note on a missing report is refused', () => assertFails(kabir.doc('reports/999999-01/notes/n3').set(note('u_kabir', 'Kabir', 'kabir@carbontree.com'))));
  await t('note posing as someone else is refused', () => assertFails(kabir.doc('reports/240926-01/notes/n4').set(note('u_shantanu', 'Shantanu', 'shantanu@carbontree.com'))));
  await t('Kabir edits the text of his own note', () => assertSucceeds(kabir.doc('reports/240926-01/notes/n1').update({ text: 'Chicory M and L switched off' })));
  await t('changing a note author is refused', () => assertFails(kabir.doc('reports/240926-01/notes/n1').update({ by: { uid: 'u_x', name: 'x', email: 'x@carbontree.com' } })));
  await t('Shantanu cannot edit Kabir’s note', () => assertFails(owner.doc('reports/240926-01/notes/n1').update({ text: 'edited' })));
  await t('other accounts cannot read notes', () => assertFails(other.collection('reports/240926-01/notes').get()));

  await t('Shantanu deletes a report he uploaded', () => assertSucceeds(owner.doc('reports/240926-02').delete()));
  await t('next upload after a delete still gets a new number (240926-03)', () => assertSucceeds(upload(owner, '240926-03', '2026-09-24', 3, { next: 4 })));
  const syncBy = (uid: string, name: string, email: string) => ({ at: ts(), by: { uid, name, email } });
  await t('Kabir presses Sync', () => assertSucceeds(kabir.doc('sync/state').set(syncBy('u_kabir', 'Kabir', 'kabir@carbontree.com'))));
  await t('Shantanu presses Sync', () => assertSucceeds(owner.doc('sync/state').set(syncBy('u_shantanu', 'Shantanu', 'shantanu@carbontree.com'))));
  await t('both can read the sync state', () => assertSucceeds(kabir.doc('sync/state').get()));
  await t('other accounts cannot Sync', () => assertFails(other.doc('sync/state').set(syncBy('u_other', 'P', 'priyanka@carbontree.com'))));
  await t('Sync posing as someone else is refused', () => assertFails(kabir.doc('sync/state').set(syncBy('u_shantanu', 'Shantanu', 'shantanu@carbontree.com'))));
  await t('only sync/state is allowed', () => assertFails(owner.doc('sync/other').set(syncBy('u_shantanu', 'Shantanu', 'shantanu@carbontree.com'))));
  await t('unknown collections are refused', () => assertFails(owner.doc('settings/x').set({ a: 1 })));

  await env.cleanup();
  console.log(results.join('\n'));
  assert.ok(results.length > 0);
  console.log(`\n${results.length} rules checks passed`);
})().catch(async (e) => { console.log(results.join('\n')); console.error('\n✗ FAILED after', results.length, 'checks:', e?.message || e); await env?.cleanup(); process.exit(1); });
