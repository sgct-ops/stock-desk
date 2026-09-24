/** Who can use Stock Desk, and what each person sees.
 *  Keep these emails in sync with firestore.rules (the rules are what actually protect the data). */
export type View = 'shantanu' | 'kabir' | 'karan';
export type Role = {
  views: View[];         // report tabs this person sees, in order
  canUpload: boolean;
  canConsolidate: boolean;
  canDelete: boolean;
};

export const OWNER_EMAIL = 'shantanu@carbontree.com';

const ROLES: Record<string, Role> = {
  'shantanu@carbontree.com': { views: ['shantanu', 'karan'], canUpload: true, canConsolidate: true, canDelete: true },
  'kabir@carbontree.com': { views: ['kabir'], canUpload: false, canConsolidate: false, canDelete: false },
  'revathi@carbontree.com': { views: ['kabir'], canUpload: false, canConsolidate: false, canDelete: false },
};

/** null = signed in with a company account that has no Stock Desk access. */
export function roleFor(email: string | null | undefined): Role | null {
  return (email && ROLES[email.toLowerCase()]) || null;
}
