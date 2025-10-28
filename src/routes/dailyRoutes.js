import express from "express";
import { getTodayTasks } from "../controllers/dailyController.js";

const router = express.Router();

router.get("/", getTodayTasks);

export default router;
