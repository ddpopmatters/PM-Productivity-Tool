import { renderHook, act } from '@testing-library/react';
import { useModals } from './useModals';

describe('useModals', () => {
  it('starts with all modals closed', () => {
    const { result } = renderHook(() => useModals());
    expect(result.current.showNotificationsPanel).toBe(false);
    expect(result.current.showKeyboardHelp).toBe(false);
    expect(result.current.showGlobalSearch).toBe(false);
    expect(result.current.showQuickAdd).toBe(false);
    expect(result.current.showAddItemModal).toBe(false);
    expect(result.current.showSubtaskModal).toBe(false);
    expect(result.current.showConvertModal).toBe(false);
    expect(result.current.showPdfExportModal).toBe(false);
  });

  it('openSubtaskModal sets entryId and shows modal', () => {
    const { result } = renderHook(() => useModals());
    act(() => result.current.openSubtaskModal('entry-1'));
    expect(result.current.showSubtaskModal).toBe(true);
    expect(result.current.subtaskModalEntryId).toBe('entry-1');
  });

  it('closeSubtaskModal clears entryId and hides modal', () => {
    const { result } = renderHook(() => useModals());
    act(() => result.current.openSubtaskModal('entry-1'));
    act(() => result.current.closeSubtaskModal());
    expect(result.current.showSubtaskModal).toBe(false);
    expect(result.current.subtaskModalEntryId).toBe(null);
  });

  it('openStatsModal sets title and items', () => {
    const { result } = renderHook(() => useModals());
    const items = [{ id: 1 }, { id: 2 }];
    act(() => result.current.openStatsModal('Test Stats', items));
    expect(result.current.showStatsModal).toBe(true);
    expect(result.current.statsModalData).toEqual({ title: 'Test Stats', items });
  });

  it('openPdfExport sets context and shows modal', () => {
    const { result } = renderHook(() => useModals());
    act(() => result.current.openPdfExport('manager'));
    expect(result.current.showPdfExportModal).toBe(true);
    expect(result.current.pdfExportContext).toBe('manager');
  });

  it('openConvertModal sets item and source type', () => {
    const { result } = renderHook(() => useModals());
    const item = { id: 'item-1', title: 'Test' };
    act(() => result.current.openConvertModal(item, 'project'));
    expect(result.current.showConvertModal).toBe(true);
    expect(result.current.convertSourceItem).toBe(item);
    expect(result.current.convertSourceType).toBe('project');
  });

  it('closeConvertModal clears all convert state', () => {
    const { result } = renderHook(() => useModals());
    act(() => result.current.openConvertModal({ id: '1' }, 'project'));
    act(() => result.current.closeConvertModal());
    expect(result.current.showConvertModal).toBe(false);
    expect(result.current.convertSourceItem).toBe(null);
    expect(result.current.convertSourceType).toBe(null);
  });

  it('closeJobDetailModal clears job state', () => {
    const { result } = renderHook(() => useModals());
    act(() => {
      result.current.setShowJobDetailModal(true);
      result.current.setSelectedJobId('job-1');
    });
    act(() => result.current.closeJobDetailModal());
    expect(result.current.showJobDetailModal).toBe(false);
    expect(result.current.selectedJobId).toBe(null);
  });

  it('closeAllOverlays closes keyboard help, notifications, quick add, global search', () => {
    const { result } = renderHook(() => useModals());
    act(() => {
      result.current.setShowKeyboardHelp(true);
      result.current.setShowNotificationsPanel(true);
      result.current.setShowQuickAdd(true);
      result.current.setShowGlobalSearch(true);
    });
    act(() => result.current.closeAllOverlays());
    expect(result.current.showKeyboardHelp).toBe(false);
    expect(result.current.showNotificationsPanel).toBe(false);
    expect(result.current.showQuickAdd).toBe(false);
    expect(result.current.showGlobalSearch).toBe(false);
  });

  it('closeAllOverlays does not affect non-overlay modals', () => {
    const { result } = renderHook(() => useModals());
    act(() => {
      result.current.setShowAddItemModal(true);
      result.current.setShowKeyboardHelp(true);
    });
    act(() => result.current.closeAllOverlays());
    expect(result.current.showAddItemModal).toBe(true);
  });

  it('dropdown setters toggle independently', () => {
    const { result } = renderHook(() => useModals());
    act(() => result.current.setShowFiltersDropdown(true));
    expect(result.current.showFiltersDropdown).toBe(true);
    expect(result.current.showTagsDropdown).toBe(false);
    expect(result.current.showViewDropdown).toBe(false);
  });

  it('openSubtaskModal returns a stable reference', () => {
    const { result, rerender } = renderHook(() => useModals());
    const first = result.current.openSubtaskModal;
    rerender();
    expect(result.current.openSubtaskModal).toBe(first);
  });

  it('pdfExportContext defaults to dashboard', () => {
    const { result } = renderHook(() => useModals());
    expect(result.current.pdfExportContext).toBe('dashboard');
  });
});
