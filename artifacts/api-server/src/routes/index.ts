import { Router, type IRouter } from "express";
import healthRouter from "./health";
import leadMagnetsRouter from "./leadMagnets";
import templatesRouter from "./templates";
import industriesRouter from "./industries";
import examplesRouter from "./examples";
import aiRouter from "./ai";
import fbRouter from "./fb";
import fbAuthRouter from "./fbAuth";
import profileRouter from "./profile";
import geocodeRouter from "./geocode";

const router: IRouter = Router();

router.use(healthRouter);
router.use(leadMagnetsRouter);
router.use(templatesRouter);
router.use(industriesRouter);
router.use(examplesRouter);
router.use(aiRouter);
router.use(fbRouter);
router.use(fbAuthRouter);
router.use(profileRouter);
router.use(geocodeRouter);

export default router;
