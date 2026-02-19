import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import clsx from 'clsx';
import { useApp } from './contexts';
import { initSupabase, getSupabase } from './api/supabase';
import { Logger } from './utils/logger';
import { useNotifications } from './hooks/useNotifications';
import { sanitizeEmailForQuery } from './utils/security';
import {
  APP_CONFIG,
  SUPABASE_CONFIG,
  USERS,
  TEAMS,
  MANAGERS,
  KANBAN_STATUSES,
  TIMELINE_TYPES,
  JOB_STATUSES,
  STICKY_COLORS,
  SEED_USERS,
} from './utils/config';

// Import UI components
import { Icon, Button, Badge, LoadingSpinner, ViewSwitcher, Pagination, ErrorBoundary, ListSkeleton, TableSkeleton } from './components/ui';

// Import feature components
import {
  // Views
  ListView,
  TableView,
  KanbanBoard,
  JobsView,
  WhiteboardsView,
  ProductivityToolsView,
  // Navigation
  Sidebar,
  // Auth
  LoginScreen,
  AuthCallback,
  // Dashboard
  Dashboard,
  ItemDashboard,
  // Todos
  ToDoList,
  // Forms
  AddItemForm,
  // Filters
  FilterBar,
  // Overlays
  NotificationsPanel,
  KeyboardShortcutsHelp,
  GlobalSearchModal,
  QuickAddModal,
  AddJobModal,
  JobDetailModal,
  AddItemTypeModal,
  ConvertItemModal,
  // Workstreams
  WorkstreamList,
  WorkstreamView,
  WorkstreamTaskDetail,
  WorkstreamSettings,
  // Events
  EventCalendar,
  // Whiteboards
  WhiteboardPreviewCard,
  StickyNote,
  TextBoxElement,
  ImageElement,
  ShapeElement,
  WhiteboardElement,
} from './components/features';

// Lazy-loaded components for code splitting
const GanttView = lazy(() => import('./components/features/views/GanttView'));
const CalendarScreen = lazy(() => import('./components/features/calendar/CalendarScreen'));
const WhiteboardCanvas = lazy(() => import('./components/features/whiteboards/WhiteboardCanvas'));
const AdminConsole = lazy(() => import('./components/features/admin/AdminConsole'));
const ManagerHub = lazy(() => import('./components/features/manager/ManagerHub'));

// Simple modal for adding subtasks to a project/task
const AddSubtaskModal = ({ entryId, entries, users, currentUser, onAdd, onClose }) => {
  const [title, setTitle] = React.useState('');
  const [assignedTo, setAssignedTo] = React.useState(currentUser || '');
  const [adding, setAdding] = React.useState(false);
  const entry = entries.find(e => e.id === entryId);

  const handleSubmit = async () => {
    if (!title.trim() || adding) return;
    setAdding(true);
    await onAdd(title, assignedTo);
    setAdding(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-graystone-200">
          <h3 className="text-lg font-bold text-ocean-900">Add Subtask</h3>
          <button onClick={onClose} className="p-1 hover:bg-graystone-100 rounded-lg transition">
            <Icon name="x" className="w-5 h-5 text-graystone-500" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {entry && (
            <p className="text-xs text-graystone-500">Adding to: <span className="font-medium text-graystone-700">{entry.title}</span></p>
          )}
          <div>
            <label className="block text-sm font-medium text-graystone-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Subtask title..."
              className="w-full px-3 py-2 text-sm border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-graystone-700 mb-1">Assign to</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
            >
              {(users || []).map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-graystone-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-graystone-600 hover:bg-graystone-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || adding}
            className="px-4 py-2 text-sm bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 transition disabled:opacity-50"
          >
            {adding ? 'Adding...' : 'Add Subtask'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper functions
const isAdmin = (email) => {
  const adminEmails = ['jameen.kaur@populationmatters.org', 'daniel.davis@populationmatters.org'];
  return adminEmails.includes(email?.toLowerCase());
};

const isManager = (email) => {
  return MANAGERS.some(m => m.email.toLowerCase() === email?.toLowerCase());
};

const canEditItem = (entry, userEmail, currentUser) => {
  if (!entry) return false;
  if (isAdmin(userEmail)) return true;
  if (entry.owner?.includes(currentUser)) return true;
  if (entry.collaborators?.includes(currentUser)) return true;
  return false;
};

const getPreseededProfile = (email) => {
  return SEED_USERS.find(u => u.email.toLowerCase() === email?.toLowerCase());
};

export default function App() {
  // Get auth state and UI state from context
  const {
    authChecked,
    isAuthenticated,
    authUser,
    userEmail,
    currentUser,
    setCurrentUser,
    handleSignOut,
    darkMode,
    toggleDarkMode,
  } = useApp();

  // Real-time notifications
  const { notifications, unreadCount, markAsRead } = useNotifications(userEmail);

  // Core state
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // View state
  const [currentView, setCurrentView] = useState('dashboard');
  const [viewMode, setViewMode] = useState('table');
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState('All');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState([]);
  const [ownerFilter, setOwnerFilter] = useState([]);
  const [teamFilter, setTeamFilter] = useState([]);
  const [tagFilter, setTagFilter] = useState([]);
  const [timelineFilter, setTimelineFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  const [showViewDropdown, setShowViewDropdown] = useState(false);

  // Modal state
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showSubtaskModal, setShowSubtaskModal] = useState(false);
  const [subtaskModalEntryId, setSubtaskModalEntryId] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [statsModalData, setStatsModalData] = useState({ title: '', items: [] });
  const [showPdfExportModal, setShowPdfExportModal] = useState(false);
  const [pdfExportContext, setPdfExportContext] = useState('dashboard');

  // Jobs state
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [showJobDetailModal, setShowJobDetailModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(null);

  // Add item type modal
  const [showAddItemTypeModal, setShowAddItemTypeModal] = useState(false);

  // Convert item modal
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertSourceItem, setConvertSourceItem] = useState(null);
  const [convertSourceType, setConvertSourceType] = useState(null);

  // Todos state
  const [todos, setTodos] = useState([]);

  // Workstreams state
  const [workstreams, setWorkstreams] = useState([]);
  const [workstreamTasks, setWorkstreamTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedWorkstreamId, setSelectedWorkstreamId] = useState(null);
  const [selectedWorkstreamTaskId, setSelectedWorkstreamTaskId] = useState(null);

  // Whiteboards state
  const [whiteboards, setWhiteboards] = useState([]);
  const [currentWhiteboardId, setCurrentWhiteboardId] = useState(null);

  // Productivity tools state
  const [habits, setHabits] = useState([]);
  const [matrixTasks, setMatrixTasks] = useState([]);

  // Manager Hub state
  const [managerHubTab, setManagerHubTab] = useState('overview');
  const [reportPeriodType, setReportPeriodType] = useState('week');
  const [reportStartDate, setReportStartDate] = useState(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    return start.toISOString().slice(0, 10);
  });
  const [reportEndDate, setReportEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportSections, setReportSections] = useState({
    executiveSummary: true,
    teamWorkload: true,
    projects: true,
    keyHighlights: true,
    blockersRisks: true,
  });
  const [projectsDisplayMode, setProjectsDisplayMode] = useState('cards');
  const [reportNarratives, setReportNarratives] = useState({
    executiveSummary: '',
    keyHighlights: '',
    blockersRisks: '',
  });

  // User profiles cache
  const [userProfilesCache, setUserProfilesCache] = useState({});

  // Get supabase client
  const supabase = getSupabase();

  // SUPABASE_API object - mirrors legacy.html
  const SUPABASE_API = useMemo(() => ({
    fetchWorkflowItems: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('workflow_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        Logger.error(error, 'Supabase fetch error');
        return [];
      }
      return data || [];
    },

    saveItem: async (item) => {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from('workflow_items')
        .insert([{
          title: item.title,
          caption: item.caption || '',
          workflow_status: item.workflowStatus || 'Idea',
          team: item.team || '',
          timeline_value: item.timelineValue || '',
          owner: Array.isArray(item.owner) ? item.owner : [item.owner].filter(Boolean),
          owner_email: Array.isArray(item.ownerEmail) ? item.ownerEmail : [userEmail].filter(Boolean),
          collaborators: item.collaborators || [],
          tags: item.tags || [],
          subtasks: item.subtasks || [],
          documents: item.documents || [],
          date: item.date || null,
          comments: item.comments || [],
          archived: item.archived || false,
          dependencies: item.dependencies || [],
          custom_fields: item.customFields || [],
          attachments: item.attachments || [],
          item_type: item.itemType || 'project',
        }])
        .select()
        .single();
      if (error) {
        // Retry with string fallback for pre-migration TEXT columns
        const insertObj = {
          title: item.title,
          caption: item.caption || '',
          workflow_status: item.workflowStatus || 'Idea',
          team: item.team || '',
          timeline_value: item.timelineValue || '',
          owner: Array.isArray(item.owner) ? item.owner[0] || '' : item.owner || '',
          owner_email: userEmail || '',
          collaborators: item.collaborators || [],
          tags: item.tags || [],
          subtasks: item.subtasks || [],
          documents: item.documents || [],
          date: item.date || null,
          comments: item.comments || [],
          archived: item.archived || false,
          dependencies: item.dependencies || [],
          custom_fields: item.customFields || [],
          attachments: item.attachments || [],
          item_type: item.itemType || 'project',
        };
        const { data: retryData, error: retryError } = await supabase
          .from('workflow_items')
          .insert([insertObj])
          .select()
          .single();
        if (!retryError) return retryData;
        Logger.error(retryError, 'Supabase save error (retry)');
        return null;
      }
      return data;
    },

    updateItem: async (id, updates) => {
      if (!supabase) return null;
      const updateObj = { updated_at: new Date().toISOString() };
      if (updates.title !== undefined) updateObj.title = updates.title;
      if (updates.caption !== undefined) updateObj.caption = updates.caption;
      if (updates.workflowStatus !== undefined) updateObj.workflow_status = updates.workflowStatus;
      if (updates.team !== undefined) updateObj.team = updates.team;
      if (updates.timelineValue !== undefined) updateObj.timeline_value = updates.timelineValue;
      if (updates.owner !== undefined) updateObj.owner = updates.owner;
      if (updates.ownerEmail !== undefined) updateObj.owner_email = updates.ownerEmail;
      if (updates.collaborators !== undefined) updateObj.collaborators = updates.collaborators;
      if (updates.tags !== undefined) updateObj.tags = updates.tags;
      if (updates.subtasks !== undefined) updateObj.subtasks = updates.subtasks;
      if (updates.documents !== undefined) updateObj.documents = updates.documents;
      if (updates.date !== undefined) updateObj.date = updates.date;
      if (updates.comments !== undefined) updateObj.comments = updates.comments;
      if (updates.archived !== undefined) updateObj.archived = updates.archived;
      if (updates.dependencies !== undefined) updateObj.dependencies = updates.dependencies;
      if (updates.customFields !== undefined) updateObj.custom_fields = updates.customFields;
      if (updates.attachments !== undefined) updateObj.attachments = updates.attachments;

      const { data, error } = await supabase
        .from('workflow_items')
        .update(updateObj)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        // Retry with string fallback for pre-migration TEXT columns
        if (Array.isArray(updateObj.owner) || Array.isArray(updateObj.owner_email)) {
          if (Array.isArray(updateObj.owner)) updateObj.owner = updateObj.owner[0] || '';
          if (Array.isArray(updateObj.owner_email)) updateObj.owner_email = updateObj.owner_email[0] || '';
          const { data: retryData, error: retryError } = await supabase
            .from('workflow_items')
            .update(updateObj)
            .eq('id', id)
            .select()
            .single();
          if (!retryError) return retryData;
          Logger.error(retryError, 'Supabase update error (retry)');
          return null;
        }
        Logger.error(error, 'Supabase update error');
        return null;
      }
      return data;
    },

    deleteItem: async (id) => {
      if (!supabase) return null;
      const { error } = await supabase
        .from('workflow_items')
        .delete()
        .eq('id', id);
      if (error) {
        Logger.error(error, 'Supabase delete error');
        return null;
      }
      return true;
    },

    fetchPersonalTodos: async (email) => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('personal_todos')
        .select('*')
        .eq('user_email', email)
        .order('created_at', { ascending: false });
      if (error) {
        Logger.error(error, 'Fetch todos error');
        return [];
      }
      return data || [];
    },

    savePersonalTodo: async (todo, email) => {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from('personal_todos')
        .insert([{
          text: todo.text,
          completed: todo.completed || false,
          date: todo.date || null,
          user_email: email,
        }])
        .select()
        .single();
      if (error) {
        Logger.error(error, 'Save todo error');
        return null;
      }
      return data;
    },

    updatePersonalTodo: async (id, updates) => {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from('personal_todos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        Logger.error(error, 'Update todo error');
        return null;
      }
      return data;
    },

    deletePersonalTodo: async (id) => {
      if (!supabase) return null;
      const { error } = await supabase
        .from('personal_todos')
        .delete()
        .eq('id', id);
      if (error) {
        Logger.error(error, 'Delete todo error');
        return null;
      }
      return true;
    },

    updateWorkstream: async (id, updates) => {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from('workstreams')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) {
        Logger.error(error, 'Update workstream error');
        return null;
      }
      return data;
    },

    deleteWorkstream: async (id) => {
      if (!supabase) return null;
      const { error } = await supabase
        .from('workstreams')
        .delete()
        .eq('id', id);
      if (error) {
        Logger.error(error, 'Delete workstream error');
        return null;
      }
      return true;
    },

    updateWorkstreamTask: async (id, updates) => {
      if (!supabase) return null;
      // Map camelCase props to snake_case DB columns
      const fieldMap = {
        sortOrder: 'sort_order',
        assigneeEmail: 'assignee_email',
        workstreamId: 'workstream_id',
        taskType: 'task_type',
        linkedItems: 'linked_items',
      };
      const mapped = { updated_at: new Date().toISOString() };
      for (const [key, value] of Object.entries(updates)) {
        mapped[fieldMap[key] || key] = value;
      }
      const { data, error } = await supabase
        .from('workstream_tasks')
        .update(mapped)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        Logger.error(error, 'Update workstream task error');
        return null;
      }
      return data;
    },

    deleteWorkstreamTask: async (id) => {
      if (!supabase) return null;
      const { error } = await supabase
        .from('workstream_tasks')
        .delete()
        .eq('id', id);
      if (error) {
        Logger.error(error, 'Delete workstream task error');
        return null;
      }
      return true;
    },

    // Whiteboard methods
    fetchWhiteboards: async (email) => {
      if (!supabase) return [];
      // Sanitize email to prevent query injection
      const safeEmail = sanitizeEmailForQuery(email);
      if (!safeEmail) {
        Logger.error({ email }, 'Invalid email for whiteboard fetch');
        return [];
      }
      const { data, error } = await supabase
        .from('whiteboards')
        .select('*')
        .or(`owner_email.eq.${safeEmail},shared_with.cs.{${safeEmail}}`)
        .order('updated_at', { ascending: false });
      if (error) {
        Logger.error(error, 'Fetch whiteboards error');
        return [];
      }
      return data || [];
    },

    createWhiteboard: async (whiteboard) => {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from('whiteboards')
        .insert([{
          title: whiteboard.title,
          owner_email: whiteboard.owner_email,
          owner_name: whiteboard.owner_name,
          shared_with: [],
        }])
        .select()
        .single();
      if (error) {
        Logger.error(error, 'Create whiteboard error');
        return null;
      }
      return data;
    },

    deleteWhiteboard: async (id) => {
      if (!supabase) return null;
      const { error } = await supabase
        .from('whiteboards')
        .delete()
        .eq('id', id);
      if (error) {
        Logger.error(error, 'Delete whiteboard error');
        return null;
      }
      return true;
    },

    updateWhiteboard: async (id, updates) => {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from('whiteboards')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) {
        Logger.error(error, 'Update whiteboard error');
        return null;
      }
      return data;
    },

    fetchElements: async (whiteboardId) => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('whiteboard_elements')
        .select('*')
        .eq('whiteboard_id', whiteboardId)
        .order('z_index', { ascending: true });
      if (error) {
        Logger.error(error, 'Fetch whiteboard elements error');
        return [];
      }
      return data || [];
    },

    createElement: async (element) => {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from('whiteboard_elements')
        .insert([element])
        .select()
        .single();
      if (error) {
        Logger.error(error, 'Create whiteboard element error');
        return null;
      }
      return data;
    },

    updateElement: async (id, updates) => {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from('whiteboard_elements')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) {
        Logger.error(error, 'Update whiteboard element error');
        return null;
      }
      return data;
    },

    deleteElement: async (id) => {
      if (!supabase) return null;
      const { error } = await supabase
        .from('whiteboard_elements')
        .delete()
        .eq('id', id);
      if (error) {
        Logger.error(error, 'Delete whiteboard element error');
        return null;
      }
      return true;
    },

    subscribeToWhiteboard: (whiteboardId, callback) => {
      if (!supabase) return null;
      const channel = supabase
        .channel(`whiteboard:${whiteboardId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'whiteboard_elements',
            filter: `whiteboard_id=eq.${whiteboardId}`,
          },
          callback
        )
        .subscribe();
      return channel;
    },

    // Workstream methods
    fetchWorkstreams: async (email) => {
      if (!supabase) return [];
      // Sanitize email to prevent query injection
      const safeEmail = sanitizeEmailForQuery(email);
      if (!safeEmail) {
        Logger.error({ email }, 'Invalid email for workstream fetch');
        return [];
      }
      const { data, error } = await supabase
        .from('workstreams')
        .select('*')
        .or(`owner_email.eq.${safeEmail},visibility.eq.shared`)
        .order('created_at', { ascending: false });
      if (error) {
        Logger.error(error, 'Fetch workstreams error');
        return [];
      }
      return data || [];
    },

    fetchWorkstreamTasks: async () => {
      if (!supabase) return [];
      // RLS policies handle visibility — fetch all tasks the user can see
      const { data, error } = await supabase
        .from('workstream_tasks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        // Table may not exist yet - that's okay
        if (error.code !== '42P01') {
          Logger.error(error, 'Fetch workstream tasks error');
        }
        return [];
      }
      return data || [];
    },

    // Productivity tools API methods
    fetchHabits: async (email) => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_email', email)
        .order('created_at', { ascending: false });
      if (error) {
        Logger.error(error, 'Fetch habits error');
        return [];
      }
      return data || [];
    },

    fetchCompletions: async (habitId, startDate, endDate) => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('habit_completions')
        .select('*')
        .eq('habit_id', habitId)
        .gte('date', startDate)
        .lte('date', endDate);
      if (error) {
        Logger.error(error, 'Fetch completions error');
        return [];
      }
      return data || [];
    },

    createHabit: async (habit) => {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from('habits')
        .insert([habit])
        .select()
        .single();
      if (error) {
        Logger.error(error, 'Create habit error');
        return null;
      }
      return data;
    },

    deleteHabit: async (habitId) => {
      if (!supabase) return null;
      const { error } = await supabase
        .from('habits')
        .delete()
        .eq('id', habitId);
      if (error) {
        Logger.error(error, 'Delete habit error');
        return null;
      }
      return true;
    },

    toggleCompletion: async (habitId, date) => {
      if (!supabase) return null;
      // Check if completion exists
      const { data: existing } = await supabase
        .from('habit_completions')
        .select('*')
        .eq('habit_id', habitId)
        .eq('date', date)
        .single();

      if (existing) {
        // Delete existing
        const { error } = await supabase
          .from('habit_completions')
          .delete()
          .eq('id', existing.id);
        if (error) {
          Logger.error(error, 'Toggle completion error');
          return null;
        }
        return { deleted: true };
      } else {
        // Create new
        const { data, error } = await supabase
          .from('habit_completions')
          .insert([{ habit_id: habitId, date }])
          .select()
          .single();
        if (error) {
          Logger.error(error, 'Toggle completion error');
          return null;
        }
        return data;
      }
    },

    fetchMatrixTasks: async (email) => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('matrix_tasks')
        .select('*')
        .eq('user_email', email)
        .order('created_at', { ascending: false });
      if (error) {
        Logger.error(error, 'Fetch matrix tasks error');
        return [];
      }
      return data || [];
    },

    createMatrixTask: async (task) => {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from('matrix_tasks')
        .insert([task])
        .select()
        .single();
      if (error) {
        Logger.error(error, 'Create matrix task error');
        return null;
      }
      return data;
    },

    updateMatrixTask: async (taskId, updates) => {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from('matrix_tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();
      if (error) {
        Logger.error(error, 'Update matrix task error');
        return null;
      }
      return data;
    },

    deleteMatrixTask: async (taskId) => {
      if (!supabase) return null;
      const { error } = await supabase
        .from('matrix_tasks')
        .delete()
        .eq('id', taskId);
      if (error) {
        Logger.error(error, 'Delete matrix task error');
        return null;
      }
      return true;
    },

    // Events calendar methods
    fetchEvents: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });
      if (error) {
        if (error.code !== '42P01') {
          Logger.error(error, 'Fetch events error');
        }
        return [];
      }
      return data || [];
    },

    createEvent: async (event) => {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from('events')
        .insert([{
          title: event.title,
          description: event.description || null,
          event_date: event.eventDate,
          end_date: event.endDate || null,
          created_by: event.createdBy,
          created_by_email: event.createdByEmail,
          color: event.color || 'ocean',
          category: event.category || null,
          location: event.location || null,
          linked_entry_id: event.linkedEntryId || null,
          linked_workstream_id: event.linkedWorkstreamId || null,
        }])
        .select()
        .single();
      if (error) {
        Logger.error(error, 'Create event error');
        return null;
      }
      return data;
    },

    updateEvent: async (id, updates) => {
      if (!supabase) return null;
      const fieldMap = {
        eventDate: 'event_date',
        endDate: 'end_date',
        createdBy: 'created_by',
        createdByEmail: 'created_by_email',
        linkedEntryId: 'linked_entry_id',
        linkedWorkstreamId: 'linked_workstream_id',
      };
      const mapped = { updated_at: new Date().toISOString() };
      for (const [key, value] of Object.entries(updates)) {
        mapped[fieldMap[key] || key] = value;
      }
      const { data, error } = await supabase
        .from('events')
        .update(mapped)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        Logger.error(error, 'Update event error');
        return null;
      }
      return data;
    },

    deleteEvent: async (id) => {
      if (!supabase) return null;
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);
      if (error) {
        Logger.error(error, 'Delete event error');
        return null;
      }
      return true;
    },
  }), [supabase, userEmail]);

  // Transform database row to app format
  const transformEntry = (row) => ({
    id: row.id,
    title: row.title,
    caption: row.caption,
    workflowStatus: row.workflow_status,
    team: row.team,
    timelineValue: row.timeline_value,
    owner: Array.isArray(row.owner) ? row.owner : row.owner ? [row.owner] : [],
    ownerEmail: Array.isArray(row.owner_email) ? row.owner_email : row.owner_email ? [row.owner_email] : [],
    collaborators: row.collaborators || [],
    tags: row.tags || [],
    subtasks: row.subtasks || [],
    documents: row.documents || [],
    date: row.date,
    comments: row.comments || [],
    archived: row.archived || false,
    dependencies: row.dependencies || [],
    customFields: row.custom_fields || [],
    attachments: row.attachments || [],
    itemType: row.item_type || 'project',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });

  // Load data on startup
  useEffect(() => {
    if (!authChecked) return;
    if (APP_CONFIG.AUTH_ENABLED && !isAuthenticated) return;

    async function loadData() {
      setLoading(true);
      try {
        await initSupabase();

        // Fetch workflow items
        const items = await SUPABASE_API.fetchWorkflowItems();
        setEntries(items.map(transformEntry));

        // Fetch personal todos
        if (userEmail) {
          const userTodos = await SUPABASE_API.fetchPersonalTodos(userEmail);
          setTodos(userTodos);

          // Fetch workstreams
          const userWorkstreams = await SUPABASE_API.fetchWorkstreams(userEmail);
          setWorkstreams(userWorkstreams);

          // Fetch workstream tasks
          const userWorkstreamTasks = await SUPABASE_API.fetchWorkstreamTasks();
          setWorkstreamTasks(userWorkstreamTasks);

          // Fetch events
          const userEvents = await SUPABASE_API.fetchEvents();
          setEvents(userEvents);
        }
      } catch (error) {
        Logger.error(error, 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [authChecked, isAuthenticated, userEmail, SUPABASE_API]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowQuickAdd(true);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        setShowGlobalSearch(true);
        return;
      }

      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
      if (isTyping) {
        if (e.key === 'Escape') document.activeElement.blur();
        return;
      }

      switch (e.key) {
        case '?':
          e.preventDefault();
          setShowKeyboardHelp(true);
          break;
        case 'Escape':
          setShowKeyboardHelp(false);
          setShowNotificationsPanel(false);
          setShowQuickAdd(false);
          setShowGlobalSearch(false);
          break;
        case 'd':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            setCurrentView('dashboard');
          }
          break;
        case 'p':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            setCurrentView('personal');
          }
          break;
        case 't':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            setCurrentView('todo');
          }
          break;
        case 'n':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            setCurrentView('add-item');
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('[data-dropdown]')) {
        setShowFiltersDropdown(false);
        setShowTagsDropdown(false);
        setShowViewDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Handler functions
  const handleNavigate = useCallback((view) => {
    setCurrentView(view);
    setSidebarOpen(false);
  }, []);

  const handleOpenEntry = useCallback((id) => {
    setSelectedItemId(id);
    setCurrentView('item-dashboard');
  }, []);

  const handleUpdateEntry = useCallback(async (entryId, updates) => {
    // Auto-archive when status is set to Complete or done
    const finalUpdates = { ...updates };
    if (updates.workflowStatus === 'Complete' || updates.workflowStatus === 'done') {
      finalUpdates.archived = true;
    }

    const result = await SUPABASE_API.updateItem(entryId, finalUpdates);
    if (result) {
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, ...finalUpdates } : e));
    }
  }, [SUPABASE_API]);

  const handleUpdateStatus = useCallback(async (id, newStatus) => {
    await handleUpdateEntry(id, { workflowStatus: newStatus });
  }, [handleUpdateEntry]);

  const handleAddItem = useCallback(async (newItem) => {
    const saved = await SUPABASE_API.saveItem({
      ...newItem,
      owner: [currentUser],
      ownerEmail: [userEmail],
    });
    if (saved) {
      setEntries(prev => [transformEntry(saved), ...prev]);
      // Stay on current view - don't redirect
    }
  }, [SUPABASE_API, currentUser]);

  const handleToggleSubtask = useCallback(async (entryId, subtaskId) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    const updatedSubtasks = entry.subtasks.map(st =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    await handleUpdateEntry(entryId, { subtasks: updatedSubtasks });
  }, [entries, handleUpdateEntry]);

  const handleDeleteSubtask = useCallback(async (entryId, subtaskId) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    const updatedSubtasks = entry.subtasks.filter(st => st.id !== subtaskId);
    await handleUpdateEntry(entryId, { subtasks: updatedSubtasks });
  }, [entries, handleUpdateEntry]);

  const handleEditSubtask = useCallback(async (entryId, subtaskId, updates) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    const updatedSubtasks = entry.subtasks.map(st =>
      st.id === subtaskId ? { ...st, ...updates } : st
    );
    await handleUpdateEntry(entryId, { subtasks: updatedSubtasks });
  }, [entries, handleUpdateEntry]);

  const openSubtaskModal = useCallback((entryId) => {
    setSubtaskModalEntryId(entryId);
    setShowSubtaskModal(true);
  }, []);

  const handleAddSubtask = useCallback(async (title, assignedTo) => {
    if (!subtaskModalEntryId || !title.trim()) return;
    const entry = entries.find(e => e.id === subtaskModalEntryId);
    if (!entry) return;

    const newSubtask = {
      id: crypto.randomUUID(),
      title: title.trim(),
      assignedTo: assignedTo || currentUser,
      completed: false,
    };
    const updatedSubtasks = [...(entry.subtasks || []), newSubtask];
    await handleUpdateEntry(subtaskModalEntryId, { subtasks: updatedSubtasks });
    setShowSubtaskModal(false);
    setSubtaskModalEntryId(null);
  }, [subtaskModalEntryId, entries, currentUser, handleUpdateEntry]);

  const handleAddTodo = useCallback(async (newTodo) => {
    const saved = await SUPABASE_API.savePersonalTodo(newTodo, userEmail);
    if (saved) {
      setTodos(prev => [saved, ...prev]);
    }
  }, [SUPABASE_API, userEmail]);

  const handleToggleTodo = useCallback(async (todoId) => {
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return;

    const updated = await SUPABASE_API.updatePersonalTodo(todoId, { completed: !todo.completed });
    if (updated) {
      setTodos(prev => prev.map(t => t.id === todoId ? updated : t));
    }
  }, [todos, SUPABASE_API]);

  const handleUpdateTodo = useCallback(async (todoId, updates) => {
    const updated = await SUPABASE_API.updatePersonalTodo(todoId, updates);
    if (updated) {
      setTodos(prev => prev.map(t => t.id === todoId ? updated : t));
    }
  }, [SUPABASE_API]);

  const handleDeleteTodo = useCallback(async (todoId) => {
    const success = await SUPABASE_API.deletePersonalTodo(todoId);
    if (success) {
      setTodos(prev => prev.filter(t => t.id !== todoId));
    }
  }, [SUPABASE_API]);

  // Workstream handlers
  const handleUpdateWorkstream = useCallback(async (id, updates) => {
    const updated = await SUPABASE_API.updateWorkstream(id, updates);
    if (updated) {
      setWorkstreams(prev => prev.map(w => w.id === id ? updated : w));
      return updated;
    }
    return null;
  }, [SUPABASE_API]);

  const handleDeleteWorkstream = useCallback(async (id) => {
    const success = await SUPABASE_API.deleteWorkstream(id);
    if (success) {
      setWorkstreams(prev => prev.filter(w => w.id !== id));
      setWorkstreamTasks(prev => prev.filter(t => t.workstream_id !== id));
      handleNavigate('workstreams');
      return true;
    }
    return false;
  }, [SUPABASE_API]);

  // Workstream task handlers
  const handleOpenWorkstreamTask = useCallback((workstreamId, taskId) => {
    setSelectedWorkstreamId(workstreamId);
    setSelectedWorkstreamTaskId(taskId);
    setCurrentView('workstream-task-detail');
  }, []);

  const handleUpdateWorkstreamTask = useCallback(async (taskId, workstreamIdOrUpdates, maybeUpdates) => {
    // Support both (taskId, updates) and (taskId, workstreamId, updates) signatures
    const updates = maybeUpdates !== undefined ? maybeUpdates : workstreamIdOrUpdates;
    const updated = await SUPABASE_API.updateWorkstreamTask(taskId, updates);
    if (updated) {
      setWorkstreamTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updated } : t));
    }
  }, [SUPABASE_API]);

  const handleDeleteWorkstreamTask = useCallback(async (taskId) => {
    // Note: Confirmation is handled by the UI component (WorkstreamTaskDetail)
    const result = await SUPABASE_API.deleteWorkstreamTask(taskId);
    if (result) {
      setWorkstreamTasks(prev => prev.filter(t => t.id !== taskId));
      return true;
    }
    return false;
  }, [SUPABASE_API]);

  // Open convert modal
  const handleOpenConvertModal = useCallback((item, sourceType) => {
    setConvertSourceItem(item);
    setConvertSourceType(sourceType);
    setShowConvertModal(true);
  }, []);

  // Convert to Task
  const handleConvertToTask = useCallback(async (sourceItem, sourceType, formData) => {
    if (!supabase) return;

    // Create new task (job) entry
    const { data, error } = await supabase
      .from('workflow_items')
      .insert([{
        title: formData.title,
        caption: formData.caption || '',
        workflow_status: formData.workflowStatus || 'todo',
        team: formData.team || '',
        owner: Array.isArray(formData.owner) ? formData.owner : [formData.owner || currentUser],
        owner_email: Array.isArray(formData.ownerEmail) ? formData.ownerEmail : [formData.ownerEmail || userEmail],
        tags: formData.tags || [],
        date: formData.date || null,
        item_type: 'job',
        archived: false,
        collaborators: [],
        subtasks: [],
        documents: [],
        comments: [],
        dependencies: [],
        custom_fields: {},
        attachments: []
      }])
      .select()
      .single();

    if (error) {
      Logger.error(error, 'Convert to task error');
      return;
    }

    // Add to entries
    const newEntry = {
      id: data.id,
      title: data.title,
      caption: data.caption,
      workflowStatus: data.workflow_status,
      team: data.team,
      owner: data.owner,
      ownerEmail: data.owner_email,
      tags: data.tags || [],
      date: data.date,
      itemType: 'job',
      archived: false,
      collaborators: [],
      subtasks: [],
      documents: [],
      comments: [],
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
    setEntries(prev => [newEntry, ...prev]);

    // Archive/delete the source item
    if (sourceType === 'project' || sourceType === 'task') {
      await supabase.from('workflow_items').update({ archived: true }).eq('id', sourceItem.id);
      setEntries(prev => prev.map(e => e.id === sourceItem.id ? { ...e, archived: true } : e));
    } else if (sourceType === 'workstream') {
      await SUPABASE_API.deleteWorkstreamTask(sourceItem.id);
      setWorkstreamTasks(prev => prev.filter(t => t.id !== sourceItem.id));
    }
  }, [supabase, currentUser, userEmail, SUPABASE_API]);

  // Convert to Project
  const handleConvertToProject = useCallback(async (sourceItem, sourceType, formData) => {
    if (!supabase) return;

    // Create new project entry
    const { data, error } = await supabase
      .from('workflow_items')
      .insert([{
        title: formData.title,
        caption: formData.caption || '',
        workflow_status: formData.workflowStatus || 'Idea',
        team: formData.team || '',
        timeline_value: formData.timelineValue || '',
        owner: Array.isArray(formData.owner) ? formData.owner : [formData.owner || currentUser],
        owner_email: Array.isArray(formData.ownerEmail) ? formData.ownerEmail : [formData.ownerEmail || userEmail],
        collaborators: formData.collaborators || [],
        tags: formData.tags || [],
        date: formData.date || null,
        item_type: 'project',
        archived: false,
        subtasks: [],
        documents: [],
        comments: formData.comments || [],
        dependencies: [],
        custom_fields: {},
        attachments: []
      }])
      .select()
      .single();

    if (error) {
      Logger.error(error, 'Convert to project error');
      return;
    }

    // Add to entries
    const newEntry = {
      id: data.id,
      title: data.title,
      caption: data.caption,
      workflowStatus: data.workflow_status,
      team: data.team,
      timelineValue: data.timeline_value,
      owner: data.owner,
      ownerEmail: data.owner_email,
      collaborators: data.collaborators || [],
      tags: data.tags || [],
      date: data.date,
      itemType: 'project',
      archived: false,
      subtasks: [],
      documents: [],
      comments: data.comments || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
    setEntries(prev => [newEntry, ...prev]);

    // Archive/delete the source item
    if (sourceType === 'project' || sourceType === 'task') {
      await supabase.from('workflow_items').update({ archived: true }).eq('id', sourceItem.id);
      setEntries(prev => prev.map(e => e.id === sourceItem.id ? { ...e, archived: true } : e));
    } else if (sourceType === 'workstream') {
      await SUPABASE_API.deleteWorkstreamTask(sourceItem.id);
      setWorkstreamTasks(prev => prev.filter(t => t.id !== sourceItem.id));
    }
  }, [supabase, currentUser, userEmail, SUPABASE_API]);

  // Convert to Workstream Task
  const handleConvertToWorkstream = useCallback(async (sourceItem, sourceType, formData, workstreamId) => {
    if (!supabase) return;

    // Create new workstream task
    const { data, error } = await supabase
      .from('workstream_tasks')
      .insert([{
        workstream_id: workstreamId,
        title: formData.title,
        description: formData.description || '',
        priority: formData.priority || 'medium',
        status: formData.status || 'open',
        deadline: formData.deadline || null,
        assignee: formData.assignee || '',
        assignee_email: formData.assigneeEmail || '',
        requester: formData.requester || '',
        tags: formData.tags || [],
        comments: [],
        sort_order: 0
      }])
      .select()
      .single();

    if (error) {
      Logger.error(error, 'Convert to workstream task error');
      return;
    }

    // Add to workstream tasks
    setWorkstreamTasks(prev => [data, ...prev]);

    // Archive/delete the source item
    if (sourceType === 'project' || sourceType === 'task') {
      await supabase.from('workflow_items').update({ archived: true }).eq('id', sourceItem.id);
      setEntries(prev => prev.map(e => e.id === sourceItem.id ? { ...e, archived: true } : e));
    } else if (sourceType === 'workstream') {
      // Moving between workstreams - delete from old
      await SUPABASE_API.deleteWorkstreamTask(sourceItem.id);
      setWorkstreamTasks(prev => prev.filter(t => t.id !== sourceItem.id));
    }
  }, [supabase, SUPABASE_API]);

  const handleOpenPdfExport = useCallback((context) => {
    setPdfExportContext(context);
    setShowPdfExportModal(true);
  }, []);

  // Workstream handlers
  const handleCreateWorkstream = useCallback(async (workstreamData) => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('workstreams')
      .insert([{
        title: workstreamData.title,
        description: workstreamData.description || '',
        owner: workstreamData.owner,
        owner_email: userEmail,
        visibility: workstreamData.visibility || 'personal',
        color: workstreamData.color || 'blue',
      }])
      .select()
      .single();
    if (error) {
      Logger.error(error, 'Create workstream error');
      return null;
    }
    setWorkstreams(prev => [data, ...prev]);
    return data;
  }, [supabase, userEmail]);

  // Create workstream task
  const handleCreateWorkstreamTask = useCallback(async (taskData) => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('workstream_tasks')
      .insert([{
        workstream_id: taskData.workstreamId,
        title: taskData.title,
        description: taskData.description || '',
        priority: taskData.priority || 'medium',
        status: 'open',
        deadline: taskData.deadline || null,
        assignee: taskData.assignee || '',
        assignee_email: taskData.assigneeEmail || '',
        requester: taskData.requester || '',
        task_type: taskData.taskType || 'Issue',
        tags: taskData.tags || [],
        comments: [],
        sort_order: taskData.sortOrder || 0
      }])
      .select()
      .single();
    if (error) {
      Logger.error(error, 'Create workstream task error');
      return null;
    }
    setWorkstreamTasks(prev => [data, ...prev]);
    return data;
  }, [supabase]);

  // Event calendar handlers
  const handleCreateEvent = useCallback(async (eventData) => {
    const saved = await SUPABASE_API.createEvent({
      ...eventData,
      createdBy: currentUser,
      createdByEmail: userEmail,
    });
    if (saved) {
      setEvents(prev => [...prev, saved].sort((a, b) => a.event_date.localeCompare(b.event_date)));
    }
    return saved;
  }, [SUPABASE_API, currentUser, userEmail]);

  const handleUpdateEvent = useCallback(async (id, updates) => {
    const updated = await SUPABASE_API.updateEvent(id, updates);
    if (updated) {
      setEvents(prev => prev.map(e => e.id === id ? updated : e));
    }
    return updated;
  }, [SUPABASE_API]);

  const handleDeleteEvent = useCallback(async (id) => {
    const result = await SUPABASE_API.deleteEvent(id);
    if (result) {
      setEvents(prev => prev.filter(e => e.id !== id));
    }
    return result;
  }, [SUPABASE_API]);

  const openStatsModal = useCallback((title, items) => {
    setStatsModalData({ title, items });
    setShowStatsModal(true);
  }, []);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      if (!showArchived && entry.archived) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = entry.title?.toLowerCase().includes(query);
        const matchesCaption = entry.caption?.toLowerCase().includes(query);
        const matchesTags = entry.tags?.some(t => t.toLowerCase().includes(query));
        if (!matchesTitle && !matchesCaption && !matchesTags) return false;
      }
      if (statusFilter.length && !statusFilter.includes(entry.workflowStatus)) return false;
      if (ownerFilter.length && !entry.owner?.some(o => ownerFilter.includes(o))) return false;
      if (teamFilter.length && !teamFilter.includes(entry.team)) return false;
      if (tagFilter.length && !entry.tags?.some(t => tagFilter.includes(t))) return false;
      return true;
    });
  }, [entries, showArchived, searchQuery, statusFilter, ownerFilter, teamFilter, tagFilter]);

  // Auth check - show loading
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ocean-50 to-aqua-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Auth check - show login
  if (APP_CONFIG.AUTH_ENABLED && !isAuthenticated) {
    return (
      <LoginScreen
        supabase={supabase}
        initSupabase={initSupabase}
        Logger={Logger}
      />
    );
  }

  // Loading data
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ocean-50 to-aqua-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-graystone-600">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  // Render current view
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            entries={entries}
            currentUser={currentUser}
            userEmail={userEmail}
            onOpenEntry={handleOpenEntry}
            onOpenPdfExport={handleOpenPdfExport}
            onNavigate={handleNavigate}
            todos={todos}
            onToggleTodo={handleToggleTodo}
            onAddTodo={handleAddTodo}
            onUpdateTodo={handleUpdateTodo}
            onDeleteTodo={handleDeleteTodo}
            onUpdateEntry={handleUpdateEntry}
            onEditSubtask={handleEditSubtask}
            workstreams={workstreams}
            workstreamTasks={workstreamTasks}
            onOpenWorkstreamTask={handleOpenWorkstreamTask}
            onUpdateWorkstreamTask={handleUpdateWorkstreamTask}
            Badge={Badge}
            events={events}
          />
        );

      case 'item-dashboard':
        const selectedEntry = entries.find(e => e.id === selectedItemId);
        return (
          <ItemDashboard
            entry={selectedEntry}
            onBack={() => handleNavigate('dashboard')}
            onToggleSubtask={handleToggleSubtask}
            onDeleteSubtask={handleDeleteSubtask}
            onEditSubtask={handleEditSubtask}
            onUpdateEntry={handleUpdateEntry}
            openSubtaskModal={openSubtaskModal}
            currentUser={currentUser}
            userEmail={userEmail}
            allEntries={entries}
            onNavigateToWhiteboard={(id) => {
              setCurrentWhiteboardId(id);
              setCurrentView('whiteboards');
            }}
            onConvert={(item, type) => {
              handleOpenConvertModal(item, type);
            }}
            USERS={USERS}
            KANBAN_STATUSES={KANBAN_STATUSES}
            userProfilesCache={userProfilesCache}
            SUPABASE_API={SUPABASE_API}
            Logger={Logger}
            canEditItem={canEditItem}
            WhiteboardPreviewCard={WhiteboardPreviewCard}
          />
        );

      case 'personal':
        const myPersonalProjects = filteredEntries.filter(e => (e.owner?.includes(currentUser) || e.ownerEmail?.includes(userEmail)) && e.itemType !== 'job');
        const ownedProjects = filteredEntries.filter(e => (e.owner?.includes(currentUser) || e.ownerEmail?.includes(userEmail)) && e.itemType !== 'job' && !e.archived);
        const collaboratorProjects = filteredEntries.filter(e => e.collaborators?.includes(currentUser) && !e.owner?.includes(currentUser) && !e.ownerEmail?.includes(userEmail) && e.itemType !== 'job' && !e.archived);
        const thisMonth = new Date();
        const thisMonthStr = `${thisMonth.getFullYear()}-${String(thisMonth.getMonth() + 1).padStart(2, '0')}`;
        const dueThisMonth = filteredEntries.filter(e => {
          if (e.itemType === 'job' || e.archived) return false;
          if (!e.owner?.includes(currentUser) && !e.ownerEmail?.includes(userEmail) && !e.collaborators?.includes(currentUser)) return false;
          const dateStr = e.date || e.timelineValue;
          return dateStr && dateStr.startsWith(thisMonthStr);
        });
        const personalTags = [...new Set(entries.flatMap(e => e.tags || []))];
        const activeFiltersCount = ownerFilter.length + teamFilter.length;
        const activeTagsCount = tagFilter.length;
        const toggleFilter = (item, currentList, setList) => {
          if (currentList.includes(item)) {
            setList(currentList.filter(i => i !== item));
          } else {
            setList([...currentList, item]);
          }
        };
        return (
          <div className="p-6 space-y-6">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-ocean-500 to-ocean-600 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold mb-1">Your Projects</h1>
                  <p className="text-ocean-100 text-sm">View and manage your owned projects</p>
                </div>
                <button
                  onClick={() => setShowAddItemModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors border border-white/20"
                >
                  <Icon name="plus" className="w-4 h-4" />
                  New Project
                </button>
              </div>
            </div>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-6 border border-ocean-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-heading text-sm text-graystone-600 mb-1 tracking-wide">Owned</p>
                    <p className="text-3xl font-bold text-ocean-900">{ownedProjects.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-ocean-500 rounded-xl flex items-center justify-center">
                    <Icon name="user" className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-xs text-graystone-500 mt-2">Projects you own</p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-ocean-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-heading text-sm text-graystone-600 mb-1 tracking-wide">Collaborating</p>
                    <p className="text-3xl font-bold text-ocean-900">{collaboratorProjects.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-ocean-500 rounded-xl flex items-center justify-center">
                    <Icon name="users" className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-xs text-graystone-500 mt-2">Projects you collaborate on</p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-ocean-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-heading text-sm text-graystone-600 mb-1 tracking-wide">Due This Month</p>
                    <p className="text-3xl font-bold text-ocean-900">{dueThisMonth.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-ocean-500 rounded-xl flex items-center justify-center">
                    <Icon name="calendar" className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-xs text-graystone-500 mt-2">{thisMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
            {/* Projects Card with Filters */}
            <div className="bg-white rounded-xl border border-ocean-100 shadow-sm">
              {/* Header with Search and Filters */}
              <div className="p-4 border-b border-ocean-100">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Search */}
                    <div className="relative group">
                      <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-graystone-400" />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 border border-ocean-200 rounded-lg text-sm text-ocean-900 placeholder-graystone-400 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 transition-all w-40 lg:w-48"
                      />
                    </div>
                    {/* Filters Dropdown */}
                    <div className="relative" data-dropdown>
                      <button
                        onClick={() => { setShowFiltersDropdown(!showFiltersDropdown); setShowTagsDropdown(false); setShowViewDropdown(false); }}
                        aria-label="Filter by team and user"
                        aria-expanded={showFiltersDropdown}
                        aria-haspopup="true"
                        className={clsx(
                          "px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border",
                          showFiltersDropdown || activeFiltersCount > 0
                            ? "bg-ocean-50 text-ocean-700 border-ocean-200"
                            : "bg-white text-graystone-600 border-ocean-200 hover:bg-ocean-50"
                        )}
                      >
                        <Icon name="filter" className="w-4 h-4" aria-hidden="true" />
                        Filters
                        {activeFiltersCount > 0 && (
                          <span className="bg-ocean-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                            {activeFiltersCount}
                          </span>
                        )}
                      </button>
                      {showFiltersDropdown && (
                        <div className="absolute top-full right-0 mt-2 w-full md:w-64 bg-white rounded-xl shadow-xl border border-ocean-100 p-3 md:p-4 z-50">
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-xs font-bold text-graystone-500 uppercase mb-2">Teams</h4>
                              <div className="space-y-1">
                                {TEAMS.map(team => (
                                  <label key={team} className="flex items-center gap-2 p-1.5 hover:bg-ocean-50 rounded cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={teamFilter.includes(team)}
                                      onChange={() => toggleFilter(team, teamFilter, setTeamFilter)}
                                      className="rounded border-graystone-300 text-ocean-600 focus:ring-ocean-500"
                                    />
                                    <span className="text-sm text-ocean-900">{team}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div className="border-t border-ocean-50 pt-3">
                              <h4 className="text-xs font-bold text-graystone-500 uppercase mb-2">Users</h4>
                              <div className="space-y-1 max-h-40 overflow-y-auto">
                                {USERS.map(user => (
                                  <label key={user} className="flex items-center gap-2 p-1.5 hover:bg-ocean-50 rounded cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={ownerFilter.includes(user)}
                                      onChange={() => toggleFilter(user, ownerFilter, setOwnerFilter)}
                                      className="rounded border-graystone-300 text-ocean-600 focus:ring-ocean-500"
                                    />
                                    <span className="text-sm text-ocean-900">{user}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div className="border-t border-ocean-50 pt-3">
                              <label className="flex items-center justify-between p-1.5 hover:bg-ocean-50 rounded cursor-pointer">
                                <span className="text-sm text-ocean-900 flex items-center gap-2">
                                  <Icon name="archive" className="w-4 h-4 text-graystone-500" />
                                  Show Archived
                                </span>
                                <div
                                  className={clsx(
                                    "w-10 h-5 rounded-full transition-colors relative cursor-pointer",
                                    showArchived ? "bg-ocean-500" : "bg-graystone-300"
                                  )}
                                  onClick={() => setShowArchived(!showArchived)}
                                >
                                  <div className={clsx(
                                    "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                                    showArchived ? "translate-x-5" : "translate-x-0.5"
                                  )}></div>
                                </div>
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Tags Dropdown */}
                    <div className="relative" data-dropdown>
                      <button
                        onClick={() => { setShowTagsDropdown(!showTagsDropdown); setShowFiltersDropdown(false); setShowViewDropdown(false); }}
                        className={clsx(
                          "px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border",
                          showTagsDropdown || activeTagsCount > 0
                            ? "bg-ocean-50 text-ocean-700 border-ocean-200"
                            : "bg-white text-graystone-600 border-ocean-200 hover:bg-ocean-50"
                        )}
                      >
                        <Icon name="tag" className="w-4 h-4" />
                        Tags
                        {activeTagsCount > 0 && (
                          <span className="bg-ocean-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                            {activeTagsCount}
                          </span>
                        )}
                      </button>
                      {showTagsDropdown && (
                        <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-ocean-100 p-4 z-50">
                          <h4 className="text-xs font-bold text-graystone-500 uppercase mb-2">Filter by Tags</h4>
                          <div className="space-y-1 max-h-60 overflow-y-auto">
                            {personalTags.map(tag => (
                              <label key={tag} className="flex items-center gap-2 p-1.5 hover:bg-ocean-50 rounded cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={tagFilter.includes(tag)}
                                  onChange={() => toggleFilter(tag, tagFilter, setTagFilter)}
                                  className="rounded border-graystone-300 text-ocean-600 focus:ring-ocean-500"
                                />
                                <span className="text-sm text-ocean-900">{tag}</span>
                              </label>
                            ))}
                            {personalTags.length === 0 && (
                              <p className="text-xs text-graystone-400 italic p-2">No tags available</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* View Switcher */}
                    <div className="relative" data-dropdown>
                      <button
                        onClick={() => { setShowViewDropdown(!showViewDropdown); setShowFiltersDropdown(false); setShowTagsDropdown(false); }}
                        className="px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border bg-white text-graystone-600 border-ocean-200 hover:bg-ocean-50"
                      >
                        <Icon
                          name={
                            viewMode === 'kanban' ? 'kanban' :
                              viewMode === 'table' ? 'table' :
                                viewMode === 'gantt' ? 'bar-chart-2' : 'calendar'
                          }
                          className="w-4 h-4"
                        />
                        <span className="capitalize hidden sm:inline">{viewMode === 'kanban' ? 'Board' : viewMode === 'calendar' ? 'Timeline' : viewMode}</span>
                        <Icon name="chevron-down" className="w-3 h-3 opacity-70" />
                      </button>
                      {showViewDropdown && (
                        <div className="absolute top-full right-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-ocean-100 p-1 z-50">
                          {[
                            { id: 'kanban', label: 'Board', icon: 'kanban' },
                            { id: 'table', label: 'Table', icon: 'table' },
                            { id: 'gantt', label: 'Gantt', icon: 'bar-chart-2' },
                            { id: 'calendar', label: 'Timeline', icon: 'calendar' }
                          ].map(view => (
                            <button
                              key={view.id}
                              onClick={() => { setViewMode(view.id); setShowViewDropdown(false); }}
                              className={clsx(
                                "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                                viewMode === view.id
                                  ? "bg-ocean-50 text-ocean-700"
                                  : "text-graystone-600 hover:bg-graystone-50 hover:text-ocean-900"
                              )}
                            >
                              <Icon name={view.icon} className="w-4 h-4" />
                              {view.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                </div>
                {/* Active Filter Chips */}
                {(activeFiltersCount > 0 || activeTagsCount > 0) && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-ocean-100">
                    {teamFilter.map(team => (
                      <button
                        key={`team-${team}`}
                        onClick={() => toggleFilter(team, teamFilter, setTeamFilter)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ocean-100 hover:bg-ocean-200 text-ocean-700 text-xs font-medium transition-colors"
                      >
                        <span>{team}</span>
                        <Icon name="x" className="w-3 h-3" />
                      </button>
                    ))}
                    {ownerFilter.map(user => (
                      <button
                        key={`user-${user}`}
                        onClick={() => toggleFilter(user, ownerFilter, setOwnerFilter)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ocean-100 hover:bg-ocean-200 text-ocean-700 text-xs font-medium transition-colors"
                      >
                        <span>{user}</span>
                        <Icon name="x" className="w-3 h-3" />
                      </button>
                    ))}
                    {tagFilter.map(tag => (
                      <button
                        key={`tag-${tag}`}
                        onClick={() => toggleFilter(tag, tagFilter, setTagFilter)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ocean-100 hover:bg-ocean-200 text-ocean-700 text-xs font-medium transition-colors"
                      >
                        <Icon name="tag" className="w-3 h-3" />
                        <span>{tag}</span>
                        <Icon name="x" className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* View Content */}
              <div className="p-6">
                {viewMode === 'kanban' && (
                  <KanbanBoard
                    statuses={KANBAN_STATUSES}
                    entries={myPersonalProjects}
                    onOpen={handleOpenEntry}
                    onUpdateStatus={handleUpdateStatus}
                    openSubtaskModal={openSubtaskModal}
                    currentUser={currentUser}
                  />
                )}
                {viewMode === 'table' && (
                  <TableView
                    entries={myPersonalProjects}
                    onOpen={handleOpenEntry}
                  />
                )}
                {viewMode === 'gantt' && (
                  <Suspense fallback={<TableSkeleton rows={6} cols={5} />}>
                    <GanttView
                      entries={myPersonalProjects}
                      onOpen={handleOpenEntry}
                    />
                  </Suspense>
                )}
                {viewMode === 'calendar' && (
                  <Suspense fallback={<ListSkeleton rows={5} />}>
                    <CalendarScreen
                      entries={myPersonalProjects}
                      onOpen={handleOpenEntry}
                      openSubtaskModal={openSubtaskModal}
                      isEmbedded={true}
                    />
                  </Suspense>
                )}
              </div>
            </div>
          </div>
        );

      case 'jobs':
        return (
          <JobsView
            entries={entries}
            setEntries={setEntries}
            currentUser={currentUser}
            userEmail={userEmail}
            darkMode={darkMode}
            supabase={supabase}
            Logger={Logger}
            userProfiles={SEED_USERS}
            teams={TEAMS}
          />
        );

      case 'todo':
        return (
          <ToDoList
            todos={todos}
            onToggleTodo={handleToggleTodo}
            onAddTodo={handleAddTodo}
            onUpdateTodo={handleUpdateTodo}
            onDeleteTodo={handleDeleteTodo}
            entries={entries}
            workstreamTasks={workstreamTasks}
            workstreams={workstreams}
            currentUser={currentUser}
            onOpenEntry={handleOpenEntry}
          />
        );

      case 'calendar':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <CalendarScreen
              entries={entries}
              todos={todos}
              workstreamTasks={workstreamTasks}
              workstreams={workstreams}
              currentUser={currentUser}
              onOpenEntry={handleOpenEntry}
              onUpdateEntry={handleUpdateEntry}
              onToggleTodo={handleToggleTodo}
              onOpenWorkstreamTask={handleOpenWorkstreamTask}
            />
          </Suspense>
        );

      case 'events-calendar':
        return (
          <EventCalendar
            events={events}
            entries={entries}
            workstreams={workstreams}
            workstreamTasks={workstreamTasks}
            currentUser={currentUser}
            onCreateEvent={handleCreateEvent}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
            onNavigateToEntry={(id) => { handleOpenEntry(id); }}
            onNavigateToWorkstream={(id) => { setSelectedWorkstreamId(id); setCurrentView('workstreams'); }}
          />
        );

      case 'add-item':
        return (
          <AddItemForm
            onSubmit={handleAddItem}
            onCancel={() => handleNavigate('dashboard')}
            users={USERS}
            teams={TEAMS}
            statuses={KANBAN_STATUSES}
            timelineTypes={TIMELINE_TYPES}
            currentUser={currentUser}
          />
        );

      case 'admin':
        if (!isAdmin(userEmail)) {
          return (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Icon name="shield-x" className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-ocean-900 mb-2">Admin Access Required</h2>
                <p className="text-graystone-600">You must be an administrator to access this area.</p>
              </div>
            </div>
          );
        }
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AdminConsole
              onBack={() => handleNavigate('dashboard')}
              currentUserEmail={userEmail}
              SUPABASE_API={SUPABASE_API}
              supabase={supabase}
              Logger={Logger}
              APP_CONFIG={APP_CONFIG}
              TEAMS={TEAMS}
              SEED_PROFILES={SEED_USERS}
              isAdmin={isAdmin}
              LoadingSpinner={LoadingSpinner}
            />
          </Suspense>
        );

      case 'manager-hub':
        if (!isManager(userEmail) && !isAdmin(userEmail)) {
          return (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Icon name="shield-x" className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-ocean-900 mb-2">Manager Access Required</h2>
                <p className="text-graystone-600">You must be a manager to access this area.</p>
              </div>
            </div>
          );
        }
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ManagerHub
              managers={MANAGERS}
              teams={TEAMS}
              entries={entries}
              currentUser={currentUser}
              userEmail={userEmail}
              openStatsModal={openStatsModal}
              onOpen={handleOpenEntry}
              onUpdateStatus={handleUpdateStatus}
              openSubtaskModal={openSubtaskModal}
              onOpenPdfExport={handleOpenPdfExport}
              managerHubTab={managerHubTab}
              setManagerHubTab={setManagerHubTab}
              reportPeriodType={reportPeriodType}
              setReportPeriodType={setReportPeriodType}
              reportStartDate={reportStartDate}
              setReportStartDate={setReportStartDate}
              reportEndDate={reportEndDate}
              setReportEndDate={setReportEndDate}
              reportSections={reportSections}
              setReportSections={setReportSections}
              projectsDisplayMode={projectsDisplayMode}
              setProjectsDisplayMode={setProjectsDisplayMode}
              reportNarratives={reportNarratives}
              setReportNarratives={setReportNarratives}
              workstreams={workstreams}
              workstreamTasks={workstreamTasks}
              onNavigateToWorkstream={(workstreamId) => {
                setSelectedWorkstreamId(workstreamId);
                setCurrentView('workstream-detail');
              }}
              TEAMS={TEAMS}
              isAdmin={isAdmin}
              Badge={Badge}
              APP_CONFIG={APP_CONFIG}
            />
          </Suspense>
        );

      case 'whiteboards':
        return (
          <WhiteboardsView
            whiteboards={whiteboards}
            setWhiteboards={setWhiteboards}
            onOpenWhiteboard={(id) => {
              setCurrentWhiteboardId(id);
              setCurrentView('whiteboard-canvas');
            }}
            userEmail={userEmail}
            currentUser={currentUser}
            WHITEBOARD_API={SUPABASE_API}
          />
        );

      case 'whiteboard-canvas':
        const currentWhiteboard = whiteboards.find(w => w.id === currentWhiteboardId);
        if (!currentWhiteboard) {
          return (
            <div className="text-center py-12">
              <Icon name="alert-circle" className="w-16 h-16 text-graystone-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-ocean-900 mb-2">Whiteboard Not Found</h2>
              <Button onClick={() => handleNavigate('whiteboards')}>Back to Whiteboards</Button>
            </div>
          );
        }
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <WhiteboardCanvas
              whiteboardId={currentWhiteboardId}
              whiteboard={currentWhiteboard}
              onBack={() => handleNavigate('whiteboards')}
              userEmail={userEmail}
              currentUser={currentUser}
              WHITEBOARD_API={SUPABASE_API}
              supabase={supabase}
              Logger={Logger}
              STICKY_COLORS={STICKY_COLORS}
              StickyNote={StickyNote}
              WhiteboardElement={WhiteboardElement}
              TextBoxElement={TextBoxElement}
              ImageElement={ImageElement}
              ShapeElement={ShapeElement}
            />
          </Suspense>
        );

      case 'workstreams':
        return (
          <WorkstreamList
            workstreams={workstreams}
            workstreamTasks={workstreamTasks}
            currentUser={currentUser}
            userEmail={userEmail}
            onOpenWorkstream={(id) => {
              setSelectedWorkstreamId(id);
              setCurrentView('workstream-detail');
            }}
            onCreateWorkstream={handleCreateWorkstream}
          />
        );

      case 'workstream-detail':
        const viewWorkstream = workstreams.find(w => w.id === selectedWorkstreamId);
        if (!viewWorkstream) {
          return (
            <div className="text-center py-12">
              <Icon name="alert-circle" className="w-16 h-16 text-graystone-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-ocean-900 mb-2">Workstream Not Found</h2>
              <Button onClick={() => handleNavigate('workstreams')}>Back to Workstreams</Button>
            </div>
          );
        }
        return (
          <WorkstreamView
            workstream={viewWorkstream}
            workstreamTasks={workstreamTasks.filter(t => t.workstream_id === selectedWorkstreamId)}
            onBack={() => handleNavigate('workstreams')}
            onOpenTask={(taskId) => {
              setSelectedWorkstreamTaskId(taskId);
              setCurrentView('workstream-task-detail');
            }}
            onCreateTask={handleCreateWorkstreamTask}
            onUpdateTask={handleUpdateWorkstreamTask}
            onUpdateWorkstream={handleUpdateWorkstream}
            onDeleteWorkstream={handleDeleteWorkstream}
            WorkstreamSettings={WorkstreamSettings}
            userEmail={userEmail}
            currentUser={currentUser}
            USERS={USERS}
          />
        );

      case 'productivity-tools':
        return (
          <ProductivityToolsView
            userEmail={userEmail}
            habits={habits}
            setHabits={setHabits}
            matrixTasks={matrixTasks}
            setMatrixTasks={setMatrixTasks}
            Logger={Logger}
            PRODUCTIVITY_API={SUPABASE_API}
          />
        );

      case 'workstream-task-detail':
        const selectedWorkstream = workstreams.find(w => w.id === selectedWorkstreamId);
        const selectedTask = workstreamTasks.find(t => t.id === selectedWorkstreamTaskId);
        if (!selectedWorkstream || !selectedTask) {
          return (
            <div className="text-center py-12">
              <Icon name="alert-circle" className="w-16 h-16 text-graystone-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-ocean-900 mb-2">Task Not Found</h2>
              <Button onClick={() => handleNavigate('workstreams')}>Back to Workstreams</Button>
            </div>
          );
        }
        return (
          <WorkstreamTaskDetail
            task={selectedTask}
            workstream={selectedWorkstream}
            currentUser={currentUser}
            userEmail={userEmail}
            entries={entries}
            onBack={() => handleNavigate('workstreams')}
            onUpdate={async (taskId, workstreamId, updates) => {
              await handleUpdateWorkstreamTask(taskId, updates);
            }}
            onDelete={async (taskId, workstreamId) => {
              return await handleDeleteWorkstreamTask(taskId);
            }}
            onConvert={(item, type) => {
              handleOpenConvertModal(item, type);
            }}
            USERS={USERS}
            USERS_WITH_EMAILS={SEED_USERS}
          />
        );

      default:
        return (
          <div className="text-center py-12">
            <Icon name="file-question" className="w-16 h-16 text-graystone-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-ocean-900 mb-2">View Not Found</h2>
            <Button onClick={() => handleNavigate('dashboard')}>Go to Dashboard</Button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-50 via-aqua-50 to-white">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-ocean-100 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-ocean-50 text-ocean-700"
          aria-label="Open menu"
        >
          <Icon name="menu" className="w-6 h-6" />
        </button>
        <h1 className="font-heading text-lg text-ocean-900">Momentum Hub</h1>
        <button
          onClick={() => setShowNotificationsPanel(true)}
          className="relative p-2 rounded-lg hover:bg-ocean-50 text-ocean-700"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
          <Icon name="bell" className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </header>

      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        onSignOut={handleSignOut}
        currentUser={currentUser}
        userEmail={userEmail}
        isAdmin={isAdmin}
        isManager={isManager}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        darkMode={darkMode}
        setDarkMode={toggleDarkMode}
        config={APP_CONFIG}
        onAddNewItem={() => setShowAddItemTypeModal(true)}
      />

      {/* Main content */}
      <main className="pt-16 lg:pt-0 p-6 lg:p-8 lg:ml-64 min-h-screen overflow-auto">
        <div className="max-w-7xl mx-auto">
          <ErrorBoundary message="This view encountered an error. Please try again or navigate to a different section.">
            {renderView()}
          </ErrorBoundary>
        </div>
      </main>

      {/* Modals */}
      {showKeyboardHelp && (
        <KeyboardShortcutsHelp onClose={() => setShowKeyboardHelp(false)} />
      )}

      {showGlobalSearch && (
        <GlobalSearchModal
          entries={entries}
          onClose={() => setShowGlobalSearch(false)}
          onSelect={(id) => {
            setShowGlobalSearch(false);
            handleOpenEntry(id);
          }}
        />
      )}

      {showQuickAdd && (
        <QuickAddModal
          onClose={() => setShowQuickAdd(false)}
          onSubmit={(item) => {
            handleAddItem(item);
            setShowQuickAdd(false);
          }}
          users={USERS}
          teams={TEAMS}
          currentUser={currentUser}
        />
      )}

      {showNotificationsPanel && (
        <NotificationsPanel
          notifications={notifications}
          onClose={() => setShowNotificationsPanel(false)}
          onNotificationClick={(n) => {
            markAsRead(n.id);
            if (n.entryId) handleOpenEntry(n.entryId);
            setShowNotificationsPanel(false);
          }}
          isOpen={showNotificationsPanel}
        />
      )}

      {showAddJobModal && (
        <AddJobModal
          onClose={() => setShowAddJobModal(false)}
          onSubmit={async (jobData) => {
            await handleAddItem({ ...jobData, itemType: 'job' });
            setShowAddJobModal(false);
          }}
          users={USERS}
          currentUser={currentUser}
        />
      )}

      {/* Add Project Modal (direct to project form) */}
      {showAddItemModal && (
        <AddItemTypeModal
          show={showAddItemModal}
          onClose={() => setShowAddItemModal(false)}
          onCreateProject={handleAddItem}
          onCreateJob={handleAddItem}
          onCreateWorkstream={handleCreateWorkstream}
          currentUser={currentUser}
          userEmail={userEmail}
          users={USERS}
          teams={TEAMS}
          initialStep="project"
        />
      )}

      {showJobDetailModal && selectedJobId && (
        <JobDetailModal
          job={entries.find(e => e.id === selectedJobId)}
          show={showJobDetailModal}
          onClose={() => {
            setShowJobDetailModal(false);
            setSelectedJobId(null);
          }}
          onUpdate={(updates) => handleUpdateEntry(selectedJobId, updates)}
          onDelete={handleDeleteEntry}
          onConvert={(item, type) => {
            setShowJobDetailModal(false);
            setSelectedJobId(null);
            handleOpenConvertModal(item, type);
          }}
          userProfiles={Object.values(userProfilesCache)}
          teams={TEAMS}
          userEmail={userEmail}
          currentUser={currentUser}
        />
      )}

      {showAddItemTypeModal && (
        <AddItemTypeModal
          show={showAddItemTypeModal}
          onClose={() => setShowAddItemTypeModal(false)}
          onCreateProject={handleAddItem}
          onCreateJob={handleAddItem}
          onCreateWorkstream={handleCreateWorkstream}
          currentUser={currentUser}
          userEmail={userEmail}
          users={USERS}
          teams={TEAMS}
        />
      )}

      {showSubtaskModal && subtaskModalEntryId && (
        <AddSubtaskModal
          entryId={subtaskModalEntryId}
          entries={entries}
          users={USERS}
          currentUser={currentUser}
          onAdd={handleAddSubtask}
          onClose={() => { setShowSubtaskModal(false); setSubtaskModalEntryId(null); }}
        />
      )}

      {showConvertModal && convertSourceItem && (
        <ConvertItemModal
          show={showConvertModal}
          onClose={() => {
            setShowConvertModal(false);
            setConvertSourceItem(null);
            setConvertSourceType(null);
          }}
          sourceItem={convertSourceItem}
          sourceType={convertSourceType}
          workstreams={workstreams}
          teams={TEAMS}
          userProfiles={Object.values(userProfilesCache)}
          currentUser={currentUser}
          userEmail={userEmail}
          onConvertToTask={handleConvertToTask}
          onConvertToProject={handleConvertToProject}
          onConvertToWorkstream={handleConvertToWorkstream}
        />
      )}
    </div>
  );
}
