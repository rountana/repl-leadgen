import assert from "node:assert/strict";
import test from "node:test";
import { escapeLeadCsvValue } from "./leadsCsv.js";

test("neutralizes direct and whitespace-prefixed spreadsheet formulas", () => {
  assert.equal(escapeLeadCsvValue("=SUM(A1:A2)"), "'=SUM(A1:A2)");
  assert.equal(escapeLeadCsvValue("\t=SUM(A1:A2)"), "'\t=SUM(A1:A2)");
  assert.equal(escapeLeadCsvValue("\n+1+1"), "\"'\n+1+1\"");
  assert.equal(escapeLeadCsvValue("\u0000@cmd"), "'\u0000@cmd");
});

test("escapes values that need CSV quoting without changing ordinary values", () => {
  assert.equal(escapeLeadCsvValue("Ada Lovelace"), "Ada Lovelace");
  assert.equal(escapeLeadCsvValue('Ada, "Ada"'), '"Ada, ""Ada"""');
  assert.equal(escapeLeadCsvValue("first line\nsecond line"), '"first line\nsecond line"');
  assert.equal(escapeLeadCsvValue(null), "");
});