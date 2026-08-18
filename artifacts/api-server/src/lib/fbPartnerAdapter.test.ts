/**
 * Tests for metaFbPartnerAdapter — the ASBO (Ad Set Budget Optimization)
 * submission flow after the CBO → ASBO budget model change.
 *
 * Three scenarios covered:
 *   1. First ad submission: ensureCampaign → createAd creates a new
 *      shared campaign and submits an ad under it.
 *   2. Reuse: a second ad submission finds the stored partnerCampaignId via
 *      campaignExists (returns true) and reuses it without creating a new campaign.
 *   3. Recovery: campaignExists returns false (deleted), triggers ensureCampaign
 *      to create a replacement campaign, then createAd submits under it.
 *
 * Run: pnpm --filter @workspace/api-server run test
 */

import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

// ── Fetch mock infrastructure ────────────────────────────────────────────────

type MockResponse = { data: Record<string, unknown> };

const mockQueue: MockResponse[] = [];

// Keep track of every request body sent to fetch so tests can assert on them.
interface CapturedCall {
  url: string;
  method: string;
  body: Record<string, unknown> | null;
}
const capturedCalls: CapturedCall[] = [];

const originalFetch = globalThis.fetch;

function mockFetch(response: MockResponse): void {
  mockQueue.push(response);
}

function setupFetchMock() {
  mockQueue.length = 0;
  capturedCalls.length = 0;

  globalThis.fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
    const method = init?.method ?? "GET";
    let body: Record<string, unknown> | null = null;
    if (init?.body && typeof init.body === "string") {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = null;
      }
    }
    capturedCalls.push({ url, method, body });

    const queued = mockQueue.shift();
    if (!queued) {
      throw new Error(
        `[test] Unexpected fetch call: ${method} ${url}\nNo mock response queued.\nQueued calls so far: ${JSON.stringify(capturedCalls, null, 2)}`,
      );
    }

    return {
      json: async () => queued.data,
      ok: !queued.data.error,
      status: queued.data.error ? 400 : 200,
    } as unknown as Response;
  };
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
  mockQueue.length = 0;
  capturedCalls.length = 0;
}

// ── Import adapter (after mock infrastructure is ready) ─────────────────────

// Dynamic import so the mock can be installed before any module-level code runs.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const { metaFbPartnerAdapter } = await import("./fbPartnerAdapter.js");

// ── Shared test fixtures ─────────────────────────────────────────────────────

const ACCESS_TOKEN = "test_access_token";
const AD_ACCOUNT_ID = "123456789"; // without "act_" prefix
const ACT_ID = "act_123456789"; // with prefix (what the adapter adds)
const FB_PAGE_ID = "page_987";
const PARTNER_CAMPAIGN_ID = "camp_aaa111";
const AD_SET_ID = "adset_bbb222";
const CREATIVE_ID = "creative_ccc333";
const AD_ID = "ad_ddd444";

const BASE_CREATE_AD_PARAMS = {
  partnerCampaignId: PARTNER_CAMPAIGN_ID,
  headline: "Free Coffee",
  bodyText: "Visit us today!",
  imageUrl: "https://example.com/img.jpg",
  dailyBudgetCents: 500, // $5.00 — above all minimums in tests
  targetingRadiusMiles: 10,
  targetingAgeMin: 18,
  targetingAgeMax: 65,
  targetingGender: "all",
  targetingInterests: [],
  targetingLatitude: 37.7749,
  targetingLongitude: -122.4194,
  fbPageId: FB_PAGE_ID,
  adAccountId: AD_ACCOUNT_ID,
  accessToken: ACCESS_TOKEN,
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("ensureCampaign", () => {
  beforeEach(setupFetchMock);
  afterEach(restoreFetch);

  test("creates a PAUSED OUTCOME_TRAFFIC campaign (ASBO mode)", async () => {
    mockFetch({ data: { id: PARTNER_CAMPAIGN_ID } });

    const result = await metaFbPartnerAdapter.ensureCampaign({
      adAccountId: AD_ACCOUNT_ID,
      accessToken: ACCESS_TOKEN,
    });

    assert.equal(result.partnerCampaignId, PARTNER_CAMPAIGN_ID);
    assert.equal(capturedCalls.length, 1);

    const [call] = capturedCalls;
    assert.ok(call.url.includes(`/${ACT_ID}/campaigns`), "must POST to act_xxx/campaigns");
    assert.equal(call.method, "POST");
    assert.equal(call.body?.objective, "OUTCOME_TRAFFIC", "must use OUTCOME_TRAFFIC objective");
    assert.equal(call.body?.status, "PAUSED", "must submit as PAUSED");
    // ASBO: campaign must NOT carry budget — verify forbidden fields are absent
    assert.ok(
      !("daily_budget" in (call.body ?? {})),
      "must NOT set daily_budget on campaign (ASBO — budget lives on the ad set)",
    );
    assert.ok(
      !("campaign_budget_optimization" in (call.body ?? {})),
      "must NOT pass campaign_budget_optimization (triggers Meta error 100/4834011)",
    );
    assert.ok(
      !("buying_type" in (call.body ?? {})),
      "must NOT pass buying_type (triggers Meta error 100/4834011)",
    );
  });

  test("prefixes adAccountId with 'act_' if missing", async () => {
    mockFetch({ data: { id: PARTNER_CAMPAIGN_ID } });

    await metaFbPartnerAdapter.ensureCampaign({
      adAccountId: AD_ACCOUNT_ID, // no prefix
      accessToken: ACCESS_TOKEN,
    });

    assert.ok(capturedCalls[0].url.includes(`/${ACT_ID}/campaigns`));
  });

  test("leaves 'act_' prefix untouched when already present", async () => {
    mockFetch({ data: { id: PARTNER_CAMPAIGN_ID } });

    await metaFbPartnerAdapter.ensureCampaign({
      adAccountId: ACT_ID, // already has act_ prefix
      accessToken: ACCESS_TOKEN,
    });

    // Must not double-prefix: "act_act_..." would be wrong
    assert.ok(!capturedCalls[0].url.includes("act_act_"));
    assert.ok(capturedCalls[0].url.includes(`/${ACT_ID}/campaigns`));
  });
});

describe("createAd", () => {
  beforeEach(setupFetchMock);
  afterEach(restoreFetch);

  function queueSuccessfulAdCreation() {
    // 1. getMinimumDailyBudget → GET /{act_id}/minimum_budgets
    mockFetch({ data: { data: [{ currency: "USD", min_daily_budget_high_freq: 100 }] } });
    // 2. POST /{act_id}/adsets  (interests = [] so no targetingsearch before this)
    mockFetch({ data: { id: AD_SET_ID } });
    // 3. getInstagramActorId → GET /{act_id}/instagram_accounts (ad account edge, no results)
    mockFetch({ data: { data: [] } });
    // 4. getInstagramActorId → GET /{page_id}/instagram_accounts (page edge, no results)
    mockFetch({ data: { data: [] } });
    // 5. POST /{act_id}/adcreatives
    mockFetch({ data: { id: CREATIVE_ID } });
    // 6. POST /{act_id}/ads
    mockFetch({ data: { id: AD_ID } });
  }

  test("creates ad set + creative + ad under the shared campaign (ASBO)", async () => {
    queueSuccessfulAdCreation();

    const result = await metaFbPartnerAdapter.createAd(BASE_CREATE_AD_PARAMS);

    assert.equal(result.partnerAdSetId, AD_SET_ID);
    assert.equal(result.partnerAdId, AD_ID);

    // Find the ad-set call
    const adSetCall = capturedCalls.find((c) => c.url.includes(`/${ACT_ID}/adsets`));
    assert.ok(adSetCall, "must POST to act_xxx/adsets");
    assert.equal(adSetCall!.body?.campaign_id, PARTNER_CAMPAIGN_ID, "ad set must reference the shared campaign");
    assert.ok(
      "daily_budget" in (adSetCall!.body ?? {}),
      "budget must be on the ad set (ASBO mode)",
    );
    assert.equal(adSetCall!.body?.daily_budget, 500, "ad set daily_budget must equal dailyBudgetCents");
    assert.equal(adSetCall!.body?.status, "ACTIVE", "ad set must be ACTIVE so it delivers once campaign is activated");

    // Find the creative call
    const creativeCall = capturedCalls.find((c) => c.url.includes(`/${ACT_ID}/adcreatives`));
    assert.ok(creativeCall, "must POST to act_xxx/adcreatives");

    // Find the ad call
    const adCall = capturedCalls.find((c) => c.url.includes(`/${ACT_ID}/ads`));
    assert.ok(adCall, "must POST to act_xxx/ads");
    assert.equal(adCall!.body?.status, "ACTIVE");
  });

  test("rejects when budget is below Meta minimum", async () => {
    // minimum_budgets returns a minimum of $3.00 (300 cents)
    mockFetch({ data: { data: [{ currency: "USD", min_daily_budget_high_freq: 300 }] } });

    await assert.rejects(
      () =>
        metaFbPartnerAdapter.createAd({
          ...BASE_CREATE_AD_PARAMS,
          dailyBudgetCents: 100, // only $1 — below the $3 minimum
        }),
      (err: Error) => {
        assert.ok(err.message.includes("minimum daily budget"), `expected minimum-budget error, got: ${err.message}`);
        return true;
      },
    );
  });

  test("passes geo-targeting as custom_locations with radius", async () => {
    queueSuccessfulAdCreation();

    await metaFbPartnerAdapter.createAd(BASE_CREATE_AD_PARAMS);

    const adSetCall = capturedCalls.find((c) => c.url.includes(`/${ACT_ID}/adsets`))!;
    const targeting = adSetCall.body?.targeting as Record<string, unknown>;
    const customLocations = (
      targeting?.geo_locations as Record<string, unknown>
    )?.custom_locations as Array<Record<string, unknown>>;

    assert.ok(Array.isArray(customLocations) && customLocations.length > 0, "must include custom_locations");
    const loc = customLocations[0];
    assert.equal(loc.latitude, 37.7749);
    assert.equal(loc.longitude, -122.4194);
    assert.equal(loc.radius, 10);
    assert.equal(loc.distance_unit, "mile");
  });

  test("maps 'male' gender to Meta ID 1", async () => {
    queueSuccessfulAdCreation();

    await metaFbPartnerAdapter.createAd({ ...BASE_CREATE_AD_PARAMS, targetingGender: "male" });

    const adSetCall = capturedCalls.find((c) => c.url.includes(`/${ACT_ID}/adsets`))!;
    const targeting = adSetCall.body?.targeting as Record<string, unknown>;
    assert.deepEqual(targeting.genders, [1]);
  });

  test("maps 'female' gender to Meta ID 2", async () => {
    queueSuccessfulAdCreation();

    await metaFbPartnerAdapter.createAd({ ...BASE_CREATE_AD_PARAMS, targetingGender: "female" });

    const adSetCall = capturedCalls.find((c) => c.url.includes(`/${ACT_ID}/adsets`))!;
    const targeting = adSetCall.body?.targeting as Record<string, unknown>;
    assert.deepEqual(targeting.genders, [2]);
  });

  test("omits genders field for 'all' targeting", async () => {
    queueSuccessfulAdCreation();

    await metaFbPartnerAdapter.createAd({ ...BASE_CREATE_AD_PARAMS, targetingGender: "all" });

    const adSetCall = capturedCalls.find((c) => c.url.includes(`/${ACT_ID}/adsets`))!;
    const targeting = adSetCall.body?.targeting as Record<string, unknown>;
    assert.ok(!("genders" in targeting), "genders must be omitted for 'all' (Meta default keeps audience open)");
  });

  test("restricts placements to facebook only", async () => {
    queueSuccessfulAdCreation();

    await metaFbPartnerAdapter.createAd(BASE_CREATE_AD_PARAMS);

    const adSetCall = capturedCalls.find((c) => c.url.includes(`/${ACT_ID}/adsets`))!;
    const targeting = adSetCall.body?.targeting as Record<string, unknown>;
    assert.deepEqual(
      targeting.publisher_platforms,
      ["facebook"],
      "must restrict to facebook only to avoid Instagram access errors (200/1815199)",
    );
  });

  test("cleans up orphaned ad set if creative creation fails", async () => {
    // 1. minimum_budgets
    mockFetch({ data: { data: [{ currency: "USD", min_daily_budget_high_freq: 100 }] } });
    // 2. ad set creation succeeds
    mockFetch({ data: { id: AD_SET_ID } });
    // 3. instagram_accounts (ad account edge — empty)
    mockFetch({ data: { data: [] } });
    // 4. instagram_accounts (page edge — empty)
    mockFetch({ data: { data: [] } });
    // 5. creative creation fails
    mockFetch({ data: { error: { code: 100, message: "Invalid creative" } } });
    // 6. cleanup: delete the orphaned ad set
    mockFetch({ data: { success: true } });

    await assert.rejects(() => metaFbPartnerAdapter.createAd(BASE_CREATE_AD_PARAMS));

    // The last call must be a POST to the ad-set ID for cleanup deletion
    const lastCall = capturedCalls[capturedCalls.length - 1];
    assert.ok(
      lastCall.url.includes(`/${AD_SET_ID}`),
      `expected cleanup call to /${AD_SET_ID}, got ${lastCall.url}`,
    );
    assert.equal(lastCall.body?.status, "DELETED");
  });

  test("uses interest IDs resolved from Meta targeting search", async () => {
    // 1. minimum_budgets
    mockFetch({ data: { data: [{ currency: "USD", min_daily_budget_high_freq: 100 }] } });
    // 2. targetingsearch for "Coffee"
    mockFetch({ data: { data: [{ id: "6003020834693", name: "Coffee" }] } });
    // 3. ad set
    mockFetch({ data: { id: AD_SET_ID } });
    // 4. instagram accounts (ad account edge — empty)
    mockFetch({ data: { data: [] } });
    // 5. instagram accounts (page edge — empty)
    mockFetch({ data: { data: [] } });
    // 6. creative
    mockFetch({ data: { id: CREATIVE_ID } });
    // 7. ad
    mockFetch({ data: { id: AD_ID } });

    await metaFbPartnerAdapter.createAd({
      ...BASE_CREATE_AD_PARAMS,
      targetingInterests: ["Coffee"],
    });

    const adSetCall = capturedCalls.find((c) => c.url.includes(`/${ACT_ID}/adsets`))!;
    const targeting = adSetCall.body?.targeting as Record<string, unknown>;
    const flexSpec = (targeting.flexible_spec as Array<Record<string, unknown>>)?.[0];
    assert.ok(flexSpec, "flexible_spec must be present when interests are provided");
    const interests = flexSpec.interests as Array<{ id: string; name: string }>;
    assert.equal(interests[0].id, "6003020834693");
  });

  test("retries ad-set POST without a deprecated interest ID when Meta names it in the error", async () => {
    // Meta's targetingsearch can return IDs that have since been deprecated.
    // When the ad-set POST fails with "Interests with ID X is invalid", the
    // adapter parses out the bad ID, removes it, and retries once without it.
    // 1. minimum_budgets
    mockFetch({ data: { data: [{ currency: "USD", min_daily_budget_high_freq: 100 }] } });
    // 2. targetingsearch — resolves to an ID that Meta has since deprecated
    mockFetch({ data: { data: [{ id: "103153189725242", name: "Fitness and wellness" }] } });
    // 3. ad set POST fails with the invalid-interest error
    mockFetch({ data: { error: { code: 100, message: "Interests with ID 103153189725242 is invalid." } } });
    // 4. retry ad set POST without the bad ID — succeeds
    mockFetch({ data: { id: AD_SET_ID } });
    // 5. instagram (ad account edge)
    mockFetch({ data: { data: [] } });
    // 6. instagram (page edge)
    mockFetch({ data: { data: [] } });
    // 7. creative
    mockFetch({ data: { id: CREATIVE_ID } });
    // 8. ad
    mockFetch({ data: { id: AD_ID } });

    const result = await metaFbPartnerAdapter.createAd({
      ...BASE_CREATE_AD_PARAMS,
      targetingInterests: ["Fitness and wellness"],
    });

    assert.equal(result.partnerAdSetId, AD_SET_ID, "ad must succeed after retry");

    // The retry call must omit the invalid interest
    const adSetCalls = capturedCalls.filter((c) => c.url.includes(`/${ACT_ID}/adsets`) && c.method === "POST");
    assert.equal(adSetCalls.length, 2, "must have made exactly two ad-set POST attempts");
    const retryPayload = adSetCalls[1].body?.targeting as Record<string, unknown>;
    assert.ok(
      !("flexible_spec" in retryPayload),
      "retry must omit flexible_spec when the only interest was invalid",
    );
  });
});

describe("campaignExists", () => {
  beforeEach(setupFetchMock);
  afterEach(restoreFetch);

  test("returns true when Meta returns the campaign object", async () => {
    mockFetch({ data: { id: PARTNER_CAMPAIGN_ID, status: "PAUSED" } });

    const exists = await metaFbPartnerAdapter.campaignExists(PARTNER_CAMPAIGN_ID, ACCESS_TOKEN);
    assert.equal(exists, true);
  });

  test("returns false when campaign status is ARCHIVED (cannot receive new ad sets)", async () => {
    mockFetch({ data: { id: PARTNER_CAMPAIGN_ID, status: "ARCHIVED" } });

    const exists = await metaFbPartnerAdapter.campaignExists(PARTNER_CAMPAIGN_ID, ACCESS_TOKEN);
    assert.equal(exists, false, "ARCHIVED campaigns cannot receive new ad sets — must return false to trigger recovery");
  });

  test("returns false when campaign status is DELETED", async () => {
    mockFetch({ data: { id: PARTNER_CAMPAIGN_ID, status: "DELETED" } });

    const exists = await metaFbPartnerAdapter.campaignExists(PARTNER_CAMPAIGN_ID, ACCESS_TOKEN);
    assert.equal(exists, false, "DELETED campaigns must return false to trigger recovery");
  });

  test("returns false for Meta error code 803 (object not found)", async () => {
    mockFetch({
      data: {
        error: {
          code: 803,
          message: "Some aliases you requested do not exist",
        },
      },
    });

    const exists = await metaFbPartnerAdapter.campaignExists(PARTNER_CAMPAIGN_ID, ACCESS_TOKEN);
    assert.equal(exists, false, "error 803 = campaign deleted — must return false to trigger recovery");
  });

  test("returns false when error message contains 'does not exist'", async () => {
    mockFetch({
      data: {
        error: {
          code: 100,
          message: "Object with ID '12345678' does not exist",
        },
      },
    });

    const exists = await metaFbPartnerAdapter.campaignExists(PARTNER_CAMPAIGN_ID, ACCESS_TOKEN);
    assert.equal(exists, false);
  });

  test("re-throws on transient / permission errors (does not silently drop a live campaign)", async () => {
    mockFetch({
      data: {
        error: {
          code: 190,
          message: "Invalid OAuth access token",
        },
      },
    });

    await assert.rejects(
      () => metaFbPartnerAdapter.campaignExists(PARTNER_CAMPAIGN_ID, ACCESS_TOKEN),
      (err: Error) => {
        assert.ok(err.message.length > 0);
        return true;
      },
    );
  });
});

describe("verifyLeadDelivery", () => {
  beforeEach(setupFetchMock);
  afterEach(restoreFetch);

  test("reports active when effective_status is ACTIVE", async () => {
    mockFetch({ data: { status: "ACTIVE", effective_status: "ACTIVE" } });
    const r = await metaFbPartnerAdapter.verifyLeadDelivery(AD_SET_ID, ACCESS_TOKEN);
    assert.equal(r.active, true);
    assert.equal(r.paused, false);
    assert.equal(r.inReview, false);
  });

  test("reports paused when effective_status is CAMPAIGN_PAUSED (user hasn't activated campaign yet)", async () => {
    mockFetch({ data: { status: "ACTIVE", effective_status: "CAMPAIGN_PAUSED" } });
    const r = await metaFbPartnerAdapter.verifyLeadDelivery(AD_SET_ID, ACCESS_TOKEN);
    assert.equal(r.active, false);
    assert.equal(r.paused, true);
    assert.equal(r.inReview, false);
  });

  test("reports inReview when effective_status is PENDING_REVIEW", async () => {
    mockFetch({ data: { status: "ACTIVE", effective_status: "PENDING_REVIEW" } });
    const r = await metaFbPartnerAdapter.verifyLeadDelivery(AD_SET_ID, ACCESS_TOKEN);
    assert.equal(r.active, false);
    assert.equal(r.paused, false);
    assert.equal(r.inReview, true);
  });

  test("reports inReview when effective_status is IN_PROCESS", async () => {
    mockFetch({ data: { status: "ACTIVE", effective_status: "IN_PROCESS" } });
    const r = await metaFbPartnerAdapter.verifyLeadDelivery(AD_SET_ID, ACCESS_TOKEN);
    assert.equal(r.inReview, true);
  });

  test("reports all false for DISAPPROVED (maps to error/failed)", async () => {
    mockFetch({ data: { status: "DISAPPROVED", effective_status: "DISAPPROVED" } });
    const r = await metaFbPartnerAdapter.verifyLeadDelivery(AD_SET_ID, ACCESS_TOKEN);
    assert.equal(r.active, false);
    assert.equal(r.paused, false);
    assert.equal(r.inReview, false);
  });

  test("checkedAt is a valid ISO timestamp", async () => {
    mockFetch({ data: { status: "PAUSED", effective_status: "PAUSED" } });
    const r = await metaFbPartnerAdapter.verifyLeadDelivery(AD_SET_ID, ACCESS_TOKEN);
    assert.ok(!isNaN(Date.parse(r.checkedAt)), `checkedAt must be a valid ISO date, got: ${r.checkedAt}`);
  });
});

describe("ASBO launch scenarios (shared campaign management)", () => {
  /**
   * These tests simulate the three launch scenarios described in the task:
   *
   *   1. First ad submission — no existing campaign → ensureCampaign → createAd
   *   2. Reuse — campaign exists → skip ensureCampaign → createAd
   *   3. Recovery — campaign deleted → ensureCampaign → createAd
   *
   * The shared-campaign DB logic lives in the launch route, so we exercise it
   * here through the adapter's individual methods, confirming their outputs
   * compose correctly.
   */

  beforeEach(setupFetchMock);
  afterEach(restoreFetch);

  function queueCampaignCreate() {
    mockFetch({ data: { id: PARTNER_CAMPAIGN_ID } });
  }

  function queueAdCreate() {
    // Correct call order within createAd:
    // 1. GET minimum_budgets
    mockFetch({ data: { data: [{ currency: "USD", min_daily_budget_high_freq: 100 }] } });
    // 2. POST adsets  (no interests → no targetingsearch)
    mockFetch({ data: { id: AD_SET_ID } });
    // 3. GET instagram_accounts (ad account edge — empty)
    mockFetch({ data: { data: [] } });
    // 4. GET instagram_accounts (page edge — empty)
    mockFetch({ data: { data: [] } });
    // 5. POST adcreatives
    mockFetch({ data: { id: CREATIVE_ID } });
    // 6. POST ads
    mockFetch({ data: { id: AD_ID } });
  }

  test("Scenario 1 — first submission creates a new shared campaign then the ad", async () => {
    queueCampaignCreate();
    queueAdCreate();

    // Simulate: no stored campaign → create one
    const { partnerCampaignId } = await metaFbPartnerAdapter.ensureCampaign({
      adAccountId: AD_ACCOUNT_ID,
      accessToken: ACCESS_TOKEN,
    });

    // Simulate: store partnerCampaignId in DB (fb_connection_campaigns), then launch
    const adResult = await metaFbPartnerAdapter.createAd({
      ...BASE_CREATE_AD_PARAMS,
      partnerCampaignId,
    });

    assert.equal(partnerCampaignId, PARTNER_CAMPAIGN_ID);
    assert.equal(adResult.partnerAdSetId, AD_SET_ID);
    assert.equal(adResult.partnerAdId, AD_ID);
  });

  test("Scenario 2 — second submission reuses campaign (campaignExists = true)", async () => {
    // campaignExists check
    mockFetch({ data: { id: PARTNER_CAMPAIGN_ID, status: "PAUSED" } });
    queueAdCreate();

    // Simulate: stored campaign ID retrieved from db (fb_connection_campaigns)
    const storedCampaignId = PARTNER_CAMPAIGN_ID;

    const stillExists = await metaFbPartnerAdapter.campaignExists(storedCampaignId, ACCESS_TOKEN);
    assert.equal(stillExists, true, "campaign should still exist");

    // Skip ensureCampaign — reuse the stored ID
    const adResult = await metaFbPartnerAdapter.createAd({
      ...BASE_CREATE_AD_PARAMS,
      partnerCampaignId: storedCampaignId,
    });

    assert.equal(adResult.partnerAdSetId, AD_SET_ID);
    // Confirm ensureCampaign was NOT called: only 1 GET (campaignExists) + ad creation calls
    const campaignPostCalls = capturedCalls.filter(
      (c) => c.method === "POST" && c.url.includes("/campaigns"),
    );
    assert.equal(campaignPostCalls.length, 0, "must NOT create a new campaign when one already exists");
  });

  test("Scenario 3 — recovery: deleted campaign triggers fresh campaign + ad", async () => {
    const NEW_CAMPAIGN_ID = "camp_new_zzz999";

    // campaignExists returns false (error 803 = campaign deleted)
    mockFetch({
      data: {
        error: { code: 803, message: "Some aliases you requested do not exist" },
      },
    });
    // ensureCampaign creates a replacement
    mockFetch({ data: { id: NEW_CAMPAIGN_ID } });
    queueAdCreate();

    // Simulate: stored campaign ID retrieved from db
    const storedCampaignId = PARTNER_CAMPAIGN_ID;

    const stillExists = await metaFbPartnerAdapter.campaignExists(storedCampaignId, ACCESS_TOKEN);
    assert.equal(stillExists, false, "deleted campaign must not exist");

    // Simulate: launch route clears partnerCampaignId and calls ensureCampaign
    const { partnerCampaignId: newCampaignId } = await metaFbPartnerAdapter.ensureCampaign({
      adAccountId: AD_ACCOUNT_ID,
      accessToken: ACCESS_TOKEN,
    });
    assert.notEqual(newCampaignId, storedCampaignId, "new campaign ID must differ from the deleted one");
    assert.equal(newCampaignId, NEW_CAMPAIGN_ID);

    // Simulate: DB updated with newCampaignId, then createAd runs under it
    const adResult = await metaFbPartnerAdapter.createAd({
      ...BASE_CREATE_AD_PARAMS,
      partnerCampaignId: newCampaignId,
    });

    assert.equal(adResult.partnerAdSetId, AD_SET_ID);
    assert.equal(adResult.partnerAdId, AD_ID);

    // Confirm the ad set references the NEW campaign, not the deleted one
    const adSetCall = capturedCalls.find((c) => c.url.includes(`/${ACT_ID}/adsets`))!;
    assert.equal(adSetCall.body?.campaign_id, NEW_CAMPAIGN_ID);
  });
});
