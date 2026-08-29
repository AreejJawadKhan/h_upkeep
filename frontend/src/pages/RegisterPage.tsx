import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { Button, Field } from '../components/UI';
import { useAuth } from '../context/AuthContext';

export function RegisterPage() {
  const { user, ready, register, googleLoginUrl } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
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
      await register(form);
      navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Create account"
      title="Create your Hupkeep account"
      description="Sign up with email verification so your account stays protected from the start."
      footer={
        <p>
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <Field label="Name">
          <input
            className="input"
            autoComplete="name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
        </Field>

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

        <Field label="Password" hint="At least 8 characters.">
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
          />
        </Field>

        {error ? (
          <div className="form-error" role="alert" aria-live="assertive">
            {error}
          </div>
        ) : null}

        <Button type="submit" disabled={busy}>
          {busy ? 'Creating account...' : 'Create account'}
        </Button>

        <Button variant="secondary" href={googleLoginUrl} external>
          Continue with Google
        </Button>
      </form>
    </AuthShell>
  );
}
