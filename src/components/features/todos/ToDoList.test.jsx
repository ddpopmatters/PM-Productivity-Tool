import { fireEvent, render, screen } from '@testing-library/react';
import ToDoList from './ToDoList';

describe('ToDoList workstream navigation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-11T09:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens a workstream task when clicking it in the today panel', () => {
    const onOpenWorkstreamTask = vi.fn();

    render(
      <ToDoList
        todos={[]}
        onAddTodo={vi.fn()}
        onToggleTodo={vi.fn()}
        entries={[]}
        workstreamTasks={[
          {
            id: 'task-1',
            title: 'Fix launch checklist',
            deadline: '2026-04-11',
            status: 'open',
            workstream_id: 'ws-1',
          },
        ]}
        workstreams={[{ id: 'ws-1', title: 'Launch Ops' }]}
        currentUser="Alice Example"
        onOpenEntry={vi.fn()}
        onOpenWorkstreamTask={onOpenWorkstreamTask}
      />
    );

    fireEvent.click(screen.getByText('Fix launch checklist'));

    expect(onOpenWorkstreamTask).toHaveBeenCalledWith('ws-1', 'task-1');
  });
});
