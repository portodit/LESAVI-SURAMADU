import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import amRouter from "./am";
import importRouter from "./importData";
import performanceRouter from "./performance";
import funnelRouter from "./funnel";
import activityRouter from "./activity";
import telegramRouter from "./telegram";
import settingsRouter from "./settings";
import publicAmRouter from "./publicAm";
import publicPerformanceRouter from "./publicPerformance";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(amRouter);
router.use(importRouter);
router.use(performanceRouter);
router.use(funnelRouter);
router.use(activityRouter);
router.use(telegramRouter);
router.use(settingsRouter);
router.use(publicAmRouter);
router.use(publicPerformanceRouter);

export default router;
