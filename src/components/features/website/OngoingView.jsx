import React from 'react';
import { Archive } from 'lucide-react';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import PageRegistry from './PageRegistry';
import ChangeRequestList from './ChangeRequestList';

export default function OngoingView({
  project,
  pages = [],
  changeRequests = [],
  isAdminUser,
  handlers,
  userEmail,
}) {
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

      <PageRegistry
        pages={pages}
        isAdminUser={isAdminUser}
        handlers={handlers}
        projectId={project.id}
      />

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
    </div>
  );
}
