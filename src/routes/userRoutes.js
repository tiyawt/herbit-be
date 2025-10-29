import { Router } from "express";
import {
  getUserByUsernameHandler,
  getUserPointsHistoryHandler,
  getUserMilestonesHandler,
  getUserProfileSummaryHandler,
  getUserPointsActivityHandler,
  getMyHomeSummaryHandler,
  getUserHomeSummaryHandler,
} from "../controllers/userController.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/home-summary", authRequired, getMyHomeSummaryHandler);
router.get("/:username/home-summary", getUserHomeSummaryHandler);
router.get("/:username/profile-summary", getUserProfileSummaryHandler);
router.get("/:username/points-activity", getUserPointsActivityHandler);
router.get("/:username/points-history", getUserPointsHistoryHandler);
router.get("/:username/milestones", getUserMilestonesHandler);
router.get("/:username", getUserByUsernameHandler);

export default router;
