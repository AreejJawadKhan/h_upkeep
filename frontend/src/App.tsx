import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AppShell } from './components/AppShell';
import { LoadingState } from './components/UI';
import { useAuth } from './context/AuthContext';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { AuthErrorPage } from './pages/AuthErrorPage';
import { HomesPage } from './pages/HomesPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { WarrantiesPage } from './pages/WarrantiesPage';
import { SchedulesPage } from './pages/SchedulesPage';
import { SpendingPage } from './pages/SpendingPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { RegisterPage } from './pages/RegisterPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { ready, user } = useAuth();

  if (!ready) {
    return <LoadingState label="Opening your workspace..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/auth/error" element={<AuthErrorPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="homes" replace />} />
        <Route path="homes" element={<HomesPage />} />
        <Route path="schedules" element={<SchedulesPage />} />
        <Route path="spending" element={<SpendingPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="warranties" element={<WarrantiesPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
