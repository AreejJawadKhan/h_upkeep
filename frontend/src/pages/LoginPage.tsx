import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { Button, Field } from '../components/UI';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { user, ready, login, googleLoginUrl } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (ready && user) {
    return <Navigate to="/app/homes" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(form);
      navigate('/app/homes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to your home workspace"
      description="Use your verified email/password account or continue with Google."
      footer={
        <p>
          New here? <Link to="/register">Create an account</Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <Field label="Email">
          <input
            className="input"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
        </Field>

        <Field label="Password">
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
          />
        </Field>

        {error ? <div className="form-error">{error}</div> : null}

        <Button type="submit" disabled={busy}>
          {busy ? 'Signing in...' : 'Sign in'}
        </Button>

        <Button variant="secondary" href={googleLoginUrl} external>
          Continue with Google
        </Button>

        <div className="form-links">
          <Link to="/reset-password">Forgot password?</Link>
          <Link to="/verify-email">Verify email</Link>
        </div>
      </form>
    </AuthShell>
  );
}

