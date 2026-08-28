import { Link } from 'react-router-dom';
import { Panel } from '../components/UI';
import { BrandWordmark } from '../components/BrandWordmark';

const LAST_UPDATED = 'August 28, 2026';

export function TermsPage() {
  return (
    <main className="landing-shell legal-shell">
      <header className="landing-topbar">
        <BrandWordmark subtitle="Home maintenance, organized" />
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
          <p>Last updated: {LAST_UPDATED}</p>
          <p>
            These Terms of Service apply to Hupkeep, a home-maintenance workspace that helps users organize homes,
            repairs, maintenance history, schedules, assets, warranties, documents, reminders, and related
            information. By using Hupkeep, you agree to these terms.
          </p>

          <h3>Your account</h3>
          <p>
            You are responsible for the information you provide, for keeping your account credentials secure, and for
            all activity that happens through your account. If you use Google Sign-In, you are responsible for the
            security of the Google account connected to Hupkeep.
          </p>

          <h3>Your content</h3>
          <p>
            You keep ownership of the information and content you submit to Hupkeep. You grant Hupkeep the limited
            rights needed to host, store, process, display, transmit, back up, and otherwise operate the service so we
            can provide the features you choose to use.
          </p>
          <p>
            Do not upload content that you do not have the right to use, that is unlawful, or that could harm the
            service or other users.
          </p>

          <h3>Acceptable use</h3>
          <p>When using Hupkeep, you agree not to:</p>
          <ul>
            <li>misuse the service or attempt unauthorized access;</li>
            <li>probe, attack, or disrupt the platform or its underlying systems;</li>
            <li>upload malicious files, scripts, or harmful content;</li>
            <li>use the service for unlawful activity; or</li>
            <li>interfere with other users or the operation of the product.</li>
          </ul>

          <h3>Maintenance and safety disclaimer</h3>
          <p>
            Hupkeep is an organizational and informational tool. It does not replace professional advice from
            contractors, electricians, plumbers, engineers, inspectors, safety professionals, or other qualified
            experts. You are responsible for your own maintenance decisions, safety choices, and any actions taken
            based on information in the service.
          </p>

          <h3>Third-party services</h3>
          <p>
            Hupkeep depends on third-party services to operate, including hosting, deployment, authentication,
            database storage, file storage, and email delivery. These services may process your information as needed
            to provide the product, support sign-in, send verification or password reset emails, and store uploaded
            content.
          </p>

          <h3>Service changes and availability</h3>
          <p>
            Features may change over time as Hupkeep evolves. We may suspend, limit, or discontinue parts of the
            service when necessary. We do not guarantee uninterrupted or error-free availability.
          </p>

          <h3>Termination or restriction</h3>
          <p>
            We may restrict or terminate access to Hupkeep if we believe these terms have been violated, if the
            service is being abused, or if doing so is necessary to protect the product, users, or infrastructure.
          </p>

          <h3>General limits</h3>
          <p>
            The service is provided in a practical, good-faith manner for personal home organization. To the extent
            allowed by law, Hupkeep is not responsible for indirect, incidental, or consequential losses arising from
            use of the service.
          </p>

          <h3>Changes to these terms</h3>
          <p>
            We may update these Terms of Service from time to time. The updated version will be posted on this page
            with a new last-updated date.
          </p>

        </div>
      </Panel>

      <footer className="landing-footer">
        <span>Hupkeep</span>
        <div className="legal-links">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/login">Sign in</Link>
        </div>
      </footer>
    </main>
  );
}
