import { fireEvent, render, screen } from '@testing-library/react';
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
    const mediumSection = screen.getByText('Medium (1)').closest('div.border.rounded-lg');

    fireEvent.dragStart(taskCard);
    expect(taskCard).toHaveClass('pointer-events-none');

    fireEvent.dragOver(mediumSection);
    fireEvent.drop(mediumSection);

    expect(taskCard).not.toHaveClass('pointer-events-none');
    expect(onUpdateTask).toHaveBeenCalledWith('task-1', 'ws-1', {
      priority: 'medium',
      sortOrder: 1,
    });

    resolveUpdate({});
  });
});
