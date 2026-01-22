/**
 * Security utilities for input sanitization and validation
 */

/**
 * Sanitize email for use in Supabase query filters
 * Prevents injection by escaping special characters and validating format
 * @param {string} email - Email address to sanitize
 * @returns {string|null} - Sanitized email or null if invalid
 */
export function sanitizeEmailForQuery(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }

  // Trim whitespace
  const trimmed = email.trim().toLowerCase();

  // Validate email format (basic RFC 5322 pattern)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(trimmed)) {
    return null;
  }

  // Additional length check (max 254 chars per RFC 5321)
  if (trimmed.length > 254) {
    return null;
  }

  // Escape characters that could be used for query injection
  // In PostgREST/Supabase filters: quotes, commas, parentheses, dots in wrong context
  const escaped = trimmed
    .replace(/"/g, '\\"')  // Escape double quotes
    .replace(/'/g, "\\'"); // Escape single quotes

  return escaped;
}

/**
 * Validate that a value is a safe identifier (alphanumeric + underscore)
 * @param {string} value - Value to validate
 * @returns {boolean} - True if safe
 */
export function isSafeIdentifier(value) {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value);
}

/**
 * Sanitize a string for safe display (prevent XSS)
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
export function sanitizeForDisplay(str) {
  if (!str || typeof str !== 'string') {
    return '';
  }
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export default {
  sanitizeEmailForQuery,
  isSafeIdentifier,
  sanitizeForDisplay,
};
