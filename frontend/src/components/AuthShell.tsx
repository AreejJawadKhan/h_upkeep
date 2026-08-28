import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BrandWordmark } from './BrandWordmark';

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
        <BrandWordmark subtitle={eyebrow} />
        <h1>{title}</h1>
        <p className="auth-story-copy">{description}</p>
        <div className="auth-story-notes">
          <div className="note-card">
            <span className="note-label">Keep track of</span>
            <strong>homes, repairs, receipts, and warranties</strong>
          </div>
          <div className="note-card">
            <span className="note-label">Made for</span>
            <strong>a calm home-maintenance routine</strong>
          </div>
        </div>
      </section>

      <section className="auth-card">
        {children}
        <div className="auth-footer">
          {footer ? <div className="auth-footer-main">{footer}</div> : null}
          <div className="legal-links auth-legal-links">
            <Link to="/terms">Terms of Service</Link>
            <Link to="/privacy">Privacy Policy</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
