import { Router, type IRouter } from "express";
import { eq, and, or } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "crypto";
import { getAuth } from "@clerk/express";
import { db, fbConnectionsTable, fbCampaignsTable, fbLeadsTable } from "@workspace/db";
import {
  CreateFbConnectionBody,
  GenerateFbAdBody,
  CreateFbCampaignBody,
  UpdateFbCampaignBody,
  GetFbCampaignParams,
  LaunchFbCampaignParams,
  GetFbCampaignLeadStatusParams,
  ReceiveFbLeadBody,
} from "@workspace/api-zod";
import { activeFbPartnerAdapter } from "../lib/fbPartnerAdapter";
import { generateFbAd } from "../lib/fbAdGenerator";

/**
 * Verify the webhook request using HMAC-SHA256 over the raw body.
 * The partner is expected to send an X-Hub-Signature-256 header of the form
 * "sha256=<hex-digest>" (Meta/Facebook convention). We verify with a
 * timing-safe comparison to prevent timing attacks.
 *
 * Returns true when verification passes; throws or returns false on failure.
 */
function verifyWebhookSignature(rawBody: Buffer, secret: string, signatureHeader: string): boolean {
  if (!signatureHeader.startsWith("sha256=")) return false;
  const expected = Buffer.from(signatureHeader.slice("sha256=".length), "hex");
  const actual = Buffer.from(
    createHmac("sha256", secret).update(rawBody).digest("hex"),
    "hex",
  );
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

const router: IRouter = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
}

function serializeCampaign(c: any) {
  return {
    ...c,
    targetingLatitude: c.targetingLatitude ?? null,
    targetingLongitude: c.targetingLongitude ?? null,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : c.updatedAt,
  };
}

function serializeConnection(c: any) {
  // Never return partnerToken — it is a server-side credential only
  const { partnerToken: _omit, ...safe } = c;
  return {
    ...safe,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : c.updatedAt,
  };
}

// ── FB CONNECTION ────────────────────────────────────────────────────────────

// GET /fb/connection
router.get("/fb/connection", requireAuth, async (req: any, res): Promise<void> => {
  const userId = req.userId as string;
  const [conn] = await db
    .select()
    .from(fbConnectionsTable)
    .where(eq(fbConnectionsTable.userId, userId));

  if (!conn) {
    res.status(404).json({ error: "No Facebook connection found" });
    return;
  }
  res.json(serializeConnection(conn));
});

// POST /fb/connection
router.post("/fb/connection", requireAuth, async (req: any, res): Promise<void> => {
  const userId = req.userId as string;
  const parsed = CreateFbConnectionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { fbPageId, fbPageName, adAccountId, adAccountName } = parsed.data;

  // Upsert: update existing row to preserve FK references from campaigns,
  // or insert fresh if none exists yet.
  const [existing] = await db
    .select({ id: fbConnectionsTable.id })
    .from(fbConnectionsTable)
    .where(eq(fbConnectionsTable.userId, userId));

  let conn: typeof fbConnectionsTable.$inferSelect;
  if (existing) {
    const [updated] = await db
      .update(fbConnectionsTable)
      .set({ fbPageId, fbPageName, adAccountId, adAccountName, status: "connected" })
      .where(eq(fbConnectionsTable.userId, userId))
      .returning();
    conn = updated;
    req.log.info({ userId, fbPageId }, "FB connection updated");
  } else {
    const [inserted] = await db
      .insert(fbConnectionsTable)
      .values({ userId, fbPageId, fbPageName, adAccountId, adAccountName, status: "connected" })
      .returning();
    conn = inserted;
    req.log.info({ userId, fbPageId }, "FB connection created");
  }

  res.json(serializeConnection(conn));
});

// DELETE /fb/connection
router.delete("/fb/connection", requireAuth, async (req: any, res): Promise<void> => {
  const userId = req.userId as string;
  await db
    .update(fbConnectionsTable)
    .set({ status: "disconnected", partnerToken: null })
    .where(eq(fbConnectionsTable.userId, userId));

  req.log.info({ userId }, "FB connection disconnected");
  res.sendStatus(204);
});

// ── AD GENERATION ────────────────────────────────────────────────────────────

// POST /fb/campaigns/generate-ad
// NOTE: must be registered before /fb/campaigns/:id
router.post("/fb/campaigns/generate-ad", requireAuth, async (req: any, res): Promise<void> => {
  const parsed = GenerateFbAdBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const draft = generateFbAd(parsed.data);
  req.log.info({ industry: parsed.data.industry }, "FB ad generated");
  res.json(draft);
});

// ── FB CAMPAIGNS ─────────────────────────────────────────────────────────────

// GET /fb/campaigns
router.get("/fb/campaigns", requireAuth, async (req: any, res): Promise<void> => {
  const userId = req.userId as string;
  const campaigns = await db
    .select()
    .from(fbCampaignsTable)
    .where(eq(fbCampaignsTable.userId, userId))
    .orderBy(fbCampaignsTable.createdAt);

  res.json(campaigns.map(serializeCampaign));
});

// POST /fb/campaigns
router.post("/fb/campaigns", requireAuth, async (req: any, res): Promise<void> => {
  const userId = req.userId as string;
  const parsed = CreateFbCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Require an active connection before creating a campaign
  const [conn] = await db
    .select()
    .from(fbConnectionsTable)
    .where(and(eq(fbConnectionsTable.userId, userId), eq(fbConnectionsTable.status, "connected")));

  if (!conn) {
    res.status(400).json({ error: "No active Facebook connection. Connect your account before creating a campaign." });
    return;
  }

  const {
    headline,
    bodyText,
    imageUrl,
    dailyBudgetCents,
    targetingRadiusMiles,
    targetingLatitude,
    targetingLongitude,
    destinationUrl,
  } = parsed.data;

  const [campaign] = await db
    .insert(fbCampaignsTable)
    .values({
      userId,
      connectionId: conn.id,
      headline,
      bodyText,
      imageUrl,
      dailyBudgetCents,
      targetingRadiusMiles,
      targetingLatitude: String(targetingLatitude),
      targetingLongitude: String(targetingLongitude),
      destinationUrl: destinationUrl ?? null,
      status: "draft",
      leadDeliveryStatus: "unverified",
    })
    .returning();

  req.log.info({ userId, campaignId: campaign.id }, "FB campaign created");
  res.status(201).json(serializeCampaign(campaign));
});

// GET /fb/campaigns/:id
router.get("/fb/campaigns/:id", requireAuth, async (req: any, res): Promise<void> => {
  const params = GetFbCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const userId = req.userId as string;
  const [campaign] = await db
    .select()
    .from(fbCampaignsTable)
    .where(and(eq(fbCampaignsTable.id, params.data.id), eq(fbCampaignsTable.userId, userId)));

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  res.json(serializeCampaign(campaign));
});

// PATCH /fb/campaigns/:id — update fields on a draft or failed campaign, reset to draft
router.patch("/fb/campaigns/:id", requireAuth, async (req: any, res): Promise<void> => {
  const params = GetFbCampaignParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const userId = req.userId as string;

  const [existing] = await db
    .select()
    .from(fbCampaignsTable)
    .where(and(eq(fbCampaignsTable.id, params.data.id), eq(fbCampaignsTable.userId, userId)));

  if (!existing) { res.status(404).json({ error: "Campaign not found" }); return; }

  if (!["draft", "error"].includes(existing.status)) {
    res.status(409).json({ error: "Only draft or failed campaigns can be edited." });
    return;
  }

  const patch = UpdateFbCampaignBody.safeParse(req.body);
  if (!patch.success) { res.status(400).json({ error: patch.error.message }); return; }

  const [updated] = await db
    .update(fbCampaignsTable)
    .set({ ...patch.data, status: "draft", leadDeliveryStatus: "unverified", errorMessage: null })
    .where(eq(fbCampaignsTable.id, existing.id))
    .returning();

  res.json(serializeCampaign(updated));
});

// POST /fb/campaigns/sync
// Re-checks Meta campaign status for all live/launching/paused campaigns and updates DB.
// Must be registered before /fb/campaigns/:id to avoid the param route catching "sync".
router.post("/fb/campaigns/sync", requireAuth, async (req: any, res): Promise<void> => {
  const userId = req.userId as string;

  const candidates = await db
    .select()
    .from(fbCampaignsTable)
    .where(
      and(
        eq(fbCampaignsTable.userId, userId),
        or(
          eq(fbCampaignsTable.status, "live"),
          eq(fbCampaignsTable.status, "launching"),
          eq(fbCampaignsTable.status, "paused"),
        ),
      ),
    );

  const syncable = candidates.filter((c) => !!c.partnerCampaignId && !!c.connectionId);
  if (syncable.length === 0) {
    res.json({ synced: 0, updated: 0 });
    return;
  }

  // Batch-fetch all unique connections so we have access tokens
  const uniqueConnIds = [...new Set(syncable.map((c) => c.connectionId!))];
  const connections = await db
    .select()
    .from(fbConnectionsTable)
    .where(
      and(
        eq(fbConnectionsTable.userId, userId),
        or(...uniqueConnIds.map((id) => eq(fbConnectionsTable.id, id))),
      ),
    );
  const connById = new Map(connections.map((c) => [c.id, c]));

  let updated = 0;

  await Promise.all(
    syncable.map(async (campaign) => {
      const conn = connById.get(campaign.connectionId!);
      if (!conn?.partnerToken) {
        req.log.warn({ campaignId: campaign.id }, "FB campaign sync: no access token on connection, skipping");
        return;
      }
      try {
        const result = await activeFbPartnerAdapter.verifyLeadDelivery(
          campaign.partnerCampaignId!,
          conn.partnerToken,
        );
        const isActive = result.active;
        const newStatus = isActive ? "live" : "paused";
        const newLeadDelivery = isActive ? "active" : "failed";

        if (newStatus !== campaign.status || newLeadDelivery !== campaign.leadDeliveryStatus) {
          await db
            .update(fbCampaignsTable)
            .set({ status: newStatus, leadDeliveryStatus: newLeadDelivery })
            .where(eq(fbCampaignsTable.id, campaign.id));
          updated++;
          req.log.info(
            { campaignId: campaign.id, oldStatus: campaign.status, newStatus },
            "FB campaign sync: status updated",
          );
        }
      } catch (err) {
        req.log.error({ campaignId: campaign.id, err }, "FB campaign sync: failed to check status");
      }
    }),
  );

  res.json({ synced: syncable.length, updated });
});

// POST /fb/campaigns/:id/launch
router.post("/fb/campaigns/:id/launch", requireAuth, async (req: any, res): Promise<void> => {
  const params = LaunchFbCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const userId = req.userId as string;

  const [campaign] = await db
    .select()
    .from(fbCampaignsTable)
    .where(and(eq(fbCampaignsTable.id, params.data.id), eq(fbCampaignsTable.userId, userId)));

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  // Require an active connection with credentials to launch
  const [conn] = campaign.connectionId
    ? await db
        .select()
        .from(fbConnectionsTable)
        .where(
          and(
            eq(fbConnectionsTable.id, campaign.connectionId),
            eq(fbConnectionsTable.status, "connected"),
          ),
        )
    : [];

  if (!conn || !conn.fbPageId || !conn.adAccountId) {
    res.status(400).json({
      error:
        "Campaign has no active Facebook connection. Reconnect your account before launching.",
    });
    return;
  }

  if (!conn.partnerToken) {
    res.status(400).json({
      error:
        "No Facebook access token found. Please disconnect and reconnect your Facebook account to refresh your credentials.",
    });
    return;
  }

  // Mark as launching
  await db
    .update(fbCampaignsTable)
    .set({ status: "launching" })
    .where(eq(fbCampaignsTable.id, campaign.id));

  let updatedCampaign: typeof campaign;
  try {
    // 1. Create the campaign via Meta Marketing API
    const createResult = await activeFbPartnerAdapter.createCampaign({
      headline: campaign.headline ?? "",
      bodyText: campaign.bodyText ?? "",
      imageUrl: campaign.imageUrl ?? "",
      dailyBudgetCents: campaign.dailyBudgetCents ?? 0,
      targetingRadiusMiles: campaign.targetingRadiusMiles ?? 0,
      targetingLatitude: Number(campaign.targetingLatitude ?? 0),
      targetingLongitude: Number(campaign.targetingLongitude ?? 0),
      fbPageId: conn.fbPageId,
      adAccountId: conn.adAccountId,
      accessToken: conn.partnerToken!,
      destinationUrl: campaign.destinationUrl ?? undefined,
    });

    // 2. Atomically verify campaign delivery status right after launch
    const verifyResult = await activeFbPartnerAdapter.verifyLeadDelivery(
      createResult.partnerCampaignId,
      conn.partnerToken!,
    );
    const leadDeliveryStatus: "active" | "failed" = verifyResult.active ? "active" : "failed";

    const [updated] = await db
      .update(fbCampaignsTable)
      .set({
        status: leadDeliveryStatus === "active" ? "live" : "error",
        partnerCampaignId: createResult.partnerCampaignId,
        leadDeliveryStatus,
      })
      .where(eq(fbCampaignsTable.id, campaign.id))
      .returning();

    updatedCampaign = updated;
    req.log.info(
      {
        campaignId: campaign.id,
        partnerCampaignId: createResult.partnerCampaignId,
        leadDeliveryStatus,
      },
      "FB campaign launched",
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const [updated] = await db
      .update(fbCampaignsTable)
      .set({ status: "error", leadDeliveryStatus: "failed", errorMessage })
      .where(eq(fbCampaignsTable.id, campaign.id))
      .returning();

    updatedCampaign = updated;
    req.log.error({ campaignId: campaign.id, err }, "FB campaign launch failed");
  }

  res.json(serializeCampaign(updatedCampaign!));
});

// GET /fb/campaigns/:id/lead-status
router.get(
  "/fb/campaigns/:id/lead-status",
  requireAuth,
  async (req: any, res): Promise<void> => {
    const params = GetFbCampaignLeadStatusParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const userId = req.userId as string;

    const [campaign] = await db
      .select()
      .from(fbCampaignsTable)
      .where(and(eq(fbCampaignsTable.id, params.data.id), eq(fbCampaignsTable.userId, userId)));

    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }

    // If no partner campaign ID yet, return unverified immediately
    if (!campaign.partnerCampaignId) {
      res.json({ status: "unverified", checkedAt: new Date().toISOString() });
      return;
    }

    // Fetch connection to get the access token
    const [conn] = campaign.connectionId
      ? await db
          .select()
          .from(fbConnectionsTable)
          .where(eq(fbConnectionsTable.id, campaign.connectionId))
      : [];

    if (!conn?.partnerToken) {
      res.status(400).json({ error: "No access token found. Please reconnect your Facebook account." });
      return;
    }

    // Verify campaign status via Meta Marketing API
    const result = await activeFbPartnerAdapter.verifyLeadDelivery(
      campaign.partnerCampaignId,
      conn.partnerToken,
    );
    const deliveryStatus: "active" | "failed" | "unverified" = result.active ? "active" : "failed";

    // Persist the verified status
    await db
      .update(fbCampaignsTable)
      .set({ leadDeliveryStatus: deliveryStatus })
      .where(eq(fbCampaignsTable.id, campaign.id));

    req.log.info(
      { campaignId: campaign.id, deliveryStatus },
      "FB campaign lead delivery checked",
    );
    res.json({ status: deliveryStatus, checkedAt: result.checkedAt });
  },
);

// ── FB WEBHOOKS (public — no auth) ───────────────────────────────────────────

// POST /fb/webhooks/leads
router.post("/fb/webhooks/leads", async (req: any, res): Promise<void> => {
  // Signature verification — FB_WEBHOOK_SECRET must be set.
  // Uses HMAC-SHA256 over the raw request body (Meta/Facebook X-Hub-Signature-256 convention).
  // Fails closed in all environments when the secret is absent or the signature is invalid.
  const webhookSecret = process.env.FB_WEBHOOK_SECRET;
  if (!webhookSecret) {
    req.log.error(
      "FB webhook: FB_WEBHOOK_SECRET is not configured — rejecting all webhook requests until set",
    );
    res.status(503).json({ error: "Webhook receiver is not configured" });
    return;
  }

  const signatureHeader = req.headers["x-hub-signature-256"] as string | undefined;
  const rawBody: Buffer | undefined = req.rawBody;

  if (!signatureHeader || !rawBody || !verifyWebhookSignature(rawBody, webhookSecret, signatureHeader)) {
    req.log.warn({ signatureHeader }, "FB webhook: invalid or missing HMAC signature");
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  const parsed = ReceiveFbLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { campaignId, firstName, lastName, email, phone } = parsed.data;

  // Look up campaign to get the userId
  const [campaign] = await db
    .select()
    .from(fbCampaignsTable)
    .where(eq(fbCampaignsTable.id, campaignId));

  if (!campaign) {
    req.log.warn({ campaignId }, "FB webhook: campaign not found, dropping lead");
    // Return 200 so the partner doesn't retry indefinitely
    res.json({ status: "ok" });
    return;
  }

  await db.insert(fbLeadsTable).values({
    campaignId,
    userId: campaign.userId,
    firstName: firstName ?? null,
    lastName: lastName ?? null,
    email: email ?? null,
    phone: phone ?? null,
  });

  // Do not log PII (email, name, phone) — log only the campaign reference
  req.log.info({ campaignId }, "FB inbound lead received");
  res.json({ status: "ok" });
});

export default router;
