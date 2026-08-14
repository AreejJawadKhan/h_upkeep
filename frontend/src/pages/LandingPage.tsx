import { Link, Navigate } from 'react-router-dom';
import { Button, Panel } from '../components/UI';
import { useAuth } from '../context/AuthContext';

const featureCards = [
  {
    title: 'Homes with context',
    body: 'Store address, property type, and year built in one visible card.',
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
        <div className="brand-lockup">
          <div className="brand-mark">HR</div>
          <div>
            <p className="eyebrow">HomeRepair Log</p>
            <h1>Field Journal</h1>
          </div>
        </div>
        <div className="landing-actions">
          <Button variant="ghost" href="/login">Sign in</Button>
          <Button variant="primary" href="/register">Create account</Button>
        </div>
      </header>

      <section className="landing-grid">
        <div className="hero-copy">
          <div className="hero-tag">Home maintenance, but calm.</div>
          <h2>Track repairs, rooms, systems, and reminders in a workspace that feels human.</h2>
          <p>
            HomeRepair Log turns the scattered stuff around a house into a structured history:
            what was fixed, where it lives, and what comes next.
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
        <span>Built as a real product, not a mock dashboard.</span>
        <Link to="/login">Already have an account?</Link>
      </footer>
    </main>
  );
}

