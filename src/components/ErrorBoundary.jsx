// Error boundary component for React error handling
import React from 'react';
import './ErrorBoundary.css';

class ErrorBoundaryClass extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    this.setState({
      error,
      errorInfo,
    });

    // Log to console in development
    if (import.meta.env.MODE === 'development' || import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // In production, you could send this to an error reporting service
    // e.g., Sentry, LogRocket, etc.
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      // Default fallback UI
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <h2>Something went wrong</h2>
            <p>We're sorry, but something unexpected happened.</p>
            {import.meta.env.MODE === 'development' && this.state.error && (
              <details className="error-boundary-details">
                <summary>Error details (development only)</summary>
                <pre>{this.state.error.toString()}</pre>
                {this.state.errorInfo && (
                  <pre>{this.state.errorInfo.componentStack}</pre>
                )}
              </details>
            )}
            <div className="error-boundary-actions">
              <button
                type="button"
                onClick={this.handleReset}
                className="error-boundary-button"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => {
                  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '';
                  window.location.href = base ? `${base}/` : '/';
                }}
                className="error-boundary-button error-boundary-button-secondary"
              >
                Go to home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Error boundary component wrapper with navigation support
 */
export function ErrorBoundary({ children, fallback, onReset }) {
  return (
    <ErrorBoundaryClass fallback={fallback} onReset={onReset}>
      {children}
    </ErrorBoundaryClass>
  );
}

export default ErrorBoundary;
