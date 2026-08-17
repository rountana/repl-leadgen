import { Router } from "express";
import { eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, userProfilesTable, fbConnectionsTable, leadMagnetsTable } from "@workspace/db";

const router = Router();

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

function serializeProfile(p: any) {
  return {
    ...p,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
  };
}

// GET /profile — return (or auto-create) the user's business profile
router.get("/profile", requireAuth, async (req: any, res): Promise<void> => {
  const userId = req.userId as string;

  const [existing] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId));

  if (existing) {
    res.json(serializeProfile(existing));
    return;
  }

  // ── Auto-populate from existing data sources ────────────────────────────
  let businessName: string | null = null;
  let businessLocation: string | null = null;

  // 1. Try fb connection for business name
  const [conn] = await db
    .select({ fbPageName: fbConnectionsTable.fbPageName })
    .from(fbConnectionsTable)
    .where(eq(fbConnectionsTable.userId, userId));
  if (conn?.fbPageName) businessName = conn.fbPageName;

  // 2. Try most recent lead magnet for business name + location
  const [magnet] = await db
    .select({
      businessName: leadMagnetsTable.businessName,
      businessLocation: leadMagnetsTable.businessLocation,
    })
    .from(leadMagnetsTable)
    .where(eq(leadMagnetsTable.userId, userId))
    .orderBy(leadMagnetsTable.createdAt)
    .limit(1);

  if (magnet?.businessName && !businessName) businessName = magnet.businessName;
  if (magnet?.businessLocation) businessLocation = magnet.businessLocation;

  const [created] = await db
    .insert(userProfilesTable)
    .values({ userId, businessName, businessLocation, industry: null, logoUrl: null })
    .returning();

  res.json(serializeProfile(created));
});

// PUT /profile — upsert the user's business profile
router.put("/profile", requireAuth, async (req: any, res): Promise<void> => {
  const userId = req.userId as string;
  const { businessName, businessLocation, industry, logoUrl } = req.body ?? {};

  const [existing] = await db
    .select({ id: userProfilesTable.id })
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId));

  const data: Record<string, string | null> = {};
  if (businessName !== undefined) data.businessName = businessName ?? null;
  if (businessLocation !== undefined) data.businessLocation = businessLocation ?? null;
  if (industry !== undefined) data.industry = industry ?? null;
  if (logoUrl !== undefined) data.logoUrl = logoUrl ?? null;

  // Guard: nothing to update (client sent an empty body)
  if (Object.keys(data).length === 0) {
    if (existing) { res.json(serializeProfile(existing)); return; }
  }

  if (existing) {
    const [updated] = await db
      .update(userProfilesTable)
      .set(Object.keys(data).length ? data : { businessName: null })
      .where(eq(userProfilesTable.userId, userId))
      .returning();
    res.json(serializeProfile(updated));
  } else {
    const [created] = await db
      .insert(userProfilesTable)
      .values({ userId, ...data })
      .returning();
    res.json(serializeProfile(created));
  }
});

export default router;
