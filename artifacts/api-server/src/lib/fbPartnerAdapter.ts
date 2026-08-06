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

// ── Helpers ────────────────────────────────────────────────────────────────

const ZERNIO_BASE = "https://zernio.com/api/v1";

function getZernioApiKey(): string {
  const key = process.env.ZERNIO_API_KEY;
  if (!key) {
    throw new Error(
      "ZERNIO_API_KEY is not configured. Add it as a server secret in the Replit environment.",
    );
  }
  return key;
}

async function zernioFetch(
  path: string,
  options: RequestInit = {},
): Promise<any> {
  const token = getZernioApiKey();
  const url = `${ZERNIO_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Zernio ${options.method ?? "GET"} ${path} → ${res.status}: ${body}`);
  }
  return JSON.parse(body);
}

// ── Zernio adapter ─────────────────────────────────────────────────────────

export const zernioFbPartnerAdapter: FbPartnerAdapter = {
  async createCampaign(params) {
    // 1. Discover the Zernio account ID that holds this Meta ad account.
    //    Zernio's campaign-create endpoint requires their internal accountId,
    //    not the raw Meta page/ad-account ID.
    const accountsData = await zernioFetch("/accounts");
    const accounts: any[] = accountsData.accounts ?? [];

    const fbAccount = accounts.find(
      (a) => a.platform === "facebook" || a.platform === "instagram",
    );

    if (!fbAccount) {
      throw new Error(
        "No Facebook account found in Zernio. Connect a Facebook Business account " +
          "under Settings → Connected accounts in the Zernio dashboard.",
      );
    }

    logger.info(
      { zernioAccountId: fbAccount._id, adAccountId: params.adAccountId },
      "Zernio: resolved FB account",
    );

    // 2. Convert budget from cents → whole currency units (Zernio's requirement).
    //    Minimum is $1 / day.
    const budgetAmount = Math.max(1, Math.round(params.dailyBudgetCents / 100));

    // 3. Create the campaign shell (lead_generation objective, daily budget, ACTIVE).
    const idempotencyKey = `hvcg-${params.adAccountId}-${Date.now()}`;
    const campaignData = await zernioFetch("/ads/campaigns", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({
        accountId: fbAccount._id,
        adAccountId: params.adAccountId,
        name: params.headline.slice(0, 255),
        goal: "lead_generation",
        budgetAmount,
        budgetType: "daily",
        status: "ACTIVE",
      }),
    });

    logger.info(
      { partnerCampaignId: campaignData.campaignId },
      "Zernio: FB campaign created",
    );

    return { partnerCampaignId: campaignData.campaignId };
  },

  async verifyLeadDelivery(partnerCampaignId) {
    // Query the campaign list filtered by platform campaign ID and check status.
    const data = await zernioFetch(
      `/ads/campaigns?campaignId=${encodeURIComponent(partnerCampaignId)}&platform=facebook`,
    );

    const campaigns: any[] = data.campaigns ?? [];
    const campaign = campaigns[0];

    // Zernio derives status from child ad statuses; "active" means delivering.
    const active = campaign?.status === "active";

    logger.info(
      { partnerCampaignId, status: campaign?.status ?? "not_found", active },
      "Zernio: lead delivery verification",
    );

    return { active, checkedAt: new Date().toISOString() };
  },
};

// ── Stub (kept for local dev / tests without Zernio credentials) ──────────

export const stubFbPartnerAdapter: FbPartnerAdapter = {
  async createCampaign(_params) {
    logger.warn("stubFbPartnerAdapter.createCampaign: returning stub campaign ID");
    return { partnerCampaignId: `stub_camp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}` };
  },
  async verifyLeadDelivery(partnerCampaignId) {
    logger.warn({ partnerCampaignId }, "stubFbPartnerAdapter.verifyLeadDelivery: returning stub active");
    return { active: true, checkedAt: new Date().toISOString() };
  },
};

/**
 * The active adapter. Swap to stubFbPartnerAdapter for local dev without
 * real Zernio credentials.
 */
export const activeFbPartnerAdapter: FbPartnerAdapter = zernioFbPartnerAdapter;
