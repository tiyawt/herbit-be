import express from "express";
import {
    generateDailyChecklist,
  getChecklistByUser,
  markComplete,
  uncheck,
} from "../controllers/dailyTaskChecklistController.js";
import { authRequired } from "../middleware/authMiddleware.js"; // pastikan auth juga pakai export ESM

const router = express.Router();

// Ambil semua checklist milik user
router.get("/", authRequired, getChecklistByUser);

router.post("/generate", authRequired, generateDailyChecklist);

// Tandai checklist selesai
router.patch("/:id/complete", authRequired, markComplete);

// Batalkan checklist
router.patch("/:id/uncheck", authRequired, uncheck);

export default router;
