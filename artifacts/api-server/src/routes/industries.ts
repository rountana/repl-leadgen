import { Router, type IRouter } from "express";
import { db, industriesTable } from "@workspace/db";

const router: IRouter = Router();

// GET /industries
router.get("/industries", async (_req, res): Promise<void> => {
  const industries = await db.select().from(industriesTable).orderBy(industriesTable.name);
  res.json(industries);
});

export default router;
