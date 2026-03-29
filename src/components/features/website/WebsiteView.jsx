import React, { useState } from 'react';
import { Globe, Plus } from 'lucide-react';
import LoadingSpinner from '../../ui/LoadingSpinner';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import BuildView from './BuildView';
import OngoingView from './OngoingView';

const FIELD_CLASSES =
  'w-full rounded-lg border border-graystone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-aqua-200';

function createBlankProjectForm() {
  return {
    name: '',
    description: '',
    lead_email: '',
  };
}

export default function WebsiteView({ websiteHook }) {
  const {
    project,
    phases,
    tasks,
    pages,
    templates,
    dependencies,
    decisions,
    launchReadiness,
    changeRequests,
    loading,
    error,
    userEmail,
    isAdminUser,
    handleCreateProject,
    ...handlers
  } = websiteHook;

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [projectForm, setProjectForm] = useState(createBlankProjectForm());

  if (loading) {
    return <LoadingSpinner className="py-16" text="Loading website project..." />;
  }

  const submitCreateProject = async (event) => {
    event.preventDefault();
    const created = await handleCreateProject(projectForm);
    if (created) {
      setProjectForm(createBlankProjectForm());
      setShowCreateForm(false);
    }
  };

  const renderCreateForm = () => (
    <form onSubmit={submitCreateProject} className="mt-5 rounded-xl border border-graystone-200 bg-graystone-50 p-4 text-left">
      <div className="grid gap-3 lg:grid-cols-2">
        <input
          type="text"
          required
          value={projectForm.name}
          onChange={(event) => setProjectForm((prev) => ({ ...prev, name: event.target.value }))}
          placeholder="Project name"
          className={FIELD_CLASSES}
        />
        <input
          type="email"
          required
          value={projectForm.lead_email}
          onChange={(event) =>
            setProjectForm((prev) => ({ ...prev, lead_email: event.target.value }))
          }
          placeholder="Lead email"
          className={FIELD_CLASSES}
        />
      </div>
      <textarea
        value={projectForm.description}
        onChange={(event) => setProjectForm((prev) => ({ ...prev, description: event.target.value }))}
        rows={3}
        placeholder="Project description"
        className={`${FIELD_CLASSES} mt-3`}
      />
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => setShowCreateForm(false)}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          Create project
        </Button>
      </div>
    </form>
  );

  const sharedHandlers = {
    ...handlers,
    handleCreateProject,
  };

  if (!project) {
    return (
      <div className="animate-in fade-in space-y-6 duration-500">
        <div className="rounded-2xl bg-ocean-800 p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Globe className="h-6 w-6 text-ocean-300" />
                <h2 className="text-2xl font-bold">Website Project</h2>
              </div>
              <p className="mt-1 text-sm text-ocean-100">
                Plan and manage your website build — phases, pages, templates, and post-launch changes.
              </p>
            </div>
            {isAdminUser ? (
              <button
                onClick={() => setShowCreateForm((prev) => !prev)}
                className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 transition hover:bg-white/30"
              >
                <Plus className="h-4 w-4" />
                <span>New project</span>
              </button>
            ) : null}
          </div>
          {showCreateForm ? renderCreateForm() : null}
        </div>

        <div className="rounded-2xl border border-graystone-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-aqua-100 text-ocean-700">
            <Globe className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-ocean-900">No website project yet</h3>
          <p className="mt-2 text-sm text-graystone-500">
            {isAdminUser
              ? 'Use the "New project" button above to get started.'
              : 'Ask an administrator to create the website project.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      ) : null}

      {project.status === 'archived' ? (
        <div className="rounded-2xl bg-ocean-800 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <Globe className="h-6 w-6 text-ocean-300" />
                <h2 className="text-2xl font-bold">{project.name}</h2>
                <Badge variant="warning" className="bg-white/15 text-white">Archived</Badge>
              </div>
              <p className="mt-1 text-sm text-ocean-100">
                This website project is archived. Start a new one to continue.
              </p>
            </div>
            {isAdminUser ? (
              <button
                onClick={() => setShowCreateForm((prev) => !prev)}
                className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 transition hover:bg-white/30"
              >
                <Plus className="h-4 w-4" />
                <span>New project</span>
              </button>
            ) : null}
          </div>
          {showCreateForm ? renderCreateForm() : null}
        </div>
      ) : null}

      {(project.status === 'planning' || project.status === 'in_progress') ? (
        <BuildView
          project={project}
          phases={phases}
          tasks={tasks}
          pages={pages}
          templates={templates}
          dependencies={dependencies}
          decisions={decisions}
          isAdminUser={isAdminUser}
          handlers={sharedHandlers}
          userEmail={userEmail}
        />
      ) : null}

      {project.status === 'launched' ? (
        <OngoingView
          project={project}
          pages={pages}
          templates={templates}
          decisions={decisions}
          launchReadiness={launchReadiness}
          changeRequests={changeRequests}
          isAdminUser={isAdminUser}
          handlers={sharedHandlers}
          userEmail={userEmail}
        />
      ) : null}
    </div>
  );
}
