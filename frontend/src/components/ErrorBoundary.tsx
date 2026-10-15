import { Component, ReactNode } from 'react'

/** Last line of defence: a render error shows a recovery screen instead of a blank page. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: unknown) { console.error('UI error', error) } // hook Sentry here
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="boot" role="alert" style={{ flexDirection: 'column', gap: 12 }}>
        <b style={{ fontSize: 18 }}>Something went wrong</b>
        <span>Reload the page. If it keeps happening, contact your administrator.</span>
        <button className="btn p" onClick={() => window.location.reload()}>Reload</button>
      </div>
    )
  }
}
