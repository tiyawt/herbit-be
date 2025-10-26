// src/services/gameSortingService.js
import GameSorting from "../models/gameSorting.js";
import { bumpSortingStreak } from "./streakService.js";
import { todayBucketWIB } from "../utils/date.js";

export async function completeGameSession(sessionId, userId, now = new Date()) {
  const session = await GameSorting.findByIdAndUpdate(
    sessionId,
    { $set: { isCompleted: true } },
    { new: true }
  );
  if (!session) throw new Error("Session not found");

  if (!session.dayBucket) {
    session.dayBucket = todayBucketWIB(now);
    await session.save();
  }

  await bumpSortingStreak(userId, now);

  return session;
}
