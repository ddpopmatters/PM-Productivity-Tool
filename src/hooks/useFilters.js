import { useState, useMemo, useCallback } from 'react';

const SAVED_FILTERS_KEY = 'momentum-saved-filters';

function loadSavedFilters() {
  try {
    const raw = localStorage.getItem(SAVED_FILTERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistSavedFilters(filters) {
  try {
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(filters));
  } catch { /* quota exceeded — silently ignore */ }
}

export function useFilters(entries) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState([]);
  const [ownerFilter, setOwnerFilter] = useState([]);
  const [teamFilter, setTeamFilter] = useState([]);
  const [tagFilter, setTagFilter] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [savedFilters, setSavedFilters] = useState(loadSavedFilters);

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

  const toggleFilter = (item, currentList, setList) => {
    if (currentList.includes(item)) {
      setList(currentList.filter(i => i !== item));
    } else {
      setList([...currentList, item]);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter([]);
    setOwnerFilter([]);
    setTeamFilter([]);
    setTagFilter([]);
    setShowArchived(false);
  };

  const saveCurrentFilter = useCallback((name) => {
    const filter = {
      id: Date.now(),
      name,
      searchQuery,
      statusFilter,
      ownerFilter,
      teamFilter,
      tagFilter,
      showArchived,
    };
    const updated = [...savedFilters, filter];
    setSavedFilters(updated);
    persistSavedFilters(updated);
    return filter;
  }, [searchQuery, statusFilter, ownerFilter, teamFilter, tagFilter, showArchived, savedFilters]);

  const applySavedFilter = useCallback((filter) => {
    setSearchQuery(filter.searchQuery || '');
    setStatusFilter(filter.statusFilter || []);
    setOwnerFilter(filter.ownerFilter || []);
    setTeamFilter(filter.teamFilter || []);
    setTagFilter(filter.tagFilter || []);
    setShowArchived(filter.showArchived || false);
  }, []);

  const deleteSavedFilter = useCallback((filterId) => {
    const updated = savedFilters.filter(f => f.id !== filterId);
    setSavedFilters(updated);
    persistSavedFilters(updated);
  }, [savedFilters]);

  return {
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    ownerFilter, setOwnerFilter,
    teamFilter, setTeamFilter,
    tagFilter, setTagFilter,
    showArchived, setShowArchived,
    filteredEntries,
    toggleFilter,
    clearFilters,
    savedFilters,
    saveCurrentFilter,
    applySavedFilter,
    deleteSavedFilter,
  };
}
