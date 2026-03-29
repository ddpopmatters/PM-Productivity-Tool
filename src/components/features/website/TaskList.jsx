import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Link2, Plus, Trash2 } from 'lucide-react';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';

const FIELD_CLASSES =
  'w-full rounded-lg border border-graystone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-aqua-200';

const STATUS_OPTIONS = [
  { value: 'todo', label: 'To do', badge: 'neutral', select: 'border-graystone-300 text-graystone-700' },
  { value: 'in_progress', label: 'In progress', badge: 'info', select: 'border-blue-300 text-blue-700' },
  { value: 'done', label: 'Done', badge: 'success', select: 'border-green-300 text-green-700' },
  { value: 'blocked', label: 'Blocked', badge: 'danger', select: 'border-red-300 text-red-700' },
];

function formatEmailLabel(email) {
  if (!email) return 'Unassigned';
  const localPart = email.split('@')[0] || '';
  const firstName = localPart.split(/[._-]/)[0] || '';
  if (!firstName) return email;
  return firstName.charAt(0).toUpperCase() + firstName.slice(1);
}

function formatDate(dateValue) {
  if (!dateValue) return 'No due date';
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString();
}

export default function TaskList({
  tasks = [],
  pages = [],
  isAdminUser,
  phaseId,
  projectId,
  userEmail,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
}) {
  const [formData, setFormData] = useState({
    title: '',
    assignee_email: '',
    due_date: '',
    page_id: '',
  });

  const pageMap = useMemo(
    () => new Map((pages || []).map((page) => [page.id, page])),
    [pages]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.title.trim()) return;

    const created = await onCreateTask({
      project_id: projectId,
      phase_id: phaseId,
      title: formData.title.trim(),
      assignee_email: formData.assignee_email.trim(),
      due_date: formData.due_date || null,
      page_id: formData.page_id || null,
      created_by_email: userEmail,
    });

    if (created) {
      setFormData({
        title: '',
        assignee_email: '',
        due_date: '',
        page_id: '',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-graystone-300 bg-graystone-50 px-4 py-6 text-sm text-graystone-500">
            No tasks yet, add the first one.
          </div>
        ) : (
          tasks.map((task) => {
            const statusMeta =
              STATUS_OPTIONS.find((option) => option.value === task.status) || STATUS_OPTIONS[0];
            const linkedPage = task.page_id ? pageMap.get(task.page_id) : null;
            const isOverdue =
              Boolean(task.due_date) &&
              task.status !== 'done' &&
              task.due_date < new Date().toISOString().slice(0, 10);

            return (
              <div
                key={task.id}
                className="rounded-xl border border-graystone-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-ocean-900">{task.title}</p>
                      <Badge variant={statusMeta.badge}>{statusMeta.label}</Badge>
                      {linkedPage ? (
                        <Badge variant="outline" className="gap-1">
                          <Link2 className="h-3 w-3" />
                          {linkedPage.name}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-graystone-500">
                      <span>{formatEmailLabel(task.assignee_email)}</span>
                      <span
                        className={clsx(
                          isOverdue ? 'font-medium text-red-600' : 'text-graystone-500'
                        )}
                      >
                        {formatDate(task.due_date)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={task.status}
                      onChange={(event) =>
                        onUpdateTask(task.id, { status: event.target.value })
                      }
                      className={clsx(
                        FIELD_CLASSES,
                        'w-auto min-w-[140px] bg-white',
                        statusMeta.select
                      )}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    {isAdminUser ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-3 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => onDeleteTask(task.id, phaseId)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-graystone-200 bg-graystone-50 p-4"
      >
        <div className="mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-ocean-600" />
          <h4 className="text-sm font-semibold text-ocean-900">Add task</h4>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <input
            type="text"
            required
            value={formData.title}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder="Task title"
            className={FIELD_CLASSES}
          />
          <input
            type="email"
            value={formData.assignee_email}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, assignee_email: event.target.value }))
            }
            placeholder="Assignee email"
            className={FIELD_CLASSES}
          />
          <input
            type="date"
            value={formData.due_date}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, due_date: event.target.value }))
            }
            className={FIELD_CLASSES}
          />
          <select
            value={formData.page_id}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, page_id: event.target.value }))
            }
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

        <div className="mt-4 flex justify-end">
          <Button type="submit" size="sm">
            Add task
          </Button>
        </div>
      </form>
    </div>
  );
}
