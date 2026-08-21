import assert from "node:assert/strict";
import test from "node:test";
import { getClerkProxyHost } from "./clerkProxyMiddleware";

test("uses the configured deployment host even when the browser is on Netlify", () => {
  const host = getClerkProxyHost({
    headers: {
      origin: "https://vibeengg.com",
      host: "lead-magnet-hub-shaamsarath1.replit.app",
      "x-forwarded-host": "lead-magnet-hub-shaamsarath1.replit.app",
    },
  });

  assert.equal(host, "lead-magnet-hub-shaamsarath1.replit.app");
});

test("uses the original forwarding host instead of any browser origin", () => {
  const host = getClerkProxyHost({
    headers: {
      origin: "https://untrusted.example",
      host: "lead-magnet-hub-shaamsarath1.replit.app",
      "x-forwarded-host": "lead-magnet-hub-shaamsarath1.replit.app",
    },
  });

  assert.equal(host, "lead-magnet-hub-shaamsarath1.replit.app");
});