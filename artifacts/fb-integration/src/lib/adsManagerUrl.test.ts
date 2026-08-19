import assert from "node:assert/strict";
import test from "node:test";
import { adsManagerUrl, isRealAdAccountId } from "./adsManagerUrl.js";

const adsManagerBaseUrl =
  "https://adsmanager.facebook.com/adsmanager/manage/campaigns";

test("opens the submitted campaign in its connected ad account", () => {
  assert.equal(
    adsManagerUrl("act_123456789", "987654321"),
    `${adsManagerBaseUrl}?act=123456789&selected_campaign_ids=987654321`,
  );
});

test("opens a valid ad account when a campaign ID is not available", () => {
  assert.equal(
    adsManagerUrl("act_123456789"),
    `${adsManagerBaseUrl}?act=123456789`,
  );
});

test("keeps the campaign selection but excludes an invalid ad account", () => {
  assert.equal(
    adsManagerUrl("not-a-meta-account", "987654321"),
    `${adsManagerBaseUrl}?selected_campaign_ids=987654321`,
  );
});

test("falls back to Ads Manager without malformed query parameters", () => {
  assert.equal(adsManagerUrl(null, null), adsManagerBaseUrl);
  assert.equal(isRealAdAccountId("act_123456789"), true);
  assert.equal(isRealAdAccountId("123456789"), false);
  assert.equal(isRealAdAccountId("act_not-a-number"), false);
});