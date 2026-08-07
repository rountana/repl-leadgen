import { Router, type IRouter } from "express";
import healthRouter from "./health";
import leadMagnetsRouter from "./leadMagnets";
import templatesRouter from "./templates";
import industriesRouter from "./industries";
import examplesRouter from "./examples";
import aiRouter from "./ai";
import fbRouter from "./fb";
import fbAuthRouter from "./fbAuth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(leadMagnetsRouter);
router.use(templatesRouter);
router.use(industriesRouter);
router.use(examplesRouter);
router.use(aiRouter);
router.use(fbRouter);
router.use(fbAuthRouter);

export default router;
