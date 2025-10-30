import { Router } from "express";
import {
  createVoucherHandler,
  deleteVoucherHandler,
  getVoucherDetailHandler,
  getVoucherHistoryHandler,
  listVoucherHandler,
  redeemVoucherHandler,
  updateVoucherHandler,
} from "../controllers/voucherController.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", listVoucherHandler);
router.post("/", createVoucherHandler);
router.put("/:voucherId", updateVoucherHandler);
router.delete("/:voucherId", deleteVoucherHandler);

router.get("/history", authRequired, getVoucherHistoryHandler);
router.post("/:voucherId/redeem", authRequired, redeemVoucherHandler);
router.get("/:voucherId", getVoucherDetailHandler);

export default router;
