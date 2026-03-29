import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { CheckCircle2, Plus, UserRoundPlus } from 'lucide-react';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';

const FIELD_CLASSES =
  'w-full rounded-lg border border-graystone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-aqua-200';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'done', label: 'Done' },
];

const PRIORITY_META = {
  high: { label: 'High', badge: 'danger' },
  medium: { label: 'Medium', badge: 'warning' },
  low: { label: 'Low', badge: 'neutral' },
};

const STATUS_META = {
  open: { label: 'Open', badge: 'neutral' },
  in_progress: { label: 'In progress', badge: 'info' },
  done: { label: 'Done', badge: 'success' },
};

function createBlankForm() {
  return {
    title: '',
    description: '',
    page_id: '',
    priority: 'medium',
    approval_required: false,
  };
}

export default function ChangeRequestList({
  changeRequests = [],
  pages = [],
  isAdminUser,
  userEmail,
  projectId,
  onLoad,
  onCreateChangeRequest,
  onUpdateChangeRequest,
}) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState(createBlankForm());
  const [assigningRequestId, setAssigningRequestId] = useState(null);
  const [assigneeEmail, setAssigneeEmail] = useState('');

  const pageMap = useMemo(
    () => new Map((pages || []).map((page) => [page.id, page])),
    [pages]
  );

  useEffect(() => {
    onLoad(activeFilter);
  }, [activeFilter, onLoad]);

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!formData.title.trim()) return;

    const created = await onCreateChangeRequest({
      project_id: projectId,
      title: formData.title.trim(),
      description: formData.description.trim(),
      page_id: formData.page_id || null,
      priority: formData.priority,
      approval_required: isAdminUser ? formData.approval_required : false,
      requested_by_email: userEmail,
    });

    if (created) {
      setFormData(createBlankForm());
      setShowCreateForm(false);
    }
  };

  const saveAssignee = async (requestId) => {
    const updated = await onUpdateChangeRequest(requestId, {
      assignee_email: assigneeEmail.trim() || null,
    });

    if (updated) {
      setAssigningRequestId(null);
      setAssigneeEmail('');
    }
  };

  return (
    <section className="rounded-2xl border border-graystone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-ocean-900">Change requests</h3>
          <p className="text-sm text-graystone-500">
            Track post-launch improvements, fixes, and approvals.
          </p>
        </div>
        <Button size="sm" variant={showCreateForm ? 'secondary' : 'solid'} onClick={() => setShowCreateForm((prev) => !prev)}>
          <Plus className="h-4 w-4" />
          {showCreateForm ? 'Close form' : 'Raise change request'}
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setActiveFilter(filter.id)}
            className={clsx(
              'rounded-full px-4 py-2 text-sm transition',
              activeFilter === filter.id
                ? 'bg-ocean-600 text-white shadow-sm'
                : 'bg-graystone-100 text-graystone-600 hover:bg-graystone-200'
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {showCreateForm ? (
        <form onSubmit={handleCreate} className="mt-5 rounded-xl border border-graystone-200 bg-graystone-50 p-4">
          <div className="grid gap-3 lg:grid-cols-2">
            <input
              type="text"
              required
              value={formData.title}
              onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Request title"
              className={FIELD_CLASSES}
            />
            <select
              value={formData.page_id}
              onChange={(event) => setFormData((prev) => ({ ...prev, page_id: event.target.value }))}
              className={FIELD_CLASSES}
            >
              <option value="">Link to a page</option>
              {pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.name}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={formData.description}
            onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
            rows={3}
            placeholder="Describe the change"
            className={clsx(FIELD_CLASSES, 'mt-3')}
          />
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <select
              value={formData.priority}
              onChange={(event) => setFormData((prev) => ({ ...prev, priority: event.target.value }))}
              className={FIELD_CLASSES}
            >
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
            </select>
            {isAdminUser ? (
              <label className="flex items-center gap-2 rounded-lg border border-graystone-200 bg-white px-3 py-2 text-sm text-graystone-700">
                <input
                  type="checkbox"
                  checked={formData.approval_required}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      approval_required: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-graystone-300 text-ocean-600 focus:ring-ocean-500"
                />
                Approval required
              </label>
            ) : null}
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="submit" size="sm">
              Save request
            </Button>
          </div>
        </form>
      ) : null}

      <div className="mt-5 space-y-3">
        {changeRequests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-graystone-300 bg-graystone-50 px-4 py-8 text-center text-sm text-graystone-500">
            No change requests in this view yet.
          </div>
        ) : (
          changeRequests.map((request) => {
            const priority = PRIORITY_META[request.priority] || PRIORITY_META.medium;
            const status = STATUS_META[request.status] || STATUS_META.open;
            const linkedPage = request.page_id ? pageMap.get(request.page_id) : null;

            return (
              <div key={request.id} className="rounded-xl border border-graystone-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={priority.badge}>{priority.label}</Badge>
                      <Badge variant={status.badge}>{status.label}</Badge>
                      {request.approval_required ? (
                        <Badge
                          variant={
                            request.approval_status === 'approved'
                              ? 'success'
                              : request.approval_status === 'rejected'
                                ? 'danger'
                                : 'warning'
                          }
                        >
                          {request.approval_status === 'approved'
                            ? 'Approved'
                            : request.approval_status === 'rejected'
                              ? 'Rejected'
                              : 'Approval pending'}
                        </Badge>
                      ) : null}
                    </div>
                    <div>
                      <h4 className="font-semibold text-ocean-900">{request.title}</h4>
                      {request.description ? (
                        <p className="mt-1 text-sm text-graystone-500">{request.description}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-graystone-500">
                      <span>Page: {linkedPage ? linkedPage.name : 'Not linked'}</span>
                      <span>Requested by: {request.requested_by_email}</span>
                      <span>Assignee: {request.assignee_email || 'Unassigned'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={request.status}
                      onChange={(event) =>
                        onUpdateChangeRequest(request.id, { status: event.target.value })
                      }
                      className={clsx(FIELD_CLASSES, 'w-auto min-w-[150px]')}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In progress</option>
                      <option value="done">Done</option>
                    </select>

                    {isAdminUser ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAssigningRequestId((prev) => (prev === request.id ? null : request.id));
                          setAssigneeEmail(request.assignee_email || '');
                        }}
                      >
                        <UserRoundPlus className="h-4 w-4" />
                        Assign
                      </Button>
                    ) : null}
                  </div>
                </div>

                {isAdminUser && request.approval_required && request.approval_status === 'pending' ? (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-graystone-100 pt-3">
                    <Button
                      size="sm"
                      onClick={() =>
                        onUpdateChangeRequest(request.id, { approval_status: 'approved' })
                      }
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        onUpdateChangeRequest(request.id, { approval_status: 'rejected' })
                      }
                    >
                      Reject
                    </Button>
                  </div>
                ) : null}

                {isAdminUser && assigningRequestId === request.id ? (
                  <div className="mt-3 flex flex-col gap-3 border-t border-graystone-100 pt-3 lg:flex-row lg:items-end">
                    <div className="flex-1">
                      <label className="mb-2 block text-sm font-medium text-ocean-900">
                        Assignee email
                      </label>
                      <input
                        type="email"
                        value={assigneeEmail}
                        onChange={(event) => setAssigneeEmail(event.target.value)}
                        placeholder="name@example.com"
                        className={FIELD_CLASSES}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setAssigningRequestId(null)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => saveAssignee(request.id)}>
                        Save assignee
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
