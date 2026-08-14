import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { Button, Field } from '../components/UI';
import { useAuth } from '../context/AuthContext';

export function VerifyEmailPage() {
  const { verifyEmail, resendVerification } = useAuth();
  const [params] = useSearchParams();
  const queryToken = params.get('token') ?? '';
  const queryEmail = params.get('email') ?? '';
  const [token, setToken] = useState(queryToken);
  const [email, setEmail] = useState(queryEmail);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!queryToken) return;
    (async () => {
      setBusy(true);
      try {
        const response = await verifyEmail(queryToken);
        setStatus(response.message);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Verification link is not valid.');
      } finally {
        setBusy(false);
      }
    })();
  }, [queryToken, verifyEmail]);

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const response = await verifyEmail(token);
      setStatus(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification link is not valid.');
    } finally {
      setBusy(false);
    }
  }

  async function handleResend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const response = await resendVerification(email);
      setStatus(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend verification email.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Email verification"
      title="Confirm your address"
      description="Paste the verification token here if you opened the email outside the browser, or resend a new link."
      footer={
        <p>
          <Link to="/login">Back to sign in</Link>
        </p>
      }
    >
      {status ? <div className="success-banner">{status}</div> : null}
      {error ? <div className="form-error">{error}</div> : null}

      <form className="auth-form" onSubmit={handleVerify}>
        <Field label="Verification token" hint="The token lives in the email link.">
          <input className="input" value={token} onChange={(event) => setToken(event.target.value)} />
        </Field>
        <Button type="submit" disabled={busy}>
          {busy ? 'Verifying...' : 'Verify email'}
        </Button>
      </form>

      <div className="auth-divider">or resend a fresh link</div>

      <form className="auth-form" onSubmit={handleResend}>
        <Field label="Email address">
          <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Button variant="secondary" type="submit" disabled={busy}>
          {busy ? 'Sending...' : 'Resend verification'}
        </Button>
      </form>
    </AuthShell>
  );
}

