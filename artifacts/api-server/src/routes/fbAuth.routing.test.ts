import assert from "node:assert/strict";
import test from "node:test";
import { getFrontendPath } from "./fbAuth";

test("keeps Netlify Facebook OAuth returns on the /fb alias", () => {
  assert.equal(getFrontendPath("/fb/connect"), "/fb");
  assert.equal(getFrontendPath("/fb/campaign/new"), "/fb");
});

test("uses the nested Replit Facebook app path for current deployment routes", () => {
  assert.equal(getFrontendPath("/apps/fb/connect"), "/apps/fb");
  assert.equal(getFrontendPath("/apps/fb/campaign/new"), "/apps/fb");
  assert.equal(getFrontendPath("/"), "/apps/fb");
});