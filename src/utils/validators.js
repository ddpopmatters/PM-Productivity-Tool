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
  },

  // --- Form-level validators ---

  validateRequired: (value) => {
    if (value === null || value === undefined) return 'This field is required';
    if (typeof value === 'string' && value.trim().length === 0) return 'This field is required';
    return null;
  },

  validateMaxLength: (max) => (value) => {
    if (typeof value !== 'string') return null;
    if (value.length > max) return `Must be ${max} characters or fewer`;
    return null;
  },

  validateUrl: (value) => {
    if (!value || typeof value !== 'string') return null; // empty is OK (use validateRequired to require)
    try {
      new URL(value);
      return null;
    } catch {
      return 'Must be a valid URL';
    }
  },

  validateDate: (value) => {
    if (!value || typeof value !== 'string') return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) return 'Must be a valid date';
    return null;
  },

  /**
   * Validate an object of values against a rules map.
   * rules: { fieldName: [validator1, validator2, ...] }
   * Returns: { fieldName: 'error message' | null } — only fields with errors included.
   * Returns null if all fields pass.
   */
  validateForm: (values, rules) => {
    const errors = {};
    let hasErrors = false;
    for (const [field, fieldRules] of Object.entries(rules)) {
      for (const rule of fieldRules) {
        const error = rule(values[field]);
        if (error) {
          errors[field] = error;
          hasErrors = true;
          break; // first error per field wins
        }
      }
    }
    return hasErrors ? errors : null;
  },
};

export default Validators;
