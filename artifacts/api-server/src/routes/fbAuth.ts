import { Router } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { getAuth } from "@clerk/express";
import { db, fbConnectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const FB_VERSION = "v20.0";
const SCOPES = ["pages_show_list", "ads_read", "ads_management"].join(",");

// ── Helpers ────────────────────────────────────────────────────────────────

function getAppId(): string {
  const v = process.env.FB_APP_ID;
  if (!v) throw new Error("FB_APP_ID is not configured");
  return v;
}

function getAppSecret(): string {
  const v = process.env.FB_APP_SECRET;
  if (!v) throw new Error("FB_APP_SECRET is not configured");
  return v;
}

/** The OAuth redirect_uri registered in the Facebook Developer App */
function getCallbackUrl(): string {
  const base =
    process.env.APP_BASE_URL ?? `https://${process.env.REPLIT_DEV_DOMAIN}`;
  return `${base}/api/auth/facebook/callback`;
}

/** Base URL of the FB integration frontend */
function getFrontendBase(): string {
  const base =
    process.env.APP_BASE_URL ?? `https://${process.env.REPLIT_DEV_DOMAIN}`;
  return `${base}/fb`;
}

/**
 * Build a CSRF state token: base64url( userId:timestamp:hmac )
 * where hmac = HMAC-SHA256(userId:timestamp, SESSION_SECRET)
 */
function makeState(userId: string): string {
  const secret = process.env.SESSION_SECRET ?? "fallback_dev_secret";
  const ts = Date.now().toString();
  const payload = `${userId}:${ts}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

/**
 * Verify the state token and extract the userId.
 * Returns null on any failure (invalid, tampered, or expired after 10 min).
 */
function verifyState(state: string): string | null {
  try {
    const secret = process.env.SESSION_SECRET ?? "fallback_dev_secret";
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    // Format: userId:timestamp:sig  (userId may contain colons, timestamp and sig don't)
    const parts = decoded.split(":");
    if (parts.length < 3) return null;
    const sig = parts[parts.length - 1];
    const ts = parts[parts.length - 2];
    const userId = parts.slice(0, parts.length - 2).join(":");
    const payload = `${userId}:${ts}`;
    if (Date.now() - parseInt(ts, 10) > 10 * 60 * 1000) return null; // 10-min expiry
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    const eBuf = Buffer.from(expected);
    const sBuf = Buffer.from(sig);
    if (eBuf.length !== sBuf.length) return null;
    if (!timingSafeEqual(eBuf, sBuf)) return null;
    return userId;
  } catch {
    return null;
  }
}

// ── Short-lived callback result cache ──────────────────────────────────────
// Facebook auth codes are single-use. Browsers (especially with Safe Browsing
// interstitials) sometimes replay the callback URL, hitting the server twice
// with the same code. We cache the picker result for 5 minutes keyed by state
// so replayed requests return the same redirect without re-exchanging the code.

interface CachedCallbackResult {
  redirectUrl: string;
  expiresAt: number;
}

const callbackCache = new Map<string, CachedCallbackResult>();

function getCachedResult(state: string): string | null {
  const entry = callbackCache.get(state);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    callbackCache.delete(state);
    return null;
  }
  return entry.redirectUrl;
}

function cacheResult(state: string, redirectUrl: string): void {
  callbackCache.set(state, { redirectUrl, expiresAt: Date.now() + 5 * 60 * 1000 });
}

async function graphGet(path: string, accessToken: string): Promise<any> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `https://graph.facebook.com/${FB_VERSION}${path}${sep}access_token=${accessToken}`;
  const res = await fetch(url);
  const body = (await res.json()) as any;
  if (body.error) throw new Error(`Graph API: ${body.error.message}`);
  return body;
}

// ── Auth middleware ────────────────────────────────────────────────────────

function requireAuth(req: any, res: any, next: any) {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
}

// ── DB helper ──────────────────────────────────────────────────────────────

async function upsertConnection(
  userId: string,
  fbPageId: string,
  fbPageName: string,
  adAccountId: string,
  adAccountName: string,
  accessToken: string,
) {
  const [existing] = await db
    .select({ id: fbConnectionsTable.id })
    .from(fbConnectionsTable)
    .where(eq(fbConnectionsTable.userId, userId));

  if (existing) {
    await db
      .update(fbConnectionsTable)
      .set({ fbPageId, fbPageName, adAccountId, adAccountName, status: "connected", partnerToken: accessToken })
      .where(eq(fbConnectionsTable.userId, userId));
  } else {
    await db
      .insert(fbConnectionsTable)
      .values({ userId, fbPageId, fbPageName, adAccountId, adAccountName, status: "connected", partnerToken: accessToken });
  }
}

// ── OAuth callback handler (standalone — mounted pre-Clerk in app.ts) ──────
//
// The callback arrives from Facebook without a Clerk session. Mounting it
// before clerkMiddleware() prevents Clerk's development-instance handshake
// from intercepting the request and eating the one-time OAuth code.

async function handleFacebookCallback(req: any, res: any): Promise<void> {
  const { code, state, error: fbError, error_description } = req.query as Record<string, string>;
  const frontend = getFrontendBase();

  // User denied the dialog
  if (fbError || !code) {
    const msg = error_description ?? "Facebook login was cancelled or denied.";
    res.redirect(`${frontend}/connect?fb_error=${encodeURIComponent(msg)}`);
    return;
  }

  // Validate CSRF state
  const userId = verifyState(state ?? "");
  if (!userId) {
    res.redirect(`${frontend}/connect?fb_error=${encodeURIComponent("Login session expired. Please try again.")}`);
    return;
  }

  // Return the cached redirect if this state was already processed successfully.
  const cached = getCachedResult(state);
  if (cached) {
    logger.info({ userId }, "FB OAuth: serving cached callback result");
    res.redirect(cached);
    return;
  }

  try {
    // 1. Exchange code → short-lived access token
    const tokenParams = new URLSearchParams({
      client_id: getAppId(),
      client_secret: getAppSecret(),
      redirect_uri: getCallbackUrl(),
      code,
    });
    const tokenRes = await fetch(
      `https://graph.facebook.com/${FB_VERSION}/oauth/access_token?${tokenParams}`,
    );
    const tokenData = (await tokenRes.json()) as any;
    if (tokenData.error) {
      if (
        typeof tokenData.error.message === "string" &&
        tokenData.error.message.toLowerCase().includes("authorization code has been used")
      ) {
        res.redirect(
          `${frontend}/connect?fb_error=${encodeURIComponent("This Facebook login link has already been used. Please click Continue with Facebook to start a new login.")}`,
        );
        return;
      }
      throw new Error(tokenData.error.message);
    }
    const shortLivedToken: string = tokenData.access_token;

    // 1b. Exchange short-lived token → long-lived token (valid ~60 days).
    //     This ensures the stored token doesn't expire within an hour.
    let accessToken = shortLivedToken;
    try {
      const llParams = new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: getAppId(),
        client_secret: getAppSecret(),
        fb_exchange_token: shortLivedToken,
      });
      const llRes = await fetch(
        `https://graph.facebook.com/${FB_VERSION}/oauth/access_token?${llParams}`,
      );
      const llData = (await llRes.json()) as any;
      if (llData.access_token) {
        accessToken = llData.access_token;
        logger.info({ userId }, "FB OAuth: exchanged for long-lived token");
      }
    } catch (llErr) {
      logger.warn({ llErr }, "FB OAuth: long-lived token exchange failed, using short-lived token");
    }

    // 2. Fetch pages and ad accounts in parallel
    const [pagesData, accountsData] = await Promise.all([
      graphGet("/me/accounts?fields=id,name", accessToken),
      graphGet("/me/adaccounts?fields=id,name", accessToken),
    ]);

    const pages: Array<{ id: string; name: string }> = pagesData.data ?? [];
    const adAccounts: Array<{ id: string; name: string }> = accountsData.data ?? [];

    logger.info({ userId, pageCount: pages.length, adAccountCount: adAccounts.length }, "FB OAuth: fetched accounts");

    if (pages.length === 0) {
      res.redirect(
        `${frontend}/connect?fb_error=${encodeURIComponent("No Facebook Pages found on this account. Make sure you manage at least one Page.")}`,
      );
      return;
    }
    if (adAccounts.length === 0) {
      res.redirect(
        `${frontend}/connect?fb_error=${encodeURIComponent("No Ad Accounts found. Make sure your Facebook account has access to at least one Ad Account in Business Manager.")}`,
      );
      return;
    }

    let redirectUrl: string;

    // 3a. Exactly one of each → auto-save and redirect to success
    if (pages.length === 1 && adAccounts.length === 1) {
      const page = pages[0];
      const account = adAccounts[0];
      await upsertConnection(userId, page.id, page.name, account.id, account.name, accessToken);
      logger.info({ userId, fbPageId: page.id, adAccountId: account.id }, "FB OAuth: auto-connected");
      redirectUrl = `${frontend}/connect?fb_connected=1`;
    } else {
      // 3b. Multiple options → let the frontend show a picker.
      const fbData = Buffer.from(JSON.stringify({ pages, adAccounts })).toString("base64");
      redirectUrl = `${frontend}/connect?fb_data=${encodeURIComponent(fbData)}`;
    }

    cacheResult(state, redirectUrl);
    res.redirect(redirectUrl);
  } catch (err: any) {
    logger.error({ err, userId }, "FB OAuth callback error");
    res.redirect(
      `${frontend}/connect?fb_error=${encodeURIComponent("Something went wrong connecting Facebook. Please try again.")}`,
    );
  }
}

// ── Routers ────────────────────────────────────────────────────────────────

/**
 * callbackRouter — mounted BEFORE clerkMiddleware() in app.ts so Clerk's
 * development-instance handshake cannot intercept the one-time OAuth code.
 */
export const callbackRouter = Router();
callbackRouter.get("/auth/facebook/callback", handleFacebookCallback);

/**
 * Default router — mounted after clerkMiddleware() via routes/index.ts.
 * Contains the authenticated /init route (and the callback as a fallback).
 */
const router = Router();

router.get("/auth/facebook/init", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const userId = req.userId as string;
    const state = makeState(userId);
    const params = new URLSearchParams({
      client_id: getAppId(),
      redirect_uri: getCallbackUrl(),
      scope: SCOPES,
      state,
      response_type: "code",
    });
    const authUrl = `https://www.facebook.com/${FB_VERSION}/dialog/oauth?${params}`;
    res.json({ authUrl });
  } catch (err) {
    logger.error({ err }, "FB OAuth init failed");
    res.status(500).json({ error: "Failed to start Facebook login. Check FB_APP_ID is configured." });
  }
});

// Fallback registration (pre-Clerk router wins first, but kept for completeness)
router.get("/auth/facebook/callback", handleFacebookCallback);

export default router;
