import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[EcoGuardian Error]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-[#fecaca] bg-[#fee2e2]/60 p-8 text-center backdrop-blur-sm">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#ba1a1a]/10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ba1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 className="font-serif text-lg font-bold text-[#ba1a1a]">
            Something went wrong
          </h3>
          <p className="mt-1 max-w-xs text-sm text-on-surface-variant">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={this.handleRetry}
            className="mt-4 rounded-full bg-[#ba1a1a] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#9a1515]"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
