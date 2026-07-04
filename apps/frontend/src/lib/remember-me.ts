const REMEMBER_ME_KEY = 'xcash_remember_me';
const REMEMBERED_EMAIL_KEY = 'xcash_remembered_email';

export function getRememberMePreference(): boolean {
  const stored = localStorage.getItem(REMEMBER_ME_KEY);
  if (stored === 'false') {
    return false;
  }
  return true;
}

export function setRememberMePreference(rememberMe: boolean): void {
  localStorage.setItem(REMEMBER_ME_KEY, String(rememberMe));
}

export function getRememberedEmail(): string {
  return localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? '';
}

export function setRememberedEmail(email: string | null): void {
  if (!email?.trim()) {
    localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    return;
  }
  localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim().toLowerCase());
}

export function persistLoginPreferences(email: string, rememberMe: boolean): void {
  setRememberMePreference(rememberMe);
  if (rememberMe) {
    setRememberedEmail(email);
  } else {
    setRememberedEmail(null);
  }
}
