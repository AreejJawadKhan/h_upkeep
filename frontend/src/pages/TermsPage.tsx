import { Link } from 'react-router-dom';
import { Panel } from '../components/UI';

export function TermsPage() {
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

      <Panel title="Terms of Service" eyebrow="Legal" className="legal-panel">
        <div className="legal-content">
          <p>Effective date: August 27, 2026</p>
          <p>
            HomeRepair Log is a home maintenance workspace for tracking homes, areas, assets, repairs, reminders,
            documents, and warranties. By using the service, you agree to use it only for lawful purposes and to
            provide accurate information where required.
          </p>
          <h3>Account responsibility</h3>
          <p>
            You are responsible for keeping your account credentials secure and for all activity that occurs under
            your account.
          </p>
          <h3>Acceptable use</h3>
          <p>
            You agree not to misuse the service, attempt unauthorized access, or interfere with the operation of the
            platform.
          </p>
          <h3>Service changes</h3>
          <p>
            We may update, change, suspend, or discontinue parts of the service as needed to maintain or improve the
            product.
          </p>
          <h3>Contact</h3>
          <p>
            If you have questions about these terms, contact us at{' '}
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
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/login">Sign in</Link>
        </div>
      </footer>
    </main>
  );
}
