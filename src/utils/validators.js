import { APP_CONFIG } from './config';

// Validation utilities
export const Validators = {
  isValidEmail: (email) => {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  },

  isOrgEmail: (email) => {
    if (!Validators.isValidEmail(email)) return false;
    return email.toLowerCase().endsWith(`@${APP_CONFIG.ORG_DOMAIN}`);
  },

  isNotEmpty: (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    return true;
  },

  isValidPassword: (password) => {
    return typeof password === 'string' && password.length >= 8;
  }
};

export default Validators;
