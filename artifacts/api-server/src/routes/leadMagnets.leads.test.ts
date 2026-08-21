/**
 * Integration tests for GET /api/leads.
 *
 * The route is exercised against the real development database. In test mode,
 * leadMagnets.ts accepts x-test-user-id instead of a Clerk session so ownership
 * filtering can be verified without an OAuth flow.
 */
process.env.NODE_ENV = "test";

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import express, { type Express } from "express";
import { createServer, type Server } from "node:http";
import { eq, inArray } from "drizzle-orm";
import { db, leadMagnetsTable, leadsTable } from "@workspace/db";
import leadMagnetsRouter from "./leadMagnets.js";

const OWNER_ID = `test_leads_owner_${Date.now()}`;
const OTHER_OWNER_ID = `test_leads_other_${Date.now()}`;

const app: Express = express();
app.use(express.json());
app.use("/api", leadMagnetsRouter);

let server: Server;
let baseUrl: string;

async function cleanupUser(userId: string): Promise<void> {
  const magnets = await db
    .select({ id: leadMagnetsTable.id })
    .from(leadMagnetsTable)
    .where(eq(leadMagnetsTable.userId, userId));

  const magnetIds = magnets.map((magnet) => magnet.id);
  if (magnetIds.length > 0) {
    await db.delete(leadsTable).where(inArray(leadsTable.leadMagnetId, magnetIds));
  }
  await db.delete(leadMagnetsTable).where(eq(leadMagnetsTable.userId, userId));
}

async function createMagnet(userId: string, title: string): Promise<number> {
  const [magnet] = await db
    .insert(leadMagnetsTable)
    .values({ userId, title, type: "give_away", status: "live" })
    .returning({ id: leadMagnetsTable.id });
  return magnet.id;
}

before(async () => {
  await cleanupUser(OWNER_ID);
  await cleanupUser(OTHER_OWNER_ID);
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not start");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await cleanupUser(OWNER_ID);
  await cleanupUser(OTHER_OWNER_ID);
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

describe("GET /api/leads", () => {
  test("returns only the current owner's giveaway leads, newest first", async () => {
    const ownerMagnetId = await createMagnet(OWNER_ID, "Free weekend class");
    const otherMagnetId = await createMagnet(OTHER_OWNER_ID, "Other business giveaway");

    await db.insert(leadsTable).values([
      {
        leadMagnetId: ownerMagnetId,
        name: "Earlier Lead",
        email: "earlier@example.com",
        phone: null,
        createdAt: new Date("2026-01-01T09:00:00.000Z"),
      },
      {
        leadMagnetId: ownerMagnetId,
        name: "Latest Lead",
        email: "latest@example.com",
        phone: "555-0100",
        createdAt: new Date("2026-01-02T09:00:00.000Z"),
      },
      {
        leadMagnetId: otherMagnetId,
        name: "Private Lead",
        email: "private@example.com",
        phone: null,
        createdAt: new Date("2026-01-03T09:00:00.000Z"),
      },
    ]);

    const response = await fetch(`${baseUrl}/api/leads`, {
      headers: { "x-test-user-id": OWNER_ID },
    });

    assert.equal(response.status, 200);
    const leads = await response.json() as Array<{
      name: string;
      email: string;
      phone: string | null;
      leadMagnetId: number;
      leadMagnetTitle: string | null;
      createdAt: string;
    }>;

    assert.equal(leads.length, 2);
    assert.deepEqual(leads.map((lead) => lead.name), ["Latest Lead", "Earlier Lead"]);
    assert.deepEqual(leads.map((lead) => lead.email), ["latest@example.com", "earlier@example.com"]);
    assert.equal(leads[0].phone, "555-0100");
    assert.equal(leads[0].leadMagnetId, ownerMagnetId);
    assert.equal(leads[0].leadMagnetTitle, "Free weekend class");
    assert.match(leads[0].createdAt, /^2026-01-02T09:00:00.000Z$/);
    assert.equal(leads.some((lead) => lead.email === "private@example.com"), false);
  });

  test("requires authentication", async () => {
    const response = await fetch(`${baseUrl}/api/leads`);
    assert.equal(response.status, 401);
  });
});