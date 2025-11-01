import { Router } from "express";
import {
  listMilestoneClaimsAdminHandler,
  getMilestoneClaimAdminHandler,
} from "../controllers/milestoneClaimAdminController.js";

const router = Router();

router.get("/", listMilestoneClaimsAdminHandler);
router.get("/:claimId", getMilestoneClaimAdminHandler);

export default router;
