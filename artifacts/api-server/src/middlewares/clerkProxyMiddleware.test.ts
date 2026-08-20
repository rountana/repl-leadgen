import assert from "node:assert/strict";
import test from "node:test";
import { getClerkProxyHost } from "./clerkProxyMiddleware";

test("uses the approved Netlify origin for Clerk proxy requests", () => {
  const host = getClerkProxyHost({
    headers: {
      origin: "https://vibeengg.com",
      host: "lead-magnet-hub-shaamsarath1.replit.app",
      "x-forwarded-host": "lead-magnet-hub-shaamsarath1.replit.app",
    },
  });

  assert.equal(host, "vibeengg.com");
});

test("does not trust an arbitrary browser origin", () => {
  const host = getClerkProxyHost({
    headers: {
      origin: "https://untrusted.example",
      host: "lead-magnet-hub-shaamsarath1.replit.app",
      "x-forwarded-host": "lead-magnet-hub-shaamsarath1.replit.app",
    },
  });

  assert.equal(host, "lead-magnet-hub-shaamsarath1.replit.app");
});