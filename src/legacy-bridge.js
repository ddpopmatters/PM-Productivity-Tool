/**
 * Legacy Bridge
 *
 * This module exposes extracted React components to the legacy.html app
 * via the global window.MomentumComponents object.
 *
 * Usage in legacy.html:
 *   const { LoadingSpinner, Badge, Button, Pagination } = window.MomentumComponents;
 */

import { LoadingSpinner, Badge, Button, Pagination } from './components/ui';

// Register components globally for legacy.html
window.MomentumComponents = {
  // Tier 1 - Pure UI Components
  LoadingSpinner,
  Badge,
  Button,
  Pagination,
};

// Log registration for debugging (only in development)
if (import.meta.env.DEV) {
  console.log('[Legacy Bridge] Components registered:', Object.keys(window.MomentumComponents));
}
