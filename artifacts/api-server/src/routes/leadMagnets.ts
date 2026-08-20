import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, leadMagnetsTable, templatesTable, leadsTable } from "@workspace/db";
import {
  CreateLeadMagnetBody,
  UpdateLeadMagnetBody,
  GetLeadMagnetParams,
  UpdateLeadMagnetParams,
  DeleteLeadMagnetParams,
  ApproveLeadMagnetParams,
  UploadLeadMagnetFileParams,
  UploadLeadMagnetFileBody,
} from "@workspace/api-zod";

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

// ── PUBLIC ROUTES (no auth) ────────────────────────────────────────────────

// GET /public/lead-magnets/:id
router.get("/public/lead-magnets/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = await db
    .select()
    .from(leadMagnetsTable)
    .leftJoin(templatesTable, eq(leadMagnetsTable.templateId, templatesTable.id))
    .where(and(eq(leadMagnetsTable.id, id), eq(leadMagnetsTable.status, "live")));

  if (!rows.length) { res.status(404).json({ error: "Not found" }); return; }

  const { lead_magnets: lm, templates: tpl } = rows[0];
  res.json({
    id: lm.id,
    title: lm.title,
    description: lm.description,
    businessName: lm.businessName,
    businessLocation: lm.businessLocation,
    giveawayFileName: lm.giveawayFileName,
    ctaText: lm.ctaText ?? null,
    templateLayout: tpl?.layout ?? null,
    bgColor: lm.customBgColor ?? tpl?.previewColor ?? "#ffffff",
    fontColor: lm.customFontColor ?? "#1e1b4b",
    accentColor: lm.customTextColor ?? tpl?.accentColor ?? "#4f46e5",
    fontFamily: tpl?.fontFamily ?? "'Plus Jakarta Sans', sans-serif",
  });
});

// POST /public/lead-magnets/:id/leads
router.post("/public/lead-magnets/:id/leads", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { name, email, phone } = req.body ?? {};
  if (!name || !email) { res.status(400).json({ error: "name and email are required" }); return; }

  // Verify the lead magnet is live and fetch the file URL
  const [lm] = await db
    .select()
    .from(leadMagnetsTable)
    .where(and(eq(leadMagnetsTable.id, id), eq(leadMagnetsTable.status, "live")));

  if (!lm) { res.status(404).json({ error: "Not found" }); return; }

  await db.insert(leadsTable).values({ leadMagnetId: id, name, email, phone: phone ?? null });

  res.json({ fileUrl: lm.giveawayFileUrl ?? null });
});

// ── AUTHENTICATED ROUTES ───────────────────────────────────────────────────

// GET /lead-magnets/summary — must come before /:id
router.get("/lead-magnets/summary", requireAuth, async (req: any, res): Promise<void> => {
  const userId = req.userId as string;
  const allMagnets = await db
    .select({ status: leadMagnetsTable.status })
    .from(leadMagnetsTable)
    .where(eq(leadMagnetsTable.userId, userId));

  const summary = { total: 0, live: 0, review: 0, draft: 0 };
  for (const m of allMagnets) {
    summary.total++;
    if (m.status === "live") summary.live++;
    else if (m.status === "review") summary.review++;
    else summary.draft++;
  }
  res.json(summary);
});

// GET /lead-magnets
router.get("/lead-magnets", requireAuth, async (req: any, res): Promise<void> => {
  const userId = req.userId as string;
  const magnets = await db
    .select()
    .from(leadMagnetsTable)
    .where(eq(leadMagnetsTable.userId, userId))
    .orderBy(leadMagnetsTable.createdAt);
  res.json(magnets.map(serializeMagnet));
});

// POST /lead-magnets
router.post("/lead-magnets", requireAuth, async (req: any, res): Promise<void> => {
  const userId = req.userId as string;
  const parsed = CreateLeadMagnetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const isExisting = data.type === "existing_url";

  const [magnet] = await db
    .insert(leadMagnetsTable)
    .values({
      userId,
      type: data.type,
      status: isExisting ? "live" : "draft",
      title: data.title ?? null,
      description: data.description ?? null,
      existingUrl: data.existingUrl ?? null,
      businessName: data.businessName ?? null,
      businessLocation: data.businessLocation ?? null,
      templateId: data.templateId ?? null,
      customFontColor: data.customFontColor ?? null,
      customBgColor: data.customBgColor ?? null,
      customTextColor: data.customTextColor ?? null,
      shareUrl: isExisting && data.existingUrl ? data.existingUrl : null,
    })
    .returning();

  res.status(201).json(serializeMagnet(magnet));
});

// GET /lead-magnets/:id
router.get("/lead-magnets/:id", requireAuth, async (req: any, res): Promise<void> => {
  const params = GetLeadMagnetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const userId = req.userId as string;
  const [magnet] = await db
    .select()
    .from(leadMagnetsTable)
    .where(and(eq(leadMagnetsTable.id, params.data.id), eq(leadMagnetsTable.userId, userId)));

  if (!magnet) {
    res.status(404).json({ error: "Lead magnet not found" });
    return;
  }
  res.json(serializeMagnet(magnet));
});

// PUT /lead-magnets/:id
router.put("/lead-magnets/:id", requireAuth, async (req: any, res): Promise<void> => {
  const params = UpdateLeadMagnetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const userId = req.userId as string;
  const parsed = UpdateLeadMagnetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  const data = parsed.data;
  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.existingUrl !== undefined) updates.existingUrl = data.existingUrl;
  if (data.businessName !== undefined) updates.businessName = data.businessName;
  if (data.businessLocation !== undefined) updates.businessLocation = data.businessLocation;
  if (data.templateId !== undefined) updates.templateId = data.templateId;
  if (data.customFontColor !== undefined) updates.customFontColor = data.customFontColor;
  if (data.customBgColor !== undefined) updates.customBgColor = data.customBgColor;
  if (data.customTextColor !== undefined) updates.customTextColor = data.customTextColor;
  if (data.logoUrl !== undefined) updates.logoUrl = data.logoUrl;
  if (data.tagline !== undefined) updates.tagline = data.tagline;
  if (data.ctaText !== undefined) updates.ctaText = data.ctaText;

  const [magnet] = await db
    .update(leadMagnetsTable)
    .set(updates)
    .where(and(eq(leadMagnetsTable.id, params.data.id), eq(leadMagnetsTable.userId, userId)))
    .returning();

  if (!magnet) {
    res.status(404).json({ error: "Lead magnet not found" });
    return;
  }
  res.json(serializeMagnet(magnet));
});

// DELETE /lead-magnets/:id
router.delete("/lead-magnets/:id", requireAuth, async (req: any, res): Promise<void> => {
  const params = DeleteLeadMagnetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const userId = req.userId as string;
  const [magnet] = await db
    .delete(leadMagnetsTable)
    .where(and(eq(leadMagnetsTable.id, params.data.id), eq(leadMagnetsTable.userId, userId)))
    .returning();

  if (!magnet) {
    res.status(404).json({ error: "Lead magnet not found" });
    return;
  }
  res.sendStatus(204);
});

// POST /lead-magnets/:id/approve
router.post("/lead-magnets/:id/approve", requireAuth, async (req: any, res): Promise<void> => {
  const params = ApproveLeadMagnetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const userId = req.userId as string;
  const [existing] = await db
    .select()
    .from(leadMagnetsTable)
    .where(and(eq(leadMagnetsTable.id, params.data.id), eq(leadMagnetsTable.userId, userId)));

  if (!existing) {
    res.status(404).json({ error: "Lead magnet not found" });
    return;
  }

  const proto = req.get("x-forwarded-proto") || req.protocol || "https";
  const host = req.get("x-forwarded-host") || req.get("host") || "";
  const origin = host ? `${proto}://${host}` : "";
  const shareUrl = existing.shareUrl ?? `${origin}/apps/lm/${existing.id}`;

  const [magnet] = await db
    .update(leadMagnetsTable)
    .set({ status: "live", shareUrl })
    .where(and(eq(leadMagnetsTable.id, params.data.id), eq(leadMagnetsTable.userId, userId)))
    .returning();

  res.json(serializeMagnet(magnet));
});

// POST /lead-magnets/:id/file
router.post("/lead-magnets/:id/file", requireAuth, async (req: any, res): Promise<void> => {
  const params = UploadLeadMagnetFileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const userId = req.userId as string;
  const parsed = UploadLeadMagnetFileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Store the file name and data URL as the file URL for now
  // In production this would go to object storage
  const fileUrl = parsed.data.fileDataUrl;
  const fileName = parsed.data.fileName;

  const [magnet] = await db
    .update(leadMagnetsTable)
    .set({ giveawayFileUrl: fileUrl, giveawayFileName: fileName })
    .where(and(eq(leadMagnetsTable.id, params.data.id), eq(leadMagnetsTable.userId, userId)))
    .returning();

  if (!magnet) {
    res.status(404).json({ error: "Lead magnet not found" });
    return;
  }

  res.json({ fileUrl, fileName });
});

function serializeMagnet(m: any) {
  return {
    ...m,
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
    updatedAt: m.updatedAt instanceof Date ? m.updatedAt.toISOString() : m.updatedAt,
  };
}

export default router;
