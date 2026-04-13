import React, { useMemo, useState } from 'react';
import { CheckCircle2, Mail, Rocket, FolderKanban } from 'lucide-react';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import PhaseAccordion from './PhaseAccordion';
import PageInventory from './PageInventory';
import SitemapView from './SitemapView';
import TemplateTracker from './TemplateTracker';
import DecisionsLog from './DecisionsLog';
import MindmapList from '../mindmaps/MindmapList';

const PROJECT_STATUS_META = {
  planning: { label: 'Planning', badge: 'neutral' },
  in_progress: { label: 'In progress', badge: 'info' },
  launched: { label: 'Launched', badge: 'success' },
  archived: { label: 'Archived', badge: 'warning' },
};

export default function BuildView({
  project,
  phases = [],
  tasks = {},
  pages = [],
  templates = [],
  dependencies = [],
  decisions = [],
  isAdminUser,
  handlers,
  userEmail,
  mindmaps = [],
  setMindmaps,
  mindmapApi,
  onOpenMindmap,
}) {
  const [activeTab, setActiveTab] = useState('phases');
  const allTasks = useMemo(() => Object.values(tasks).flat(), [tasks]);
  const doneTasks = allTasks.filter((task) => task.status === 'done').length;
  const completion = allTasks.length ? Math.round((doneTasks / allTasks.length) * 100) : 0;
  const launchPhase = phases.find((phase) => phase.name === 'Launch');
  const canLaunch = launchPhase?.status === 'complete';
  const projectStatus = PROJECT_STATUS_META[project.status] || PROJECT_STATUS_META.planning;

  const tabs = [
    { id: 'phases', label: 'Phases' },
    { id: 'pages', label: 'Pages' },
    { id: 'sitemap', label: 'Sitemap' },
    { id: 'templates', label: 'Templates' },
    { id: 'decisions', label: 'Decisions' },
    { id: 'mindmaps', label: 'Mindmaps' },
  ];

  const handleLaunch = async () => {
    if (!canLaunch) return;
    if (window.confirm('Mark this website project as launched?')) {
      await handlers.handleLaunchProject(project.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-ocean-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold">{project.name}</h2>
              <Badge variant={projectStatus.badge} className="bg-white/15 text-white">
                {projectStatus.label}
              </Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-ocean-100">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {project.lead_email}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FolderKanban className="h-3.5 w-3.5" />
                {pages.length} pages
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {completion}% complete
              </span>
            </div>
          </div>
          {isAdminUser && canLaunch ? (
            <button
              onClick={handleLaunch}
              className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 transition hover:bg-white/30"
            >
              <Rocket className="h-4 w-4" />
              <span>Mark as launched</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="border-b border-graystone-200">
        <div className="flex flex-wrap gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                'border-b-2 px-1 py-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-ocean-600 text-ocean-900'
                  : 'border-transparent text-graystone-600 hover:text-graystone-800',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'phases' ? (
        <div className="space-y-4">
          {phases.map((phase) => (
            <PhaseAccordion
              key={phase.id}
              phase={phase}
              tasks={tasks[phase.id] || []}
              pages={pages}
              isAdminUser={isAdminUser}
              onLoadTasks={handlers.loadPhaseTasks}
              handlers={handlers}
              projectId={project.id}
              userEmail={userEmail}
            />
          ))}
        </div>
      ) : null}

      {activeTab === 'pages' ? (
        <PageInventory
          pages={pages}
          templates={templates}
          dependencies={dependencies}
          isAdminUser={isAdminUser}
          handlers={handlers}
          projectId={project.id}
        />
      ) : null}

      {activeTab === 'sitemap' ? (
        <SitemapView
          sitemapNodes={handlers.sitemapNodes || []}
          pages={pages}
          projectId={project.id}
          isAdminUser={isAdminUser}
          userEmail={userEmail}
          handlers={handlers}
        />
      ) : null}

      {activeTab === 'templates' ? (
        <TemplateTracker
          templates={templates}
          pages={pages}
          isAdminUser={isAdminUser}
          handlers={handlers}
        />
      ) : null}

      {activeTab === 'decisions' ? (
        <DecisionsLog
          decisions={decisions}
          pages={pages}
          isAdminUser={isAdminUser}
          userEmail={userEmail}
          handlers={handlers}
        />
      ) : null}

      {activeTab === 'mindmaps' ? (
        <MindmapList
          mindmaps={mindmaps}
          setMindmaps={setMindmaps}
          onOpenMindmap={onOpenMindmap}
          userEmail={userEmail}
          mindmapApi={mindmapApi}
        />
      ) : null}
    </div>
  );
}
