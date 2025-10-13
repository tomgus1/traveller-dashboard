import { useEffect, useState, useCallback } from "react";
import { getCampaignService } from "../core/container";
import type {
  CampaignWithMeta,
  CreateCampaignRequest,
  UpdateCampaignRequest,
} from "../core/entities";

export const useCampaigns = () => {
  const [campaigns, setCampaigns] = useState<CampaignWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const campaignService = getCampaignService();

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await campaignService.getCampaigns();

      if (result.success && result.data) {
        setCampaigns(result.data);
      } else {
        setError(result.error || "Failed to fetch campaigns");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [campaignService]);

  const createCampaign = async (request: CreateCampaignRequest) => {
    try {
      setError(null);

      const result = await campaignService.createCampaign(request);

      if (result.success) {
        await fetchCampaigns();
        return { success: true };
      }

      setError(result.error || "Failed to create campaign");
      return { success: false, error: result.error };
    } catch {
      const errorMsg = "An unexpected error occurred";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const updateCampaign = async (
    campaignId: string,
    request: UpdateCampaignRequest
  ) => {
    try {
      setError(null);

      const result = await campaignService.updateCampaign(campaignId, request);

      if (result.success) {
        await fetchCampaigns();
        return { success: true };
      }

      setError(result.error || "Failed to update campaign");
      return { success: false, error: result.error };
    } catch {
      const errorMsg = "An unexpected error occurred";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    try {
      setError(null);

      const result = await campaignService.deleteCampaign(campaignId);

      if (result.success) {
        await fetchCampaigns();
        return { success: true };
      }

      setError(result.error || "Failed to delete campaign");
      return { success: false, error: result.error };
    } catch {
      const errorMsg = "An unexpected error occurred";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return {
    campaigns,
    loading,
    error,
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
  };
};
