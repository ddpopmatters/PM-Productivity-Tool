import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense, lazy } from 'react';
import clsx from 'clsx';
import { useApp } from './contexts';
import { initSupabase, getSupabase } from './api/supabase';
import { fetchWorkflowItems as fetchWorkflowItemsService } from './services/workflowItems';
import { useCockpitSync } from './hooks/useCockpitSync';
import { Logger } from './utils/logger';
import {
  isAdmin,
  isManager,
  canEditItem,
  getPagesRole,
  isPagesOnly,
  getAuthCallbackContext,
  clearAuthCallbackUrl,
} from './utils/auth';
import { exportCSV, exportJSON } from './utils/export';
import {
  useWorkflowItems,
  useTodos,
  useWorkstreams,
  useWhiteboards,
  useEvents,
  useFilters,
  useNavigation,
  useModals,
  useKeyboardShortcuts,
  useNotifications,
} from './hooks';
import { useMindmaps } from './hooks/useMindmaps';
import {
  APP_CONFIG,
  USERS,
  TEAMS,
  MANAGERS,
  KANBAN_STATUSES,
  TIMELINE_TYPES,
  STICKY_COLORS,
  SEED_USERS,
} from './utils/config';

// Import UI components
import { Icon, Button, Badge, LoadingSpinner, ViewSwitcher, Pagination, ErrorBoundary, ListSkeleton, TableSkeleton } from './components/ui';

// Import feature components
import {
  ListView,
  TableView,
  KanbanBoard,
  JobsView,
  WhiteboardsView,
  ProductivityToolsView,
  Sidebar,
  LoginScreen,
  AuthCallback,
  Dashboard,
  StartOfDayView,
  ItemDashboard,
  ToDoList,
  AddItemForm,
  FilterBar,
  NotificationsPanel,
  KeyboardShortcutsHelp,
  GlobalSearchModal,
  QuickAddModal,
  AddJobModal,
  JobDetailModal,
  AddItemTypeModal,
  ConvertItemModal,
  AddSubtaskModal,
  BrainDumpInbox,
  WorkstreamList,
  WorkstreamView,
  WorkstreamTaskDetail,
  WorkstreamSettings,
  EventCalendar,
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
const MindmapEditor = lazy(() => import('./components/features/mindmaps/MindmapEditor'));
const AdminConsole = lazy(() => import('./components/features/admin/AdminConsole'));
const ManagerHub = lazy(() => import('./components/features/manager/ManagerHub'));
const PagesView = lazy(() => import('./components/features/pages/PagesView'));
const RequestDashboard = lazy(() => import('./components/features/pages/dashboard/RequestDashboard'));
const WebsiteRoute = lazy(() =>
  import('./components/features/website/WebsiteRoute').then((module) => ({
    default: module.WebsiteRoute,
  }))
);

export default function App() {
  // Auth state from context
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

  // Domain hooks
  const items = useWorkflowItems();
  const todosHook = useTodos();
  const ws = useWorkstreams();
  const wb = useWhiteboards();
  const mm = useMindmaps();
  const ev = useEvents();
  const nav = useNavigation();
  const modals = useModals();
  const { notifications, unreadCount, markAsRead } = useNotifications(userEmail);
  const filters = useFilters(items.entries);

  // Manager Hub state (kept here — tightly coupled to ManagerHub props)
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

  // Habits & matrix (simple state, passed to productivity tools)
  const [habits, setHabits] = useState([]);
  const [matrixTasks, setMatrixTasks] = useState([]);

  // User profiles cache
  const [userProfilesCache, setUserProfilesCache] = useState({});
  const [authCallbackContext, setAuthCallbackContext] = useState(() => getAuthCallbackContext());

  const supabase = getSupabase();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    navigate: nav.navigate,
    setShowQuickAdd: modals.setShowQuickAdd,
    setShowGlobalSearch: modals.setShowGlobalSearch,
    setShowKeyboardHelp: modals.setShowKeyboardHelp,
    closeAllOverlays: modals.closeAllOverlays,
  });

  // Close dropdowns on outside click
  useEffect(() => {
    const handleCloseDropdowns = () => {
      modals.setShowFiltersDropdown(false);
      modals.setShowTagsDropdown(false);
      modals.setShowViewDropdown(false);
    };
    document.addEventListener('close-dropdowns', handleCloseDropdowns);
    return () => document.removeEventListener('close-dropdowns', handleCloseDropdowns);
  }, [modals]);

  // Load data on startup
  useEffect(() => {
    if (!authChecked) return;
    if (APP_CONFIG.AUTH_ENABLED && !isAuthenticated) return;

    async function loadData() {
      await initSupabase();
      await items.loadEntries();
      if (userEmail) {
        todosHook.loadTodos(userEmail);
        const accessibleWorkstreams = await ws.loadWorkstreams(userEmail);
        ws.loadWorkstreamTasks(accessibleWorkstreams);
        mm.loadMindmaps(userEmail);
        ev.loadEvents();
      }
    }

    loadData();
  }, [authChecked, isAuthenticated, userEmail]);

  // PM Hermes Cockpit bridge — snapshot publishing + action polling
  useCockpitSync({
    authChecked,
    isAuthenticated,
    userEmail,
    currentUser,
    items,
    ws,
    todosHook,
    ev,
  });

  // Build SUPABASE_API object for components that still need it (whiteboard, admin, productivity)
  const SUPABASE_API = useMemo(() => {
    const whiteboardApi = wb.whiteboardApi;
    const productivityMethods = {
      fetchHabits: async (email) => {
        const { fetchHabits } = await import('./services/productivity');
        return fetchHabits(email);
      },
      fetchCompletions: async (habitId, startDate, endDate) => {
        const { fetchCompletions } = await import('./services/productivity');
        return fetchCompletions(habitId, startDate, endDate);
      },
      createHabit: async (habit) => {
        const { createHabit } = await import('./services/productivity');
        return createHabit(habit);
      },
      deleteHabit: async (habitId) => {
        const { deleteHabit } = await import('./services/productivity');
        return deleteHabit(habitId);
      },
      toggleCompletion: async (habitId, date) => {
        const { toggleCompletion } = await import('./services/productivity');
        return toggleCompletion(habitId, date);
      },
      fetchMatrixTasks: async (email) => {
        const { fetchMatrixTasks } = await import('./services/productivity');
        return fetchMatrixTasks(email);
      },
      createMatrixTask: async (task) => {
        const { createMatrixTask } = await import('./services/productivity');
        return createMatrixTask(task);
      },
      updateMatrixTask: async (taskId, updates) => {
        const { updateMatrixTask } = await import('./services/productivity');
        return updateMatrixTask(taskId, updates);
      },
      deleteMatrixTask: async (taskId) => {
        const { deleteMatrixTask } = await import('./services/productivity');
        return deleteMatrixTask(taskId);
      },
    };
    return {
      ...whiteboardApi,
      ...productivityMethods,
      // Legacy methods still needed by some components
      fetchWorkflowItems: fetchWorkflowItemsService,
      // Admin console methods — use getSupabase() at call time to avoid stale closure
      fetchUserProfiles: async () => {
        const sb = getSupabase();
        if (!sb) return [];
        const { data, error } = await sb
          .from('user_profiles')
          .select('*')
          .order('name');
        if (error) { Logger.error(error, 'Failed to fetch user profiles'); return []; }
        return data || [];
      },
      fetchRecentActivity: async (limit = 100) => {
        const sb = getSupabase();
        if (!sb) return [];
        const { data, error } = await sb
          .from('activity_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
        if (error) { Logger.error(error, 'Failed to fetch activity log'); return []; }
        return data || [];
      },
      logActivity: async (actionType, entityType, targetEmail, targetName, metadata = {}) => {
        const sb = getSupabase();
        if (!sb) return;
        try {
          await sb.from('activity_log').insert([{
            action_type: actionType,
            actor_email: userEmail || '',
            actor_name: currentUser || null,
            target_type: entityType,
            target_id: targetEmail || null,
            target_title: targetName || null,
            details: metadata,
            related_users: targetEmail ? [targetEmail] : [],
          }]);
        } catch (_) {
          // Swallow logging errors so invite flows do not fail on audit issues.
        }
      },
      // Teams CRUD
      fetchTeams: async () => {
        const sb = getSupabase();
        if (!sb) return [];
        const { data, error } = await sb
          .from('teams')
          .select('*')
          .order('name');
        if (error) { Logger.error(error, 'Failed to fetch teams'); return []; }
        return data || [];
      },
      createTeam: async (name) => {
        const sb = getSupabase();
        if (!sb) return null;
        const { data, error } = await sb
          .from('teams')
          .insert([{ name }])
          .select()
          .single();
        if (error) { Logger.error(error, 'Failed to create team'); return null; }
        return data;
      },
      deleteTeam: async (id) => {
        const sb = getSupabase();
        if (!sb) return false;
        const { error } = await sb
          .from('teams')
          .delete()
          .eq('id', id);
        if (error) { Logger.error(error, 'Failed to delete team'); return false; }
        return true;
      },
    };
  }, [wb.whiteboardApi, currentUser, userEmail]);

  // Convert handlers (cross-hook coordination)
  const handleConvertToTask = useCallback(async (sourceItem, sourceType, formData) => {
    if (!supabase) return;
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
        archived: false, collaborators: [], subtasks: [], documents: [],
        comments: [], dependencies: [], custom_fields: {}, attachments: [],
      }])
      .select().single();
    if (error) { Logger.error(error, 'Convert to task error'); return; }
    const newEntry = items.transformEntry(data);
    items.setEntries(prev => [newEntry, ...prev]);
    if (sourceType === 'project' || sourceType === 'task') {
      await supabase.from('workflow_items').update({ archived: true }).eq('id', sourceItem.id);
      items.archiveEntry(sourceItem.id);
    } else if (sourceType === 'workstream') {
      await ws.deleteWorkstreamTask(sourceItem.id);
    }
  }, [supabase, currentUser, userEmail, items, ws]);

  const handleConvertToProject = useCallback(async (sourceItem, sourceType, formData) => {
    if (!supabase) return;
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
        archived: false, subtasks: [], documents: [],
        comments: formData.comments || [],
        dependencies: [], custom_fields: {}, attachments: [],
      }])
      .select().single();
    if (error) { Logger.error(error, 'Convert to project error'); return; }
    const newEntry = items.transformEntry(data);
    items.setEntries(prev => [newEntry, ...prev]);
    if (sourceType === 'project' || sourceType === 'task') {
      await supabase.from('workflow_items').update({ archived: true }).eq('id', sourceItem.id);
      items.archiveEntry(sourceItem.id);
    } else if (sourceType === 'workstream') {
      await ws.deleteWorkstreamTask(sourceItem.id);
    }
  }, [supabase, currentUser, userEmail, items, ws]);

  const handleConvertToWorkstream = useCallback(async (sourceItem, sourceType, formData, workstreamId) => {
    if (!supabase) return;
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
        comments: [], sort_order: 0,
      }])
      .select().single();
    if (error) { Logger.error(error, 'Convert to workstream task error'); return; }
    ws.setWorkstreamTasks(prev => [data, ...prev]);
    if (sourceType === 'project' || sourceType === 'task') {
      await supabase.from('workflow_items').update({ archived: true }).eq('id', sourceItem.id);
      items.archiveEntry(sourceItem.id);
    } else if (sourceType === 'workstream') {
      await ws.deleteWorkstreamTask(sourceItem.id);
    }
  }, [supabase, items, ws]);

  // Subtask modal handler
  const handleAddSubtask = useCallback(async (title, assignedTo) => {
    if (!modals.subtaskModalEntryId) return;
    await items.addSubtask(modals.subtaskModalEntryId, title, assignedTo, currentUser);
    modals.closeSubtaskModal();
  }, [modals.subtaskModalEntryId, items, currentUser, modals]);

  // Bulk operations
  const handleBulkStatusChange = useCallback(async (ids, newStatus) => {
    await Promise.all(ids.map(id => items.updateStatus(id, newStatus)));
  }, [items]);

  const handleBulkDelete = useCallback(async (ids) => {
    await Promise.all(ids.map(id => items.deleteEntry(id)));
  }, [items]);

  // Wrapped handlers that bind user context
  const handleAddItem = useCallback(async (newItem) => {
    return items.addItem(newItem, currentUser, userEmail);
  }, [items, currentUser, userEmail]);

  const handleCreateEvent = useCallback(async (eventData) => {
    return ev.createEvent(eventData, currentUser, userEmail);
  }, [ev, currentUser, userEmail]);

  const handleAddTodo = useCallback(async (newTodo) => {
    return todosHook.addTodo(newTodo, userEmail);
  }, [todosHook, userEmail]);

  const handleCreateWorkstream = useCallback(async (workstreamData) => {
    return ws.createWorkstream(workstreamData, userEmail);
  }, [ws, userEmail]);

  const handleDeleteWorkstream = useCallback(async (id) => {
    const success = await ws.deleteWorkstream(id);
    if (success) nav.navigate('workstreams');
    return success;
  }, [ws, nav]);

  const handleAuthCallbackContinue = useCallback(() => {
    clearAuthCallbackUrl();
    setAuthCallbackContext(null);
  }, []);

  if (authCallbackContext) {
    return (
      <AuthCallback
        type={authCallbackContext.type}
        initialError={authCallbackContext.error}
        onContinue={handleAuthCallbackContinue}
        supabase={supabase}
        initSupabase={initSupabase}
        Logger={Logger}
        config={APP_CONFIG}
      />
    );
  }

  // Auth check - show loading
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
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

  // Pages-only users — minimal shell, no hub data
  if (isPagesOnly(userEmail)) {
    return (
      <div className="min-h-screen bg-graystone-50 dark:bg-slate-950">
        <header className="flex items-center justify-between border-b border-graystone-200 bg-white px-6 py-3 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-ocean-100 p-1.5 text-ocean-700 dark:bg-ocean-500/15 dark:text-ocean-200">
              <Icon name="layout-template" className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-ocean-900 dark:text-slate-100">Pages Hub</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-graystone-500 dark:text-slate-400">{currentUser || userEmail}</span>
            <button
              onClick={handleSignOut}
              className="text-xs text-graystone-500 hover:text-ocean-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Sign out
            </button>
          </div>
        </header>
        <main className={clsx(nav.currentView === 'pages-request' ? 'min-h-0' : 'mx-auto max-w-4xl p-6')}>
          <Suspense fallback={<LoadingSpinner />}>
            {nav.currentView === 'pages-request' ? (
              <RequestDashboard
                requestId={nav.selectedRequestId}
                pagesRole={getPagesRole(userEmail)}
                userId={authUser?.id}
                userEmail={userEmail}
                currentUser={currentUser}
                onBack={() => nav.navigate('pages')}
              />
            ) : (
              <PagesView
                pagesRole={getPagesRole(userEmail)}
                userId={authUser?.id}
                userEmail={userEmail}
                currentUser={currentUser}
                onOpenRequest={(id) => nav.openRequest(id)}
              />
            )}
          </Suspense>
        </main>
      </div>
    );
  }

  // Loading data
  if (items.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-graystone-600">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  // Render current view
  const renderView = () => {
    switch (nav.currentView) {
      case 'dashboard':
        return (
          <ErrorBoundary key="dashboard" message="The dashboard encountered an error.">
          <Dashboard
            entries={items.entries}
            currentUser={currentUser}
            userEmail={userEmail}
            onOpenEntry={nav.openEntry}
            onOpenPdfExport={modals.openPdfExport}
            onNavigate={nav.navigate}
            todos={todosHook.todos}
            onToggleTodo={todosHook.toggleTodo}
            onAddTodo={handleAddTodo}
            onUpdateTodo={todosHook.updateTodo}
            onDeleteTodo={todosHook.deleteTodo}
            onUpdateEntry={items.updateEntry}
            onEditSubtask={items.editSubtask}
            workstreams={ws.workstreams}
            workstreamTasks={ws.workstreamTasks}
            onOpenWorkstreamTask={nav.openWorkstreamTask}
            onUpdateWorkstreamTask={ws.updateWorkstreamTask}
            Badge={Badge}
            events={ev.events}
          />
          </ErrorBoundary>
        );

      case 'start-of-day':
        return (
          <ErrorBoundary key="start-of-day" message="The start of day packet encountered an error.">
            <StartOfDayView userEmail={userEmail} authUserId={authUser?.id} />
          </ErrorBoundary>
        );

      case 'item-dashboard': {
        const selectedEntry = items.entries.find(e => e.id === nav.selectedItemId);
        return (
          <ErrorBoundary key={`item-${nav.selectedItemId}`} message="This item encountered an error. Try navigating back and reopening it.">
          <ItemDashboard
            entry={selectedEntry}
            onBack={nav.goBack}
            onToggleSubtask={items.toggleSubtask}
            onDeleteSubtask={items.deleteSubtask}
            onEditSubtask={items.editSubtask}
            onUpdateEntry={items.updateEntry}
            openSubtaskModal={modals.openSubtaskModal}
            currentUser={currentUser}
            userEmail={userEmail}
            allEntries={items.entries}
            onNavigateToWhiteboard={(id) => nav.openWhiteboard(id)}
            onConvert={(item, type) => modals.openConvertModal(item, type)}
            USERS={USERS}
            KANBAN_STATUSES={KANBAN_STATUSES}
            userProfilesCache={userProfilesCache}
            SUPABASE_API={SUPABASE_API}
            Logger={Logger}
            canEditItem={canEditItem}
            WhiteboardPreviewCard={WhiteboardPreviewCard}
          />
          </ErrorBoundary>
        );
      }

      case 'personal': {
        const myPersonalProjects = filters.filteredEntries.filter(e => (e.owner?.includes(currentUser) || e.ownerEmail?.includes(userEmail)) && e.itemType !== 'job');
        const ownedProjects = filters.filteredEntries.filter(e => (e.owner?.includes(currentUser) || e.ownerEmail?.includes(userEmail)) && e.itemType !== 'job' && !e.archived);
        const collaboratorProjects = filters.filteredEntries.filter(e => e.collaborators?.includes(currentUser) && !e.owner?.includes(currentUser) && !e.ownerEmail?.includes(userEmail) && e.itemType !== 'job' && !e.archived);
        const thisMonth = new Date();
        const thisMonthStr = `${thisMonth.getFullYear()}-${String(thisMonth.getMonth() + 1).padStart(2, '0')}`;
        const dueThisMonth = filters.filteredEntries.filter(e => {
          if (e.itemType === 'job' || e.archived) return false;
          if (!e.owner?.includes(currentUser) && !e.ownerEmail?.includes(userEmail) && !e.collaborators?.includes(currentUser)) return false;
          const dateStr = e.date || e.timelineValue;
          return dateStr && dateStr.startsWith(thisMonthStr);
        });
        const personalTags = [...new Set(items.entries.flatMap(e => e.tags || []))];
        const activeFiltersCount = filters.ownerFilter.length + filters.teamFilter.length;
        const activeTagsCount = filters.tagFilter.length;
        return (
          <ErrorBoundary key="personal" message="Your projects view encountered an error.">
          <div className="p-6 space-y-6">
            <div className="bg-ocean-800 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold mb-1">Your Projects</h1>
                  <p className="text-ocean-100 text-sm">View and manage your owned projects</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative" data-dropdown>
                    <button
                      onClick={() => modals.setShowExportMenu?.(!modals.showExportMenu)}
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20 text-sm"
                    >
                      <Icon name="download" className="w-4 h-4" />
                      Export
                    </button>
                    {modals.showExportMenu && (
                      <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-graystone-200 p-1 z-50">
                        <button onClick={() => { exportCSV(myPersonalProjects, 'my-projects'); modals.setShowExportMenu(false); }} className="w-full text-left px-3 py-2 rounded-lg text-sm text-graystone-700 hover:bg-ocean-50 transition flex items-center gap-2">
                          <Icon name="file-spreadsheet" className="w-4 h-4 text-green-600" /> Export CSV
                        </button>
                        <button onClick={() => { exportJSON(myPersonalProjects, 'my-projects'); modals.setShowExportMenu(false); }} className="w-full text-left px-3 py-2 rounded-lg text-sm text-graystone-700 hover:bg-ocean-50 transition flex items-center gap-2">
                          <Icon name="file-json" className="w-4 h-4 text-blue-600" /> Export JSON
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => modals.setShowAddItemModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors border border-white/20"
                  >
                    <Icon name="plus" className="w-4 h-4" />
                    New Project
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Owned', count: ownedProjects.length, icon: 'user', desc: 'Projects you own' },
                { label: 'Collaborating', count: collaboratorProjects.length, icon: 'users', desc: 'Projects you collaborate on' },
                { label: 'Due This Month', count: dueThisMonth.length, icon: 'calendar', desc: thisMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) },
              ].map(stat => (
                <div key={stat.label} className="bg-white rounded-xl p-6 border border-graystone-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-heading text-sm text-graystone-600 mb-1 tracking-wide">{stat.label}</p>
                      <p className="text-3xl font-bold text-ocean-900">{stat.count}</p>
                    </div>
                    <div className="w-12 h-12 bg-ocean-500 rounded-xl flex items-center justify-center">
                      <Icon name={stat.icon} className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <p className="text-xs text-graystone-500 mt-2">{stat.desc}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border border-graystone-200 shadow-sm">
              <div className="p-4 border-b border-graystone-200">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative group">
                    <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-graystone-400" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={filters.searchQuery}
                      onChange={(e) => filters.setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 border border-ocean-200 rounded-lg text-sm text-ocean-900 placeholder-graystone-400 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 transition-all w-40 lg:w-48"
                    />
                  </div>
                  <div className="relative" data-dropdown>
                    <button
                      onClick={() => { modals.setShowFiltersDropdown(!modals.showFiltersDropdown); modals.setShowTagsDropdown(false); modals.setShowViewDropdown(false); }}
                      className={clsx(
                        "px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border",
                        modals.showFiltersDropdown || activeFiltersCount > 0
                          ? "bg-ocean-50 text-ocean-700 border-ocean-200"
                          : "bg-white text-graystone-600 border-ocean-200 hover:bg-ocean-50"
                      )}
                    >
                      <Icon name="filter" className="w-4 h-4" />
                      Filters
                      {activeFiltersCount > 0 && (
                        <span className="bg-ocean-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{activeFiltersCount}</span>
                      )}
                    </button>
                    {modals.showFiltersDropdown && (
                      <div className="absolute top-full right-0 mt-2 w-full md:w-64 bg-white rounded-xl shadow-xl border border-graystone-200 p-3 md:p-4 z-50">
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-xs font-bold text-graystone-500 uppercase mb-2">Teams</h4>
                            <div className="space-y-1">
                              {TEAMS.map(team => (
                                <label key={team} className="flex items-center gap-2 p-1.5 hover:bg-ocean-50 rounded cursor-pointer">
                                  <input type="checkbox" checked={filters.teamFilter.includes(team)} onChange={() => filters.toggleFilter(team, filters.teamFilter, filters.setTeamFilter)} className="rounded border-graystone-300 text-ocean-600 focus:ring-ocean-500" />
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
                                  <input type="checkbox" checked={filters.ownerFilter.includes(user)} onChange={() => filters.toggleFilter(user, filters.ownerFilter, filters.setOwnerFilter)} className="rounded border-graystone-300 text-ocean-600 focus:ring-ocean-500" />
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
                                className={clsx("w-10 h-5 rounded-full transition-colors relative cursor-pointer", filters.showArchived ? "bg-ocean-500" : "bg-graystone-300")}
                                onClick={() => filters.setShowArchived(!filters.showArchived)}
                              >
                                <div className={clsx("absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform", filters.showArchived ? "translate-x-5" : "translate-x-0.5")}></div>
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="relative" data-dropdown>
                    <button
                      onClick={() => { modals.setShowTagsDropdown(!modals.showTagsDropdown); modals.setShowFiltersDropdown(false); modals.setShowViewDropdown(false); }}
                      className={clsx(
                        "px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border",
                        modals.showTagsDropdown || activeTagsCount > 0
                          ? "bg-ocean-50 text-ocean-700 border-ocean-200"
                          : "bg-white text-graystone-600 border-ocean-200 hover:bg-ocean-50"
                      )}
                    >
                      <Icon name="tag" className="w-4 h-4" />
                      Tags
                      {activeTagsCount > 0 && (
                        <span className="bg-ocean-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{activeTagsCount}</span>
                      )}
                    </button>
                    {modals.showTagsDropdown && (
                      <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-graystone-200 p-4 z-50">
                        <h4 className="text-xs font-bold text-graystone-500 uppercase mb-2">Filter by Tags</h4>
                        <div className="space-y-1 max-h-60 overflow-y-auto">
                          {personalTags.map(tag => (
                            <label key={tag} className="flex items-center gap-2 p-1.5 hover:bg-ocean-50 rounded cursor-pointer">
                              <input type="checkbox" checked={filters.tagFilter.includes(tag)} onChange={() => filters.toggleFilter(tag, filters.tagFilter, filters.setTagFilter)} className="rounded border-graystone-300 text-ocean-600 focus:ring-ocean-500" />
                              <span className="text-sm text-ocean-900">{tag}</span>
                            </label>
                          ))}
                          {personalTags.length === 0 && <p className="text-xs text-graystone-400 italic p-2">No tags available</p>}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="relative" data-dropdown>
                    <button
                      onClick={() => { modals.setShowViewDropdown(!modals.showViewDropdown); modals.setShowFiltersDropdown(false); modals.setShowTagsDropdown(false); }}
                      className="px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border bg-white text-graystone-600 border-ocean-200 hover:bg-ocean-50"
                    >
                      <Icon name={nav.viewMode === 'kanban' ? 'kanban' : nav.viewMode === 'table' ? 'table' : nav.viewMode === 'gantt' ? 'bar-chart-2' : 'calendar'} className="w-4 h-4" />
                      <span className="capitalize hidden sm:inline">{nav.viewMode === 'kanban' ? 'Board' : nav.viewMode === 'calendar' ? 'Timeline' : nav.viewMode}</span>
                      <Icon name="chevron-down" className="w-3 h-3 opacity-70" />
                    </button>
                    {modals.showViewDropdown && (
                      <div className="absolute top-full right-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-graystone-200 p-1 z-50">
                        {[
                          { id: 'kanban', label: 'Board', icon: 'kanban' },
                          { id: 'table', label: 'Table', icon: 'table' },
                          { id: 'gantt', label: 'Gantt', icon: 'bar-chart-2' },
                          { id: 'calendar', label: 'Timeline', icon: 'calendar' },
                        ].map(view => (
                          <button
                            key={view.id}
                            onClick={() => { nav.setViewMode(view.id); modals.setShowViewDropdown(false); }}
                            className={clsx(
                              "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                              nav.viewMode === view.id ? "bg-ocean-50 text-ocean-700" : "text-graystone-600 hover:bg-graystone-50 hover:text-ocean-900"
                            )}
                          >
                            <Icon name={view.icon} className="w-4 h-4" />
                            {view.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {(activeFiltersCount > 0 || activeTagsCount > 0) && (
                    <button
                      onClick={() => {
                        const name = prompt('Save current filter as:');
                        if (name?.trim()) filters.saveCurrentFilter(name.trim());
                      }}
                      className="px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border bg-white text-graystone-600 border-ocean-200 hover:bg-ocean-50"
                    >
                      <Icon name="bookmark-plus" className="w-4 h-4" />
                      <span className="hidden sm:inline">Save</span>
                    </button>
                  )}
                </div>
                {filters.savedFilters.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-xs text-graystone-500 font-medium">Saved:</span>
                    {filters.savedFilters.map(sf => (
                      <div key={sf.id} className="flex items-center gap-1">
                        <button
                          onClick={() => filters.applySavedFilter(sf)}
                          className="px-2.5 py-1 rounded-full bg-ocean-50 hover:bg-ocean-100 text-ocean-700 text-xs font-medium transition-colors border border-ocean-200"
                        >
                          {sf.name}
                        </button>
                        <button
                          onClick={() => filters.deleteSavedFilter(sf.id)}
                          className="p-0.5 hover:bg-graystone-100 rounded-full transition"
                        >
                          <Icon name="x" className="w-3 h-3 text-graystone-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {(activeFiltersCount > 0 || activeTagsCount > 0) && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-graystone-200">
                    {filters.teamFilter.map(team => (
                      <button key={`team-${team}`} onClick={() => filters.toggleFilter(team, filters.teamFilter, filters.setTeamFilter)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ocean-100 hover:bg-ocean-200 text-ocean-700 text-xs font-medium transition-colors">
                        <span>{team}</span><Icon name="x" className="w-3 h-3" />
                      </button>
                    ))}
                    {filters.ownerFilter.map(user => (
                      <button key={`user-${user}`} onClick={() => filters.toggleFilter(user, filters.ownerFilter, filters.setOwnerFilter)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ocean-100 hover:bg-ocean-200 text-ocean-700 text-xs font-medium transition-colors">
                        <span>{user}</span><Icon name="x" className="w-3 h-3" />
                      </button>
                    ))}
                    {filters.tagFilter.map(tag => (
                      <button key={`tag-${tag}`} onClick={() => filters.toggleFilter(tag, filters.tagFilter, filters.setTagFilter)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ocean-100 hover:bg-ocean-200 text-ocean-700 text-xs font-medium transition-colors">
                        <Icon name="tag" className="w-3 h-3" /><span>{tag}</span><Icon name="x" className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-6">
                {nav.viewMode === 'kanban' && (
                  <KanbanBoard statuses={KANBAN_STATUSES} entries={myPersonalProjects} onOpen={nav.openEntry} onUpdateStatus={items.updateStatus} openSubtaskModal={modals.openSubtaskModal} currentUser={currentUser} />
                )}
                {nav.viewMode === 'table' && (
                  <TableView entries={myPersonalProjects} onOpen={nav.openEntry} onBulkStatusChange={handleBulkStatusChange} onBulkDelete={handleBulkDelete} statuses={KANBAN_STATUSES} />
                )}
                {nav.viewMode === 'gantt' && (
                  <Suspense fallback={<TableSkeleton rows={6} cols={5} />}>
                    <GanttView entries={myPersonalProjects} onOpen={nav.openEntry} />
                  </Suspense>
                )}
                {nav.viewMode === 'calendar' && (
                  <Suspense fallback={<ListSkeleton rows={5} />}>
                    <CalendarScreen entries={myPersonalProjects} onOpen={nav.openEntry} openSubtaskModal={modals.openSubtaskModal} isEmbedded={true} />
                  </Suspense>
                )}
              </div>
            </div>
          </div>
          </ErrorBoundary>
        );
      }

      case 'jobs':
        return (
          <ErrorBoundary key="jobs" message="The jobs view encountered an error.">
          <JobsView entries={items.entries} setEntries={items.setEntries} currentUser={currentUser} userEmail={userEmail} darkMode={darkMode} supabase={supabase} Logger={Logger} userProfiles={SEED_USERS} teams={TEAMS} />
          </ErrorBoundary>
        );

      case 'todo':
        return (
          <ErrorBoundary key="todo" message="The to-do list encountered an error.">
          <ToDoList todos={todosHook.todos} onToggleTodo={todosHook.toggleTodo} onAddTodo={handleAddTodo} onUpdateTodo={todosHook.updateTodo} onDeleteTodo={todosHook.deleteTodo} entries={items.entries} workstreamTasks={ws.workstreamTasks} workstreams={ws.workstreams} currentUser={currentUser} onOpenEntry={nav.openEntry} onOpenWorkstreamTask={nav.openWorkstreamTask} />
          </ErrorBoundary>
        );

      case 'calendar':
        return (
          <ErrorBoundary key="calendar" message="The calendar encountered an error.">
          <Suspense fallback={<LoadingSpinner />}>
            <CalendarScreen entries={items.entries} todos={todosHook.todos} workstreamTasks={ws.workstreamTasks} workstreams={ws.workstreams} currentUser={currentUser} onOpenEntry={nav.openEntry} onUpdateEntry={items.updateEntry} onToggleTodo={todosHook.toggleTodo} onOpenWorkstreamTask={nav.openWorkstreamTask} />
          </Suspense>
          </ErrorBoundary>
        );

      case 'events-calendar':
        return (
          <ErrorBoundary key="events-calendar" message="The events calendar encountered an error.">
          <EventCalendar events={ev.events} entries={items.entries} workstreams={ws.workstreams} workstreamTasks={ws.workstreamTasks} currentUser={currentUser} onCreateEvent={handleCreateEvent} onUpdateEvent={ev.updateEvent} onDeleteEvent={ev.deleteEvent} onNavigateToEntry={(id) => nav.openEntry(id)} onNavigateToWorkstream={(id) => nav.openWorkstreamDetail(id)} />
          </ErrorBoundary>
        );

      case 'add-item':
        return (
          <ErrorBoundary key="add-item" message="The add item form encountered an error.">
          <AddItemForm onSubmit={handleAddItem} onCancel={nav.goBack} users={USERS} teams={TEAMS} statuses={KANBAN_STATUSES} timelineTypes={TIMELINE_TYPES} currentUser={currentUser} />
          </ErrorBoundary>
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
          <ErrorBoundary key="admin" message="The admin console encountered an error.">
          <Suspense fallback={<LoadingSpinner />}>
            <AdminConsole onBack={() => nav.navigate('dashboard')} currentUserEmail={userEmail} SUPABASE_API={SUPABASE_API} logActivity={SUPABASE_API.logActivity} getSupabase={getSupabase} Logger={Logger} APP_CONFIG={APP_CONFIG} TEAMS={TEAMS} SEED_PROFILES={SEED_USERS} isAdmin={isAdmin} LoadingSpinner={LoadingSpinner} />
          </Suspense>
          </ErrorBoundary>
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
          <ErrorBoundary key="manager-hub" message="The manager hub encountered an error.">
          <Suspense fallback={<LoadingSpinner />}>
            <ManagerHub
              managers={MANAGERS} teams={TEAMS} entries={items.entries} currentUser={currentUser} userEmail={userEmail}
              openStatsModal={modals.openStatsModal} onOpen={nav.openEntry} onUpdateStatus={items.updateStatus}
              openSubtaskModal={modals.openSubtaskModal} onOpenPdfExport={modals.openPdfExport}
              managerHubTab={managerHubTab} setManagerHubTab={setManagerHubTab}
              reportPeriodType={reportPeriodType} setReportPeriodType={setReportPeriodType}
              reportStartDate={reportStartDate} setReportStartDate={setReportStartDate}
              reportEndDate={reportEndDate} setReportEndDate={setReportEndDate}
              reportSections={reportSections} setReportSections={setReportSections}
              projectsDisplayMode={projectsDisplayMode} setProjectsDisplayMode={setProjectsDisplayMode}
              reportNarratives={reportNarratives} setReportNarratives={setReportNarratives}
              workstreams={ws.workstreams} workstreamTasks={ws.workstreamTasks}
              onNavigateToWorkstream={(id) => nav.openWorkstreamDetail(id)}
              TEAMS={TEAMS} isAdmin={isAdmin} Badge={Badge} APP_CONFIG={APP_CONFIG}
            />
          </Suspense>
          </ErrorBoundary>
        );

      case 'whiteboards':
        return (
          <ErrorBoundary key="whiteboards" message="The whiteboards view encountered an error.">
          <WhiteboardsView whiteboards={wb.whiteboards} setWhiteboards={wb.setWhiteboards} onOpenWhiteboard={(id) => nav.openWhiteboard(id)} userEmail={userEmail} currentUser={currentUser} WHITEBOARD_API={SUPABASE_API} />
          </ErrorBoundary>
        );

      case 'mindmap-editor': {
        const currentMindmap = mm.mindmaps.find(m => m.id === nav.selectedMindmapId);
        return (
          <ErrorBoundary key={`mindmap-${nav.selectedMindmapId}`} message="The mindmap encountered an error.">
            <Suspense fallback={<LoadingSpinner />}>
              <MindmapEditor mindmapId={nav.selectedMindmapId} mindmap={currentMindmap} onBack={nav.goBack} mindmapApi={mm.mindmapApi} userEmail={userEmail} />
            </Suspense>
          </ErrorBoundary>
        );
      }

      case 'whiteboard-canvas': {
        const currentWhiteboard = wb.whiteboards.find(w => w.id === nav.selectedWhiteboardId);
        if (!currentWhiteboard) {
          return (
            <div className="text-center py-12">
              <Icon name="alert-circle" className="w-16 h-16 text-graystone-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-ocean-900 mb-2">Whiteboard Not Found</h2>
              <Button onClick={nav.goBack}>Back to Whiteboards</Button>
            </div>
          );
        }
        return (
          <ErrorBoundary key={`whiteboard-${nav.selectedWhiteboardId}`} message="The whiteboard encountered an error.">
          <Suspense fallback={<LoadingSpinner />}>
            <WhiteboardCanvas whiteboardId={nav.selectedWhiteboardId} whiteboard={currentWhiteboard} onBack={nav.goBack} userEmail={userEmail} currentUser={currentUser} WHITEBOARD_API={SUPABASE_API} supabase={supabase} Logger={Logger} STICKY_COLORS={STICKY_COLORS} StickyNote={StickyNote} WhiteboardElement={WhiteboardElement} TextBoxElement={TextBoxElement} ImageElement={ImageElement} ShapeElement={ShapeElement} />
          </Suspense>
          </ErrorBoundary>
        );
      }

      case 'braindump-inbox':
        return (
          <ErrorBoundary key="braindump-inbox" message="The Brain Dump Inbox encountered an error.">
          <BrainDumpInbox workstreams={ws.workstreams} currentUser={currentUser} userEmail={userEmail} />
          </ErrorBoundary>
        );

      case 'workstreams':
        return (
          <ErrorBoundary key="workstreams" message="The workstreams view encountered an error.">
          <WorkstreamList workstreams={ws.workstreams} workstreamTasks={ws.workstreamTasks} currentUser={currentUser} userEmail={userEmail} onOpenWorkstream={(id) => nav.openWorkstreamDetail(id)} onCreateWorkstream={handleCreateWorkstream} />
          </ErrorBoundary>
        );

      case 'website':
        return (
          <ErrorBoundary key="website" message="The website project view encountered an error.">
            <Suspense fallback={<LoadingSpinner />}>
              <WebsiteRoute
                mindmaps={mm.mindmaps}
                setMindmaps={mm.setMindmaps}
                mindmapApi={mm.mindmapApi}
                onOpenMindmap={nav.openMindmap}
              />
            </Suspense>
          </ErrorBoundary>
        );

      case 'workstream-detail': {
        const viewWorkstream = ws.workstreams.find(w => w.id === nav.selectedWorkstreamId);
        if (!viewWorkstream) {
          return (
            <div className="text-center py-12">
              <Icon name="alert-circle" className="w-16 h-16 text-graystone-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-ocean-900 mb-2">Workstream Not Found</h2>
              <Button onClick={nav.goBack}>Back to Workstreams</Button>
            </div>
          );
        }
        return (
          <ErrorBoundary key={`workstream-${nav.selectedWorkstreamId}`} message="This workstream encountered an error.">
          <WorkstreamView workstream={viewWorkstream} workstreamTasks={ws.workstreamTasks.filter(t => t.workstream_id === nav.selectedWorkstreamId)} onBack={nav.goBack} onOpenTask={(taskId) => nav.openWorkstreamTask(nav.selectedWorkstreamId, taskId)} onCreateTask={ws.createWorkstreamTask} onUpdateTask={ws.updateWorkstreamTask} onUpdateWorkstream={ws.updateWorkstream} onDeleteWorkstream={handleDeleteWorkstream} WorkstreamSettings={WorkstreamSettings} userEmail={userEmail} currentUser={currentUser} USERS={USERS} />
          </ErrorBoundary>
        );
      }

      case 'productivity-tools':
        return (
          <ErrorBoundary key="productivity-tools" message="The productivity tools encountered an error.">
          <ProductivityToolsView userEmail={userEmail} habits={habits} setHabits={setHabits} matrixTasks={matrixTasks} setMatrixTasks={setMatrixTasks} Logger={Logger} PRODUCTIVITY_API={SUPABASE_API} />
          </ErrorBoundary>
        );

      case 'pages':
        return (
          <ErrorBoundary key="pages" message="The Pages feature encountered an error.">
            <Suspense fallback={<LoadingSpinner />}>
              <PagesView
                pagesRole={getPagesRole(userEmail)}
                userId={authUser?.id}
                userEmail={userEmail}
                currentUser={currentUser}
                onOpenRequest={(id) => nav.openRequest(id)}
              />
            </Suspense>
          </ErrorBoundary>
        );

      case 'pages-request': {
        const reqId = nav.selectedRequestId;
        return (
          <ErrorBoundary key="pages-request" message="The request dashboard encountered an error.">
            <Suspense fallback={<LoadingSpinner />}>
              <RequestDashboard
                requestId={reqId}
                pagesRole={getPagesRole(userEmail)}
                userId={authUser?.id}
                userEmail={userEmail}
                currentUser={currentUser}
                onBack={() => nav.navigate('pages')}
              />
            </Suspense>
          </ErrorBoundary>
        );
      }

      case 'workstream-task-detail': {
        const selectedWorkstream = ws.workstreams.find(w => w.id === nav.selectedWorkstreamId);
        const selectedTask = ws.workstreamTasks.find(
          (t) => t.id === nav.selectedWorkstreamTaskId && t.workstream_id === nav.selectedWorkstreamId
        );
        if (!selectedWorkstream || !selectedTask) {
          return (
            <div className="text-center py-12">
              <Icon name="alert-circle" className="w-16 h-16 text-graystone-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-ocean-900 mb-2">Task Not Found</h2>
              <Button onClick={nav.goBack}>Back to Workstreams</Button>
            </div>
          );
        }
        return (
          <ErrorBoundary key={`ws-task-${nav.selectedWorkstreamTaskId}`} message="This task encountered an error.">
          <WorkstreamTaskDetail key={`ws-task-${selectedTask.id}-${selectedTask.updated_at || 'draft'}`} task={selectedTask} workstream={selectedWorkstream} currentUser={currentUser} entries={items.entries} onBack={nav.goBack} onUpdate={(taskId, _wsId, updates) => ws.updateWorkstreamTask(taskId, updates)} onDelete={async (taskId) => { return await ws.deleteWorkstreamTask(taskId); }} onConvert={(item, type) => modals.openConvertModal(item, type)} USERS={USERS} USERS_WITH_EMAILS={SEED_USERS} />
          </ErrorBoundary>
        );
      }

      default:
        return (
          <div className="text-center py-12">
            <Icon name="file-question" className="w-16 h-16 text-graystone-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-ocean-900 mb-2">View Not Found</h2>
            <Button onClick={() => nav.navigate('dashboard')}>Go to Dashboard</Button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-graystone-200 px-4 py-3 flex items-center justify-between">
        <button onClick={() => nav.setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-ocean-50 text-ocean-700" aria-label="Open menu">
          <Icon name="menu" className="w-6 h-6" />
        </button>
        <h1 className="font-heading text-lg text-ocean-900">Momentum Hub</h1>
        <button onClick={() => modals.setShowNotificationsPanel(true)} className="relative p-2 rounded-lg hover:bg-ocean-50 text-ocean-700" aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}>
          <Icon name="bell" className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </header>

      {/* Sidebar */}
      <Sidebar currentView={nav.currentView} onNavigate={nav.navigate} onSignOut={handleSignOut} currentUser={currentUser} userEmail={userEmail} isAdmin={isAdmin} isManager={isManager} isOpen={nav.sidebarOpen} onClose={() => nav.setSidebarOpen(false)} darkMode={darkMode} setDarkMode={toggleDarkMode} config={APP_CONFIG} onAddNewItem={() => modals.setShowAddItemTypeModal(true)} />

      {/* Main content */}
      <main className={clsx(
        'pt-16 lg:pt-0 lg:ml-64 min-h-screen overflow-auto',
        nav.currentView === 'pages-request' ? 'p-0' : 'p-6 lg:p-8'
      )}>
        <div className={clsx(nav.currentView !== 'pages-request' && 'max-w-7xl mx-auto')}>
          <ErrorBoundary message="This view encountered an error. Please try again or navigate to a different section.">
            {renderView()}
          </ErrorBoundary>
        </div>
      </main>

      {/* Modals */}
      {modals.showKeyboardHelp && <KeyboardShortcutsHelp onClose={() => modals.setShowKeyboardHelp(false)} />}

      {modals.showGlobalSearch && (
        <GlobalSearchModal
          show={modals.showGlobalSearch}
          entries={items.entries}
          whiteboards={wb.whiteboards}
          workstreamTasks={ws.workstreamTasks}
          workstreams={ws.workstreams}
          events={ev.events}
          todos={todosHook.todos}
          onClose={() => modals.setShowGlobalSearch(false)}
          onSelectItem={(item) => { modals.setShowGlobalSearch(false); nav.openEntry(item.id); }}
          onSelectWhiteboard={(whiteboard) => { modals.setShowGlobalSearch(false); nav.openWhiteboard(whiteboard.id); }}
          onSelectWorkstreamTask={(task) => { modals.setShowGlobalSearch(false); nav.openWorkstreamTask(task.workstream_id, task.id); }}
          onSelectEvent={() => { modals.setShowGlobalSearch(false); nav.navigate('events-calendar'); }}
          onSelectTodo={() => { modals.setShowGlobalSearch(false); nav.navigate('todo'); }}
        />
      )}

      {modals.showQuickAdd && (
        <QuickAddModal onClose={() => modals.setShowQuickAdd(false)} onSubmit={(item) => { handleAddItem(item); modals.setShowQuickAdd(false); }} users={USERS} teams={TEAMS} currentUser={currentUser} />
      )}

      {modals.showNotificationsPanel && (
        <NotificationsPanel notifications={notifications} onClose={() => modals.setShowNotificationsPanel(false)} onNotificationClick={(n) => { markAsRead(n.id); if (n.entryId) nav.openEntry(n.entryId); modals.setShowNotificationsPanel(false); }} isOpen={modals.showNotificationsPanel} />
      )}

      {modals.showAddJobModal && (
        <AddJobModal onClose={() => modals.setShowAddJobModal(false)} onSubmit={async (jobData) => { await handleAddItem({ ...jobData, itemType: 'job' }); modals.setShowAddJobModal(false); }} users={USERS} currentUser={currentUser} />
      )}

      {modals.showAddItemModal && (
        <AddItemTypeModal show={modals.showAddItemModal} onClose={() => modals.setShowAddItemModal(false)} onCreateProject={handleAddItem} onCreateJob={handleAddItem} onCreateWorkstream={handleCreateWorkstream} currentUser={currentUser} userEmail={userEmail} users={USERS} teams={TEAMS} initialStep="project" />
      )}

      {modals.showJobDetailModal && modals.selectedJobId && (
        <JobDetailModal job={items.entries.find(e => e.id === modals.selectedJobId)} show={modals.showJobDetailModal} onClose={modals.closeJobDetailModal} onUpdate={(updates) => items.updateEntry(modals.selectedJobId, updates)} onDelete={items.deleteEntry} onConvert={(item, type) => { modals.closeJobDetailModal(); modals.openConvertModal(item, type); }} userProfiles={Object.values(userProfilesCache)} teams={TEAMS} userEmail={userEmail} currentUser={currentUser} />
      )}

      {modals.showAddItemTypeModal && (
        <AddItemTypeModal show={modals.showAddItemTypeModal} onClose={() => modals.setShowAddItemTypeModal(false)} onCreateProject={handleAddItem} onCreateJob={handleAddItem} onCreateWorkstream={handleCreateWorkstream} currentUser={currentUser} userEmail={userEmail} users={USERS} teams={TEAMS} />
      )}

      {modals.showSubtaskModal && modals.subtaskModalEntryId && (
        <AddSubtaskModal entryId={modals.subtaskModalEntryId} entries={items.entries} users={USERS} currentUser={currentUser} onAdd={handleAddSubtask} onClose={modals.closeSubtaskModal} />
      )}

      {modals.showConvertModal && modals.convertSourceItem && (
        <ConvertItemModal show={modals.showConvertModal} onClose={modals.closeConvertModal} sourceItem={modals.convertSourceItem} sourceType={modals.convertSourceType} workstreams={ws.workstreams} teams={TEAMS} userProfiles={Object.values(userProfilesCache)} currentUser={currentUser} userEmail={userEmail} onConvertToTask={handleConvertToTask} onConvertToProject={handleConvertToProject} onConvertToWorkstream={handleConvertToWorkstream} />
      )}
    </div>
  );
}
