import { Link, Navigate } from 'react-router-dom';
import { Button, Panel } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { BrandWordmark } from '../components/BrandWordmark';

const featureCards = [
  {
    title: 'Homes with context',
    body: 'Keep the property story, address, and build details visible at a glance.',
  },
  {
    title: 'Areas and assets',
    body: 'Keep rooms and systems connected without losing the hierarchy.',
  },
  {
    title: 'Safe auth flows',
    body: 'Verified email, Google sign-in, refresh cookies, and protected sessions.',
  },
];

export function LandingPage() {
  const { user, ready, googleLoginUrl } = useAuth();

  if (ready && user) {
    return <Navigate to="/app/homes" replace />;
  }

  return (
    <main className="landing-shell">
      <header className="landing-topbar">
        <BrandWordmark subtitle="Home upkeep, organized" />
        <div className="landing-actions">
          <Button variant="ghost" href="/login">Sign in</Button>
          <Button variant="primary" href="/register">Create account</Button>
        </div>
      </header>

      <section className="landing-grid">
        <div className="hero-copy">
          <div className="hero-tag">Calm upkeep for real homes.</div>
          <h2>Know what your home needs next, without digging through spreadsheets or scattered notes.</h2>
          <p>
            Hupkeep turns the scattered stuff around a house into a clear upkeep history: what was fixed, where it
            lives, and what comes next.
          </p>

          <div className="hero-actions">
            <Button href="/register">Get started</Button>
            <Button variant="secondary" href={googleLoginUrl} external>
              Continue with Google
            </Button>
          </div>

          <div className="hero-metrics">
            <div className="metric-card">
              <span>Auth</span>
              <strong>Email verification + refresh cookies</strong>
            </div>
            <div className="metric-card">
              <span>Structure</span>
              <strong>Homes, areas, assets</strong>
            </div>
            <div className="metric-card">
              <span>Next</span>
              <strong>Maintenance and scheduling</strong>
            </div>
          </div>
        </div>

          <div className="preview-stack">
          <Panel title="What the system keeps" eyebrow="Workspace preview">
            <div className="preview-list">
              <div className="preview-item">
                <strong>Kitchen</strong>
                <span>Area connected to a refrigerator, disposal, and plumbing notes.</span>
              </div>
              <div className="preview-item">
                <strong>Water heater</strong>
                <span>Asset card with purchase date, installation date, and lifespan.</span>
              </div>
              <div className="preview-item">
                <strong>Verification flow</strong>
                <span>Registration sends a verification email before login is enabled.</span>
              </div>
            </div>
          </Panel>

          <div className="feature-grid">
            {featureCards.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
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
