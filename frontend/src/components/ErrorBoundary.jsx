import React from 'react';

// Simple reusable error boundary so that a rendering error in any
// subtree shows a fallback message instead of a blank screen.
// Docs: https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    // Update state so the next render shows the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Log error details for debugging or monitoring.
    console.error('ErrorBoundary caught an error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 text-center">
          <h2 className="text-2xl font-semibold text-red-600">Something went wrong</h2>
          <p className="text-sm opacity-75">Try refreshing the page or checking the console for details.</p>
        </div>
      );
    }
    return this.props.children;
  }
} 