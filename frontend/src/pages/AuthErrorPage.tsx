import { Link, useSearchParams } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { Button } from '../components/UI';

const REASONS: Record<string, string> = {
  google_not_configured: 'Google sign-in is not enabled on this server.',
  access_denied: 'You declined the Google sign-in request.',
  invalid_state: 'The sign-in state could not be verified.',
  missing_code: 'Google did not return an authorization code.',
  google_api_error: 'Google returned an error while completing sign-in.',
  incomplete_profile: 'The Google profile information was incomplete.',
  email_conflict: 'That email is already registered as a local account.',
};

export function AuthErrorPage() {
  const [params] = useSearchParams();
  const reason = params.get('reason') ?? 'unknown';

  return (
    <AuthShell
      eyebrow="Sign-in issue"
      title="Google login did not complete"
      description={REASONS[reason] ?? 'Something interrupted the Google callback flow.'}
      footer={
        <p>
          <Link to="/login">Back to sign in</Link>
        </p>
      }
    >
      <div className="empty-state compact" role="status" aria-live="polite">
        <h3>Try again from the login screen</h3>
        <p>If this keeps happening, the backend configuration for Google OAuth may need a check.</p>
        <Button href="/login">Return to login</Button>
      </div>
    </AuthShell>
  );
}
