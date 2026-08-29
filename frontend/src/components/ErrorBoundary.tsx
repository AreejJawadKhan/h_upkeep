import { Component, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="callback-shell">
          <div className="auth-card" style={{ maxWidth: '640px', margin: '0 auto' }}>
            <p className="eyebrow">Something went wrong</p>
            <h2>Hupkeep could not load this page.</h2>
            <p className="muted-copy" role="alert" aria-live="assertive">
              Please refresh the page. If the problem keeps happening, sign out and sign back in.
            </p>
            <div className="hero-actions">
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => window.location.reload()}
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
