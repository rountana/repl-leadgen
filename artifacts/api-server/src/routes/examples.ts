import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, examplesTable } from "@workspace/db";
import { ListExamplesQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

// GET /examples
router.get("/examples", async (req, res): Promise<void> => {
  const queryParams = ListExamplesQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: queryParams.error.message });
    return;
  }

  const { industry } = queryParams.data;
  const examples = industry
    ? await db.select().from(examplesTable).where(eq(examplesTable.industry, industry))
    : await db.select().from(examplesTable).orderBy(examplesTable.industry);

  res.json(examples);
});

export default router;
