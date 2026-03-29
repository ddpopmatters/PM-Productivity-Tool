import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { CheckCheck, ChevronDown, ClipboardCheck } from 'lucide-react';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import TaskList from './TaskList';

const FIELD_CLASSES =
  'w-full rounded-lg border border-graystone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-aqua-200';

const PHASE_STATUS_META = {
  not_started: { label: 'Not started', badge: 'neutral' },
  in_progress: { label: 'In progress', badge: 'info' },
  complete: { label: 'Complete', badge: 'success' },
};

export default function PhaseAccordion({
  phase,
  tasks = [],
  pages = [],
  isAdminUser,
  onLoadTasks,
  handlers,
  projectId,
  userEmail,
}) {
  const [isOpen, setIsOpen] = useState(phase.status === 'in_progress');
  const [approvalComment, setApprovalComment] = useState(phase.approval_comment || '');

  useEffect(() => {
    onLoadTasks(phase.id);
  }, [phase.id, onLoadTasks]);

  useEffect(() => {
    if (phase.status === 'in_progress') {
      setIsOpen(true);
    }
  }, [phase.status]);

  useEffect(() => {
    setApprovalComment(phase.approval_comment || '');
  }, [phase.approval_comment]);

  const doneCount = tasks.filter((task) => task.status === 'done').length;
  const statusMeta = PHASE_STATUS_META[phase.status] || PHASE_STATUS_META.not_started;

  const handleApprove = async () => {
    await handlers.handleReviewPhaseApproval(phase.id, 'approved', approvalComment);
    await handlers.handleUpdatePhase(phase.id, 'complete');
  };

  const handleReject = async () => {
    await handlers.handleReviewPhaseApproval(phase.id, 'rejected', approvalComment);
    await handlers.handleUpdatePhase(phase.id, 'in_progress');
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-graystone-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-ocean-900">{phase.name}</h3>
            <Badge variant={statusMeta.badge}>{statusMeta.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-graystone-500">
            {doneCount}/{tasks.length} done
          </p>
        </div>
        <ChevronDown
          className={clsx(
            'h-5 w-5 text-graystone-500 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen ? (
        <div className="space-y-4 border-t border-graystone-200 bg-graystone-50 px-5 py-5">
          <div className="flex flex-col gap-3 rounded-xl border border-graystone-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-ocean-900">Phase status</h4>
              <p className="text-sm text-graystone-500">
                Keep the phase in sync with delivery progress.
              </p>
            </div>
            <select
              value={phase.status}
              onChange={(event) =>
                handlers.handleUpdatePhase(phase.id, event.target.value)
              }
              className={clsx(FIELD_CLASSES, 'w-full lg:w-52')}
            >
              <option value="not_started">Not started</option>
              <option value="in_progress">In progress</option>
              <option value="complete">Complete</option>
            </select>
          </div>

          <TaskList
            tasks={tasks}
            pages={pages}
            isAdminUser={isAdminUser}
            phaseId={phase.id}
            projectId={projectId}
            userEmail={userEmail}
            onCreateTask={handlers.handleCreateTask}
            onUpdateTask={handlers.handleUpdateTask}
            onDeleteTask={handlers.handleDeleteTask}
          />

          {isAdminUser ? (
            <div className="rounded-xl border border-graystone-200 bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-ocean-600" />
                <h4 className="text-sm font-semibold text-ocean-900">Approval</h4>
              </div>

              {phase.approval_status === 'pending' ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="warning">Pending approval</Badge>
                    {phase.approval_submitted_by ? (
                      <span className="text-sm text-graystone-500">
                        Submitted by {phase.approval_submitted_by}
                      </span>
                    ) : null}
                  </div>
                  <textarea
                    value={approvalComment}
                    onChange={(event) => setApprovalComment(event.target.value)}
                    rows={3}
                    placeholder="Add a sign-off note"
                    className={FIELD_CLASSES}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={handleApprove}>
                      <CheckCheck className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleReject}>
                      Reject
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {phase.approval_status ? (
                      <Badge
                        variant={
                          phase.approval_status === 'approved'
                            ? 'success'
                            : phase.approval_status === 'rejected'
                              ? 'danger'
                              : 'warning'
                        }
                      >
                        {phase.approval_status === 'approved'
                          ? 'Approved'
                          : phase.approval_status === 'rejected'
                            ? 'Rejected'
                            : 'Pending approval'}
                      </Badge>
                    ) : null}
                    <span className="text-sm text-graystone-500">
                      Ready for sign-off when the phase is ready.
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlers.handleSubmitPhaseApproval(phase.id)}
                  >
                    Submit for approval
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
