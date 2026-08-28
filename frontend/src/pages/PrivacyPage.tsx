import { Link } from 'react-router-dom';
import { Panel } from '../components/UI';
import { BrandWordmark } from '../components/BrandWordmark';

const LAST_UPDATED = 'August 28, 2026';

export function PrivacyPage() {
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

      <Panel title="Privacy Policy" eyebrow="Legal" className="legal-panel">
        <div className="legal-content">
          <p>Last updated: {LAST_UPDATED}</p>
          <p>
            Hupkeep is a home maintenance app that helps people organize homes, repairs, schedules, assets,
            documents, warranties, and related maintenance history. This Privacy Policy explains what information
            Hupkeep collects, how it uses that information, and when service providers may process it on our behalf.
          </p>

          <h3>Information we collect</h3>
          <p>
            We collect the information you submit to create and use an account, including your name, email address,
            password-derived authentication data, and account status information such as whether your email has been
            verified.
          </p>
          <p>
            We also collect the home-maintenance content you choose to store in the product, such as homes, areas,
            assets, maintenance records, schedules, warranties, reminders, and comments or notes you add while using
            the app.
          </p>
          <p>
            If you upload files or images, we collect those uploads and related metadata needed to store and display
            them inside Hupkeep.
          </p>
          <p>
            Like most web applications, we also receive technical information such as device and browser data, request
            logs, IP-related network information, and session data needed to secure the service and keep you signed in.
          </p>

          <h3>Google Sign-In information</h3>
          <p>
            If you choose to sign in with Google, Hupkeep currently requests the <code>openid</code>, <code>email</code>,
            and <code>profile</code> scopes. We use that access to identify your Google account, confirm your email
            address, and create or sign you into a Hupkeep account.
          </p>
          <p>
            From Google, Hupkeep receives the information returned by those scopes, which currently includes your
            Google subject identifier, email address, and basic profile details such as your display name. We do not
            request access to Gmail, Google Drive, Google Calendar, contacts, or other Google services.
          </p>
          <p>
            Google account information is used only to authenticate you and maintain your Hupkeep account. When a
            Google sign-in creates or links an account, Hupkeep stores the Google subject identifier in its
            authentication records so the same Google identity can be recognized on later sign-ins.
          </p>

          <h3>How we use information</h3>
          <p>
            We use the information we collect to provide Hupkeep features, create and manage accounts, verify email
            addresses, send verification and password-reset emails, display your home information, protect the
            platform from abuse, and improve the product over time.
          </p>

          <h3>Session and authentication</h3>
          <p>
            Hupkeep uses signed access tokens and secure session cookies to keep you signed in. The session cookie is
            HttpOnly, and we use it only to maintain your sign-in and rotate access credentials. We also use a signed
            session value for the Google OAuth state check so the sign-in flow can be protected against cross-site
            request forgery.
          </p>

          <h3>Service providers</h3>
          <p>
            Hupkeep runs on third-party infrastructure and services that may process information on our behalf. These
            providers currently include hosting and deployment platforms such as Railway and Vercel, database hosting
            such as Neon or Railway Postgres, email delivery such as Resend, and file storage or delivery such as
            Cloudinary. Google also processes information when you use Google Sign-In.
          </p>
          <p>
            These providers process the information necessary to run the service, deliver emails, store files, host the
            application, and authenticate sign-in flows. We do not sell your personal information.
          </p>

          <h3>Data retention</h3>
          <p>
            We keep account and maintenance data for as long as it is needed to provide Hupkeep, maintain your account,
            resolve issues, and support the features you choose to use. We do not publish a fixed retention period here
            because retention can vary based on the type of data and whether the information is still needed for the
            service.
          </p>

          <h3>Security</h3>
          <p>
            We use reasonable technical and organizational safeguards designed to protect your information, including
            secure session handling, authentication checks, and restricted access controls. No online service can
            guarantee absolute security, and we cannot promise that information will never be compromised.
          </p>

          <h3>Your choices</h3>
          <p>
            You can update account information through the product where those features are available. If you need help
            with access, deletion, or privacy concerns, contact us using the details below.
          </p>

          <h3>Changes to this policy</h3>
          <p>
            We may update this Privacy Policy from time to time as Hupkeep changes or as our legal and operational
            needs change. The updated version will be posted on this page with a new last-updated date.
          </p>

        </div>
      </Panel>

      <footer className="landing-footer">
        <span>Hupkeep</span>
        <div className="legal-links">
          <Link to="/terms">Terms of Service</Link>
          <Link to="/login">Sign in</Link>
        </div>
      </footer>
    </main>
  );
}
