import React from 'react';
import Icon from './Icon';

/**
 * ErrorBoundary - Catches JavaScript errors in child components
 *
 * Prevents single component errors from crashing the entire app.
 * Displays a fallback UI with retry option when an error occurs.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log to console in development, could send to error tracking service
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-red-200">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Icon name="alert-triangle" className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-ocean-900 mb-2">
            Something went wrong
          </h2>
          <p className="text-graystone-600 text-sm mb-4 max-w-md">
            {this.props.message || 'This section encountered an error and could not be displayed.'}
          </p>
          {import.meta.env.DEV && this.state.error && (
            <details className="mb-4 text-left w-full max-w-md">
              <summary className="text-xs text-graystone-500 cursor-pointer hover:text-graystone-700">
                Error details (dev only)
              </summary>
              <pre className="mt-2 p-2 bg-graystone-100 rounded text-xs overflow-auto max-h-32 text-red-600">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 transition text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
