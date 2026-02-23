import { render, screen, fireEvent } from '@testing-library/react';
import DashboardCalendar from './DashboardCalendar';

const baseProps = () => ({
  today: '2025-06-15',
  getScheduledItems: vi.fn(() => []),
  onOpenEntry: vi.fn(),
  onOpenWorkstreamTask: vi.fn(),
});

describe('DashboardCalendar', () => {
  it('renders calendar heading', () => {
    render(<DashboardCalendar {...baseProps()} />);
    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });

  it('renders month view by default with day headers', () => {
    render(<DashboardCalendar {...baseProps()} />);
    expect(screen.getByText('Mo')).toBeInTheDocument();
    expect(screen.getByText('Su')).toBeInTheDocument();
  });

  it('switches to week view', () => {
    render(<DashboardCalendar {...baseProps()} />);
    fireEvent.change(screen.getByDisplayValue('Month'), { target: { value: 'week' } });
    // Week view shows 7 day columns with short weekday names
    expect(screen.getByText('Mon')).toBeInTheDocument();
  });

  it('switches to day view', () => {
    render(<DashboardCalendar {...baseProps()} />);
    fireEvent.change(screen.getByDisplayValue('Month'), { target: { value: 'day' } });
    expect(screen.getByText('No items scheduled')).toBeInTheDocument();
  });

  it('shows selected date detail when clicking a day in month view', () => {
    const props = baseProps();
    props.getScheduledItems.mockReturnValue([]);
    render(<DashboardCalendar {...props} />);

    // Click on day 15
    const day15 = screen.getByText('15');
    fireEvent.click(day15);

    // Should show selected date detail section
    expect(screen.getByText('No items scheduled')).toBeInTheDocument();
  });

  it('calls getScheduledItems for each rendered day', () => {
    const props = baseProps();
    render(<DashboardCalendar {...props} />);
    // In month view, getScheduledItems is called for each day of the month
    expect(props.getScheduledItems).toHaveBeenCalled();
    // At least 28 days in any month
    expect(props.getScheduledItems.mock.calls.length).toBeGreaterThanOrEqual(28);
  });
});
