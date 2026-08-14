import { FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { Button, Field } from '../components/UI';
import { useAuth } from '../context/AuthContext';

export function ResetPasswordPage() {
  const { requestPasswordReset, confirmPasswordReset } = useAuth();
  const [params] = useSearchParams();
  const queryToken = params.get('token') ?? '';
  const [token, setToken] = useState(queryToken);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const hasToken = token.trim().length > 0;

  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const response = await requestPasswordReset(email);
      setStatus(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not request a reset email.');
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const response = await confirmPasswordReset(token, newPassword);
      setStatus(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset the password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Password reset"
      title="Choose a new password"
      description="If you came from an email link, confirm the token and set a new password. Otherwise request a reset email."
      footer={
        <p>
          <Link to="/login">Back to sign in</Link>
        </p>
      }
    >
      {status ? <div className="success-banner">{status}</div> : null}
      {error ? <div className="form-error">{error}</div> : null}

      {hasToken ? (
        <form className="auth-form" onSubmit={handleConfirm}>
          <Field label="Reset token">
            <input className="input" value={token} onChange={(event) => setToken(event.target.value)} />
          </Field>
          <Field label="New password" hint="At least 8 characters.">
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </Field>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving...' : 'Reset password'}
          </Button>
        </form>
      ) : (
        <form className="auth-form" onSubmit={handleRequest}>
          <Field label="Email address">
            <input
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          <Button type="submit" disabled={busy}>
            {busy ? 'Sending...' : 'Send reset email'}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

