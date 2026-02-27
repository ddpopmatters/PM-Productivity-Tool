import { MANAGERS, SEED_USERS } from './config';

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
