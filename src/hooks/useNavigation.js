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
  'website': '/website',
  'productivity-tools': '/productivity',
  'braindump-inbox': '/braindump',
  'pages': '/pages',
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
  if (parts[0] === 'mindmaps' && parts[1]) {
    return { view: 'mindmap-editor', params: { mindmapId: parts[1] } };
  }
  if (parts[0] === 'pages' && parts[1] === 'requests' && parts[2]) {
    return { view: 'pages-request', params: { requestId: parts[2] } };
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
    case 'mindmap-editor':
      return `/mindmaps/${params.mindmapId || params.id}`;
    case 'pages-request':
      return `/pages/requests/${params.requestId || params.id}`;
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
  const selectedMindmapId = currentView === 'mindmap-editor' ? params.mindmapId : null;
  const selectedRequestId = currentView === 'pages-request' ? params.requestId : null;

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

  const openMindmap = useCallback((mindmapId) => {
    routerNavigate(buildPath('mindmap-editor', { mindmapId }));
  }, [routerNavigate]);

  const openRequest = useCallback((id) => {
    routerNavigate(buildPath('pages-request', { requestId: id }));
  }, [routerNavigate]);

  return {
    currentView,
    viewMode, setViewMode,
    selectedItemId,
    sidebarOpen, setSidebarOpen,
    selectedWorkstreamId,
    selectedWorkstreamTaskId,
    selectedWhiteboardId,
    selectedMindmapId,
    selectedRequestId,
    navigate,
    goBack,
    openEntry,
    openWorkstreamTask,
    openWorkstreamDetail,
    openWhiteboard,
    openMindmap,
    openRequest,
  };
}
