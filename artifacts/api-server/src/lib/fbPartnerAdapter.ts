import { logger } from "./logger";

export interface CreateCampaignParams {
  headline: string;
  bodyText: string;
  imageUrl: string;
  dailyBudgetCents: number;
  targetingRadiusMiles: number;
  targetingLatitude: number;
  targetingLongitude: number;
  fbPageId: string;
  adAccountId: string;
  partnerToken: string;
}

export interface CreateCampaignResult {
  partnerCampaignId: string;
}

export interface VerifyLeadDeliveryResult {
  active: boolean;
  checkedAt: string;
}

export interface FbPartnerAdapter {
  createCampaign(params: CreateCampaignParams): Promise<CreateCampaignResult>;
  verifyLeadDelivery(partnerCampaignId: string): Promise<VerifyLeadDeliveryResult>;
}

/**
 * Stub adapter — returns plausible shaped responses without calling any real partner.
 * Swap this import in fb.ts once a real partner adapter is implemented.
 */
export const stubFbPartnerAdapter: FbPartnerAdapter = {
  async createCampaign(_params: CreateCampaignParams): Promise<CreateCampaignResult> {
    logger.warn(
      "stubFbPartnerAdapter.createCampaign: no real partner configured — returning stub campaign ID",
    );
    // Generate a plausible-looking partner campaign ID
    const stubId = `stub_camp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    return { partnerCampaignId: stubId };
  },

  async verifyLeadDelivery(partnerCampaignId: string): Promise<VerifyLeadDeliveryResult> {
    logger.warn(
      { partnerCampaignId },
      "stubFbPartnerAdapter.verifyLeadDelivery: no real partner configured — returning stub active status",
    );
    return { active: true, checkedAt: new Date().toISOString() };
  },
};
