import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { LoadingState, Panel } from '../components/UI';
import { useAuth } from '../context/AuthContext';

function parseFragment() {
  const fragment = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  return new URLSearchParams(fragment);
}

export function AuthCallbackPage() {
  const { completeGoogleLogin, user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');
  const [message, setMessage] = useState('Finishing Google sign-in...');
  const token = useMemo(() => parseFragment().get('access_token') ?? '', []);

  useEffect(() => {
    if (!window.location.hash) return;
    window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
  }, []);

  useEffect(() => {
    if (user) {
      setStatus('done');
      return;
    }

    if (!token) {
      setStatus('error');
      setMessage('The Google callback did not include an access token.');
      return;
    }

    (async () => {
      try {
        await completeGoogleLogin(token);
        setStatus('done');
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Google sign-in failed.');
      }
    })();
  }, [completeGoogleLogin, token, user]);

  if (status === 'done' && user) {
    return <Navigate to="/app/homes" replace />;
  }

  return (
    <main className="callback-shell">
      <Panel title="Google sign-in" eyebrow="Secure session">
        {status === 'loading' ? (
          <LoadingState label={message} />
        ) : (
          <div className="form-error" role="alert" aria-live="assertive">
            {message}
          </div>
        )}
      </Panel>
    </main>
  );
}
