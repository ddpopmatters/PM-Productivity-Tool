import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import WorkstreamTaskDetail from './WorkstreamTaskDetail';

function renderTaskDetail(overrides = {}) {
  const props = {
    task: {
      id: 'task-1',
      title: 'Triage issue',
      description: '',
      priority: 'medium',
      status: 'open',
      deadline: '',
      assignee: 'Alice Example',
      assignee_email: 'alice@example.com',
      requester: '',
      tags: [],
      comments: [],
      linked_items: [],
      created_at: '2026-04-11T09:00:00Z',
    },
    workstream: {
      id: 'ws-1',
      title: 'Product Ops',
    },
    currentUser: 'Alice Example',
    userEmail: 'alice@example.com',
    entries: [],
    onBack: vi.fn(),
    onUpdate: vi.fn().mockResolvedValue(null),
    onDelete: vi.fn(),
    onConvert: vi.fn(),
    USERS: ['Alice Example'],
    USERS_WITH_EMAILS: [{ name: 'Alice Example', email: 'alice@example.com' }],
    ...overrides,
  };

  render(<WorkstreamTaskDetail {...props} />);
  return props;
}

describe('WorkstreamTaskDetail failed save handling', () => {
  it('reverts the completion toggle when the save fails', async () => {
    const props = renderTaskDetail();

    fireEvent.click(screen.getByText('Mark Done'));

    await waitFor(() => {
      expect(screen.getByText('Mark Done')).toBeInTheDocument();
    });

    expect(props.onUpdate).toHaveBeenCalledWith('task-1', 'ws-1', { status: 'done' });
  });

  it('stores effort separately from user tags', async () => {
    const props = renderTaskDetail({
      task: {
        id: 'task-1',
        title: 'Triage issue',
        description: '',
        priority: 'medium',
        status: 'open',
        deadline: '',
        assignee: 'Alice Example',
        assignee_email: 'alice@example.com',
        requester: '',
        tags: ['customer', 'effort:medium'],
        comments: [],
        linked_items: [],
        created_at: '2026-04-11T09:00:00Z',
      },
      onUpdate: vi.fn().mockResolvedValue({
        id: 'task-1',
        tags: ['customer', 'effort:low'],
      }),
    });

    fireEvent.change(screen.getByLabelText('Effort'), { target: { value: 'low' } });

    await waitFor(() => {
      expect(props.onUpdate).toHaveBeenCalledWith('task-1', 'ws-1', {
        tags: ['customer', 'effort:low'],
      });
    });

    expect(screen.getByText('customer')).toBeInTheDocument();
    expect(screen.queryByText('effort:medium')).not.toBeInTheDocument();
  });
});
