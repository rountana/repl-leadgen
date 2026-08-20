import { Router, type IRouter } from "express";
import { eq, and, or } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "crypto";
import { getAuth } from "@clerk/express";
import { db, fbConnectionsTable, fbConnectionCampaignsTable, fbCampaignsTable, fbLeadsTable, fbAdTemplatesTable } from "@workspace/db";
import {
  CreateFbConnectionBody,
  GenerateFbAdBody,
  CreateFbCampaignBody,
  UpdateFbCampaignBody,
  GetFbCampaignParams,
  LaunchFbCampaignParams,
  GetFbCampaignLeadStatusParams,
  ReceiveFbLeadBody,
  CreateFbAdTemplateBody,
} from "@workspace/api-zod";
import { activeFbPartnerAdapter, getMinimumDailyBudget, formatBudget } from "../lib/fbPartnerAdapter";
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
  // Integration-test bypass: only active when NODE_ENV === "test".
  // Production and development builds never enter this branch.
  if (process.env.NODE_ENV === "test") {
    const testUserId = req.headers["x-test-user-id"] as string | undefined;
    if (testUserId) {
      req.userId = testUserId;
      next();
      return;
    }
  }

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
    // Campaigns created before CTA selection have no persisted value. Give them
    // the current default while preserving any explicitly selected CTA.
    callToAction: c.callToAction ?? "GET_OFFER",
    targetingLatitude: c.targetingLatitude ?? null,
    targetingLongitude: c.targetingLongitude ?? null,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : c.updatedAt,
  };
}

function serializeConnection(c: any, partnerCampaignId?: string | null) {
  // Never return partnerToken — it is a server-side credential only
  const { partnerToken: _omit, ...safe } = c;
  return {
    ...safe,
    // partnerCampaignId is looked up from fb_connection_campaigns (per-account),
    // not from fb_connections.partnerCampaignId (which is now unused).
    partnerCampaignId: partnerCampaignId ?? null,
    // A page/account selection without the server-side token is not launchable.
    // Treat it as disconnected in the client so the user is guided through a
    // fresh OAuth flow instead of reaching the launch guard with a misleading
    // "connected" state.
    status: safe.status === "connected" && Boolean(c.partnerToken) ? "connected" : "disconnected",
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : c.updatedAt,
  };
}

/** Look up the stored Meta campaign ID for this connection's current ad account. */
async function getStoredCampaignId(connectionId: number, adAccountId: string | null): Promise<string | null> {
  if (!adAccountId) return null;
  const [row] = await db
    .select({ partnerCampaignId: fbConnectionCampaignsTable.partnerCampaignId })
    .from(fbConnectionCampaignsTable)
    .where(
      and(
        eq(fbConnectionCampaignsTable.connectionId, connectionId),
        eq(fbConnectionCampaignsTable.adAccountId, adAccountId),
      ),
    );
  return row?.partnerCampaignId ?? null;
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
  const partnerCampaignId = await getStoredCampaignId(conn.id, conn.adAccountId);
  res.json(serializeConnection(conn, partnerCampaignId));
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
    .select({ id: fbConnectionsTable.id, adAccountId: fbConnectionsTable.adAccountId })
    .from(fbConnectionsTable)
    .where(eq(fbConnectionsTable.userId, userId));

  let conn: typeof fbConnectionsTable.$inferSelect;
  if (existing) {
    const [updated] = await db
      .update(fbConnectionsTable)
      .set({
        fbPageId,
        fbPageName,
        adAccountId,
        adAccountName,
        status: "connected",
      })
      .where(eq(fbConnectionsTable.userId, userId))
      .returning();
    conn = updated;
    // Log whether the user switched ad accounts — useful for debugging launch failures
    // where they might be trying to use the old account's shared campaign.
    const accountChanged = existing.adAccountId !== adAccountId;
    req.log.info({ userId, fbPageId, accountChanged }, "FB connection updated");
  } else {
    const [inserted] = await db
      .insert(fbConnectionsTable)
      .values({ userId, fbPageId, fbPageName, adAccountId, adAccountName, status: "connected" })
      .returning();
    conn = inserted;
    req.log.info({ userId, fbPageId }, "FB connection created");
  }

  const partnerCampaignId = await getStoredCampaignId(conn.id, conn.adAccountId);
  res.json(serializeConnection(conn, partnerCampaignId));
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

// ── MINIMUM BUDGET ───────────────────────────────────────────────────────────

// GET /fb/minimum-budget
// Returns the Meta minimum daily budget for this user's ad account.
// If the minimum cannot be fetched, returns null fields (graceful fallback).
router.get("/fb/minimum-budget", requireAuth, async (req: any, res): Promise<void> => {
  const userId = req.userId as string;

  const [conn] = await db
    .select()
    .from(fbConnectionsTable)
    .where(and(eq(fbConnectionsTable.userId, userId), eq(fbConnectionsTable.status, "connected")));

  if (!conn || !conn.adAccountId || !conn.partnerToken) {
    res.status(400).json({ error: "No connected Facebook account with an ad account selected." });
    return;
  }

  const actId = conn.adAccountId.startsWith("act_") ? conn.adAccountId : `act_${conn.adAccountId}`;

  const minimum = await getMinimumDailyBudget(actId, conn.partnerToken);

  if (!minimum) {
    res.json({ minDailyBudgetDollars: null, currency: null, formatted: null });
    return;
  }

  // Convert from smallest currency unit (cents for USD) to display units (dollars).
  const zeroDecimalCurrencies = new Set([
    "BIF","CLP","DJF","GNF","JPY","KMF","KRW","MGA","PYG","RWF","UGX","VND","VUV","XAF","XOF","XPF",
  ]);
  const divisor = zeroDecimalCurrencies.has(minimum.currency) ? 1 : 100;
  const minDailyBudgetDollars = minimum.amount / divisor;

  res.json({
    minDailyBudgetDollars,
    currency: minimum.currency,
    formatted: formatBudget(minimum.amount, minimum.currency),
  });
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
    callToAction,
    dailyBudgetCents,
    targetingRadiusMiles,
    targetingAgeMin,
    targetingAgeMax,
    targetingGender,
    targetingInterests,
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
      callToAction: callToAction ?? "GET_OFFER",
      dailyBudgetCents,
      targetingRadiusMiles,
      targetingAgeMin,
      targetingAgeMax,
      targetingGender: targetingGender ?? "all",
      targetingInterests: targetingInterests ?? [],
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

  if (!["draft", "error", "paused"].includes(existing.status)) {
    res.status(409).json({ error: "Only draft, failed, or paused campaigns can be edited." });
    return;
  }

  const patch = UpdateFbCampaignBody.safeParse(req.body);
  if (!patch.success) { res.status(400).json({ error: patch.error.message }); return; }

  // The DB numeric columns (targetingLatitude / targetingLongitude) require strings,
  // but the Zod body schema parses them as numbers. Convert before writing.
  const { targetingLatitude, targetingLongitude, ...rest } = patch.data;
  const dbPatch = {
    ...rest,
    ...(targetingLatitude !== undefined ? { targetingLatitude: String(targetingLatitude) } : {}),
    ...(targetingLongitude !== undefined ? { targetingLongitude: String(targetingLongitude) } : {}),
  };

  // If the campaign was previously paused (submitted to Meta), clear the old
  // Meta partner IDs so the next launch creates a fresh campaign there.
  // The orphaned paused campaign in Ads Manager is harmless — users can delete it.
  const clearPartnerIds = existing.status === "paused"
    ? { partnerCampaignId: null, partnerAdSetId: null, partnerAdId: null }
    : {};

  const [updated] = await db
    .update(fbCampaignsTable)
    .set({ ...dbPatch, ...clearPartnerIds, status: "draft", leadDeliveryStatus: "unverified", errorMessage: null })
    .where(eq(fbCampaignsTable.id, existing.id))
    .returning();

  res.json(serializeCampaign(updated));
});

// DELETE /fb/campaigns/:id — remove a draft or failed campaign from the DB
router.delete("/fb/campaigns/:id", requireAuth, async (req: any, res): Promise<void> => {
  const params = GetFbCampaignParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const userId = req.userId as string;

  const [existing] = await db
    .select()
    .from(fbCampaignsTable)
    .where(and(eq(fbCampaignsTable.id, params.data.id), eq(fbCampaignsTable.userId, userId)));

  if (!existing) { res.status(404).json({ error: "Campaign not found" }); return; }

  if (existing.status === "live" || existing.status === "launching") {
    res.status(409).json({ error: "Live or launching campaigns cannot be deleted here. Pause them in Ads Manager first." });
    return;
  }

  await db.delete(fbCampaignsTable).where(eq(fbCampaignsTable.id, existing.id));
  req.log.info({ userId, campaignId: existing.id }, "FB campaign deleted");
  res.status(204).end();
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
          eq(fbCampaignsTable.status, "in_review"),
        ),
      ),
    );

  // Each local ad maps to its own Meta ad set + ad. Both IDs are required so
  // a paused ad cannot be reported as live merely because its parent is active.
  const syncable = candidates.filter(
    (c) => !!c.partnerAdSetId && !!c.partnerAdId && !!c.connectionId,
  );
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
        // Check the individual ad and its parent ad set so each ad has its own
        // status rather than inheriting a shared campaign/parent status.
        const result = await activeFbPartnerAdapter.verifyLeadDelivery(
          campaign.partnerAdSetId!,
          campaign.partnerAdId!,
          conn.partnerToken,
        );
        // Map Meta effective_status → our internal status + leadDeliveryStatus
        // ACTIVE              → live    + active
        // PENDING_REVIEW / IN_PROCESS → in_review + unverified
        // PAUSED / CAMPAIGN_PAUSED / ADSET_PAUSED → paused + unverified
        // DISAPPROVED / WITH_ISSUES / unknown → error + failed
        const newStatus: "live" | "paused" | "in_review" | "error" = result.active
          ? "live"
          : result.inReview
            ? "in_review"
            : result.paused
              ? "paused"
              : "error";
        const newLeadDelivery: "active" | "unverified" | "failed" = result.active
          ? "active"
          : result.paused || result.inReview
            ? "unverified"
            : "failed";

        if (newStatus !== campaign.status || newLeadDelivery !== campaign.leadDeliveryStatus) {
          await db
            .update(fbCampaignsTable)
            .set({ status: newStatus, leadDeliveryStatus: newLeadDelivery })
            .where(eq(fbCampaignsTable.id, campaign.id));
          updated++;
          req.log.info(
            { campaignId: campaign.id, oldStatus: campaign.status, newStatus, newLeadDelivery },
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
    // ── Shared campaign (per ad account) ──────────────────────────────────
    // Each user×adAccount pair gets its own Meta campaign stored in
    // fb_connection_campaigns. Switching ad accounts never reuses a campaign
    // that belongs to a different account.
    const adAccountId = conn.adAccountId!;
    let partnerCampaignId = await getStoredCampaignId(conn.id, adAccountId);
    // storedId: the DB value before we touch it — used in atomic replace predicate.
    const storedId = partnerCampaignId;

    if (partnerCampaignId) {
      const stillExists = await activeFbPartnerAdapter.campaignExists(
        partnerCampaignId,
        conn.partnerToken!,
      );
      if (!stillExists) {
        req.log.warn(
          { partnerCampaignId, connectionId: conn.id, adAccountId },
          "FB shared campaign no longer exists — creating a replacement",
        );
        partnerCampaignId = null;
      }
    }

    if (!partnerCampaignId) {
      const campaignResult = await activeFbPartnerAdapter.ensureCampaign({
        adAccountId,
        accessToken: conn.partnerToken!,
      });
      const newCampaignId = campaignResult.partnerCampaignId;

      if (storedId) {
        // Replacing a confirmed-deleted campaign: UPDATE with old-ID predicate
        // so a concurrent winner that already replaced it beats us safely.
        const [replaced] = await db
          .update(fbConnectionCampaignsTable)
          .set({ partnerCampaignId: newCampaignId })
          .where(
            and(
              eq(fbConnectionCampaignsTable.connectionId, conn.id),
              eq(fbConnectionCampaignsTable.adAccountId, adAccountId),
              eq(fbConnectionCampaignsTable.partnerCampaignId, storedId),
            ),
          )
          .returning();

        if (replaced) {
          partnerCampaignId = newCampaignId;
          req.log.info({ partnerCampaignId, connectionId: conn.id, adAccountId }, "FB shared campaign replaced");
        } else {
          // Concurrent winner updated the row first — use their value.
          partnerCampaignId = (await getStoredCampaignId(conn.id, adAccountId)) ?? newCampaignId;
          req.log.warn({ partnerCampaignId, orphanedCampaignId: newCampaignId }, "FB campaign: concurrent replace — using winner");
        }
      } else {
        // First launch for this account: INSERT, ignore if concurrent launch won.
        const inserted = await db
          .insert(fbConnectionCampaignsTable)
          .values({ connectionId: conn.id, adAccountId, partnerCampaignId: newCampaignId })
          .onConflictDoNothing()
          .returning();

        if (inserted.length > 0) {
          partnerCampaignId = newCampaignId;
          req.log.info({ partnerCampaignId, connectionId: conn.id, adAccountId }, "FB shared campaign stored");
        } else {
          // Concurrent winner inserted first — use their value.
          partnerCampaignId = (await getStoredCampaignId(conn.id, adAccountId)) ?? newCampaignId;
          req.log.warn({ partnerCampaignId, orphanedCampaignId: newCampaignId }, "FB campaign: concurrent insert — using winner");
        }
      }
    }

    // ── Create the ad under the verified shared campaign ──────────────────
    const adParams = {
      partnerCampaignId,
      headline: campaign.headline ?? "",
      bodyText: campaign.bodyText ?? "",
      imageUrl: campaign.imageUrl ?? "",
      callToAction: campaign.callToAction ?? "LEARN_MORE",
      dailyBudgetCents: campaign.dailyBudgetCents ?? 0,
      targetingRadiusMiles: campaign.targetingRadiusMiles ?? 0,
      targetingAgeMin: campaign.targetingAgeMin ?? 18,
      targetingAgeMax: campaign.targetingAgeMax ?? 65,
      targetingGender: campaign.targetingGender ?? "all",
      targetingInterests: campaign.targetingInterests ?? [],
      targetingLatitude: Number(campaign.targetingLatitude ?? 0),
      targetingLongitude: Number(campaign.targetingLongitude ?? 0),
      fbPageId: conn.fbPageId,
      adAccountId: conn.adAccountId,
      accessToken: conn.partnerToken!,
      destinationUrl: campaign.destinationUrl ?? undefined,
    };

    let adResult: Awaited<ReturnType<typeof activeFbPartnerAdapter.createAd>>;
    try {
      adResult = await activeFbPartnerAdapter.createAd(adParams);
    } catch (firstErr) {
      // Safety net: if the campaign was archived between our campaignExists check
      // and this createAd call (race condition), Meta returns:
      // "Ad Sets may not be added to archived Campaigns."
      // Recover by creating a fresh campaign and retrying once.
      const isArchivedError =
        firstErr instanceof Error &&
        /archived campaign/i.test(firstErr.message);

      if (!isArchivedError) throw firstErr;

      req.log.warn(
        { partnerCampaignId, connectionId: conn.id, adAccountId },
        "FB shared campaign archived at ad-set creation — creating a replacement and retrying",
      );

      const replacement = await activeFbPartnerAdapter.ensureCampaign({
        adAccountId,
        accessToken: conn.partnerToken!,
      });
      const replacementId = replacement.partnerCampaignId;

      // Persist the new campaign ID, replacing the archived one.
      await db
        .update(fbConnectionCampaignsTable)
        .set({ partnerCampaignId: replacementId })
        .where(
          and(
            eq(fbConnectionCampaignsTable.connectionId, conn.id),
            eq(fbConnectionCampaignsTable.adAccountId, adAccountId),
          ),
        );

      partnerCampaignId = replacementId;
      adResult = await activeFbPartnerAdapter.createAd({
        ...adParams,
        partnerCampaignId: replacementId,
      });

      req.log.info(
        { replacementCampaignId: replacementId, connectionId: conn.id, adAccountId },
        "FB ad submitted under replacement campaign after archived-campaign recovery",
      );
    }

    // ── Mark the ad as submitted (PAUSED) ─────────────────────────────────
    // Store the shared campaign ID alongside the ad-specific IDs so sync/
    // lead-status routes can still check Meta campaign status.
    const [updated] = await db
      .update(fbCampaignsTable)
      .set({
        status: "paused",
        partnerCampaignId,
        partnerAdSetId: adResult.partnerAdSetId,
        partnerAdId: adResult.partnerAdId,
        leadDeliveryStatus: "unverified",
      })
      .where(eq(fbCampaignsTable.id, campaign.id))
      .returning();

    updatedCampaign = updated;
    req.log.info(
      {
        campaignId: campaign.id,
        partnerCampaignId,
        partnerAdSetId: adResult.partnerAdSetId,
        partnerAdId: adResult.partnerAdId,
      },
      "FB ad submitted as paused under shared campaign — awaiting user review in Ads Manager",
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const [updated] = await db
      .update(fbCampaignsTable)
      .set({ status: "error", leadDeliveryStatus: "failed", errorMessage })
      .where(eq(fbCampaignsTable.id, campaign.id))
      .returning();

    updatedCampaign = updated;
    req.log.error({ campaignId: campaign.id, err }, "FB ad launch failed");
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

    // If no ad set ID yet (ad was never launched), return unverified immediately
    if (!campaign.partnerAdSetId) {
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

    if (!campaign.partnerAdId) {
      res.json({ status: "unverified", checkedAt: new Date().toISOString() });
      return;
    }

    // Check the individual ad and its parent ad set so this ad's status is
    // independent of other ads under the shared campaign.
    const result = await activeFbPartnerAdapter.verifyLeadDelivery(
      campaign.partnerAdSetId,
      campaign.partnerAdId,
      conn.partnerToken,
    );
    // Map Meta effective_status to our delivery status:
    // ACTIVE                      → "active"     (ad and hierarchy are delivering)
    // PAUSED / CAMPAIGN_PAUSED    → "unverified" (user hasn't activated yet / manually paused)
    // PENDING_REVIEW / IN_PROCESS → "unverified" (Meta is reviewing)
    // DISAPPROVED / WITH_ISSUES / unknown → "failed" (delivery/policy problem)
    const deliveryStatus: "active" | "failed" | "unverified" = result.active
      ? "active"
      : result.paused || result.inReview
        ? "unverified"
        : "failed";

    // Also keep the campaign status column consistent with what Meta reports:
    // ACTIVE → live | PENDING_REVIEW/IN_PROCESS → in_review |
    // PAUSED/CAMPAIGN_PAUSED → paused | everything else → error
    const campaignStatus: "live" | "paused" | "in_review" | "error" = result.active
      ? "live"
      : result.inReview
        ? "in_review"
        : result.paused
          ? "paused"
          : "error";

    // Persist the verified status
    await db
      .update(fbCampaignsTable)
      .set({ leadDeliveryStatus: deliveryStatus, status: campaignStatus })
      .where(eq(fbCampaignsTable.id, campaign.id));

    req.log.info(
      { campaignId: campaign.id, deliveryStatus, campaignStatus },
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

// ── Personal ad templates ──────────────────────────────────────────────────

router.get("/fb/ad-templates", requireAuth, async (req: any, res): Promise<void> => {
  const userId = req.userId as string;
  const templates = await db
    .select()
    .from(fbAdTemplatesTable)
    .where(eq(fbAdTemplatesTable.userId, userId))
    .orderBy(fbAdTemplatesTable.createdAt);
  res.json(templates);
});

router.post("/fb/ad-templates", requireAuth, async (req: any, res): Promise<void> => {
  const userId = req.userId as string;
  const parsed = CreateFbAdTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid template data." });
    return;
  }
  const { name, headline, bodyText, imageUrl, suggestedDailyBudget, suggestedRadiusMiles } = parsed.data;
  const [template] = await db
    .insert(fbAdTemplatesTable)
    .values({ userId, name, headline, bodyText, imageUrl, suggestedDailyBudget, suggestedRadiusMiles })
    .returning();
  res.status(201).json(template);
});

router.delete("/fb/ad-templates/:id", requireAuth, async (req: any, res): Promise<void> => {
  const userId = req.userId as string;
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid template ID." }); return; }
  const [deleted] = await db
    .delete(fbAdTemplatesTable)
    .where(and(eq(fbAdTemplatesTable.id, id), eq(fbAdTemplatesTable.userId, userId)))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Template not found." }); return; }
  res.sendStatus(204);
});

export default router;
