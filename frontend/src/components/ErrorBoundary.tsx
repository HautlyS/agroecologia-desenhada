import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Log error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // In production, you might want to log to a service like Sentry
      console.error('Production error:', { error: error.message, stack: error.stack });
    }

    this.setState({ errorInfo });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full space-y-4">
            <Alert variant="destructive" className="border-red-200 dark:border-red-800">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Oops! Something went wrong</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>
                  {process.env.NODE_ENV === 'development'
                    ? this.state.error?.message
                    : 'An unexpected error occurred while rendering this component.'
                  }
                </p>

                {process.env.NODE_ENV === 'development' && this.state.error?.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium">Error Details</summary>
                    <pre className="mt-2 text-xs bg-red-50 dark:bg-red-950 p-2 rounded overflow-auto max-h-32">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button onClick={this.handleReset} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="flex-1"
              >
                Reload Page
              </Button>
            </div>

            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              <p>If this problem persists, please contact support.</p>
              <p className="mt-1">Error ID: {Date.now().toString(36)}</p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback} onError={onError}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Hook for handling errors in functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: string) => {
    console.error('Error caught by error handler:', error, errorInfo);

    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error);
    }
  };
}