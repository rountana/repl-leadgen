import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { AiPrefillBody, AiExtractBrandingBody } from "@workspace/api-zod";

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

// POST /ai/prefill
router.post("/ai/prefill", requireAuth, async (req: any, res): Promise<void> => {
  const parsed = AiPrefillBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { sourceUrl } = parsed.data;

  // Return a helpful stub response — real AI scraping can be added later
  if (sourceUrl) {
    // Attempt to extract domain as a business name hint
    let businessName: string | null = null;
    try {
      const url = new URL(sourceUrl);
      businessName = url.hostname.replace(/^www\./, "").split(".")[0];
      // Capitalize first letter
      businessName = businessName.charAt(0).toUpperCase() + businessName.slice(1);
    } catch {
      businessName = null;
    }

    res.json({
      title: null,
      description: null,
      businessName,
      businessLocation: null,
    });
    return;
  }

  res.json({
    title: null,
    description: null,
    businessName: null,
    businessLocation: null,
  });
});

// POST /ai/extract-branding
router.post("/ai/extract-branding", requireAuth, async (req: any, res): Promise<void> => {
  const parsed = AiExtractBrandingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Stub response — real branding extraction can be wired up later
  res.json({
    logoUrl: null,
    tagline: null,
    primaryColor: null,
  });
});

export default router;
