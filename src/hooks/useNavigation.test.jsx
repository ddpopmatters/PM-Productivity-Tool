import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useNavigation } from './useNavigation';

function renderNav(initialPath = '/') {
  return renderHook(() => useNavigation(), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
    ),
  });
}

describe('useNavigation', () => {
  describe('route parsing', () => {
    it('/ maps to dashboard', () => {
      const { result } = renderNav('/');
      expect(result.current.currentView).toBe('dashboard');
    });

    it('/personal maps to personal', () => {
      const { result } = renderNav('/personal');
      expect(result.current.currentView).toBe('personal');
    });

    it('/items/:id maps to item-dashboard with selectedItemId', () => {
      const { result } = renderNav('/items/abc-123');
      expect(result.current.currentView).toBe('item-dashboard');
      expect(result.current.selectedItemId).toBe('abc-123');
    });

    it('/workstreams/:id maps to workstream-detail', () => {
      const { result } = renderNav('/workstreams/ws-1');
      expect(result.current.currentView).toBe('workstream-detail');
      expect(result.current.selectedWorkstreamId).toBe('ws-1');
    });

    it('/workstreams/:id/tasks/:taskId maps to workstream-task-detail', () => {
      const { result } = renderNav('/workstreams/ws-1/tasks/task-2');
      expect(result.current.currentView).toBe('workstream-task-detail');
      expect(result.current.selectedWorkstreamId).toBe('ws-1');
      expect(result.current.selectedWorkstreamTaskId).toBe('task-2');
    });

    it('/whiteboards/:id maps to whiteboard-canvas', () => {
      const { result } = renderNav('/whiteboards/wb-5');
      expect(result.current.currentView).toBe('whiteboard-canvas');
      expect(result.current.selectedWhiteboardId).toBe('wb-5');
    });

    it('unknown routes fallback to dashboard', () => {
      const { result } = renderNav('/nonexistent/path');
      expect(result.current.currentView).toBe('dashboard');
    });

    it('selectedItemId is null when not on item-dashboard', () => {
      const { result } = renderNav('/jobs');
      expect(result.current.currentView).toBe('jobs');
      expect(result.current.selectedItemId).toBe(null);
    });
  });

  describe('navigation actions', () => {
    it('navigate() changes current view', () => {
      const { result } = renderNav('/');
      act(() => result.current.navigate('jobs'));
      expect(result.current.currentView).toBe('jobs');
    });

    it('openEntry navigates to item-dashboard', () => {
      const { result } = renderNav('/');
      act(() => result.current.openEntry('item-99'));
      expect(result.current.currentView).toBe('item-dashboard');
      expect(result.current.selectedItemId).toBe('item-99');
    });

    it('openWorkstreamTask navigates to workstream-task-detail', () => {
      const { result } = renderNav('/');
      act(() => result.current.openWorkstreamTask('ws-1', 'task-3'));
      expect(result.current.currentView).toBe('workstream-task-detail');
      expect(result.current.selectedWorkstreamId).toBe('ws-1');
      expect(result.current.selectedWorkstreamTaskId).toBe('task-3');
    });

    it('openWhiteboard navigates to whiteboard-canvas', () => {
      const { result } = renderNav('/');
      act(() => result.current.openWhiteboard('wb-7'));
      expect(result.current.currentView).toBe('whiteboard-canvas');
      expect(result.current.selectedWhiteboardId).toBe('wb-7');
    });
  });

  describe('local state', () => {
    it('viewMode defaults to table', () => {
      const { result } = renderNav('/');
      expect(result.current.viewMode).toBe('table');
    });

    it('sidebarOpen defaults to false and toggles', () => {
      const { result } = renderNav('/');
      expect(result.current.sidebarOpen).toBe(false);
      act(() => result.current.setSidebarOpen(true));
      expect(result.current.sidebarOpen).toBe(true);
    });

    it('navigate() closes sidebar', () => {
      const { result } = renderNav('/');
      act(() => result.current.setSidebarOpen(true));
      act(() => result.current.navigate('todo'));
      expect(result.current.sidebarOpen).toBe(false);
    });
  });
});
