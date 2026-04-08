import { APP_CONFIG } from './config';

// Centralized logging utility
// Debug logs stay behind DEBUG_MODE; warnings always emit.
export const Logger = {
  debug: (...args) => {
    if (APP_CONFIG.DEBUG_MODE) console.log('[DEBUG]', ...args);
  },
  warn: (...args) => {
    console.warn('[WARN]', ...args);
  },
  error: (error, context = '') => {
    if (APP_CONFIG.DEBUG_MODE) {
      console.error('[ERROR]', context, error);
    }
    // Future: send to error monitoring service (Sentry, etc.)
  }
};

export default Logger;
