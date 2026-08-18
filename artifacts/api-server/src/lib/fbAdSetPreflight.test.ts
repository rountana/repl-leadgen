/**
 * Smoke test for Meta API required-field drift (Task: catch Meta API
 * requirement changes before business owners see a submission error).
 *
 * Two layers:
 *
 * 1. Payload-contract tests (always run, no network):
 *    Assert that buildAdSetPayload — the exact payload production submits —
 *    contains every field Meta currently requires. If a refactor drops one
 *    (e.g. targeting_automation), CI fails immediately.
 *
 * 2. Live preflight smoke test (opt-in, real Meta call, creates nothing):
 *    validateAdSetPreflight posts the payload with
 *    execution_options: ["validate_only"], so Meta runs full server-side
 *    validation and reports the exact error a real submission would hit —
 *    including NEWLY-introduced required fields our payload doesn't know
 *    about yet — without creating an ad set or spending budget.
 *    Runs only when these env vars are set:
 *      FB_SMOKE_ACCESS_TOKEN   — a valid user/system token with ads_management
 *      FB_SMOKE_AD_ACCOUNT_ID  — ad account id (with or without act_ prefix)
 *      FB_SMOKE_CAMPAIGN_ID    — an existing campaign id in that account
 *    Otherwise it is skipped (normal CI runs stay offline).
 *
 * Run: pnpm --filter @workspace/api-server run test
 */

import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import { buildAdSetPayload, validateAdSetPreflight } from "./fbPartnerAdapter.js";

// ── Fetch mock (same pattern as fbPartnerAdapter.test.ts) ────────────────────

interface CapturedCall {
  url: string;
  method: string;
  body: Record<string, unknown> | null;
}
const capturedCalls: CapturedCall[] = [];
const mockQueue: Array<{ data: Record<string, unknown> }> = [];
const originalFetch = globalThis.fetch;

function setupFetchMock() {
  mockQueue.length = 0;
  capturedCalls.length = 0;
  globalThis.fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
    let body: Record<string, unknown> | null = null;
    if (init?.body && typeof init.body === "string") {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = null;
      }
    }
    capturedCalls.push({ url, method: init?.method ?? "GET", body });
    const queued = mockQueue.shift();
    if (!queued) throw new Error(`[test] Unexpected fetch call: ${url}`);
    return {
      json: async () => queued.data,
      ok: !queued.data.error,
      status: queued.data.error ? 400 : 200,
    } as unknown as Response;
  };
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

// ── Layer 1: payload contract ────────────────────────────────────────────────

const payload = buildAdSetPayload({
  headline: "Contract Check",
  partnerCampaignId: "camp_123",
  dailyBudgetCents: 1000,
  targetingRadiusMiles: 10,
  targetingAgeMin: 21,
  targetingAgeMax: 55,
  targetingGender: "all",
  targetingLatitude: 30.2672,
  targetingLongitude: -97.7431,
  resolvedInterests: [],
});

describe("ad-set payload contract (fields Meta currently requires)", () => {
  test("includes every top-level required field", () => {
    for (const field of [
      "name",
      "campaign_id",
      "daily_budget",
      "billing_event",
      "optimization_goal",
      "bid_strategy",
      "targeting",
      "status",
    ]) {
      assert.ok(field in payload, `payload must include required field '${field}'`);
    }
  });

  test("targeting includes targeting_automation.advantage_audience (Meta requirement since 2024)", () => {
    const targeting = payload.targeting as Record<string, unknown>;
    const ta = targeting.targeting_automation as Record<string, unknown> | undefined;
    assert.ok(ta, "targeting_automation must be present — Meta rejects ad sets without it");
    assert.equal(
      ta.advantage_audience,
      0,
      "advantage_audience must be 0 (manual targeting) so our geo/age/gender spec is honored",
    );
  });

  test("targeting includes geo, age bounds, and facebook-only placements", () => {
    const targeting = payload.targeting as Record<string, unknown>;
    const geo = targeting.geo_locations as Record<string, unknown>;
    assert.ok(Array.isArray(geo?.custom_locations) && geo.custom_locations.length > 0);
    assert.equal(targeting.age_min, 21);
    assert.equal(targeting.age_max, 55);
    assert.deepEqual(targeting.publisher_platforms, ["facebook"]);
  });

  test("uses the ASBO budget model (budget on ad set, integer smallest-currency-unit)", () => {
    assert.equal(payload.daily_budget, 1000);
    assert.ok(Number.isInteger(payload.daily_budget));
  });
});

// ── Layer 2: offline preflight behavior (mocked fetch) ──────────────────────

describe("validateAdSetPreflight (mocked)", () => {
  beforeEach(setupFetchMock);
  afterEach(restoreFetch);

  test("posts to /{act}/adsets with execution_options validate_only and never persists", async () => {
    // 1. minimum_budgets lookup
    mockQueue.push({ data: { data: [{ currency: "USD", min_daily_budget_high_freq: 100 }] } });
    // 2. validate_only adsets POST succeeds
    mockQueue.push({ data: { success: true } });

    const result = await validateAdSetPreflight({
      adAccountId: "123456789",
      partnerCampaignId: "camp_123",
      accessToken: "tok",
    });

    assert.equal(result.ok, true);
    const adSetCall = capturedCalls.find((c) => c.url.includes("/act_123456789/adsets"));
    assert.ok(adSetCall, "must POST to act_xxx/adsets (unprefixed id normalized)");
    assert.equal(adSetCall!.method, "POST");
    assert.deepEqual(
      adSetCall!.body?.execution_options,
      ["validate_only"],
      "must use validate_only so nothing is created",
    );
    // budget derived from account minimum (100 * 2), not a hardcoded USD amount
    assert.equal(adSetCall!.body?.daily_budget, 200);
    const targeting = adSetCall!.body?.targeting as Record<string, unknown>;
    assert.deepEqual(targeting.targeting_automation, { advantage_audience: 0 });
  });

  test("keeps an already-prefixed account id intact", async () => {
    mockQueue.push({ data: { data: [] } }); // minimum_budgets — no data → fallback budget
    mockQueue.push({ data: { success: true } });

    await validateAdSetPreflight({
      adAccountId: "act_555",
      partnerCampaignId: "camp_123",
      accessToken: "tok",
    });

    const adSetCall = capturedCalls.find((c) => c.url.includes("/adsets"))!;
    assert.ok(adSetCall.url.includes("/act_555/adsets"));
    assert.ok(!adSetCall.url.includes("act_act_"));
    assert.equal(adSetCall.body?.daily_budget, 5000, "falls back to generous default budget");
  });

  test("returns ok:false with Meta's error message when validation fails", async () => {
    mockQueue.push({ data: { data: [{ currency: "USD", min_daily_budget_high_freq: 100 }] } });
    mockQueue.push({
      data: { error: { code: 100, message: "targeting_automation is required" } },
    });

    const result = await validateAdSetPreflight({
      adAccountId: "123",
      partnerCampaignId: "camp_123",
      accessToken: "tok",
    });

    assert.equal(result.ok, false);
    assert.ok(!result.ok && result.error.includes("targeting_automation is required"));
  });
});

// ── Layer 3: live validate_only smoke test (opt-in) ─────────────────────────

const SMOKE_TOKEN = process.env.FB_SMOKE_ACCESS_TOKEN;
const SMOKE_AD_ACCOUNT = process.env.FB_SMOKE_AD_ACCOUNT_ID;
const SMOKE_CAMPAIGN = process.env.FB_SMOKE_CAMPAIGN_ID;
const smokeEnabled = Boolean(SMOKE_TOKEN && SMOKE_AD_ACCOUNT && SMOKE_CAMPAIGN);

describe("live Meta API preflight (validate_only — creates nothing)", () => {
  test(
    "current ad-set payload passes Meta's server-side validation",
    { skip: smokeEnabled ? false : "set FB_SMOKE_ACCESS_TOKEN, FB_SMOKE_AD_ACCOUNT_ID, FB_SMOKE_CAMPAIGN_ID to run" },
    async () => {
      const result = await validateAdSetPreflight({
        adAccountId: SMOKE_AD_ACCOUNT!,
        partnerCampaignId: SMOKE_CAMPAIGN!,
        accessToken: SMOKE_TOKEN!,
      });
      assert.ok(
        result.ok,
        `Meta rejected our ad-set payload — a required field likely changed. Error: ${result.ok ? "" : result.error}`,
      );
    },
  );
});
