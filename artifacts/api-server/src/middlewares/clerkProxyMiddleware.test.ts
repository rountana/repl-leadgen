import assert from "node:assert/strict";
import test from "node:test";
import { getClerkProxyHost } from "./clerkProxyMiddleware";
import {
  getApprovedOrigin,
  isApprovedRequestOrigin,
} from "../lib/publicOrigins";

test("uses the browser-facing custom domain for Clerk proxy attribution", () => {
  const host = getClerkProxyHost({
    headers: {
      origin: "https://addlaun.ch",
      host: "internal-deployment-host",
      "x-forwarded-host": "addlaun.ch",
    },
  });

  assert.equal(host, "addlaun.ch");
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

test("uses the original browser host when internal proxies append their host", () => {
  const host = getClerkProxyHost({
    headers: {
      host: "internal-deployment-host",
      "x-forwarded-host": "addlaun.ch, internal-deployment-host",
    },
  });

  assert.equal(host, "addlaun.ch");
});

test("allows only the branded and deployment origins for Clerk", () => {
  assert.equal(getApprovedOrigin("https://addlaun.ch"), "https://addlaun.ch");
  assert.equal(
    getApprovedOrigin("https://lead-magnet-hub-shaamsarath1.replit.app"),
    "https://lead-magnet-hub-shaamsarath1.replit.app",
  );
  assert.equal(getApprovedOrigin("https://vibeengg.com"), null);
  assert.equal(getApprovedOrigin("https://attacker.example"), null);
  assert.equal(
    isApprovedRequestOrigin({ origin: "https://attacker.example" }),
    false,
  );
});