import { Platform } from 'react-native';

const KEY = 'tandem_invite_code';
const SITE = 'https://tandem-app-3big.vercel.app';

/** Lien d'invitation : ouvre l'app avec le code du foyer déjà rempli. */
export function inviteLink(code: string) {
  const origin = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : SITE;
  return `${origin}/?code=${code}`;
}

/** À l'ouverture (web) : si l'adresse contient ?code=…, on le garde jusqu'à l'écran « rejoindre ». */
export function captureInviteFromUrl() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const code = new URLSearchParams(window.location.search).get('code');
    if (code && /^[a-z0-9]{6,20}$/i.test(code)) window.localStorage.setItem(KEY, code.toLowerCase());
  } catch {}
}

export function pendingInvite(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearInvite() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
}
