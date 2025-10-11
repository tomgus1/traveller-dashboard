import { useState } from "react";
import { useCampaigns } from "../hooks/useCampaigns";
import { useAuth } from "../hooks/useAuth";
import CampaignSettings from "./CampaignSettings";

interface CampaignSelectorProps {
  onCampaignSelect: (campaignId: string) => void;
}

// eslint-disable-next-line max-lines-per-function
export default function CampaignSelector({
  onCampaignSelect,
}: CampaignSelectorProps) {
  const {
    campaigns,
    loading,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    getCampaignMembers,
    removeMember,
  } = useCampaigns();
  const { signOut } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignDescription, setNewCampaignDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim()) return;

    try {
      setCreating(true);
      await createCampaign(newCampaignName, newCampaignDescription);
      setNewCampaignName("");
      setNewCampaignDescription("");
      setShowCreateForm(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to create campaign:", error);
    } finally {
      setCreating(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400",
      gm: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400",
      player:
        "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400",
    };
    return (
      colors[role as keyof typeof colors] ||
      "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400"
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-zinc-50">
              Campaign Selection
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Choose a campaign to manage or create a new one
            </p>
          </div>
          <button
            onClick={signOut}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors border border-gray-300 dark:border-zinc-600 rounded-md hover:border-gray-400 dark:hover:border-zinc-500"
          >
            Sign Out
          </button>
        </div>

        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 dark:text-gray-500 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-zinc-50 mb-2">
              No campaigns yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Create your first campaign to get started
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Create Campaign
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="bg-white dark:bg-zinc-900 rounded-lg shadow hover:shadow-md transition-shadow p-6 border border-gray-200 dark:border-zinc-700 relative"
                >
                  {/* Settings button for admins */}
                  {campaign.role === "admin" && (
                    <div className="absolute top-4 right-4">
                      <CampaignSettings
                        campaign={campaign}
                        onUpdateCampaign={updateCampaign}
                        onDeleteCampaign={deleteCampaign}
                        onGetMembers={getCampaignMembers}
                        onRemoveMember={removeMember}
                      />
                    </div>
                  )}

                  {/* Campaign card content - clickable area */}
                  <div
                    className="cursor-pointer"
                    onClick={() => onCampaignSelect(campaign.id)}
                  >
                    <div className="flex justify-between items-start mb-3 pr-8">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-50 truncate">
                        {campaign.name}
                      </h3>
                      {campaign.role && (
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadge(campaign.role)}`}
                        >
                          {campaign.role.toUpperCase()}
                        </span>
                      )}
                    </div>

                    {campaign.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                        {campaign.description}
                      </p>
                    )}

                    <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                      <span>{campaign.member_count || 0} member(s)</span>
                      <span>
                        Created{" "}
                        {new Date(campaign.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Create New Campaign
              </button>
            </div>
          </>
        )}

        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 w-full max-w-md border dark:border-zinc-700">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-zinc-50">
                Create New Campaign
              </h2>

              <form onSubmit={handleCreateCampaign}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    value={newCampaignName}
                    onChange={(e) => setNewCampaignName(e.target.value)}
                    className="input w-full bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-600 text-gray-900 dark:text-zinc-50 placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="Enter campaign name"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={newCampaignDescription}
                    onChange={(e) => setNewCampaignDescription(e.target.value)}
                    className="input w-full bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-600 text-gray-900 dark:text-zinc-50 placeholder-gray-500 dark:placeholder-gray-400"
                    rows={3}
                    placeholder="Describe your campaign"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !newCampaignName.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 text-white rounded-lg transition-colors"
                  >
                    {creating ? "Creating..." : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
