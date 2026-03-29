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

function sortTemplatesList(templateRows) {
  return [...templateRows].sort((left, right) => {
    if (left.flagged_for_early_signoff !== right.flagged_for_early_signoff) {
      return left.flagged_for_early_signoff ? -1 : 1;
    }
    return (left.name || '').localeCompare(right.name || '');
  });
}

function sortDecisionsList(decisionRows) {
  const statusOrder = {
    open: 0,
    deferred: 1,
    decided: 2,
  };

  return [...decisionRows].sort((left, right) => {
    const leftRank = statusOrder[left.status] ?? 99;
    const rightRank = statusOrder[right.status] ?? 99;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    if (!left.due_date && !right.due_date) return 0;
    if (!left.due_date) return 1;
    if (!right.due_date) return -1;
    return left.due_date.localeCompare(right.due_date);
  });
}

export function useWebsiteProject() {
  const { userEmail, currentUser } = useApp();
  const [project, setProject] = useState(null);
  const [phases, setPhases] = useState([]);
  const [tasks, setTasks] = useState({});
  const [pages, setPages] = useState([]);
  const [sitemapNodes, setSitemapNodes] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [launchReadiness, setLaunchReadiness] = useState([]);
  const [changeRequests, setChangeRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeChangeRequestFilter, setActiveChangeRequestFilter] = useState('all');

  const loadTemplates = useCallback(
    async (projectIdOverride) => {
      const targetProjectId = projectIdOverride || project?.id;
      if (!targetProjectId) {
        setTemplates([]);
        return [];
      }

      const nextTemplates = await service.fetchWebsiteTemplates(targetProjectId);
      setTemplates(sortTemplatesList(nextTemplates));
      return nextTemplates;
    },
    [project]
  );

  const loadDependencies = useCallback(
    async (projectIdOverride) => {
      const targetProjectId = projectIdOverride || project?.id;
      if (!targetProjectId) {
        setDependencies([]);
        return [];
      }

      const nextDependencies = await service.fetchPageDependencies(targetProjectId);
      setDependencies(nextDependencies);
      return nextDependencies;
    },
    [project]
  );

  const loadDecisions = useCallback(
    async (projectIdOverride) => {
      const targetProjectId = projectIdOverride || project?.id;
      if (!targetProjectId) {
        setDecisions([]);
        return [];
      }

      const nextDecisions = await service.fetchDecisions(targetProjectId);
      setDecisions(sortDecisionsList(nextDecisions));
      return nextDecisions;
    },
    [project]
  );

  const loadSitemapNodes = useCallback(
    async (projectIdOverride) => {
      const targetProjectId = projectIdOverride || project?.id;
      if (!targetProjectId) {
        setSitemapNodes([]);
        return [];
      }

      const nextSitemapNodes = await service.fetchSitemapNodes(targetProjectId);
      setSitemapNodes(nextSitemapNodes);
      return nextSitemapNodes;
    },
    [project]
  );

  const loadLaunchReadiness = useCallback(
    async (projectIdOverride) => {
      const targetProjectId = projectIdOverride || project?.id;
      if (!targetProjectId) {
        setLaunchReadiness([]);
        return [];
      }

      const readiness = await service.fetchLaunchReadiness(targetProjectId);
      setLaunchReadiness(readiness);
      return readiness;
    },
    [project]
  );

  const loadProject = useCallback(async () => {
    setLoading(true);
    setError(null);

    const nextProject = await service.fetchWebsiteProject();
    if (!nextProject) {
      setProject(null);
      setPhases([]);
      setTasks({});
      setPages([]);
      setSitemapNodes([]);
      setTemplates([]);
      setDependencies([]);
      setDecisions([]);
      setLaunchReadiness([]);
      setChangeRequests([]);
      setLoading(false);
      return null;
    }

    const [
      nextPhases,
      nextPages,
      nextSitemapNodes,
      nextTemplates,
      nextDependencies,
      nextDecisions,
      nextLaunchReadiness,
    ] = await Promise.all([
      service.fetchWebsitePhases(nextProject.id),
      service.fetchWebsitePages(nextProject.id),
      service.fetchSitemapNodes(nextProject.id),
      service.fetchWebsiteTemplates(nextProject.id),
      service.fetchPageDependencies(nextProject.id),
      service.fetchDecisions(nextProject.id),
      service.fetchLaunchReadiness(nextProject.id),
    ]);

    setProject(nextProject);
    setPhases(nextPhases);
    setPages(nextPages);
    setTemplates(sortTemplatesList(nextTemplates));
    setDependencies(nextDependencies);
    setDecisions(sortDecisionsList(nextDecisions));
    setLaunchReadiness(nextLaunchReadiness);
    setTasks({});
    setLoading(false);
    setSitemapNodes(nextSitemapNodes);

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
        const [nextPages] = await Promise.all([
          service.fetchWebsitePages(project.id),
          loadLaunchReadiness(project.id),
        ]);
        setPages(nextPages);
      }
      return created;
    },
    [loadLaunchReadiness, project, userEmail]
  );

  const handleCreateSitemapNode = useCallback(
    async (data) => {
      const created = await service.createSitemapNode({
        ...data,
        created_by_email: data.created_by_email || userEmail,
      });
      if (created) {
        await loadSitemapNodes(project?.id || data.project_id);
      }
      return created;
    },
    [loadSitemapNodes, project, userEmail]
  );

  const handleUpdateSitemapNode = useCallback(
    async (id, updates) => {
      const previousNodes = sitemapNodes;
      setSitemapNodes((prev) =>
        prev.map((node) => (node.id === id ? { ...node, ...updates } : node))
      );

      const updated = await service.updateSitemapNode(id, updates);
      if (updated) {
        setSitemapNodes((prev) =>
          prev.map((node) => (node.id === id ? updated : node))
        );
        return updated;
      }

      setSitemapNodes(previousNodes);
      return null;
    },
    [sitemapNodes]
  );

  const handleDeleteSitemapNode = useCallback(
    async (id) => {
      const deleted = await service.deleteSitemapNode(id);
      if (deleted && project) {
        await loadSitemapNodes(project.id);
      }
      return deleted;
    },
    [loadSitemapNodes, project]
  );

  const handleImportPagesAsSitemapNodes = useCallback(
    async (pageRows) => {
      if (!project) return null;

      const imported = await service.importPagesAsSitemapNodes(
        project.id,
        pageRows,
        userEmail
      );

      if (imported) {
        await loadSitemapNodes(project.id);
      }

      return imported;
    },
    [loadSitemapNodes, project, userEmail]
  );

  const handleUpdatePage = useCallback(
    async (id, updates) => {
      const previousPages = pages;
      setPages((prev) => prev.map((page) => (page.id === id ? { ...page, ...updates } : page)));

      const updated = await service.updatePage(id, updates);
      if (updated) {
        setPages((prev) => prev.map((page) => (page.id === id ? updated : page)));
        if (project) {
          await Promise.all([
            loadDependencies(project.id),
            loadLaunchReadiness(project.id),
          ]);
        }
        return updated;
      }

      setPages(previousPages);
      return null;
    },
    [loadDependencies, loadLaunchReadiness, pages, project]
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
        const [nextPages] = await Promise.all([
          service.fetchWebsitePages(project.id),
          loadDependencies(project.id),
          loadLaunchReadiness(project.id),
        ]);
        setPages(nextPages);
      }
      return result;
    },
    [loadDependencies, loadLaunchReadiness, project]
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

  const handleCreateTemplate = useCallback(
    async (data) => {
      const created = await service.createTemplate({
        ...data,
        created_by_email: data.created_by_email || userEmail,
      });
      if (created) {
        await loadTemplates(project?.id || data.project_id);
      }
      return created;
    },
    [loadTemplates, project, userEmail]
  );

  const handleUpdateTemplate = useCallback(
    async (id, updates) => {
      const previousTemplates = templates;
      setTemplates((prev) =>
        sortTemplatesList(prev.map((template) => (template.id === id ? { ...template, ...updates } : template)))
      );

      const updated = await service.updateTemplate(id, updates);
      if (updated) {
        setTemplates((prev) =>
          sortTemplatesList(prev.map((template) => (template.id === id ? updated : template)))
        );
        return updated;
      }

      setTemplates(previousTemplates);
      return null;
    },
    [templates]
  );

  const handleDeleteTemplate = useCallback(
    async (id) => {
      const deleted = await service.deleteTemplate(id);
      if (deleted && project) {
        const [nextPages] = await Promise.all([
          service.fetchWebsitePages(project.id),
          loadTemplates(project.id),
        ]);
        setPages(nextPages);
      }
      return deleted;
    },
    [loadTemplates, project]
  );

  const handleAddDependency = useCallback(
    async (pageId, dependsOnPageId, type, notes) => {
      const created = await service.addPageDependency(pageId, dependsOnPageId, type, notes);
      if (created && !created.error && project) {
        await loadDependencies(project.id);
      }
      return created;
    },
    [loadDependencies, project]
  );

  const handleRemoveDependency = useCallback(
    async (id) => {
      const removed = await service.removePageDependency(id);
      if (removed && project) {
        await loadDependencies(project.id);
      }
      return removed;
    },
    [loadDependencies, project]
  );

  const handleCreateDecision = useCallback(
    async (data) => {
      const created = await service.createDecision({
        ...data,
        created_by_email: data.created_by_email || userEmail,
      });
      if (created) {
        await loadDecisions(project?.id || data.project_id);
      }
      return created;
    },
    [loadDecisions, project, userEmail]
  );

  const handleUpdateDecision = useCallback(
    async (id, updates) => {
      const previousDecisions = decisions;
      setDecisions((prev) =>
        sortDecisionsList(prev.map((decision) => (decision.id === id ? { ...decision, ...updates } : decision)))
      );

      const updated = await service.updateDecision(id, updates);
      if (updated) {
        setDecisions((prev) =>
          sortDecisionsList(prev.map((decision) => (decision.id === id ? updated : decision)))
        );
        return updated;
      }

      setDecisions(previousDecisions);
      return null;
    },
    [decisions]
  );

  const handleDeleteDecision = useCallback(
    async (id) => {
      const deleted = await service.deleteDecision(id);
      if (deleted && project) {
        await loadDecisions(project.id);
      }
      return deleted;
    },
    [loadDecisions, project]
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
    sitemapNodes,
    templates,
    dependencies,
    decisions,
    launchReadiness,
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
    loadSitemapNodes,
    handleCreateSitemapNode,
    handleUpdateSitemapNode,
    handleDeleteSitemapNode,
    handleImportPagesAsSitemapNodes,
    handleUpdatePage,
    handleDeletePage,
    handleMarkPageReviewed,
    loadTemplates,
    loadDependencies,
    loadDecisions,
    loadLaunchReadiness,
    handleCreateTemplate,
    handleUpdateTemplate,
    handleDeleteTemplate,
    handleAddDependency,
    handleRemoveDependency,
    handleCreateDecision,
    handleUpdateDecision,
    handleDeleteDecision,
    loadChangeRequests,
    handleCreateChangeRequest,
    handleUpdateChangeRequest,
  };
}
