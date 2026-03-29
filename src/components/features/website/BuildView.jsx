import React, { useMemo, useState } from 'react';
import { CheckCircle2, Mail, Rocket, FolderKanban } from 'lucide-react';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import PhaseAccordion from './PhaseAccordion';
import PageInventory from './PageInventory';
import TemplateTracker from './TemplateTracker';
import DecisionsLog from './DecisionsLog';

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
    { id: 'templates', label: 'Templates' },
    { id: 'decisions', label: 'Decisions' },
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
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-3xl font-bold">{project.name}</h2>
              <Badge variant={projectStatus.badge} className="bg-white/15 text-white">
                {projectStatus.label}
              </Badge>
            </div>
            {project.description ? (
              <p className="max-w-2xl text-sm text-ocean-100">{project.description}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-4 text-sm text-ocean-100">
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {project.lead_email}
              </span>
              <span className="inline-flex items-center gap-2">
                <FolderKanban className="h-4 w-4" />
                {pages.length} pages in scope
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
            <div className="flex items-center gap-2 text-sm text-ocean-100">
              <CheckCircle2 className="h-4 w-4" />
              Overall completion
            </div>
            <p className="mt-2 text-3xl font-bold">{completion}%</p>
            <p className="text-sm text-ocean-100">
              {doneTasks}/{allTasks.length} tasks done
            </p>
          </div>
        </div>
      </div>

      {isAdminUser ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-graystone-200 bg-white p-4 shadow-sm">
          <div>
            <h3 className="text-sm font-semibold text-ocean-900">Launch control</h3>
            <p className="text-sm text-graystone-500">
              The project can go live once the Launch phase is complete.
            </p>
          </div>
          <Button
            onClick={handleLaunch}
            disabled={!canLaunch}
            title={canLaunch ? 'Mark project as launched' : 'Complete the Launch phase first'}
          >
            <Rocket className="h-4 w-4" />
            Mark as launched
          </Button>
        </div>
      ) : null}

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
    </div>
  );
}
