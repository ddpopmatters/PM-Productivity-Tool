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
  // Tier 6 - Navigation Components
  Sidebar,
  // Tier 7 - Auth Components
  LoginScreen,
  AuthCallback,
  // Tier 8 - Calendar Components
  CalendarScreen,
  // Tier 9 - Todo Components
  ToDoList,
  // Tier 10 - Form Components
  AddItemForm,
  // Tier 11 - Filter Components
  FilterBar,
  // Tier 12 - Productivity Components
  PomodoroTimer,
  StopwatchTimer,
  QuickNotes,
  SpeedReader,
  HabitTracker,
  EisenhowerMatrix,
  BookmarkManager,
  DailyPlanner,
  GoalTracker,
  DecisionMatrix,
  MindMapTool,
  ProductivityToolsView,
  // Tier 13 - Workstream Components
  WorkstreamList,
  WorkstreamView,
  WorkstreamSettings,
  WorkstreamTaskDetail,
  // Tier 14 - Whiteboard Components
  WhiteboardPreviewCard,
  // Tier 15 - Jobs Components
  AddJobModal,
  JobDetailModal,
  JobsView,
  // Tier 16 - Whiteboard Views
  WhiteboardsView,
  // Tier 17 - Whiteboard Elements
  StickyNote,
  TextBoxElement,
  ImageElement,
  ShapeElement,
  WhiteboardElement,
  // Tier 18 - Whiteboard Canvas
  WhiteboardCanvas,
  // Tier 19 - Admin Components
  AdminConsole,
  // Tier 20 - Manager Components
  ManagerHub,
  // Tier 21 - Dashboard Components
  Dashboard,
  // Tier 22 - Item Dashboard Components
  ItemDashboard,
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
  // Tier 6 - Navigation Components
  Sidebar,
  // Tier 7 - Auth Components
  LoginScreen,
  AuthCallback,
  // Tier 8 - Calendar Components
  CalendarScreen,
  // Tier 9 - Todo Components
  ToDoList,
  // Tier 10 - Form Components
  AddItemForm,
  // Tier 11 - Filter Components
  FilterBar,
  // Tier 12 - Productivity Components
  PomodoroTimer,
  StopwatchTimer,
  QuickNotes,
  SpeedReader,
  HabitTracker,
  EisenhowerMatrix,
  BookmarkManager,
  DailyPlanner,
  GoalTracker,
  DecisionMatrix,
  MindMapTool,
  ProductivityToolsView,
  // Tier 13 - Workstream Components
  WorkstreamList,
  WorkstreamView,
  WorkstreamSettings,
  WorkstreamTaskDetail,
  // Tier 14 - Whiteboard Components
  WhiteboardPreviewCard,
  // Tier 15 - Jobs Components
  AddJobModal,
  JobDetailModal,
  JobsView,
  // Tier 16 - Whiteboard Views
  WhiteboardsView,
  // Tier 17 - Whiteboard Elements
  StickyNote,
  TextBoxElement,
  ImageElement,
  ShapeElement,
  WhiteboardElement,
  // Tier 18 - Whiteboard Canvas
  WhiteboardCanvas,
  // Tier 19 - Admin Components
  AdminConsole,
  // Tier 20 - Manager Components
  ManagerHub,
  // Tier 21 - Dashboard Components
  Dashboard,
  // Tier 22 - Item Dashboard Components
  ItemDashboard,
};

// Log registration for debugging (only in development)
if (import.meta.env.DEV) {
  console.log('[Legacy Bridge] Components registered:', Object.keys(window.MomentumComponents));
}
