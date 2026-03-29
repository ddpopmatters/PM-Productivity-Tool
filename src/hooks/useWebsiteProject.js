import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext.jsx';
import { isAdmin } from '../utils/auth';
import * as service from '../services/websiteProject';

function replaceItemInTaskGroups(taskGroups, taskId, updater) {
  const nextGroups = {};

  Object.entries(taskGroups).forEach(([phaseId, phaseTasks]) => {
    nextGroups[phaseId] = phaseTasks.map((task) =>
      task.id === taskId ? updater(task) : task
    );
  });

  return nextGroups;
}

export function useWebsiteProject() {
  const { userEmail, currentUser } = useApp();
  const [project, setProject] = useState(null);
  const [phases, setPhases] = useState([]);
  const [tasks, setTasks] = useState({});
  const [pages, setPages] = useState([]);
  const [changeRequests, setChangeRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeChangeRequestFilter, setActiveChangeRequestFilter] = useState('all');

  const loadProject = useCallback(async () => {
    setLoading(true);
    setError(null);

    const nextProject = await service.fetchWebsiteProject();
    if (!nextProject) {
      setProject(null);
      setPhases([]);
      setTasks({});
      setPages([]);
      setChangeRequests([]);
      setLoading(false);
      return null;
    }

    const [nextPhases, nextPages] = await Promise.all([
      service.fetchWebsitePhases(nextProject.id),
      service.fetchWebsitePages(nextProject.id),
    ]);

    setProject(nextProject);
    setPhases(nextPhases);
    setPages(nextPages);
    setTasks({});
    setLoading(false);

    return nextProject;
  }, []);

  const handleCreateProject = useCallback(
    async (data) => {
      const created = await service.createWebsiteProject(data);
      if (created) {
        await loadProject();
      }
      return created;
    },
    [loadProject]
  );

  const handleUpdateProject = useCallback(
    async (id, updates) => {
      const previousProject = project;
      setProject((prev) => (prev && prev.id === id ? { ...prev, ...updates } : prev));

      const updated = await service.updateWebsiteProject(id, updates);
      if (updated) {
        setProject(updated);
        return updated;
      }

      setProject(previousProject);
      return null;
    },
    [project]
  );

  const handleLaunchProject = useCallback(
    async (id) => {
      setError(null);
      const result = await service.launchProject(id);
      if (result?.error) {
        setError(result.error);
        return result;
      }
      if (result) {
        await loadProject();
      }
      return result;
    },
    [loadProject]
  );

  const handleArchiveProject = useCallback(
    async (id) => {
      const archived = await service.archiveProject(id);
      if (archived) {
        await loadProject();
      }
      return archived;
    },
    [loadProject]
  );

  const handleUpdatePhase = useCallback(
    async (id, status) => {
      const updated = await service.updatePhaseStatus(id, status);
      if (updated) {
        setPhases((prev) => prev.map((phase) => (phase.id === id ? updated : phase)));
        if (
          project &&
          project.status === 'planning' &&
          (status === 'in_progress' || status === 'complete')
        ) {
          const updatedProject = await service.updateWebsiteProject(project.id, {
            status: 'in_progress',
          });
          if (updatedProject) {
            setProject(updatedProject);
          }
        }
      }
      return updated;
    },
    [project]
  );

  const handleSubmitPhaseApproval = useCallback(
    async (id) => {
      setError(null);
      const updated = await service.submitPhaseForApproval(id, userEmail);
      if (updated) {
        setPhases((prev) => prev.map((phase) => (phase.id === id ? updated : phase)));
      }
      return updated;
    },
    [userEmail]
  );

  const handleReviewPhaseApproval = useCallback(async (id, status, comment) => {
    const updated = await service.reviewPhaseApproval(id, status, comment);
    if (updated) {
      setPhases((prev) => prev.map((phase) => (phase.id === id ? updated : phase)));
    }
    return updated;
  }, []);

  const loadPhaseTasks = useCallback(async (phaseId) => {
    if (!phaseId) return [];
    const phaseTasks = await service.fetchPhaseTasks(phaseId);
    setTasks((prev) => ({ ...prev, [phaseId]: phaseTasks }));
    return phaseTasks;
  }, []);

  const handleCreateTask = useCallback(
    async (data) => {
      const created = await service.createTask({
        ...data,
        created_by_email: data.created_by_email || userEmail,
      });
      if (created) {
        await loadPhaseTasks(created.phase_id || data.phase_id);
      }
      return created;
    },
    [loadPhaseTasks, userEmail]
  );

  const handleUpdateTask = useCallback(
    async (id, updates) => {
      const previousTasks = tasks;
      setTasks((prev) =>
        replaceItemInTaskGroups(prev, id, (task) => ({ ...task, ...updates }))
      );

      const updated = await service.updateTask(id, updates);
      if (updated) {
        setTasks((prev) =>
          replaceItemInTaskGroups(prev, id, () => updated)
        );
        return updated;
      }

      setTasks(previousTasks);
      return null;
    },
    [tasks]
  );

  const handleDeleteTask = useCallback(async (id, phaseId) => {
    const success = await service.deleteTask(id);
    if (success) {
      setTasks((prev) => ({
        ...prev,
        [phaseId]: (prev[phaseId] || []).filter((task) => task.id !== id),
      }));
    }
    return success;
  }, []);

  const handleCreatePage = useCallback(
    async (data) => {
      const created = await service.createPage({
        ...data,
        created_by_email: data.created_by_email || userEmail,
      });
      if (created && project) {
        const nextPages = await service.fetchWebsitePages(project.id);
        setPages(nextPages);
      }
      return created;
    },
    [project, userEmail]
  );

  const handleUpdatePage = useCallback(
    async (id, updates) => {
      const previousPages = pages;
      setPages((prev) => prev.map((page) => (page.id === id ? { ...page, ...updates } : page)));

      const updated = await service.updatePage(id, updates);
      if (updated) {
        setPages((prev) => prev.map((page) => (page.id === id ? updated : page)));
        return updated;
      }

      setPages(previousPages);
      return null;
    },
    [pages]
  );

  const handleDeletePage = useCallback(
    async (id) => {
      setError(null);
      const result = await service.deletePage(id);
      if (result?.error) {
        setError(result.error);
        return result;
      }
      if (result && project) {
        const nextPages = await service.fetchWebsitePages(project.id);
        setPages(nextPages);
      }
      return result;
    },
    [project]
  );

  const handleMarkPageReviewed = useCallback(async (id, note) => {
    const updated = await service.markPageReviewed(id, note);
    if (updated) {
      setPages((prev) => prev.map((page) => (page.id === id ? updated : page)));
    }
    return updated;
  }, []);

  const loadChangeRequests = useCallback(
    async (statusFilter = 'all') => {
      if (!project) {
        setChangeRequests([]);
        return [];
      }
      setActiveChangeRequestFilter(statusFilter);
      const nextChangeRequests = await service.fetchChangeRequests(project.id, statusFilter);
      setChangeRequests(nextChangeRequests);
      return nextChangeRequests;
    },
    [project]
  );

  const handleCreateChangeRequest = useCallback(
    async (data) => {
      const created = await service.createChangeRequest({
        ...data,
        requested_by_email: data.requested_by_email || userEmail,
        approval_status: data.approval_required ? 'pending' : data.approval_status || null,
      });
      if (created) {
        await loadChangeRequests(activeChangeRequestFilter);
      }
      return created;
    },
    [activeChangeRequestFilter, loadChangeRequests, userEmail]
  );

  const handleUpdateChangeRequest = useCallback(
    async (id, updates) => {
      const previousRequests = changeRequests;
      setChangeRequests((prev) =>
        prev.map((request) => (request.id === id ? { ...request, ...updates } : request))
      );

      const updated = await service.updateChangeRequest(id, updates);
      if (updated) {
        setChangeRequests((prev) =>
          prev.map((request) => (request.id === id ? updated : request))
        );
        return updated;
      }

      setChangeRequests(previousRequests);
      return null;
    },
    [changeRequests]
  );

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  return {
    project,
    phases,
    tasks,
    pages,
    changeRequests,
    loading,
    error,
    userEmail,
    currentUser,
    isAdminUser: isAdmin(userEmail),
    loadProject,
    handleCreateProject,
    handleUpdateProject,
    handleLaunchProject,
    handleArchiveProject,
    handleUpdatePhase,
    handleSubmitPhaseApproval,
    handleReviewPhaseApproval,
    loadPhaseTasks,
    handleCreateTask,
    handleUpdateTask,
    handleDeleteTask,
    handleCreatePage,
    handleUpdatePage,
    handleDeletePage,
    handleMarkPageReviewed,
    loadChangeRequests,
    handleCreateChangeRequest,
    handleUpdateChangeRequest,
  };
}
