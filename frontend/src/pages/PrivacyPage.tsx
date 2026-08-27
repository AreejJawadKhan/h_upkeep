import { Link } from 'react-router-dom';
import { Panel } from '../components/UI';

export function PrivacyPage() {
  return (
    <main className="landing-shell legal-shell">
      <header className="landing-topbar">
        <div className="brand-lockup">
          <div className="brand-mark">HR</div>
          <div>
            <p className="eyebrow">HomeRepair Log</p>
            <h1>Field Journal</h1>
          </div>
        </div>
        <div className="landing-actions">
          <Link className="btn btn-ghost" to="/login">
            Sign in
          </Link>
          <Link className="btn btn-primary" to="/register">
            Create account
          </Link>
        </div>
      </header>

      <Panel title="Privacy Policy" eyebrow="Legal" className="legal-panel">
        <div className="legal-content">
          <p>Effective date: August 27, 2026</p>
          <p>
            HomeRepair Log collects the information needed to provide the service, including account details, homes,
            areas, assets, maintenance entries, documents, and other content you choose to store in the workspace.
          </p>
          <h3>How we use information</h3>
          <p>
            We use your information to operate the service, authenticate you, send verification and password reset
            emails, display your workspace, and improve the product.
          </p>
          <h3>Email delivery</h3>
          <p>
            Verification and reset emails may be sent through a third-party delivery provider such as Resend.
          </p>
          <h3>Sharing</h3>
          <p>
            We do not sell your personal information. We may share data with service providers that help run the
            product, such as hosting, email delivery, and analytics tooling where enabled.
          </p>
          <h3>Security</h3>
          <p>
            We use reasonable technical and organizational measures to protect your data, but no internet service can
            guarantee absolute security.
          </p>
          <h3>Contact</h3>
          <p>
            Questions about privacy can be sent to{' '}
            <a href="mailto:support@areejjkhan.tech">support@areejjkhan.tech</a>.
          </p>
          <p className="muted-copy">
            This page is a product-facing summary and should be reviewed by counsel before formal publication.
          </p>
        </div>
      </Panel>

      <footer className="landing-footer">
        <span>HomeRepair Log</span>
        <div className="legal-links">
          <Link to="/terms">Terms of Service</Link>
          <Link to="/login">Sign in</Link>
        </div>
      </footer>
    </main>
  );
}
