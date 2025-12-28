import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./presentation/hooks/useAuth";
import { useAuthInvitationHandler } from "./hooks/useAuthInvitationHandler";
import AuthForm from "./presentation/components/AuthForm";
import ProfileSetup from "./presentation/components/ProfileSetup";
import MainDashboard from "./presentation/components/MainDashboard";
import Dashboard from "./presentation/components/Dashboard";
import DebugPanel from "./presentation/components/DebugPanel";
import { AppShell } from "./presentation/components/layout/AppShell";

function AppContent() {
  const { user, loading, completeProfile } = useAuth();

  // Handle campaign invitations for new users
  useAuthInvitationHandler();

  // Temporarily show debug panel to diagnose the issue
  const isDebugMode = false;

  if (isDebugMode) {
    return <DebugPanel />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  // Show profile setup if user hasn't completed their profile
  if (!user.profileCompleted) {
    return <ProfileSetup onComplete={completeProfile} />;
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<MainDashboard />} />
        <Route path="/campaigns" element={<MainDashboard />} />
        <Route path="/characters" element={<MainDashboard />} />
        <Route path="/campaign/:campaignId" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/traveller-dashboard">
      <AppContent />
    </BrowserRouter>
  );
}
