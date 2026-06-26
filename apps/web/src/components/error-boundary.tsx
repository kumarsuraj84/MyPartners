'use client'
import React from 'react'

interface Props { children: React.ReactNode; fallback?: React.ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm font-medium text-foreground/70">Something went wrong loading this page.</p>
          <p className="text-xs text-muted-foreground mt-1">Try refreshing — your data is safe.</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-4 text-xs text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
