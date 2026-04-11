import { fireEvent, render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';

function TestBadge({ children }) {
  return <span>{children}</span>;
}

function renderDashboard(overrides = {}) {
  const props = {
    entries: [],
    currentUser: 'Alice Example',
    userEmail: 'alice@example.com',
    onOpenEntry: vi.fn(),
    onOpenPdfExport: vi.fn(),
    onNavigate: vi.fn(),
    todos: [],
    onToggleTodo: vi.fn(),
    onAddTodo: vi.fn(),
    onUpdateTodo: vi.fn(),
    onDeleteTodo: vi.fn(),
    onUpdateEntry: vi.fn(),
    onEditSubtask: vi.fn(),
    workstreams: [{ id: 'ws-1', title: 'Product Ops' }],
    workstreamTasks: [
      {
        id: 'task-1',
        title: 'Assigned to Alice',
        workstream_id: 'ws-1',
        assignee: 'Alice Example',
        assignee_email: 'alice@example.com',
        status: 'open',
        priority: 'medium',
        comments: [],
      },
      {
        id: 'task-2',
        title: 'Assigned to Bob',
        workstream_id: 'ws-1',
        assignee: 'Bob Example',
        assignee_email: 'bob@example.com',
        status: 'open',
        priority: 'high',
        comments: [],
      },
    ],
    onOpenWorkstreamTask: vi.fn(),
    onUpdateWorkstreamTask: vi.fn(),
    Badge: TestBadge,
    events: [],
    ...overrides,
  };

  render(<Dashboard {...props} />);
  return props;
}

describe('Dashboard workstream scoping', () => {
  it('shows only assigned workstream tasks in the dashboard task list', () => {
    renderDashboard();

    fireEvent.click(screen.getByText('Workstream Tasks'));

    expect(screen.getByText('My Workstream Tasks')).toBeInTheDocument();
    expect(screen.getByText('Assigned to Alice')).toBeInTheDocument();
    expect(screen.queryByText('Assigned to Bob')).not.toBeInTheDocument();
  });
});
