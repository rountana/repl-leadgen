import { Router } from "express";
import { eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, userProfilesTable, fbConnectionsTable, leadMagnetsTable } from "@workspace/db";

/** Attempt to geocode an address via Nominatim. Returns true if at least one result is found. */
async function isAddressGeocodable(address: string): Promise<boolean> {
  try {
    const params = new URLSearchParams({ q: address.trim(), format: "json", limit: "1" });
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          "User-Agent": "HVCG-FbIntegration/1.0 (contact@hvcg.app)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!response.ok) return true; // don't penalise saves when Nominatim is unavailable
    const results = (await response.json()) as Array<unknown>;
    return results.length > 0;
  } catch {
    // Network/timeout — treat as "can't verify", don't block the save
    return true;
  }
}

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

  // Geocode check — run before the DB write so we can attach the warning to the response.
  // The save always succeeds; this is a soft warning only.
  let addressWarning: string | null = null;
  const locationToCheck =
    businessLocation !== undefined ? businessLocation : null;
  if (locationToCheck && locationToCheck.trim() !== "") {
    const geocodable = await isAddressGeocodable(locationToCheck);
    if (!geocodable) {
      addressWarning =
        "We couldn't find this address on the map. Check for typos before creating an ad.";
    }
  }

  let profile: any;
  if (existing) {
    const [updated] = await db
      .update(userProfilesTable)
      .set(Object.keys(data).length ? data : { businessName: null })
      .where(eq(userProfilesTable.userId, userId))
      .returning();
    profile = updated;
  } else {
    const [created] = await db
      .insert(userProfilesTable)
      .values({ userId, ...data })
      .returning();
    profile = created;
  }

  res.json({ ...serializeProfile(profile), addressWarning });
});

export default router;
