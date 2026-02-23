import { render, screen, fireEvent } from '@testing-library/react';
import CommentsSection from './CommentsSection';

const baseProps = () => ({
  entry: {
    id: 'entry-1',
    title: 'Test Entry',
    comments: [],
    collaborators: ['Alice'],
    owner: ['Bob'],
  },
  currentUser: 'Dan',
  USERS: ['Alice', 'Bob', 'Charlie', 'Dan'],
  onUpdateEntry: vi.fn(),
  userProfilesCache: [
    { name: 'Alice', email: 'alice@pm.org' },
    { name: 'Bob', email: 'bob@pm.org' },
  ],
  sendNotificationEmail: vi.fn(),
});

describe('CommentsSection', () => {
  it('renders empty state when no comments', () => {
    render(<CommentsSection {...baseProps()} />);
    expect(screen.getByText(/No comments yet/)).toBeInTheDocument();
  });

  it('renders existing comments', () => {
    const props = baseProps();
    props.entry.comments = [
      { id: 'c1', text: 'First comment', author: 'Alice', timestamp: '2025-01-01T12:00:00Z' },
      { id: 'c2', text: 'Second comment', author: 'Bob', timestamp: '2025-01-02T12:00:00Z' },
    ];
    render(<CommentsSection {...props} />);
    expect(screen.getByText('First comment')).toBeInTheDocument();
    expect(screen.getByText('Second comment')).toBeInTheDocument();
  });

  it('submits a new comment', () => {
    const props = baseProps();
    render(<CommentsSection {...props} />);

    const textarea = screen.getByPlaceholderText(/Add a comment/);
    fireEvent.change(textarea, { target: { value: 'My new comment' } });
    fireEvent.click(screen.getByText('Post Comment'));

    expect(props.onUpdateEntry).toHaveBeenCalledWith('entry-1', {
      comments: [expect.objectContaining({ text: 'My new comment', author: 'Dan' })],
    });
  });

  it('does not submit empty comment', () => {
    const props = baseProps();
    render(<CommentsSection {...props} />);
    fireEvent.click(screen.getByText('Post Comment'));
    expect(props.onUpdateEntry).not.toHaveBeenCalled();
  });

  it('shows mention dropdown when typing @', () => {
    const props = baseProps();
    render(<CommentsSection {...props} />);

    const textarea = screen.getByPlaceholderText(/Add a comment/);
    fireEvent.change(textarea, { target: { value: 'Hey @' } });
    expect(screen.getByText('Mention someone')).toBeInTheDocument();
  });

  it('sends notification email when mentioning a user', () => {
    const props = baseProps();
    render(<CommentsSection {...props} />);

    const textarea = screen.getByPlaceholderText(/Add a comment/);
    fireEvent.change(textarea, { target: { value: 'Hello @Alice ' } });
    fireEvent.click(screen.getByText('Post Comment'));

    expect(props.sendNotificationEmail).toHaveBeenCalledWith(
      'alice@pm.org', 'Alice', 'mention', 'Test Entry', 'entry-1',
      expect.objectContaining({ comment: expect.any(String) }),
    );
  });
});
