// src/jobs/notificationScheduler.js
import cron from "node-cron";
import mongoose from "mongoose";
import { pushDailyTaskNotif, pushEcoenzymProgressNotif, pushVoucherExpiring } from "../services/notificationService.js";
import { daysBetween } from "../utils/date.js";

const Users = () => mongoose.connection.collection("users");
const EcoenzymProjects = () => mongoose.connection.collection("ecoenzym_projects");
const Vouchers = () => mongoose.connection.collection("vouchers");

// 1) Daily Task — tiap hari 06:00
cron.schedule("0 6 * * *", async () => {
  const cursor = Users().find({}, { projection: { _id: 1 } });
  for await (const u of cursor) {
    await pushDailyTaskNotif(u._id);
  }
  console.log("✅ Daily task notifications done @06:00");
});

// 2) Ecoenzym — cek 08:00; kirim hari ke-30/60/90 dari start_date (selama <= end_date)
cron.schedule("0 8 * * *", async () => {
  const today = new Date();
  const projects = EcoenzymProjects().find(
    { status: { $in: ["ongoing", "active"] } },
    { projection: { _id: 1, user_id: 1, start_date: 1, end_date: 1 } }
  );
  for await (const p of projects) {
    if (!p.start_date) continue;
    if (p.end_date && today > new Date(p.end_date)) continue;

    const d = daysBetween(new Date(p.start_date), today);
    if ([30, 60, 90].includes(d)) {
      await pushEcoenzymProgressNotif(p.user_id, p._id, d);
    }
  }
  console.log("✅ Ecoenzym progress notifications checked @08:00");
});

// 3) Voucher — H-1 dari valid_until (cek 09:00)
cron.schedule("0 9 * * *", async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const start = new Date(tomorrow); start.setHours(0,0,0,0);
  const end = new Date(tomorrow); end.setHours(23,59,59,999);

  const vouchers = Vouchers().find(
    { valid_until: { $gte: start, $lte: end } },
    { projection: { _id: 1, user_id: 1, valid_until: 1 } }
  );
  for await (const v of vouchers) {
    await pushVoucherExpiring(v.user_id, v._id);
  }
  console.log("✅ Voucher expiry notifications checked @09:00");
});