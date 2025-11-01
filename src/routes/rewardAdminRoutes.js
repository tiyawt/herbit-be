import { Router } from "express";
import {
  listRewardsAdminHandler,
  createRewardAdminHandler,
  updateRewardAdminHandler,
  deleteRewardAdminHandler,
  getRewardAdminHandler,
} from "../controllers/rewardAdminController.js";

const router = Router();

router.get("/", listRewardsAdminHandler);
router.post("/", createRewardAdminHandler);
router.patch("/:rewardId", updateRewardAdminHandler);
router.delete("/:rewardId", deleteRewardAdminHandler);
router.get("/:rewardId", getRewardAdminHandler);

export default router;
