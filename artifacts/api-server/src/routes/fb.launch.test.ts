/**
 * Integration tests for POST /api/fb/campaigns/:id/launch
 *
 * These tests hit the real Express router against the real development database.
 * Only two things are mocked:
 *   • Clerk auth  — replaced by a header-driven stub so we don't need OAuth tokens
 *   • globalThis.fetch — replaced by a queue-based stub so we don't call Meta's API
 *
 * What IS exercised (and was not covered by the adapter unit tests):
 *   • The launch route's shared-campaign coordination code in fb.ts
 *   • DB persistence: INSERT into fb_connection_campaigns with onConflictDoNothing
 *   • Scenario 2: getStoredCampaignId reuses the stored partnerCampaignId
 *   • Scenario 3: UPDATE with old-ID predicate when campaignExists returns false
 *   • Status transitions: draft → launching → paused (or error)
 *   • partnerAdSetId / partnerAdId written to fb_campaigns after a successful launch
 *
 * Run: pnpm --filter @workspace/api-server run test
 */

/**
 * Auth bypass: requireAuth in fb.ts checks for the x-test-user-id header
 * when NODE_ENV === "test" (see the NODE_ENV guard in fb.ts). This lets
 * integration tests run without a real Clerk session or OAuth flow.
 */
process.env.NODE_ENV = "test";

const TEST_USER_ID = `test_asbo_integration_${Date.now()}`;

// ── Meta fetch mock ─────────────────────────────────────────────────────────

const metaMockQueue: Array<{ data: Record<string, unknown> }> = [];

function queueMetaResponse(data: Record<string, unknown>): void {
  metaMockQueue.push({ data });
}

const originalFetch = globalThis.fetch;

globalThis.fetch = async (
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : (input as Request).url;

  // Only intercept Meta Graph API calls — let everything else through
  if (!url.includes("graph.facebook.com")) {
    return originalFetch(input as any, init);
  }

  const response = metaMockQueue.shift();
  if (!response) {
    throw new Error(`[test] Unexpected Meta API call with empty queue: ${url}`);
  }
  return {
    json: async () => response.data,
    ok: !response.data["error"],
    status: response.data["error"] ? 400 : 200,
  } as unknown as Response;
};

// ── Imports (after mocking) ─────────────────────────────────────────────────

import { test, describe, before, after, beforeEach } from "node:test"; // eslint-disable-line @typescript-eslint/no-unused-vars
import assert from "node:assert/strict";
import express, { type Express } from "express";
import { createServer, type Server } from "node:http";
import { eq, and } from "drizzle-orm";
import { db, fbConnectionsTable, fbConnectionCampaignsTable, fbCampaignsTable } from "@workspace/db";

// Dynamic import so module mock is applied first
const { default: fbRouter } = await import("./fb.js");

// ── Test Express app ────────────────────────────────────────────────────────

const noopLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  trace: () => {},
  fatal: () => {},
  child: () => noopLogger,
};

const testApp: Express = express();
testApp.use(express.json());
// fb.ts uses req.log (injected by pino-http in production). Provide a noop
// stub so routes don't crash with "Cannot read property 'info' of undefined".
testApp.use((_req: any, _res: any, next: any) => {
  _req.log = noopLogger;
  next();
});
testApp.use("/api", fbRouter);

let server: Server;
let baseUrl: string;

// ── DB fixtures ─────────────────────────────────────────────────────────────

const FB_PAGE_ID = "test_page_001";
const FB_PAGE_NAME = "Test Business Page";
const AD_ACCOUNT_ID = "test_ad_account_999";
const PARTNER_TOKEN = "test_partner_token_abc";
const PARTNER_CAMPAIGN_ID = "camp_shared_test_001";
const AD_SET_ID = "adset_test_001";
const CREATIVE_ID = "creative_test_001";
const AD_ID = "ad_test_001";

async function seedConnection(): Promise<{ connId: number }> {
  const [conn] = await db
    .insert(fbConnectionsTable)
    .values({
      userId: TEST_USER_ID,
      fbPageId: FB_PAGE_ID,
      fbPageName: FB_PAGE_NAME,
      adAccountId: AD_ACCOUNT_ID,
      adAccountName: "Test Ad Account",
      partnerToken: PARTNER_TOKEN,
      status: "connected",
    })
    .returning();
  return { connId: conn.id };
}

async function seedCampaign(connId: number): Promise<{ campaignId: number }> {
  const [campaign] = await db
    .insert(fbCampaignsTable)
    .values({
      userId: TEST_USER_ID,
      connectionId: connId,
      headline: "Free Coffee — Test",
      bodyText: "Visit our shop today!",
      imageUrl: "https://example.com/test-img.jpg",
      dailyBudgetCents: 1000,
      targetingRadiusMiles: 5,
      targetingAgeMin: 18,
      targetingAgeMax: 65,
      targetingGender: "all",
      targetingInterests: [],
      targetingLatitude: "37.7749",
      targetingLongitude: "-122.4194",
      status: "draft",
      leadDeliveryStatus: "unverified",
    })
    .returning();
  return { campaignId: campaign.id };
}

async function cleanupTestUser(): Promise<void> {
  // Delete in dependency order to avoid FK violations
  const campaigns = await db
    .select({ id: fbCampaignsTable.id })
    .from(fbCampaignsTable)
    .where(eq(fbCampaignsTable.userId, TEST_USER_ID));

  for (const { id } of campaigns) {
    await db.delete(fbCampaignsTable).where(eq(fbCampaignsTable.id, id));
  }

  const conns = await db
    .select({ id: fbConnectionsTable.id })
    .from(fbConnectionsTable)
    .where(eq(fbConnectionsTable.userId, TEST_USER_ID));

  for (const { id } of conns) {
    // fb_connection_campaigns has ON DELETE CASCADE from connection_id FK
    await db.delete(fbConnectionsTable).where(eq(fbConnectionsTable.id, id));
  }
}

/** HTTP helper: POST to the test server with auth bypass header injected */
async function post(path: string, body?: unknown): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-test-user-id": TEST_USER_ID, // picked up by requireAuth bypass in test mode
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

/** Queue the standard Meta API responses for a successful ad submission (no interests, no Instagram) */
function queueSuccessfulSubmission(
  campaignId: string = PARTNER_CAMPAIGN_ID,
  adSetId: string = AD_SET_ID,
  adId: string = AD_ID,
) {
  // 1. GET minimum_budgets
  queueMetaResponse({ data: [{ currency: "USD", min_daily_budget_high_freq: 100 }] });
  // 2. POST adsets
  queueMetaResponse({ id: adSetId });
  // 3. GET instagram_accounts (ad account edge — empty)
  queueMetaResponse({ data: [] });
  // 4. GET instagram_accounts (page edge — empty)
  queueMetaResponse({ data: [] });
  // 5. POST adcreatives
  queueMetaResponse({ id: CREATIVE_ID });
  // 6. POST ads
  queueMetaResponse({ id: adId });
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

before(async () => {
  server = createServer(testApp);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address() as { port: number };
  baseUrl = `http://127.0.0.1:${addr.port}/api`;
});

after(async () => {
  await cleanupTestUser();
  globalThis.fetch = originalFetch;
  server.close();
});

beforeEach(() => {
  metaMockQueue.length = 0;
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Launch route — ASBO shared-campaign scenarios", () => {
  test("Scenario 1: first submission creates a shared campaign and stores it in fb_connection_campaigns", async () => {
    const { connId } = await seedConnection();
    const { campaignId } = await seedCampaign(connId);

    try {
      // Seed Meta responses: ensureCampaign + createAd
      queueMetaResponse({ id: PARTNER_CAMPAIGN_ID }); // POST /campaigns
      queueSuccessfulSubmission();

      const { status, body } = await post(`/fb/campaigns/${campaignId}/launch`);

      // Route must return the updated campaign
      assert.equal(status, 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
      assert.equal(body["status"], "paused", "campaign status must be paused after submission");
      assert.equal(body["partnerCampaignId"], PARTNER_CAMPAIGN_ID);
      assert.equal(body["partnerAdSetId"], AD_SET_ID);
      assert.equal(body["partnerAdId"], AD_ID);

      // The shared campaign ID must now be persisted in fb_connection_campaigns
      const [row] = await db
        .select()
        .from(fbConnectionCampaignsTable)
        .where(
          and(
            eq(fbConnectionCampaignsTable.connectionId, connId),
            eq(fbConnectionCampaignsTable.adAccountId, AD_ACCOUNT_ID),
          ),
        );
      assert.ok(row, "fb_connection_campaigns must have a row for this connection × account");
      assert.equal(row.partnerCampaignId, PARTNER_CAMPAIGN_ID);
    } finally {
      await cleanupTestUser();
    }
  });

  test("Scenario 2: second submission reuses the stored partnerCampaignId without creating a new campaign", async () => {
    const { connId } = await seedConnection();

    // Pre-seed the shared campaign as if Scenario 1 already ran
    await db.insert(fbConnectionCampaignsTable).values({
      connectionId: connId,
      adAccountId: AD_ACCOUNT_ID,
      partnerCampaignId: PARTNER_CAMPAIGN_ID,
    });

    const { campaignId } = await seedCampaign(connId);

    try {
      // campaignExists check: GET /{campaignId} → campaign is still alive
      queueMetaResponse({ id: PARTNER_CAMPAIGN_ID, status: "PAUSED" });
      // createAd (no new campaign creation)
      queueSuccessfulSubmission(PARTNER_CAMPAIGN_ID, "adset_second_002", "ad_second_002");

      const { status, body } = await post(`/fb/campaigns/${campaignId}/launch`);

      assert.equal(status, 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
      assert.equal(body["status"], "paused");
      assert.equal(body["partnerCampaignId"], PARTNER_CAMPAIGN_ID, "must reuse the existing shared campaign ID");
      assert.equal(body["partnerAdSetId"], "adset_second_002");

      // fb_connection_campaigns row must still show the ORIGINAL campaign (not a new one)
      const rows = await db
        .select()
        .from(fbConnectionCampaignsTable)
        .where(
          and(
            eq(fbConnectionCampaignsTable.connectionId, connId),
            eq(fbConnectionCampaignsTable.adAccountId, AD_ACCOUNT_ID),
          ),
        );
      assert.equal(rows.length, 1, "must not create a duplicate row in fb_connection_campaigns");
      assert.equal(rows[0].partnerCampaignId, PARTNER_CAMPAIGN_ID);

      // Verify no POST to /campaigns was made (no ensureCampaign call)
      // The mocked queue is now empty — if ensureCampaign had been called it would have
      // consumed an extra slot and the subsequent createAd would have received wrong responses.
      assert.equal(
        metaMockQueue.length,
        0,
        "all mocked responses consumed — confirms no extra Meta calls were made",
      );
    } finally {
      await cleanupTestUser();
    }
  });

  test("Scenario 3: deleted campaign triggers recovery — new campaign created and fb_connection_campaigns updated", async () => {
    const { connId } = await seedConnection();
    const DELETED_CAMPAIGN_ID = "camp_deleted_old_111";
    const NEW_CAMPAIGN_ID = "camp_replacement_222";

    // Pre-seed the OLD shared campaign (as if it was created before the user deleted it in Ads Manager)
    await db.insert(fbConnectionCampaignsTable).values({
      connectionId: connId,
      adAccountId: AD_ACCOUNT_ID,
      partnerCampaignId: DELETED_CAMPAIGN_ID,
    });

    const { campaignId } = await seedCampaign(connId);

    try {
      // campaignExists: GET /{deletedCampaignId} → Meta returns error 803 (campaign not found)
      queueMetaResponse({
        error: { code: 803, message: "Some aliases you requested do not exist" },
      });
      // ensureCampaign: POST /campaigns → new campaign
      queueMetaResponse({ id: NEW_CAMPAIGN_ID });
      // createAd under the new campaign
      queueSuccessfulSubmission(NEW_CAMPAIGN_ID, "adset_recovery_003", "ad_recovery_003");

      const { status, body } = await post(`/fb/campaigns/${campaignId}/launch`);

      assert.equal(status, 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
      assert.equal(body["status"], "paused");
      assert.equal(body["partnerCampaignId"], NEW_CAMPAIGN_ID, "must use the new replacement campaign ID");
      assert.equal(body["partnerAdSetId"], "adset_recovery_003");

      // fb_connection_campaigns must now point to the NEW campaign (old value replaced)
      const [row] = await db
        .select()
        .from(fbConnectionCampaignsTable)
        .where(
          and(
            eq(fbConnectionCampaignsTable.connectionId, connId),
            eq(fbConnectionCampaignsTable.adAccountId, AD_ACCOUNT_ID),
          ),
        );
      assert.ok(row, "fb_connection_campaigns row must exist");
      assert.equal(
        row.partnerCampaignId,
        NEW_CAMPAIGN_ID,
        "fb_connection_campaigns must be updated from the deleted campaign ID to the new one",
      );
      assert.notEqual(row.partnerCampaignId, DELETED_CAMPAIGN_ID);
    } finally {
      await cleanupTestUser();
    }
  });

  test("launch fails gracefully when Meta rejects the ad-set creation and cleans up", async () => {
    const { connId } = await seedConnection();

    // Pre-seed a stored shared campaign
    await db.insert(fbConnectionCampaignsTable).values({
      connectionId: connId,
      adAccountId: AD_ACCOUNT_ID,
      partnerCampaignId: PARTNER_CAMPAIGN_ID,
    });

    const { campaignId } = await seedCampaign(connId);

    try {
      // campaignExists → OK
      queueMetaResponse({ id: PARTNER_CAMPAIGN_ID, status: "PAUSED" });
      // minimum_budgets
      queueMetaResponse({ data: [{ currency: "USD", min_daily_budget_high_freq: 100 }] });
      // POST adsets → Meta rejects (e.g. policy violation)
      queueMetaResponse({ error: { code: 100, message: "Ad set violates policy", error_user_msg: "Your ad targeting violates our policy." } });

      const { status, body } = await post(`/fb/campaigns/${campaignId}/launch`);

      // Route always returns 200 but sets status = "error"
      assert.equal(status, 200);
      assert.equal(body["status"], "error", "campaign status must be 'error' after Meta rejection");
      assert.ok(
        typeof body["errorMessage"] === "string" && body["errorMessage"].length > 0,
        "errorMessage must be populated",
      );

      // The db campaign record must also reflect the error
      const [dbCampaign] = await db
        .select()
        .from(fbCampaignsTable)
        .where(eq(fbCampaignsTable.id, campaignId));
      assert.equal(dbCampaign.status, "error");
      assert.equal(dbCampaign.leadDeliveryStatus, "failed");
    } finally {
      await cleanupTestUser();
    }
  });

  test("returns 400 when the connection has no partnerToken (no credentials)", async () => {
    // Insert a connection without a token — simulates a disconnected state
    const [conn] = await db
      .insert(fbConnectionsTable)
      .values({
        userId: TEST_USER_ID,
        fbPageId: FB_PAGE_ID,
        fbPageName: FB_PAGE_NAME,
        adAccountId: AD_ACCOUNT_ID,
        adAccountName: "Test Ad Account",
        partnerToken: null, // no token
        status: "connected",
      })
      .returning();

    const [campaign] = await db
      .insert(fbCampaignsTable)
      .values({
        userId: TEST_USER_ID,
        connectionId: conn.id,
        headline: "Test",
        bodyText: "Test",
        dailyBudgetCents: 500,
        targetingRadiusMiles: 5,
        targetingAgeMin: 18,
        targetingAgeMax: 65,
        targetingGender: "all",
        targetingInterests: [],
        targetingLatitude: "37.7749",
        targetingLongitude: "-122.4194",
        status: "draft",
        leadDeliveryStatus: "unverified",
      })
      .returning();

    try {
      const { status } = await post(`/fb/campaigns/${campaign.id}/launch`);
      assert.equal(status, 400, "must reject with 400 when no access token is stored");
    } finally {
      await cleanupTestUser();
    }
  });
});
