import { Component, type ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: string }> {
  state = { error: '' }
  static getDerivedStateFromError(e: unknown) {
    return { error: String(e instanceof Error ? e.message : e) }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 z-[80] bg-paper flex items-center justify-center p-8">
          <div className="max-w-lg text-center space-y-3">
            <div className="text-[14px] text-e-4 font-medium">App error</div>
            <div className="text-[12px] font-mono text-graphite-mid break-all">{this.state.error}</div>
            <button
              onClick={() => { this.setState({ error: '' }); window.location.reload() }}
              className="px-4 py-1.5 text-[13px] border border-line hover:bg-paper-2 cursor-pointer"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
