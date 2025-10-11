import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import AuthForm from "./components/AuthForm";
import CampaignSelector from "./components/CampaignSelector";
import Dashboard from "./components/Dashboard";
import DebugPanel from "./components/DebugPanel";

export default function App() {
  const { user, loading } = useAuth();
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

  if (!selectedCampaignId) {
    return <CampaignSelector onCampaignSelect={setSelectedCampaignId} />;
  }

  return (
    <Dashboard
      campaignId={selectedCampaignId}
      onBackToCampaigns={() => setSelectedCampaignId(null)}
    />
  );
}
