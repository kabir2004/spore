'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
}

/**
 * Catches errors in the block editor tree so one bad block doesn't crash the whole app.
 */
export class EditorErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Editor error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                this.props.fallback ?? (
                    <div className="flex flex-col items-center justify-center min-h-[200px] px-6 py-12 text-center">
                        <p className="text-[15px] font-medium text-text-primary mb-1">Something went wrong</p>
                        <p className="text-[13px] text-text-muted mb-4">
                            This part of the page couldn’t be loaded. Try refreshing or opening the page again.
                        </p>
                        <button
                            type="button"
                            onClick={() => this.setState({ hasError: false })}
                            aria-label="Try again"
                            className="text-[13px] font-medium text-accent-blue hover:text-accent-blue-hover"
                        >
                            Try again
                        </button>
                    </div>
                )
            );
        }
        return this.props.children;
    }
}
