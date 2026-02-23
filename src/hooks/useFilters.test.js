import { renderHook, act } from '@testing-library/react';
import { useFilters } from './useFilters';

// Mock localStorage since jsdom env may not provide standard Web Storage
const store = {};
const localStorageMock = {
  getItem: vi.fn((key) => store[key] ?? null),
  setItem: vi.fn((key, val) => { store[key] = String(val); }),
  removeItem: vi.fn((key) => { delete store[key]; }),
  clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
};
vi.stubGlobal('localStorage', localStorageMock);

const makeEntries = () => [
  { id: '1', title: 'Alpha Project', caption: 'First project', tags: ['urgent'], workflowStatus: 'In Progress', owner: ['Alice'], team: 'Comms', archived: false },
  { id: '2', title: 'Beta Task', caption: 'Second task', tags: ['review'], workflowStatus: 'Todo', owner: ['Bob'], team: 'Digital', archived: false },
  { id: '3', title: 'Gamma Report', caption: 'Archived report', tags: ['urgent', 'review'], workflowStatus: 'Complete', owner: ['Alice', 'Bob'], team: 'Comms', archived: true },
  { id: '4', title: 'Delta Brief', caption: 'Quick brief', tags: [], workflowStatus: 'In Progress', owner: ['Charlie'], team: 'Policy', archived: false },
];

describe('useFilters', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('starts with empty filters', () => {
    const { result } = renderHook(() => useFilters([]));
    expect(result.current.searchQuery).toBe('');
    expect(result.current.statusFilter).toEqual([]);
    expect(result.current.ownerFilter).toEqual([]);
    expect(result.current.teamFilter).toEqual([]);
    expect(result.current.tagFilter).toEqual([]);
    expect(result.current.showArchived).toBe(false);
  });

  it('returns all non-archived entries by default', () => {
    const entries = makeEntries();
    const { result } = renderHook(() => useFilters(entries));
    expect(result.current.filteredEntries).toHaveLength(3);
    expect(result.current.filteredEntries.map(e => e.id)).toEqual(['1', '2', '4']);
  });

  it('filters by title with searchQuery', () => {
    const { result } = renderHook(() => useFilters(makeEntries()));
    act(() => result.current.setSearchQuery('alpha'));
    expect(result.current.filteredEntries).toHaveLength(1);
    expect(result.current.filteredEntries[0].id).toBe('1');
  });

  it('filters by caption with searchQuery', () => {
    const { result } = renderHook(() => useFilters(makeEntries()));
    act(() => result.current.setSearchQuery('quick brief'));
    expect(result.current.filteredEntries).toHaveLength(1);
    expect(result.current.filteredEntries[0].id).toBe('4');
  });

  it('filters by tags with searchQuery', () => {
    const { result } = renderHook(() => useFilters(makeEntries()));
    act(() => result.current.setSearchQuery('review'));
    expect(result.current.filteredEntries).toHaveLength(1);
    expect(result.current.filteredEntries[0].id).toBe('2');
  });

  it('filters by statusFilter', () => {
    const { result } = renderHook(() => useFilters(makeEntries()));
    act(() => result.current.setStatusFilter(['Todo']));
    expect(result.current.filteredEntries).toHaveLength(1);
    expect(result.current.filteredEntries[0].id).toBe('2');
  });

  it('filters by ownerFilter', () => {
    const { result } = renderHook(() => useFilters(makeEntries()));
    act(() => result.current.setOwnerFilter(['Bob']));
    expect(result.current.filteredEntries).toHaveLength(1);
    expect(result.current.filteredEntries[0].id).toBe('2');
  });

  it('filters by teamFilter', () => {
    const { result } = renderHook(() => useFilters(makeEntries()));
    act(() => result.current.setTeamFilter(['Policy']));
    expect(result.current.filteredEntries).toHaveLength(1);
    expect(result.current.filteredEntries[0].id).toBe('4');
  });

  it('filters by tagFilter', () => {
    const { result } = renderHook(() => useFilters(makeEntries()));
    act(() => result.current.setTagFilter(['urgent']));
    expect(result.current.filteredEntries).toHaveLength(1);
    expect(result.current.filteredEntries[0].id).toBe('1');
  });

  it('showArchived includes archived entries', () => {
    const { result } = renderHook(() => useFilters(makeEntries()));
    act(() => result.current.setShowArchived(true));
    expect(result.current.filteredEntries).toHaveLength(4);
  });

  it('combines multiple filters with AND logic', () => {
    const { result } = renderHook(() => useFilters(makeEntries()));
    act(() => {
      result.current.setTeamFilter(['Comms']);
      result.current.setOwnerFilter(['Alice']);
    });
    expect(result.current.filteredEntries).toHaveLength(1);
    expect(result.current.filteredEntries[0].id).toBe('1');
  });

  it('toggleFilter adds a new item', () => {
    const { result } = renderHook(() => useFilters([]));
    act(() => result.current.toggleFilter('Comms', result.current.teamFilter, result.current.setTeamFilter));
    expect(result.current.teamFilter).toEqual(['Comms']);
  });

  it('toggleFilter removes an existing item', () => {
    const { result } = renderHook(() => useFilters([]));
    act(() => result.current.toggleFilter('Comms', result.current.teamFilter, result.current.setTeamFilter));
    act(() => result.current.toggleFilter('Comms', result.current.teamFilter, result.current.setTeamFilter));
    expect(result.current.teamFilter).toEqual([]);
  });

  it('clearFilters resets all filters', () => {
    const { result } = renderHook(() => useFilters(makeEntries()));
    act(() => {
      result.current.setSearchQuery('test');
      result.current.setStatusFilter(['Todo']);
      result.current.setOwnerFilter(['Bob']);
      result.current.setTeamFilter(['Comms']);
      result.current.setTagFilter(['urgent']);
      result.current.setShowArchived(true);
    });
    act(() => result.current.clearFilters());
    expect(result.current.searchQuery).toBe('');
    expect(result.current.statusFilter).toEqual([]);
    expect(result.current.ownerFilter).toEqual([]);
    expect(result.current.teamFilter).toEqual([]);
    expect(result.current.tagFilter).toEqual([]);
    expect(result.current.showArchived).toBe(false);
  });

  it('saves, applies, and deletes saved filters with localStorage', () => {
    const { result } = renderHook(() => useFilters(makeEntries()));
    // Save a filter
    act(() => {
      result.current.setTeamFilter(['Comms']);
      result.current.setSearchQuery('alpha');
    });
    let savedFilter;
    act(() => { savedFilter = result.current.saveCurrentFilter('My Filter'); });
    expect(result.current.savedFilters).toHaveLength(1);
    expect(result.current.savedFilters[0].name).toBe('My Filter');
    expect(localStorage.getItem('momentum-saved-filters')).toBeTruthy();

    // Clear and apply
    act(() => result.current.clearFilters());
    expect(result.current.teamFilter).toEqual([]);
    act(() => result.current.applySavedFilter(savedFilter));
    expect(result.current.teamFilter).toEqual(['Comms']);
    expect(result.current.searchQuery).toBe('alpha');

    // Delete
    act(() => result.current.deleteSavedFilter(savedFilter.id));
    expect(result.current.savedFilters).toHaveLength(0);
  });
});
