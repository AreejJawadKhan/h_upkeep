import type { ReactNode } from 'react';

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="auth-shell">
      <section className="auth-story">
        <div className="auth-story-badge">{eyebrow}</div>
        <h1>{title}</h1>
        <p className="auth-story-copy">{description}</p>
        <div className="auth-story-notes">
          <div className="note-card">
            <span className="note-label">Track</span>
            <strong>homes, systems, receipts, and warranties</strong>
          </div>
          <div className="note-card">
            <span className="note-label">Designed for</span>
            <strong>a warm, usable maintenance dashboard</strong>
          </div>
        </div>
      </section>

      <section className="auth-card">
        {children}
        {footer ? <div className="auth-footer">{footer}</div> : null}
      </section>
    </main>
  );
}

