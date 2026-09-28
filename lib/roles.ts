/** Who can use Stock Desk, and what each person sees.
 *  Keep these emails in sync with firestore.rules (the rules are what actually protect the data). */
export type View = 'shantanu' | 'kabir' | 'karan';
export type Role = {
  views: View[];         // report tabs this person sees, in order
  canUpload: boolean;
  canConsolidate: boolean;
  canDelete: boolean;
  canNotes: boolean;      // read and write notes
  canSync: boolean;       // press Sync (refreshes everyone's open pages)
  canDownloadMd: boolean; // download the original .md
};

export const OWNER_EMAIL = 'shantanu@carbontree.com';

const ROLES: Record<string, Role> = {
  'shantanu@carbontree.com': { views: ['shantanu', 'karan'], canUpload: true, canConsolidate: true, canDelete: true, canNotes: true, canSync: true, canDownloadMd: true },
  'kabir@carbontree.com': { views: ['kabir'], canUpload: false, canConsolidate: false, canDelete: false, canNotes: true, canSync: true, canDownloadMd: true },
  'revathi@carbontree.com': { views: ['kabir'], canUpload: false, canConsolidate: false, canDelete: false, canNotes: true, canSync: true, canDownloadMd: true },
  // Viewer: the Karan print page only. Reads reports; can print / save as PDF. No notes, no Sync, no .md.
  'contact@carbontree.com': { views: ['karan'], canUpload: false, canConsolidate: false, canDelete: false, canNotes: false, canSync: false, canDownloadMd: false },
};

/** null = signed in with a company account that has no Stock Desk access. */
/** True for logins that only get the Karan page (e.g. contact@). */
export const karanOnly = (r: Role | null | undefined) => !!r && r.views.length === 1 && r.views[0] === 'karan';

export function roleFor(email: string | null | undefined): Role | null {
  return (email && ROLES[email.toLowerCase()]) || null;
}
