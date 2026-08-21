import type { IncomingHttpHeaders } from "http";

export const PRIMARY_PUBLIC_ORIGIN = "https://addlaun.ch";
const DEFAULT_DEPLOYMENT_ORIGIN =
  "https://lead-magnet-hub-shaamsarath1.replit.app";

function asOrigin(value: string | undefined): string | null {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    return parsed.origin === value.replace(/\/$/, "") ? parsed.origin : null;
  } catch {
    return null;
  }
}

export function getDeploymentOrigin(): string {
  const configured = asOrigin(process.env.APP_BASE_URL);
  if (configured) return configured;

  if (process.env.NODE_ENV !== "production" && process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }

  return DEFAULT_DEPLOYMENT_ORIGIN;
}

export function getApprovedAppOrigins(): ReadonlySet<string> {
  return new Set([
    PRIMARY_PUBLIC_ORIGIN,
    getDeploymentOrigin(),
  ]);
}

export function getApprovedOrigin(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const origin = asOrigin(value);
  return origin && getApprovedAppOrigins().has(origin) ? origin : null;
}

export function getApprovedOriginFromHeaders(
  headers: IncomingHttpHeaders,
): string | null {
  const origin = Array.isArray(headers.origin)
    ? headers.origin[0]
    : headers.origin;
  const approvedOrigin = getApprovedOrigin(origin);
  if (approvedOrigin) return approvedOrigin;

  const referer = Array.isArray(headers.referer)
    ? headers.referer[0]
    : headers.referer;
  if (!referer) return null;

  try {
    return getApprovedOrigin(new URL(referer).origin);
  } catch {
    return null;
  }
}

export function isApprovedRequestOrigin(headers: IncomingHttpHeaders): boolean {
  const origin = Array.isArray(headers.origin)
    ? headers.origin[0]
    : headers.origin;
  return !origin || Boolean(getApprovedOrigin(origin));
}