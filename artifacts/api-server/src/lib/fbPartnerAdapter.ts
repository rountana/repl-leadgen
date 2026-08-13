import { logger } from "./logger";

const FB_VERSION = "v20.0";
const GRAPH_BASE = `https://graph.facebook.com/${FB_VERSION}`;

// ── Types ──────────────────────────────────────────────────────────────────

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
  /** Facebook user access token obtained during OAuth. */
  accessToken: string;
  /** Where ad clicks should land. Defaults to the Facebook Page URL if not provided. */
  destinationUrl?: string;
}

export interface CreateCampaignResult {
  partnerCampaignId: string;
  partnerAdSetId: string;
  partnerAdId: string;
}

export interface VerifyLeadDeliveryResult {
  /** true only when Meta reports effective_status === "ACTIVE" */
  active: boolean;
  /** true when Meta reports the campaign is paused (submitted but not yet activated) */
  paused: boolean;
  checkedAt: string;
}

export interface FbPartnerAdapter {
  createCampaign(params: CreateCampaignParams): Promise<CreateCampaignResult>;
  /**
   * Check whether a campaign is currently delivering.
   * @param partnerCampaignId  Meta campaign ID (e.g. "23854…")
   * @param accessToken        Facebook user access token for the account that owns the campaign.
   */
  verifyLeadDelivery(
    partnerCampaignId: string,
    accessToken: string,
  ): Promise<VerifyLeadDeliveryResult>;
}

// ── Graph API helpers ──────────────────────────────────────────────────────

async function graphPost(
  path: string,
  body: Record<string, unknown>,
  accessToken: string,
): Promise<any> {
  const url = `${GRAPH_BASE}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as any;
  if (data?.error) {
    throw new Error(
      `Meta API POST ${path} → ${res.status}: ${data.error.message} (code ${data.error.code}, subcode ${data.error.error_subcode ?? "none"})`,
    );
  }
  return data;
}

async function graphGet(
  path: string,
  params: Record<string, string>,
  accessToken: string,
): Promise<any> {
  const qs = new URLSearchParams({ ...params, access_token: accessToken });
  const url = `${GRAPH_BASE}${path}?${qs}`;
  const res = await fetch(url);
  const data = (await res.json()) as any;
  if (data?.error) {
    throw new Error(
      `Meta API GET ${path} → ${res.status}: ${data.error.message} (code ${data.error.code})`,
    );
  }
  return data;
}

interface MetaMinimumBudget {
  currency?: string;
  min_daily_budget_high_freq?: number;
  min_daily_budget_imp?: number;
}

/**
 * Meta's minimum ad-set budget varies by account currency and optimization
 * goal. Fetch it before creating anything so a low budget does not leave an
 * orphaned campaign behind when the ad set is rejected.
 */
async function getMinimumDailyBudget(
  actId: string,
  accessToken: string,
): Promise<{ amount: number; currency: string } | null> {
  try {
    const result = await graphGet(
      `/${actId}/minimum_budgets`,
      {
        fields: "currency,min_daily_budget_high_freq,min_daily_budget_imp",
      },
      accessToken,
    );
    const minimum = result?.data?.[0] as MetaMinimumBudget | undefined;
    const amount = Number(
      minimum?.min_daily_budget_high_freq ?? minimum?.min_daily_budget_imp,
    );
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return { amount, currency: minimum?.currency ?? "account currency" };
  } catch (err) {
    // Older API versions/accounts may not expose this edge. In that case,
    // continue and let the ad-set request return Meta's native error.
    logger.warn({ err }, "Meta: minimum budget lookup unavailable");
    return null;
  }
}

function formatBudget(amount: number, currency: string): string {
  const zeroDecimalCurrencies = new Set([
    "BIF",
    "CLP",
    "DJF",
    "GNF",
    "JPY",
    "KMF",
    "KRW",
    "MGA",
    "PYG",
    "RWF",
    "UGX",
    "VND",
    "VUV",
    "XAF",
    "XOF",
    "XPF",
  ]);
  const divisor = zeroDecimalCurrencies.has(currency) ? 1 : 100;
  const value = amount / divisor;
  if (currency === "account currency") return `${amount} minor units`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: zeroDecimalCurrencies.has(currency) ? 0 : 2,
  }).format(value);
}

// ── Meta Marketing API adapter ─────────────────────────────────────────────

export const metaFbPartnerAdapter: FbPartnerAdapter = {
  async createCampaign(params) {
    const {
      headline,
      bodyText,
      imageUrl,
      dailyBudgetCents,
      targetingRadiusMiles,
      targetingLatitude,
      targetingLongitude,
      fbPageId,
      adAccountId,
      accessToken,
    } = params;

    // Meta requires the account ID in "act_NNNN" format
    const actId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

    const minimumBudget = await getMinimumDailyBudget(actId, accessToken);
    if (minimumBudget && dailyBudgetCents < minimumBudget.amount) {
      throw new Error(
        `Meta requires a minimum daily budget of ${formatBudget(
          minimumBudget.amount,
          minimumBudget.currency,
        )} for link-click campaigns in this ad account. ` +
          `Increase the daily budget and try again.`,
      );
    }

    // ── 1. Campaign ────────────────────────────────────────────────────────
    const campaignData = await graphPost(
      `/${actId}/campaigns`,
      {
        name: headline.slice(0, 255) || "Campaign",
        objective: "OUTCOME_TRAFFIC",
        special_ad_categories: [],
        // This app uses Ad Set Budget Optimization: each ad set owns its
        // daily budget, so campaign-level budget sharing must be disabled.
        is_adset_budget_sharing_enabled: false,
        // Submit as PAUSED so the user can review in Ads Manager before any
        // budget is spent. The user activates the campaign manually.
        status: "PAUSED",
        buying_type: "AUCTION",
      },
      accessToken,
    );
    const campaignId: string = campaignData.id;
    logger.info({ campaignId, adAccountId }, "Meta: campaign created");

    // ── 2. Ad Set ──────────────────────────────────────────────────────────
    const adSetData = await graphPost(
      `/${actId}/adsets`,
      {
        name: `${headline.slice(0, 200)} — Ad Set`,
        campaign_id: campaignId,
        // Meta Marketing API daily_budget is in the account currency's smallest unit.
        // For USD that is cents, which matches our dailyBudgetCents field exactly.
        daily_budget: dailyBudgetCents,
        billing_event: "IMPRESSIONS",
        optimization_goal: "LINK_CLICKS",
        bid_strategy: "LOWEST_COST_WITHOUT_CAP",
        targeting: {
          geo_locations: {
            custom_locations: [
              {
                latitude: targetingLatitude,
                longitude: targetingLongitude,
                radius: targetingRadiusMiles,
                distance_unit: "mile",
              },
            ],
          },
          age_min: 18,
        },
        // Must also be PAUSED — an ACTIVE ad set under a PAUSED campaign would
        // conflict and is rejected by Meta's API.
        status: "PAUSED",
      },
      accessToken,
    );
    const adSetId: string = adSetData.id;
    logger.info({ adSetId }, "Meta: ad set created");

    // ── 3. Image (optional) ────────────────────────────────────────────────
    // Supports two cases:
    //   a) Regular URL  → pass directly as `picture` in the creative link_data
    //   b) Base64 data URL → upload via /adimages first to obtain a hash
    let imageSpec: Record<string, string> = {};
    if (imageUrl) {
      if (imageUrl.startsWith("data:image/")) {
        // Extract base64 payload (everything after the comma)
        const base64 = imageUrl.split(",")[1];
        if (base64) {
          try {
            const imgData = await graphPost(
              `/${actId}/adimages`,
              { bytes: base64 },
              accessToken,
            );
            // Response shape: { images: { <filename>: { hash, url, ... } } }
            const firstEntry = Object.values(imgData.images ?? {})[0] as any;
            if (firstEntry?.hash) {
              imageSpec = { image_hash: firstEntry.hash };
              logger.info("Meta: ad image uploaded from base64");
            }
          } catch (err) {
            logger.warn({ err }, "Meta: image upload failed, continuing without image");
          }
        }
      } else {
        // Plain URL — use directly
        imageSpec = { picture: imageUrl };
      }
    }

    // ── 4. Ad Creative ─────────────────────────────────────────────────────
    // Use the caller-provided destination URL (e.g. a HVCG lead magnet page),
    // falling back to the Facebook Page if none was supplied.
    const adDestinationUrl = params.destinationUrl || `https://www.facebook.com/${fbPageId}`;

    const creativeData = await graphPost(
      `/${actId}/adcreatives`,
      {
        name: `${headline.slice(0, 200)} — Creative`,
        object_story_spec: {
          page_id: fbPageId,
          link_data: {
            message: bodyText,
            link: adDestinationUrl,
            name: headline,
            call_to_action: { type: "LEARN_MORE" },
            ...imageSpec,
          },
        },
      },
      accessToken,
    );
    const creativeId: string = creativeData.id;
    logger.info({ creativeId }, "Meta: ad creative created");

    // ── 5. Ad ──────────────────────────────────────────────────────────────
    const adData = await graphPost(
      `/${actId}/ads`,
      {
        name: headline.slice(0, 255) || "Ad",
        adset_id: adSetId,
        creative: { creative_id: creativeId },
        status: "PAUSED",
      },
      accessToken,
    );
    const adId: string = adData.id;
    logger.info({ adId, campaignId }, "Meta: ad created");

    return { partnerCampaignId: campaignId, partnerAdSetId: adSetId, partnerAdId: adId };
  },

  async verifyLeadDelivery(partnerCampaignId, accessToken) {
    const data = await graphGet(
      `/${partnerCampaignId}`,
      { fields: "status,effective_status" },
      accessToken,
    );

    // effective_status reflects actual delivery (accounts for account-level pauses etc.)
    const active = data.effective_status === "ACTIVE";
    // PAUSED means the campaign was submitted but not yet activated by the user in Ads Manager.
    // CAMPAIGN_PAUSED appears on the ad/ad-set level when the parent campaign is paused.
    const paused =
      data.effective_status === "PAUSED" ||
      data.effective_status === "CAMPAIGN_PAUSED";

    logger.info(
      {
        partnerCampaignId,
        status: data.status,
        effectiveStatus: data.effective_status,
        active,
        paused,
      },
      "Meta: campaign status checked",
    );

    return { active, paused, checkedAt: new Date().toISOString() };
  },
};

// ── Stub (kept for local dev / tests without real Meta credentials) ─────────

export const stubFbPartnerAdapter: FbPartnerAdapter = {
  async createCampaign(_params) {
    logger.warn("stubFbPartnerAdapter.createCampaign: returning stub campaign IDs");
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    return {
      partnerCampaignId: `stub_camp_${suffix}`,
      partnerAdSetId: `stub_adset_${suffix}`,
      partnerAdId: `stub_ad_${suffix}`,
    };
  },
  async verifyLeadDelivery(partnerCampaignId, _accessToken) {
    logger.warn({ partnerCampaignId }, "stubFbPartnerAdapter.verifyLeadDelivery: returning stub paused");
    return { active: false, paused: true, checkedAt: new Date().toISOString() };
  },
};

/**
 * The active adapter — calls Meta Marketing API directly using the
 * authenticated user's access token. No third-party intermediary.
 */
export const activeFbPartnerAdapter: FbPartnerAdapter = metaFbPartnerAdapter;
