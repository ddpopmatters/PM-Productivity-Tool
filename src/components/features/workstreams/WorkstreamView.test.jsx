import { fireEvent, render, screen, within } from '@testing-library/react';
import WorkstreamView from './WorkstreamView';

function renderWorkstreamView(overrides = {}) {
  const props = {
    workstream: {
      id: 'ws-1',
      title: 'Product Ops',
      description: 'Track incoming product work',
    },
    workstreamTasks: [
      {
        id: 'task-1',
        title: 'Review homepage copy',
        priority: 'high',
        status: 'open',
        deadline: null,
        assignee: 'Alice Example',
        sort_order: 0,
      },
      {
        id: 'task-2',
        title: 'Triage support request',
        priority: 'medium',
        status: 'open',
        deadline: null,
        assignee: 'Alice Example',
        sort_order: 0,
      },
    ],
    currentUser: 'Alice Example',
    userEmail: 'alice@example.com',
    onBack: vi.fn(),
    onCreateTask: vi.fn(),
    onUpdateTask: vi.fn().mockResolvedValue({}),
    onUpdateWorkstream: vi.fn(),
    onDeleteWorkstream: vi.fn(),
    onOpenTask: vi.fn(),
    WorkstreamSettings: null,
    ...overrides,
  };

  render(<WorkstreamView {...props} />);
  return props;
}

describe('WorkstreamView drag lifecycle', () => {
  it('restores interactivity after a drag ends without a drop', () => {
    renderWorkstreamView();

    const taskCard = screen.getByText('Review homepage copy').closest('[draggable="true"]');
    expect(taskCard).not.toHaveClass('pointer-events-none');

    fireEvent.dragStart(taskCard);
    expect(taskCard).toHaveClass('pointer-events-none');

    fireEvent.dragEnd(taskCard);
    expect(taskCard).not.toHaveClass('pointer-events-none');
  });

  it('clears dragging state immediately when dropping into another priority bucket', () => {
    let resolveUpdate;
    const onUpdateTask = vi.fn().mockImplementation(
      () => new Promise((resolve) => {
        resolveUpdate = resolve;
      })
    );

    renderWorkstreamView({ onUpdateTask });

    const taskCard = screen.getByText('Review homepage copy').closest('[draggable="true"]');
    const mediumNoEstimateCell = screen.getByLabelText('Medium priority, No estimate');

    fireEvent.dragStart(taskCard);
    expect(taskCard).toHaveClass('pointer-events-none');

    fireEvent.dragOver(mediumNoEstimateCell);
    fireEvent.drop(mediumNoEstimateCell);

    expect(taskCard).not.toHaveClass('pointer-events-none');
    expect(onUpdateTask).toHaveBeenCalledWith('task-1', 'ws-1', {
      priority: 'medium',
      sortOrder: 1,
      tags: [],
    });

    resolveUpdate({});
  });

  it('renders backlog tasks in their priority and effort cells', () => {
    renderWorkstreamView({
      workstreamTasks: [
        {
          id: 'task-1',
          title: 'Large redesign',
          priority: 'high',
          status: 'open',
          deadline: null,
          assignee: 'Alice Example',
          sort_order: 0,
          tags: ['effort:high'],
        },
        {
          id: 'task-2',
          title: 'Quick copy tweak',
          priority: 'high',
          status: 'open',
          deadline: null,
          assignee: 'Alice Example',
          sort_order: 1,
          tags: ['effort:low'],
        },
        {
          id: 'task-3',
          title: 'No estimate task',
          priority: 'high',
          status: 'open',
          deadline: null,
          assignee: 'Alice Example',
          sort_order: 2,
          tags: [],
        },
      ],
    });

    expect(within(screen.getByLabelText('High priority, Low effort')).getByText('Quick copy tweak')).toBeInTheDocument();
    expect(within(screen.getByLabelText('High priority, High effort')).getByText('Large redesign')).toBeInTheDocument();
    expect(within(screen.getByLabelText('High priority, No estimate')).getByText('No estimate task')).toBeInTheDocument();
  });

  it('stores effort metadata when creating a backlog task', () => {
    const onCreateTask = vi.fn().mockResolvedValue({});
    renderWorkstreamView({ onCreateTask });

    fireEvent.click(screen.getByText('Add to backlog'));
    fireEvent.change(screen.getByPlaceholderText('Task title...'), {
      target: { value: 'Polish CTA copy' },
    });
    fireEvent.change(screen.getByLabelText('Backlog task effort'), {
      target: { value: 'low' },
    });
    fireEvent.click(screen.getByText('Add'));

    expect(onCreateTask).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Polish CTA copy',
      tags: ['effort:low'],
    }));
  });

  it('updates both priority and effort when a task is dragged into a new matrix cell', () => {
    const onUpdateTask = vi.fn().mockResolvedValue({});
    renderWorkstreamView({
      onUpdateTask,
      workstreamTasks: [
        {
          id: 'task-1',
          title: 'Review homepage copy',
          priority: 'high',
          status: 'open',
          deadline: null,
          assignee: 'Alice Example',
          sort_order: 0,
          tags: ['effort:high'],
        },
      ],
    });

    const taskCard = screen.getByText('Review homepage copy').closest('[draggable="true"]');
    const targetCell = screen.getByLabelText('Low priority, Low effort');

    fireEvent.dragStart(taskCard);
    fireEvent.dragOver(targetCell);
    fireEvent.drop(targetCell);

    expect(onUpdateTask).toHaveBeenCalledWith('task-1', 'ws-1', {
      priority: 'low',
      sortOrder: 0,
      tags: ['effort:low'],
    });
  });
});
