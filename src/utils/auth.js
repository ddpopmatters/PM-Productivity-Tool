import { MANAGERS, PAGES_ONLY_EMAILS, SEED_USERS } from './config';

export const isAdmin = (email) => {
  const adminEmails = ['daniel.davis@populationmatters.org'];
  return adminEmails.includes(email?.toLowerCase());
};

export const isManager = (email) => {
  return MANAGERS.some(m => m.email.toLowerCase() === email?.toLowerCase());
};

export const canEditItem = (entry, userEmail, currentUser) => {
  if (!entry) return false;
  if (isAdmin(userEmail)) return true;
  if (entry.owner?.includes(currentUser)) return true;
  if (entry.collaborators?.includes(currentUser)) return true;
  return false;
};

export const getPreseededProfile = (email) => {
  return SEED_USERS.find(u => u.email.toLowerCase() === email?.toLowerCase());
};

export const isPagesOnly = (email) => {
  return PAGES_ONLY_EMAILS.some(e => e.toLowerCase() === email?.toLowerCase());
};

export const getPagesRole = (email) => {
  if (isAdmin(email)) return 'builder';
  if (isManager(email)) return 'approver';
  return 'requester';
};

function getBrowserLocation(locationOverride) {
  if (locationOverride) return locationOverride;
  if (typeof window === 'undefined') {
    return { hash: '', search: '', pathname: '/' };
  }
  return window.location;
}

function mergeAuthParams(locationOverride) {
  const location = getBrowserLocation(locationOverride);
  const merged = new URLSearchParams(location.search || '');
  const hash = (location.hash || '').replace(/^#/, '');
  const hashParams = new URLSearchParams(hash);

  hashParams.forEach((value, key) => {
    if (!merged.has(key)) {
      merged.set(key, value);
    }
  });

  return merged;
}

export const getAuthRedirectUrl = () => {
  if (typeof window === 'undefined') return '/';

  const basePath = import.meta.env.BASE_URL || '/';
  return new URL(basePath, window.location.origin).toString();
};

export const getAuthCallbackContext = (locationOverride) => {
  const params = mergeAuthParams(locationOverride);
  const hasCallbackParams = [
    'access_token',
    'refresh_token',
    'token_hash',
    'code',
    'type',
    'error',
    'error_description',
  ].some((key) => params.has(key));

  if (!hasCallbackParams) {
    return null;
  }

  return {
    type: params.get('type') || 'magiclink',
    error: params.get('error_description') || params.get('error') || '',
  };
};

export const clearAuthCallbackUrl = () => {
  if (typeof window === 'undefined') return;
  window.history.replaceState({}, document.title, window.location.pathname);
};
