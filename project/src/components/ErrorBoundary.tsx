import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
  fallbackMessage?: string
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('TalentRadar ErrorBoundary caught an unhandled error:', error, errorInfo)
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="card error-boundary-card">
          <div className="empty-ico" style={{ color: '#ff5d8f', background: 'rgba(255, 93, 143, .12)' }}>
            <AlertTriangle size={28} />
          </div>
          <h3>{this.props.fallbackTitle || 'Unable to display candidates'}</h3>
          <p className="muted small" style={{ maxWidth: '420px', margin: '8px auto 18px' }}>
            {this.props.fallbackMessage ||
              'A rendering issue was prevented. Click below to refresh the candidate list.'}
          </p>
          <button className="btn btn-primary btn-sm" onClick={this.handleReset}>
            <RotateCcw size={14} /> Refresh view
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
