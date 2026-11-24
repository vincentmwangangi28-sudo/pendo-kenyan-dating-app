export const ADMIN_EMAIL = 'vincentmwangangi28@gmail.com';
export const ADMIN_DISPLAY_NAME = 'Vincent Mwangangi';

export interface AuthLikeUser {
  uid?: string | null;
  email?: string | null;
  isAnonymous?: boolean | null;
  emailVerified?: boolean | null;
}

export function isVincentAdminUser(user: AuthLikeUser | null | undefined): boolean {
  if (!user || user.isAnonymous) return false;
  if (typeof user.email !== 'string') return false;
  if (user.email.trim().toLowerCase() !== ADMIN_EMAIL) return false;
  if ('emailVerified' in user && user.emailVerified === false) return false;
  return true;
}
