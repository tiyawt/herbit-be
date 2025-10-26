import { Router } from "express";
import { authRequired } from "../middleware/authMiddleware.js";
import {
  startGameSession,
  completeGameSession,
  claimDailyReward,
} from "../services/gameSortingService.js";

const router = Router();

// Mulai game — dipanggil saat user klik "Play"
router.post("/start", authRequired, async (req, res, next) => {
  try {
    const session = await startGameSession(req.user._id);
    res.json({ ok: true, session });
  } catch (e) {
    next(e);
  }
});

// Selesai game — dipanggil ketika semua sampah udah habis
router.post("/complete/:id", authRequired, async (req, res, next) => {
  try {
    const session = await completeGameSession(req.params.id, req.user._id);
    res.json({ ok: true, session });
  } catch (e) {
    next(e);
  }
});

// Klaim poin harian — cuma bisa sekali per hari
router.post("/claim", authRequired, async (req, res, next) => {
  try {
    const { points } = req.body;
    const reward = await claimDailyReward(req.user._id, { points });
    if (reward._alreadyClaimed) {
      return res
        .status(409)
        .json({ ok: false, message: "Poin hari ini sudah diklaim" });
    }
    res.json({ ok: true, reward });
  } catch (e) {
    next(e);
  }
});

export default router;
