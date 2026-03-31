import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ThemeProvider } from './components/ThemeProvider';
import { useToast } from './components/ToastProvider.jsx';
import api from './lib/api.js';

import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import WorkspacePage from './pages/WorkspacePage';
import CreateProblemPage from './pages/CreateProblemPage';
import ProfilePage from './pages/ProfilePage';
import UserProfilePage from './pages/UserProfilePage';
import CommunityPage from './pages/CommunityPage';
import NotFoundPage from './pages/NotFoundPage';
import Navbar from './components/Navbar';

// Admin-only route wrapper
const AdminRoute = ({ children }) => {
  const { authUser, isCheckingAuth } = useAuthStore();

  if (isCheckingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#22c55e] border-t-transparent" />
      </div>
    );
  }

  if (!authUser || authUser.role !== "ADMIN") {
    return <Navigate to='/dashboard' replace />;
  }

  return children;
};

function App() {
  const { checkAuth, authUser } = useAuthStore();
  const { addToast } = useToast();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    let cancelled = false;
    let wakeToastShown = false;

    const showWakeToastTimer = setTimeout(() => {
      if (cancelled) return;
      wakeToastShown = true;
      addToast(
        "Starting the backend (Render free tier cold start). First load can take ~30–60 seconds — the server isn’t down.",
        "warning",
        12000,
      );
    }, 800);

    (async () => {
      try {
        await api.get("/health");
        if (cancelled) return;
        if (wakeToastShown) {
          addToast("Backend is awake. You’re good to go.", "success", 2500);
        }
      } catch {
        if (cancelled) return;
        addToast(
          "Backend is still starting up (Render free tier). Give it a moment and try again.",
          "warning",
          8000,
        );
      } finally {
        clearTimeout(showWakeToastTimer);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(showWakeToastTimer);
    };
  }, [addToast]);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="codedaily-theme">
      <div className="h-screen overflow-hidden bg-background text-foreground">
        <Navbar />
        <main className="h-[calc(100vh-3.5rem)] overflow-y-auto overflow-x-hidden no-scrollbar">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/dashboard" />} />
            <Route path="/signup" element={!authUser ? <SignupPage /> : <Navigate to="/dashboard" />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/problems/:slug"
              element={
                <ProtectedRoute>
                  <WorkspacePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/create-problem"
              element={
                <AdminRoute>
                  <CreateProblemPage />
                </AdminRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/user/:username"
              element={
                <ProtectedRoute>
                  <UserProfilePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/community/:slug"
              element={
                <ProtectedRoute>
                  <CommunityPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;