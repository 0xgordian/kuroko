import { Component, type ReactNode, type ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex items-center justify-center p-8 border" style={{ backgroundColor: '#111', borderColor: 'rgba(255,0,0,0.3)' }}>
          <div className="text-center">
            <p className="font-terminal text-sm mb-2" style={{ color: '#f87171' }}>Something went wrong</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="font-terminal text-xs px-3 py-1"
              style={{ backgroundColor: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 8 }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}