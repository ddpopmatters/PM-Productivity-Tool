import { useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const SIMPLE_ROUTES = {
  'dashboard': '/',
  'personal': '/personal',
  'jobs': '/jobs',
  'todo': '/todo',
  'calendar': '/calendar',
  'events-calendar': '/events',
  'add-item': '/add',
  'admin': '/admin',
  'manager-hub': '/manager',
  'whiteboards': '/whiteboards',
  'workstreams': '/workstreams',
  'productivity-tools': '/productivity',
};

const PATH_TO_VIEW = Object.fromEntries(
  Object.entries(SIMPLE_ROUTES).map(([view, path]) => [path, view])
);

function parseLocation(pathname) {
  if (PATH_TO_VIEW[pathname]) {
    return { view: PATH_TO_VIEW[pathname], params: {} };
  }

  const parts = pathname.split('/').filter(Boolean);

  if (parts[0] === 'items' && parts[1]) {
    return { view: 'item-dashboard', params: { itemId: parts[1] } };
  }
  if (parts[0] === 'workstreams' && parts[1] && parts[2] === 'tasks' && parts[3]) {
    return { view: 'workstream-task-detail', params: { workstreamId: parts[1], taskId: parts[3] } };
  }
  if (parts[0] === 'workstreams' && parts[1]) {
    return { view: 'workstream-detail', params: { workstreamId: parts[1] } };
  }
  if (parts[0] === 'whiteboards' && parts[1]) {
    return { view: 'whiteboard-canvas', params: { whiteboardId: parts[1] } };
  }

  return { view: 'dashboard', params: {} };
}

function buildPath(view, params = {}) {
  switch (view) {
    case 'item-dashboard':
      return `/items/${params.itemId || params.id}`;
    case 'workstream-detail':
      return `/workstreams/${params.workstreamId || params.id}`;
    case 'workstream-task-detail':
      return `/workstreams/${params.workstreamId || params.wsId}/tasks/${params.taskId}`;
    case 'whiteboard-canvas':
      return `/whiteboards/${params.whiteboardId || params.id}`;
    default:
      return SIMPLE_ROUTES[view] || '/';
  }
}

export function useNavigation() {
  const routerNavigate = useNavigate();
  const location = useLocation();

  const { view: currentView, params } = useMemo(
    () => parseLocation(location.pathname),
    [location.pathname]
  );

  const [viewMode, setViewMode] = useState('table');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // IDs derived from URL params
  const selectedItemId = currentView === 'item-dashboard' ? params.itemId : null;
  const selectedWorkstreamId = (currentView === 'workstream-detail' || currentView === 'workstream-task-detail') ? params.workstreamId : null;
  const selectedWorkstreamTaskId = currentView === 'workstream-task-detail' ? params.taskId : null;
  const selectedWhiteboardId = currentView === 'whiteboard-canvas' ? params.whiteboardId : null;

  const navigate = useCallback((view) => {
    routerNavigate(buildPath(view));
    setSidebarOpen(false);
  }, [routerNavigate]);

  const goBack = useCallback(() => {
    routerNavigate(-1);
    setSidebarOpen(false);
  }, [routerNavigate]);

  const openEntry = useCallback((id) => {
    routerNavigate(buildPath('item-dashboard', { itemId: id }));
  }, [routerNavigate]);

  const openWorkstreamTask = useCallback((workstreamId, taskId) => {
    routerNavigate(buildPath('workstream-task-detail', { workstreamId, taskId }));
  }, [routerNavigate]);

  const openWorkstreamDetail = useCallback((workstreamId) => {
    routerNavigate(buildPath('workstream-detail', { workstreamId }));
  }, [routerNavigate]);

  const openWhiteboard = useCallback((whiteboardId) => {
    routerNavigate(buildPath('whiteboard-canvas', { whiteboardId }));
  }, [routerNavigate]);

  return {
    currentView,
    viewMode, setViewMode,
    selectedItemId,
    sidebarOpen, setSidebarOpen,
    selectedWorkstreamId,
    selectedWorkstreamTaskId,
    selectedWhiteboardId,
    navigate,
    goBack,
    openEntry,
    openWorkstreamTask,
    openWorkstreamDetail,
    openWhiteboard,
  };
}
