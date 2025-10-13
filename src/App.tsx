import { useState } from "react";
import { useAuth } from "./presentation/hooks/useAuth";
import AuthForm from "./presentation/components/AuthForm";
import ProfileSetup from "./presentation/components/ProfileSetup";
import MainDashboard from "./presentation/components/MainDashboard";
import Dashboard from "./presentation/components/Dashboard";
import DebugPanel from "./presentation/components/DebugPanel";

export default function App() {
  const { user, loading, completeProfile } = useAuth();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null
  );

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

  if (!selectedCampaignId) {
    return <MainDashboard onCampaignSelect={setSelectedCampaignId} />;
  }

  return (
    <Dashboard
      campaignId={selectedCampaignId}
      onBackToCampaigns={() => setSelectedCampaignId(null)}
    />
  );
}
