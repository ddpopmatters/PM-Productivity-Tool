import { useState, useCallback } from 'react';
import * as service from '../services/workflowItems';

export function useWorkflowItems() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const items = await service.fetchWorkflowItems();
    setEntries(items.map(service.transformEntry));
    setLoading(false);
  }, []);

  const addItem = useCallback(async (newItem, currentUser, userEmail) => {
    const saved = await service.saveItem({
      ...newItem,
      owner: [currentUser],
      ownerEmail: [userEmail],
    }, userEmail);
    if (saved) {
      setEntries(prev => [service.transformEntry(saved), ...prev]);
    }
    return saved;
  }, []);

  const updateEntry = useCallback(async (entryId, updates) => {
    const finalUpdates = { ...updates };
    if (updates.workflowStatus === 'Complete' || updates.workflowStatus === 'done') {
      finalUpdates.archived = true;
    }
    const result = await service.updateItem(entryId, finalUpdates);
    if (result) {
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, ...finalUpdates } : e));
    }
    return result;
  }, []);

  const updateStatus = useCallback(async (id, newStatus) => {
    return updateEntry(id, { workflowStatus: newStatus });
  }, [updateEntry]);

  const deleteEntry = useCallback(async (id) => {
    const result = await service.deleteItem(id);
    if (result) {
      setEntries(prev => prev.filter(e => e.id !== id));
    }
    return result;
  }, []);

  const toggleSubtask = useCallback(async (entryId, subtaskId) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;
    const updatedSubtasks = entry.subtasks.map(st =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st,
    );
    await updateEntry(entryId, { subtasks: updatedSubtasks });
  }, [entries, updateEntry]);

  const deleteSubtask = useCallback(async (entryId, subtaskId) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;
    const updatedSubtasks = entry.subtasks.filter(st => st.id !== subtaskId);
    await updateEntry(entryId, { subtasks: updatedSubtasks });
  }, [entries, updateEntry]);

  const editSubtask = useCallback(async (entryId, subtaskId, updates) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;
    const updatedSubtasks = entry.subtasks.map(st =>
      st.id === subtaskId ? { ...st, ...updates } : st,
    );
    await updateEntry(entryId, { subtasks: updatedSubtasks });
  }, [entries, updateEntry]);

  const addSubtask = useCallback(async (entryId, title, assignedTo, currentUser) => {
    if (!entryId || !title.trim()) return;
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;
    const newSubtask = {
      id: crypto.randomUUID(),
      title: title.trim(),
      assignedTo: assignedTo || currentUser,
      completed: false,
    };
    const updatedSubtasks = [...(entry.subtasks || []), newSubtask];
    await updateEntry(entryId, { subtasks: updatedSubtasks });
  }, [entries, updateEntry]);

  // Archive an entry (used by convert operations)
  const archiveEntry = useCallback((id) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, archived: true } : e));
  }, []);

  return {
    entries,
    setEntries,
    loading,
    loadEntries,
    addItem,
    updateEntry,
    updateStatus,
    deleteEntry,
    toggleSubtask,
    deleteSubtask,
    editSubtask,
    addSubtask,
    archiveEntry,
    transformEntry: service.transformEntry,
  };
}
