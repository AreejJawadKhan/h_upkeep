import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { PreferencesProvider } from '../src/context/PreferencesContext';
import type { User } from '../src/lib/types';

const authMock = vi.hoisted(() => {
  const state: any = {
    user: null as User | null,
    accessToken: null as string | null,
    ready: true,
    googleLoginUrl: 'https://accounts.google.com/o/oauth2/auth?mock=1',
  };

  state.login = vi.fn(async ({ email }: { email: string; password: string }) => {
    state.user = {
      id: 1,
      name: 'Areej Khan',
      email,
      email_verified: true,
      created_at: '2026-08-28T00:00:00Z',
    };
    state.accessToken = 'access-token';
  });
  state.register = vi.fn(async ({ name, email }: { name: string; email: string; password: string }) => ({
    id: 2,
    name,
    email,
    email_verified: false,
    created_at: '2026-08-28T00:00:00Z',
  }));
  state.logout = vi.fn(async () => {});
  state.refreshSession = vi.fn(async () => null);
  state.completeGoogleLogin = vi.fn(async () => {});
  state.verifyEmail = vi.fn(async () => ({ message: 'Email verified.' }));
  state.resendVerification = vi.fn(async () => ({ message: 'Verification email resent.' }));
  state.requestPasswordReset = vi.fn(async () => ({ message: 'Password reset email sent.' }));
  state.confirmPasswordReset = vi.fn(async () => ({ message: 'Password has been reset.' }));
  state.createHome = vi.fn();
  state.updateHome = vi.fn();
  state.deleteHome = vi.fn();
  state.createArea = vi.fn();
  state.updateArea = vi.fn();
  state.deleteArea = vi.fn();
  state.createAsset = vi.fn();
  state.updateAsset = vi.fn();
  state.deleteAsset = vi.fn();
  state.setAccessToken = vi.fn((token: string | null) => {
    state.accessToken = token;
  });

  return { state };
});

vi.mock('../src/context/AuthContext', () => ({
  useAuth: () => authMock.state,
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PreferencesProvider>
        <App />
      </PreferencesProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  authMock.state.user = null;
  authMock.state.accessToken = null;
  vi.clearAllMocks();
});

describe('frontend workspace', () => {
  test('landing page renders the product story and legal links', () => {
    renderAt('/');

    expect(screen.getByRole('heading', { name: /everything for your home, organized\./i })).toBeInTheDocument();
    expect(
      screen.getByText(/keep maintenance, appliances, warranties, documents, and expenses in one place\./i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /terms of service/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument();
  });

  test('login form requires credentials and enters the homes workspace after submit', async () => {
    const user = userEvent.setup();
    renderAt('/login');

    expect(screen.getByLabelText(/email/i)).toBeRequired();
    expect(screen.getByLabelText(/password/i)).toBeRequired();

    await user.type(screen.getByLabelText(/email/i), 'owner@example.com');
    await user.type(screen.getByLabelText(/password/i), 'StrongPass123!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(authMock.state.login).toHaveBeenCalledWith({
      email: 'owner@example.com',
      password: 'StrongPass123!',
    });
    expect(await screen.findByRole('heading', { name: /my home/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  test('registration forwards the user to the verification screen with the submitted email', async () => {
    const user = userEvent.setup();
    renderAt('/register');

    await user.type(screen.getByLabelText(/^name$/i), 'Areej Khan');
    await user.type(screen.getByLabelText(/email/i), 'new.user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'StrongPass123!');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(authMock.state.register).toHaveBeenCalledWith({
      name: 'Areej Khan',
      email: 'new.user@example.com',
      password: 'StrongPass123!',
    });
    expect(await screen.findByRole('heading', { name: /confirm your email/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('new.user@example.com')).toBeInTheDocument();
  });

  test('verification token in the query string triggers the verification flow automatically', async () => {
    renderAt('/verify-email?token=verify-token-123');

    expect(authMock.state.verifyEmail).toHaveBeenCalledWith('verify-token-123');
    expect(await screen.findByText(/email verified\./i)).toBeInTheDocument();
  });

  test('password reset request mode sends a reset email', async () => {
    const user = userEvent.setup();
    renderAt('/reset-password');

    await user.type(screen.getByLabelText(/^email address$/i), 'reset@example.com');
    await user.click(screen.getByRole('button', { name: /send reset email/i }));

    expect(authMock.state.requestPasswordReset).toHaveBeenCalledWith('reset@example.com');
    expect(await screen.findByText(/password reset email sent\./i)).toBeInTheDocument();
  });

  test('password reset token mode confirms a new password', async () => {
    const user = userEvent.setup();
    renderAt('/reset-password?token=reset-token-123');

    expect(screen.getByDisplayValue('reset-token-123')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/new password/i), 'NewStrongPass123!');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(authMock.state.confirmPasswordReset).toHaveBeenCalledWith(
      'reset-token-123',
      'NewStrongPass123!',
    );
    expect(await screen.findByText(/password has been reset\./i)).toBeInTheDocument();
  });
});
