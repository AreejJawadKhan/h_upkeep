import { Link, Navigate } from 'react-router-dom';
import { Button, Panel } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { BrandWordmark } from '../components/BrandWordmark';

const previewItems = [
  { title: 'Add your first home', body: 'Start with one address and build from there.' },
  { title: 'Keep maintenance on track', body: 'See what needs attention without digging through notes.' },
  { title: 'Store the important things', body: 'Receipts, manuals, warranties, and photos stay together.' },
];

export function LandingPage() {
  const { user, ready, googleLoginUrl } = useAuth();

  if (ready && user) {
    return <Navigate to="/app/homes" replace />;
  }

  return (
    <main className="landing-shell">
      <header className="landing-topbar">
        <BrandWordmark subtitle="Home care, organized" />
        <div className="landing-actions">
          <Button variant="ghost" href="/login">Sign in</Button>
          <Button variant="primary" href="/register">Get started</Button>
        </div>
      </header>

      <section className="landing-grid">
        <div className="hero-copy">
          <div className="hero-tag">Calm upkeep for real homes.</div>
          <h2>Everything for your home, organized.</h2>
          <p>Keep maintenance, appliances, warranties, documents, and expenses in one place.</p>

          <div className="hero-actions">
            <Button href="/register">Get started</Button>
            <Button variant="secondary" href={googleLoginUrl} external>
              Continue with Google
            </Button>
          </div>

          <div className="hero-metrics">
            <div className="metric-card">
              <span>Homes</span>
              <strong>Keep each place clear and current.</strong>
            </div>
            <div className="metric-card">
              <span>Work</span>
              <strong>See repairs, schedules, and warranties together.</strong>
            </div>
            <div className="metric-card">
              <span>Files</span>
              <strong>Store receipts, manuals, and photos safely.</strong>
            </div>
          </div>
        </div>

        <div className="preview-stack">
          <Panel title="A simple preview" eyebrow="What Hupkeep keeps">
            <div className="preview-list">
              {previewItems.map((item) => (
                <div className="preview-item" key={item.title}>
                  <strong>{item.title}</strong>
                  <span>{item.body}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Built for day-to-day use" eyebrow="Homeowner focused">
            <div className="preview-list">
              <div className="preview-item">
                <strong>Clear next steps</strong>
                <span>See what needs attention, what is due, and what can wait.</span>
              </div>
              <div className="preview-item">
                <strong>Quiet, readable layouts</strong>
                <span>Use the app without heavy visuals getting in the way.</span>
              </div>
            </div>
          </Panel>
        </div>
      </section>

      <footer className="landing-footer">
        <span>Hupkeep</span>
        <div className="legal-links">
          <Link to="/terms">Terms of Service</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/login">Already have an account?</Link>
        </div>
      </footer>
    </main>
  );
}
