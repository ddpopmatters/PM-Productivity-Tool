import { renderHook, act, waitFor } from '@testing-library/react';
import { useWorkflowItems } from './useWorkflowItems';
import * as service from '../services/workflowItems';

vi.mock('../services/workflowItems', () => ({
  fetchWorkflowItems: vi.fn(),
  transformEntry: vi.fn((item) => ({ ...item, _transformed: true })),
  saveItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
}));

const mockItem = (overrides = {}) => ({
  id: 'item-1',
  title: 'Test Item',
  workflowStatus: 'Todo',
  subtasks: [],
  archived: false,
  ...overrides,
});

describe('useWorkflowItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with empty entries and loading true', () => {
    const { result } = renderHook(() => useWorkflowItems());
    expect(result.current.entries).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it('loadEntries fetches and transforms items', async () => {
    const raw = [mockItem(), mockItem({ id: 'item-2', title: 'Second' })];
    service.fetchWorkflowItems.mockResolvedValue(raw);

    const { result } = renderHook(() => useWorkflowItems());
    await act(async () => { await result.current.loadEntries(); });

    expect(service.fetchWorkflowItems).toHaveBeenCalledOnce();
    expect(result.current.entries).toHaveLength(2);
    expect(result.current.entries[0]._transformed).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it('addItem calls saveItem and prepends to entries', async () => {
    const saved = mockItem({ id: 'new-1', title: 'New Item' });
    service.saveItem.mockResolvedValue(saved);
    service.fetchWorkflowItems.mockResolvedValue([]);

    const { result } = renderHook(() => useWorkflowItems());
    await act(async () => { await result.current.loadEntries(); });
    await act(async () => {
      await result.current.addItem({ title: 'New Item' }, 'Alice', 'alice@pm.org');
    });

    expect(service.saveItem).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New Item', owner: ['Alice'], ownerEmail: ['alice@pm.org'] }),
      'alice@pm.org',
    );
    expect(result.current.entries[0].title).toBe('New Item');
  });

  it('addItem does nothing when saveItem returns falsy', async () => {
    service.saveItem.mockResolvedValue(null);
    service.fetchWorkflowItems.mockResolvedValue([]);

    const { result } = renderHook(() => useWorkflowItems());
    await act(async () => { await result.current.loadEntries(); });
    await act(async () => {
      await result.current.addItem({ title: 'Fail' }, 'Alice', 'alice@pm.org');
    });

    expect(result.current.entries).toHaveLength(0);
  });

  it('updateEntry calls updateItem and updates state', async () => {
    service.fetchWorkflowItems.mockResolvedValue([mockItem()]);
    service.updateItem.mockResolvedValue(true);

    const { result } = renderHook(() => useWorkflowItems());
    await act(async () => { await result.current.loadEntries(); });
    await act(async () => {
      await result.current.updateEntry('item-1', { title: 'Updated' });
    });

    expect(service.updateItem).toHaveBeenCalledWith('item-1', { title: 'Updated' });
    expect(result.current.entries[0].title).toBe('Updated');
  });

  it('updateEntry with Complete status sets archived true', async () => {
    service.fetchWorkflowItems.mockResolvedValue([mockItem()]);
    service.updateItem.mockResolvedValue(true);

    const { result } = renderHook(() => useWorkflowItems());
    await act(async () => { await result.current.loadEntries(); });
    await act(async () => {
      await result.current.updateEntry('item-1', { workflowStatus: 'Complete' });
    });

    expect(service.updateItem).toHaveBeenCalledWith('item-1', { workflowStatus: 'Complete', archived: true });
    expect(result.current.entries[0].archived).toBe(true);
  });

  it('updateStatus delegates to updateEntry', async () => {
    service.fetchWorkflowItems.mockResolvedValue([mockItem()]);
    service.updateItem.mockResolvedValue(true);

    const { result } = renderHook(() => useWorkflowItems());
    await act(async () => { await result.current.loadEntries(); });
    await act(async () => {
      await result.current.updateStatus('item-1', 'In Progress');
    });

    expect(service.updateItem).toHaveBeenCalledWith('item-1', { workflowStatus: 'In Progress' });
  });

  it('deleteEntry removes from state', async () => {
    service.fetchWorkflowItems.mockResolvedValue([mockItem(), mockItem({ id: 'item-2' })]);
    service.deleteItem.mockResolvedValue(true);

    const { result } = renderHook(() => useWorkflowItems());
    await act(async () => { await result.current.loadEntries(); });
    expect(result.current.entries).toHaveLength(2);

    await act(async () => { await result.current.deleteEntry('item-1'); });
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].id).toBe('item-2');
  });

  it('toggleSubtask flips completed on matching subtask', async () => {
    const item = mockItem({
      subtasks: [
        { id: 'st-1', title: 'Sub 1', completed: false },
        { id: 'st-2', title: 'Sub 2', completed: true },
      ],
    });
    service.fetchWorkflowItems.mockResolvedValue([item]);
    service.updateItem.mockResolvedValue(true);

    const { result } = renderHook(() => useWorkflowItems());
    await act(async () => { await result.current.loadEntries(); });
    await act(async () => { await result.current.toggleSubtask('item-1', 'st-1'); });

    expect(service.updateItem).toHaveBeenCalledWith('item-1', {
      subtasks: [
        { id: 'st-1', title: 'Sub 1', completed: true },
        { id: 'st-2', title: 'Sub 2', completed: true },
      ],
    });
  });

  it('deleteSubtask removes subtask from array', async () => {
    const item = mockItem({
      subtasks: [
        { id: 'st-1', title: 'Sub 1', completed: false },
        { id: 'st-2', title: 'Sub 2', completed: false },
      ],
    });
    service.fetchWorkflowItems.mockResolvedValue([item]);
    service.updateItem.mockResolvedValue(true);

    const { result } = renderHook(() => useWorkflowItems());
    await act(async () => { await result.current.loadEntries(); });
    await act(async () => { await result.current.deleteSubtask('item-1', 'st-1'); });

    expect(service.updateItem).toHaveBeenCalledWith('item-1', {
      subtasks: [{ id: 'st-2', title: 'Sub 2', completed: false }],
    });
  });

  it('editSubtask applies updates to matching subtask', async () => {
    const item = mockItem({
      subtasks: [{ id: 'st-1', title: 'Old Title', completed: false }],
    });
    service.fetchWorkflowItems.mockResolvedValue([item]);
    service.updateItem.mockResolvedValue(true);

    const { result } = renderHook(() => useWorkflowItems());
    await act(async () => { await result.current.loadEntries(); });
    await act(async () => {
      await result.current.editSubtask('item-1', 'st-1', { title: 'New Title' });
    });

    expect(service.updateItem).toHaveBeenCalledWith('item-1', {
      subtasks: [{ id: 'st-1', title: 'New Title', completed: false }],
    });
  });

  it('archiveEntry marks entry archived locally without service call', async () => {
    service.fetchWorkflowItems.mockResolvedValue([mockItem()]);

    const { result } = renderHook(() => useWorkflowItems());
    await act(async () => { await result.current.loadEntries(); });

    vi.clearAllMocks(); // clear to verify no service call
    act(() => result.current.archiveEntry('item-1'));

    expect(service.updateItem).not.toHaveBeenCalled();
    expect(result.current.entries[0].archived).toBe(true);
  });
});
