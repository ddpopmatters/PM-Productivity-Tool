import { render, screen, fireEvent } from '@testing-library/react';
import DetailsCard from './DetailsCard';

// Mock config to avoid loading full config module
vi.mock('../../../utils/config', () => ({
  SEED_USERS: [
    { name: 'Alice', email: 'alice@pm.org', team: 'Comms' },
    { name: 'Bob', email: 'bob@pm.org', team: 'Digital' },
  ],
  TEAMS: ['Comms', 'Digital', 'Policy'],
  PHASES: ['Q1', 'Q2', 'Q3', 'Q4'],
  getPhaseFromDate: vi.fn(() => 'Q1'),
}));

const baseEntry = {
  id: 'entry-1',
  title: 'Test Project',
  owner: ['Alice'],
  ownerEmail: ['alice@pm.org'],
  collaborators: ['Bob'],
  team: 'Comms',
  date: '2025-06-15',
  timelineValue: '2025-06-15',
  phase: 'Q2',
  itemType: 'project',
};

const baseProps = () => ({
  entry: { ...baseEntry },
  canEdit: true,
  onUpdateEntry: vi.fn(),
  USERS: ['Alice', 'Bob', 'Charlie'],
});

describe('DetailsCard', () => {
  it('renders the details card with owner and team info', () => {
    render(<DetailsCard {...baseProps()} />);
    expect(screen.getByText('Details')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Comms')).toBeInTheDocument();
  });

  it('shows collaborators', () => {
    render(<DetailsCard {...baseProps()} />);
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows edit button when canEdit is true', () => {
    render(<DetailsCard {...baseProps()} />);
    const editBtn = screen.getByTitle('Edit details');
    expect(editBtn).toBeInTheDocument();
  });

  it('does not show edit button when canEdit is false', () => {
    const props = baseProps();
    props.canEdit = false;
    render(<DetailsCard {...props} />);
    expect(screen.queryByTitle('Edit details')).not.toBeInTheDocument();
  });

  it('enters edit mode on clicking edit', () => {
    render(<DetailsCard {...baseProps()} />);
    fireEvent.click(screen.getByTitle('Edit details'));
    // In edit mode, team selector should be visible
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('saves details and exits edit mode', () => {
    const props = baseProps();
    render(<DetailsCard {...props} />);
    fireEvent.click(screen.getByTitle('Edit details'));
    fireEvent.click(screen.getByText('Save'));
    expect(props.onUpdateEntry).toHaveBeenCalledWith(
      'entry-1',
      expect.objectContaining({ owner: ['Alice'], team: 'Comms' }),
    );
  });

  it('cancels edit mode without saving', () => {
    const props = baseProps();
    render(<DetailsCard {...props} />);
    fireEvent.click(screen.getByTitle('Edit details'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(props.onUpdateEntry).not.toHaveBeenCalled();
  });

  it('shows phase when provided', () => {
    render(<DetailsCard {...baseProps()} />);
    expect(screen.getByText('Q2')).toBeInTheDocument();
  });
});
