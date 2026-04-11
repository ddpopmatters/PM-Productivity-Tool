import { useState, useCallback } from 'react';
import * as service from '../services/workstreams';

export function useWorkstreams() {
  const [workstreams, setWorkstreams] = useState([]);
  const [workstreamTasks, setWorkstreamTasks] = useState([]);

  const loadWorkstreams = useCallback(async (email) => {
    const data = await service.fetchWorkstreams(email);
    setWorkstreams(data);
    return data;
  }, []);

  const loadWorkstreamTasks = useCallback(async (workstreamListOrIds = []) => {
    const workstreamIds = workstreamListOrIds.map
      ? workstreamListOrIds.map((workstream) => typeof workstream === 'string' ? workstream : workstream.id).filter(Boolean)
      : [];
    const data = await service.fetchWorkstreamTasks(workstreamIds);
    setWorkstreamTasks(data);
    return data;
  }, []);

  const handleCreateWorkstream = useCallback(async (workstreamData, userEmail) => {
    const data = await service.createWorkstream(workstreamData, userEmail);
    if (data) {
      setWorkstreams(prev => [data, ...prev]);
    }
    return data;
  }, []);

  const handleUpdateWorkstream = useCallback(async (id, updates) => {
    const updated = await service.updateWorkstream(id, updates);
    if (updated) {
      setWorkstreams(prev => prev.map(w => w.id === id ? updated : w));
    }
    return updated;
  }, []);

  const handleDeleteWorkstream = useCallback(async (id) => {
    const success = await service.deleteWorkstream(id);
    if (success) {
      setWorkstreams(prev => prev.filter(w => w.id !== id));
      setWorkstreamTasks(prev => prev.filter(t => t.workstream_id !== id));
    }
    return success;
  }, []);

  const handleCreateWorkstreamTask = useCallback(async (taskData) => {
    const data = await service.createWorkstreamTask(taskData);
    if (data) {
      setWorkstreamTasks(prev => [data, ...prev]);
    }
    return data;
  }, []);

  const handleUpdateWorkstreamTask = useCallback(async (taskId, workstreamIdOrUpdates, maybeUpdates) => {
    const updates = maybeUpdates !== undefined ? maybeUpdates : workstreamIdOrUpdates;
    const updated = await service.updateWorkstreamTask(taskId, updates);
    if (updated) {
      setWorkstreamTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updated } : t));
    }
    return updated;
  }, []);

  const handleDeleteWorkstreamTask = useCallback(async (taskId) => {
    const result = await service.deleteWorkstreamTask(taskId);
    if (result) {
      setWorkstreamTasks(prev => prev.filter(t => t.id !== taskId));
    }
    return result;
  }, []);

  // Remove a task from local state (used by convert operations)
  const removeWorkstreamTask = useCallback((taskId) => {
    setWorkstreamTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  return {
    workstreams,
    workstreamTasks,
    setWorkstreamTasks,
    loadWorkstreams,
    loadWorkstreamTasks,
    createWorkstream: handleCreateWorkstream,
    updateWorkstream: handleUpdateWorkstream,
    deleteWorkstream: handleDeleteWorkstream,
    createWorkstreamTask: handleCreateWorkstreamTask,
    updateWorkstreamTask: handleUpdateWorkstreamTask,
    deleteWorkstreamTask: handleDeleteWorkstreamTask,
    removeWorkstreamTask,
  };
}
