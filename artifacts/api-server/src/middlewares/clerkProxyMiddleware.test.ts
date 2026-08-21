import assert from "node:assert/strict";
import test from "node:test";
import { getClerkProxyHost } from "./clerkProxyMiddleware";
import {
  getApprovedOrigin,
  isApprovedRequestOrigin,
} from "../lib/publicOrigins";

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

test("keeps production Clerk attribution on the managed deployment host", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  try {
    const host = getClerkProxyHost({
      headers: {
        host: "lead-magnet-hub-shaamsarath1.replit.app",
        "x-forwarded-host": "attacker.example",
      },
    });

    assert.equal(host, "lead-magnet-hub-shaamsarath1.replit.app");
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
  }
});

test("allows only approved branded and deployment origins for Clerk", () => {
  assert.equal(getApprovedOrigin("https://addlaun.ch"), "https://addlaun.ch");
  assert.equal(getApprovedOrigin("https://vibeengg.com"), "https://vibeengg.com");
  assert.equal(
    getApprovedOrigin("https://lead-magnet-hub-shaamsarath1.replit.app"),
    "https://lead-magnet-hub-shaamsarath1.replit.app",
  );
  assert.equal(getApprovedOrigin("https://attacker.example"), null);
  assert.equal(
    isApprovedRequestOrigin({ origin: "https://attacker.example" }),
    false,
  );
});