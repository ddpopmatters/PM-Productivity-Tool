import { APP_CONFIG } from './config';

// Centralized logging utility
// Only outputs when DEBUG_MODE is enabled
export const Logger = {
  debug: (...args) => {
    if (APP_CONFIG.DEBUG_MODE) console.log('[DEBUG]', ...args);
  },
  warn: (...args) => {
    if (APP_CONFIG.DEBUG_MODE) console.warn('[WARN]', ...args);
  },
  error: (error, context = '') => {
    if (APP_CONFIG.DEBUG_MODE) {
      console.error('[ERROR]', context, error);
    }
    // Future: send to error monitoring service (Sentry, etc.)
  }
};

export default Logger;
