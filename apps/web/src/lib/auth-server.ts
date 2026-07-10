import { cookies } from 'next/headers';

export interface ServerMeUser {
  id: string;
  username: string;
  displayName: string;
  role: 'student' | 'teacher' | 'admin' | 'parent';
  avatarUrl?: string;
}

const apiOrigin = process.env.API_ORIGIN || 'http://localhost:3001';
const cookieName = process.env.COOKIE_NAME || 'ai_camp_token';

/**
 * Read the current user on the server. Returns null when there's no valid session.
 * Used by route layouts to enforce role-based protection.
 */
export async function getServerUser(): Promise<ServerMeUser | null> {
  const token = cookies().get(cookieName)?.value;
  if (!token) return null;
  try {
    const res = await fetch(`${apiOrigin}/api/auth/me`, {
      headers: { cookie: `${cookieName}=${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}
