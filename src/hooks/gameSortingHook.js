// src/hooks/gameSortingHook.js
import { pushGameSortingInvite } from "../services/notificationService.js";

// Panggil setelah game selesai & poin diberikan.
export async function onGameSortingCompleted({ userId, gameSessionId }) {
  await pushGameSortingInvite(userId, gameSessionId);
}
