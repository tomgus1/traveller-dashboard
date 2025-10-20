import React, { useState, useEffect, useCallback } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { useAuth } from "../hooks/useAuth";
import { useCampaignInvitations } from "../hooks/useCampaignInvitations";
import { supabase } from "../../infrastructure/database/supabase";
import type { CampaignInvitation } from "../../core/entities";

interface Character {
  id: string;
  name: string;
  campaign_id: string | null;
}

interface CampaignInvitationsProps {
  onInvitationAccepted?: () => void;
}

export const CampaignInvitations: React.FC<CampaignInvitationsProps> = ({
  onInvitationAccepted,
}) => {
  const { user } = useAuth();
  const {
    invitations,
    loading,
    error,
    acceptInvitation,
    declineInvitation,
    assignCharacterAndAccept,
  } = useCampaignInvitations();

  const [characters, setCharacters] = useState<Character[]>([]);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedInvitation, setSelectedInvitation] =
    useState<CampaignInvitation | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<string>("");
  const [processing, setProcessing] = useState(false);

  const loadStandaloneCharacters = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("characters")
        .select("id, name, campaign_id")
        .eq("owner_id", user.id)
        .is("campaign_id", null);

      if (!error && data) {
        setCharacters(data);
      }
    } catch {
      // Error handled silently
    }
  }, [user]);

  useEffect(() => {
    loadStandaloneCharacters();
  }, [loadStandaloneCharacters]);

  const handleQuickAccept = async (invitation: CampaignInvitation) => {
    setProcessing(true);
    try {
      const result = await acceptInvitation(invitation.id);
      if (result.success) {
        onInvitationAccepted?.();
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleAcceptWithCharacter = (invitation: CampaignInvitation) => {
    setSelectedInvitation(invitation);
    setShowAssignmentModal(true);
  };

  const handleAcceptWithCharacterAssignment = async () => {
    if (!selectedInvitation || !selectedCharacter) return;

    setProcessing(true);
    try {
      const result = await assignCharacterAndAccept(
        selectedInvitation.id,
        selectedCharacter
      );
      if (result.success) {
        setShowAssignmentModal(false);
        setSelectedInvitation(null);
        setSelectedCharacter("");
        await loadStandaloneCharacters(); // Refresh character list
        onInvitationAccepted?.();
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async (invitationId: string) => {
    setProcessing(true);
    try {
      await declineInvitation(invitationId);
    } finally {
      setProcessing(false);
    }
  };

  const formatRoles = (roles: CampaignInvitation["rolesOffered"]) => {
    const roleNames = [];
    if (roles.isAdmin) roleNames.push("Admin");
    if (roles.isGm) roleNames.push("GM");
    if (roles.isPlayer) roleNames.push("Player");
    return roleNames.length > 0 ? roleNames.join(", ") : "Player";
  };

  const formatDate = (date: Date | null) => {
    return date ? date.toLocaleDateString() : "No expiration";
  };

  if (loading) {
    return <div className="text-center py-4">Loading invitations...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-gray-500">
        <h3 className="text-lg font-medium mb-2">Campaign Invitations</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <h3 className="text-lg font-medium mb-2">No pending invitations</h3>
        <p>You don't have any pending campaign invitations at the moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Campaign Invitations</h2>

      {invitations.map((invitation) => (
        <div
          key={invitation.id}
          className="border rounded-lg p-4 bg-white shadow-sm"
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-semibold text-lg">
                {invitation.campaignName || "Unknown Campaign"}
              </h3>
              <p className="text-gray-600 text-sm">
                Invited by {invitation.invitedByName || "Unknown User"}
              </p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <div>Expires: {formatDate(invitation.expiresAt)}</div>
              <div>Roles: {formatRoles(invitation.rolesOffered)}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => handleQuickAccept(invitation)}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              Accept
            </Button>

            {characters.length > 0 && (
              <Button
                onClick={() => handleAcceptWithCharacter(invitation)}
                disabled={processing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Accept & Assign Character
              </Button>
            )}

            <Button
              onClick={() => handleDecline(invitation.id)}
              disabled={processing}
              variant="default"
            >
              Decline
            </Button>
          </div>
        </div>
      ))}

      {/* Character Assignment Modal */}
      <Modal
        isOpen={showAssignmentModal}
        onClose={() => {
          setShowAssignmentModal(false);
          setSelectedInvitation(null);
          setSelectedCharacter("");
        }}
        title="Accept Invitation & Assign Character"
      >
        <div className="space-y-4">
          {selectedInvitation && (
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-medium">{selectedInvitation.campaignName}</h4>
              <p className="text-sm text-gray-600">
                Roles: {formatRoles(selectedInvitation.rolesOffered)}
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="character-select"
              className="block text-sm font-medium mb-2"
            >
              Select a character to assign:
            </label>
            <select
              id="character-select"
              value={selectedCharacter}
              onChange={(e) => setSelectedCharacter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Choose a character...</option>
              {characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              onClick={() => {
                setShowAssignmentModal(false);
                setSelectedInvitation(null);
                setSelectedCharacter("");
              }}
              variant="default"
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAcceptWithCharacterAssignment}
              disabled={processing || !selectedCharacter}
              className="bg-green-600 hover:bg-green-700"
            >
              Accept & Assign
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
