import assert from "node:assert/strict";
import test from "node:test";
import {
  getCallbackUrl,
  getFrontendPath,
  getRequestFrontendBase,
  isApprovedFrontendBase,
} from "./fbAuth";

test("keeps Netlify Facebook OAuth returns on the /fb alias", () => {
  assert.equal(getFrontendPath("/fb/connect"), "/fb");
  assert.equal(getFrontendPath("/fb/campaign/new"), "/fb");
});

test("uses the nested Replit Facebook app path for current deployment routes", () => {
  assert.equal(getFrontendPath("/apps/fb/connect"), "/apps/fb");
  assert.equal(getFrontendPath("/apps/fb/campaign/new"), "/apps/fb");
  assert.equal(getFrontendPath("/"), "/apps/fb");
});

test("keeps addlaun.ch Facebook OAuth returns on the public alias", () => {
  const frontend = getRequestFrontendBase({
    headers: {
      origin: "https://addlaun.ch",
      referer: "https://addlaun.ch/fb/connect",
    },
  });

  assert.equal(frontend, "https://addlaun.ch/fb");
  assert.equal(
    getCallbackUrl(frontend),
    "https://addlaun.ch/api/auth/facebook/callback",
  );
  assert.equal(isApprovedFrontendBase(frontend), true);
});

test("rejects hostile OAuth request origins and return targets", () => {
  const frontend = getRequestFrontendBase({
    headers: {
      origin: "https://attacker.example",
      referer: "https://attacker.example/fb/connect",
      "x-forwarded-host": "attacker.example",
    },
  });

  assert.equal(
    frontend,
    "https://lead-magnet-hub-shaamsarath1.replit.app/apps/fb",
  );
  assert.equal(isApprovedFrontendBase("https://attacker.example/fb"), false);
});