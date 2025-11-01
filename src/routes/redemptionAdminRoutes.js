import { Router } from "express";
import {
  listRedemptionsAdminHandler,
  getRedemptionDetailAdminHandler,
} from "../controllers/redemptionAdminController.js";
const router = Router();

router.get("/", listRedemptionsAdminHandler);
router.get("/:redemptionId", getRedemptionDetailAdminHandler);

export default router;
