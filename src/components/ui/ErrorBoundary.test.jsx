import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

// A component that throws on demand
function Thrower({ shouldThrow }) {
  if (shouldThrow) throw new Error('Test error');
  return <div>Child content</div>;
}

describe('ErrorBoundary', () => {
  // Suppress console.error from React and our ErrorBoundary during tests
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    console.error.mockRestore();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Hello world</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <Thrower shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/This section encountered an error/)).toBeInTheDocument();
  });

  it('renders custom message when provided', () => {
    render(
      <ErrorBoundary message="Custom error message">
        <Thrower shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <Thrower shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('resets and re-renders children when Try Again is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <Thrower shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Re-render with non-throwing child, then click Try Again
    rerender(
      <ErrorBoundary>
        <Thrower shouldThrow={false} />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByText('Try Again'));
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('shows Try Again button in default fallback', () => {
    render(
      <ErrorBoundary>
        <Thrower shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });
});
