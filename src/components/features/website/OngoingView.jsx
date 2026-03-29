import React, { useState } from 'react';
import { Archive } from 'lucide-react';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import PageRegistry from './PageRegistry';
import ChangeRequestList from './ChangeRequestList';
import LaunchReadiness from './LaunchReadiness';
import TemplateTracker from './TemplateTracker';
import DecisionsLog from './DecisionsLog';

export default function OngoingView({
  project,
  pages = [],
  templates = [],
  decisions = [],
  launchReadiness = [],
  changeRequests = [],
  isAdminUser,
  handlers,
  userEmail,
}) {
  const [activeTab, setActiveTab] = useState('page_registry');

  const tabs = [
    { id: 'page_registry', label: 'Page Registry' },
    { id: 'launch_readiness', label: 'Launch Readiness' },
    { id: 'templates', label: 'Templates' },
    { id: 'decisions', label: 'Decisions' },
    { id: 'change_requests', label: 'Change Requests' },
  ];

  const handleArchive = async () => {
    if (window.confirm('Archive this website project?')) {
      await handlers.handleArchiveProject(project.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-ocean-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-3xl font-bold">{project.name}</h2>
              <Badge variant="success" className="bg-white/15 text-white">
                Live
              </Badge>
            </div>
            {project.description ? (
              <p className="mt-2 max-w-2xl text-sm text-ocean-100">{project.description}</p>
            ) : null}
          </div>
          {isAdminUser ? (
            <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={handleArchive}>
              <Archive className="h-4 w-4" />
              Archive project
            </Button>
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

      {activeTab === 'page_registry' ? (
        <PageRegistry
          pages={pages}
          isAdminUser={isAdminUser}
          handlers={handlers}
          projectId={project.id}
        />
      ) : null}

      {activeTab === 'launch_readiness' ? (
        <LaunchReadiness
          launchReadiness={launchReadiness}
          pages={pages}
          decisions={decisions}
          onRefresh={handlers.loadLaunchReadiness}
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

      {activeTab === 'change_requests' ? (
        <ChangeRequestList
          changeRequests={changeRequests}
          pages={pages}
          isAdminUser={isAdminUser}
          userEmail={userEmail}
          projectId={project.id}
          onLoad={handlers.loadChangeRequests}
          onCreateChangeRequest={handlers.handleCreateChangeRequest}
          onUpdateChangeRequest={handlers.handleUpdateChangeRequest}
        />
      ) : null}
    </div>
  );
}
