import { logger } from "./logger";

const FB_VERSION = "v20.0";
const GRAPH_BASE = `https://graph.facebook.com/${FB_VERSION}`;

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * Creates the shared Meta campaign for a user's ad account.
 * Called once; the campaign ID is stored on the FB connection and reused
 * for every subsequent ad.
 */
export interface EnsureCampaignParams {
  adAccountId: string;
  /** Facebook user access token obtained during OAuth. */
  accessToken: string;
}

export interface EnsureCampaignResult {
  partnerCampaignId: string;
}

/**
 * Creates a new ad set + creative + ad under the user's shared campaign.
 * Each "ad" the user creates in our app maps to one Meta ad set + ad.
 */
export interface CreateAdParams {
  /** The shared Meta campaign ID (from EnsureCampaignResult). */
  partnerCampaignId: string;
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

export interface CreateAdResult {
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
  /**
   * Create a new PAUSED Meta campaign for the user's ad account.
   * The campaign is shared across all ads for this user.
   */
  ensureCampaign(params: EnsureCampaignParams): Promise<EnsureCampaignResult>;

  /**
   * Create an ad set + creative + ad under the user's shared campaign.
   * Budget is set on the ad set (ASBO mode — each ad has its own budget).
   */
  createAd(params: CreateAdParams): Promise<CreateAdResult>;

  /**
   * Check whether the shared Meta campaign still exists and is accessible.
   * Returns false if the campaign was deleted, archived, or is otherwise unreachable.
   * Used as a pre-flight before submitting a new ad under an existing shared campaign.
   */
  campaignExists(partnerCampaignId: string, accessToken: string): Promise<boolean>;

  /**
   * Check whether a specific ad set is currently delivering.
   * Querying by ad set ID gives per-ad status, which is correct under the
   * shared-campaign model where all ads share the same Meta campaign.
   * @param partnerAdSetId  Meta ad set ID (e.g. "23854…")
   * @param accessToken     Facebook user access token for the account that owns the ad set.
   */
  verifyLeadDelivery(
    partnerAdSetId: string,
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
 * orphaned ad set behind when it is rejected.
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
  async ensureCampaign({ adAccountId, accessToken }) {
    // Meta requires the account ID in "act_NNNN" format
    const actId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

    // Create a shared PAUSED campaign for this user's ad account.
    //
    // Objective: OUTCOME_TRAFFIC — correct for Performance 5 accounts (Meta API v14+).
    // Meta now rejects the legacy LINK_CLICKS objective on accounts migrated to
    // Performance 5; valid values are OUTCOME_TRAFFIC, OUTCOME_LEADS, etc.
    // The original error 100/4834011 was caused by campaign_budget_optimization: false
    // and buying_type: "AUCTION" being passed explicitly — those are now omitted.
    //
    // Budget: not set here — ASBO mode (each ad set carries its own daily_budget).
    // Do NOT pass campaign_budget_optimization or buying_type; both are defaults
    // and passing them explicitly triggers error 100/4834011 on many accounts.
    const campaignData = await graphPost(
      `/${actId}/campaigns`,
      {
        name: "Lead Gen — Shared Campaign",
        objective: "OUTCOME_TRAFFIC",
        special_ad_categories: [],
        // Submit as PAUSED — the user activates from Ads Manager.
        status: "PAUSED",
      },
      accessToken,
    );
    const partnerCampaignId: string = campaignData.id;
    logger.info({ partnerCampaignId, adAccountId }, "Meta: shared campaign created");
    return { partnerCampaignId };
  },

  async createAd(params) {
    const {
      partnerCampaignId,
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
      destinationUrl,
    } = params;

    // Meta requires the account ID in "act_NNNN" format
    const actId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

    // Check minimum budget for the ad account before creating the ad set.
    const minimumBudget = await getMinimumDailyBudget(actId, accessToken);
    if (minimumBudget && dailyBudgetCents < minimumBudget.amount) {
      throw new Error(
        `Meta requires a minimum daily budget of ${formatBudget(
          minimumBudget.amount,
          minimumBudget.currency,
        )} for link-click ads in this ad account. ` +
          `Increase the daily budget and try again.`,
      );
    }

    // ── 1. Ad Set ─────────────────────────────────────────────────────────
    // Budget lives here (ASBO mode) — each ad has its own daily_budget
    // independent of other ads under the same shared campaign.
    const adSetData = await graphPost(
      `/${actId}/adsets`,
      {
        name: `${headline.slice(0, 200)} — Ad Set`,
        campaign_id: partnerCampaignId,
        // Meta Marketing API daily_budget is in the account currency's smallest
        // unit. For USD that is cents, which matches our dailyBudgetCents exactly.
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
        // ACTIVE — the campaign is PAUSED, so no budget is spent yet.
        // When the user activates the campaign in Ads Manager, this ad set
        // (and its ad) start delivering immediately without needing a second toggle.
        status: "ACTIVE",
      },
      accessToken,
    );
    const adSetId: string = adSetData.id;
    logger.info({ adSetId, partnerCampaignId }, "Meta: ad set created");

    // ── 2. Image (optional) ───────────────────────────────────────────────
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

    // ── 3. Ad Creative ────────────────────────────────────────────────────
    // Use the caller-provided destination URL (e.g. a HVCG lead magnet page),
    // falling back to the Facebook Page if none was supplied.
    const adDestinationUrl = destinationUrl || `https://www.facebook.com/${fbPageId}`;

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

    // ── 4. Ad ─────────────────────────────────────────────────────────────
    // Also ACTIVE so the entire hierarchy is ready to deliver the moment the
    // parent campaign is activated by the user in Ads Manager.
    const adData = await graphPost(
      `/${actId}/ads`,
      {
        name: headline.slice(0, 255) || "Ad",
        adset_id: adSetId,
        creative: { creative_id: creativeId },
        status: "ACTIVE",
      },
      accessToken,
    );
    const adId: string = adData.id;
    logger.info({ adId, adSetId, partnerCampaignId }, "Meta: ad created");

    return { partnerAdSetId: adSetId, partnerAdId: adId };
  },

  async campaignExists(partnerCampaignId, accessToken) {
    try {
      await graphGet(`/${partnerCampaignId}`, { fields: "id,status" }, accessToken);
      return true;
    } catch (err) {
      // Only return false (campaign deleted) when Meta explicitly reports the object
      // does not exist. Transient failures (network, rate-limit, 5xx) are re-thrown
      // so callers fail loudly and do NOT silently replace a valid shared campaign.
      //
      // Meta's canonical "not found" signals:
      //   - error.code 100 with "does not exist" / "Invalid parameter" in the message
      //   - error.code 803 ("Some aliases you requested do not exist")
      if (err instanceof Error) {
        const msg = err.message;
        const isNotFound =
          /code 803/i.test(msg) ||
          /#803/i.test(msg) ||
          /does not exist/i.test(msg) ||
          /\(#100\).*not found/i.test(msg);
        if (isNotFound) return false;
      }
      // Surface transient / permission / unknown errors — do not silently orphan campaigns.
      throw err;
    }
  },

  async verifyLeadDelivery(partnerAdSetId, accessToken) {
    // Query the individual ad set — not the shared campaign — so each ad has
    // its own accurate status under the shared-campaign model.
    // Because the ad set and ad are created as ACTIVE (only the campaign is PAUSED),
    // the ad set effective_status of "CAMPAIGN_PAUSED" means the campaign hasn't been
    // activated yet; "ACTIVE" means the user activated the campaign and ads are running.
    const data = await graphGet(
      `/${partnerAdSetId}`,
      { fields: "status,effective_status" },
      accessToken,
    );

    // effective_status reflects actual delivery (accounts for campaign-level pauses etc.)
    const active = data.effective_status === "ACTIVE";
    // CAMPAIGN_PAUSED = parent campaign is paused; user hasn't activated it yet.
    // PAUSED = ad set explicitly paused after initial submission.
    const paused =
      data.effective_status === "PAUSED" ||
      data.effective_status === "CAMPAIGN_PAUSED";

    logger.info(
      {
        partnerAdSetId,
        status: data.status,
        effectiveStatus: data.effective_status,
        active,
        paused,
      },
      "Meta: ad set status checked",
    );

    return { active, paused, checkedAt: new Date().toISOString() };
  },
};

// ── Stub (kept for local dev / tests without real Meta credentials) ─────────

export const stubFbPartnerAdapter: FbPartnerAdapter = {
  async ensureCampaign(_params) {
    logger.warn("stubFbPartnerAdapter.ensureCampaign: returning stub campaign ID");
    return { partnerCampaignId: `stub_camp_${Date.now()}` };
  },
  async createAd(_params) {
    logger.warn("stubFbPartnerAdapter.createAd: returning stub ad IDs");
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    return {
      partnerAdSetId: `stub_adset_${suffix}`,
      partnerAdId: `stub_ad_${suffix}`,
    };
  },
  async campaignExists(_partnerCampaignId, _accessToken) {
    logger.warn("stubFbPartnerAdapter.campaignExists: returning true (stub)");
    return true;
  },
  async verifyLeadDelivery(partnerAdSetId, _accessToken) {
    logger.warn({ partnerAdSetId }, "stubFbPartnerAdapter.verifyLeadDelivery: returning stub paused");
    return { active: false, paused: true, checkedAt: new Date().toISOString() };
  },
};

/**
 * The active adapter — calls Meta Marketing API directly using the
 * authenticated user's access token. No third-party intermediary.
 */
export const activeFbPartnerAdapter: FbPartnerAdapter = metaFbPartnerAdapter;
