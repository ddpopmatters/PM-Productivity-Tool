/**
 * Legacy Bridge
 *
 * This module exposes extracted React components to the legacy.html app
 * via the global window.MomentumComponents object.
 *
 * Usage in legacy.html:
 *   const { LoadingSpinner, Badge, Button, ... } = window.MomentumComponents;
 */

import {
  // Tier 1 - Pure UI Components
  LoadingSpinner,
  Badge,
  Button,
  Pagination,
  // Tier 2 - Utility Components
  Icon,
  ViewSwitcher,
} from './components/ui';

import {
  // Tier 3 - View Components
  ListView,
  GanttView,
  // Tier 4 - Complex Components
  TableView,
  NotificationsPanel,
  KeyboardShortcutsHelp,
  // Tier 5 - Feature Components
  KanbanBoard,
  GlobalSearchModal,
  QuickAddModal,
  JobCard,
} from './components/features';

// Register components globally for legacy.html
window.MomentumComponents = {
  // Tier 1 - Pure UI Components
  LoadingSpinner,
  Badge,
  Button,
  Pagination,
  // Tier 2 - Utility Components
  Icon,
  ViewSwitcher,
  // Tier 3 - View Components
  ListView,
  GanttView,
  // Tier 4 - Complex Components
  TableView,
  NotificationsPanel,
  KeyboardShortcutsHelp,
  // Tier 5 - Feature Components
  KanbanBoard,
  GlobalSearchModal,
  QuickAddModal,
  JobCard,
};

// Log registration for debugging (only in development)
if (import.meta.env.DEV) {
  console.log('[Legacy Bridge] Components registered:', Object.keys(window.MomentumComponents));
}
