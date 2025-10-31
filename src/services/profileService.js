import DailyTaskChecklist from "../models/dailyTaskChecklist.js";
import DailyTask from "../models/dailyTask.js";
import EcoenzymUploadProgress from "../models/ecoenzymUploadProgress.js";
import EcoenzymProject from "../models/ecoenzymProject.js";
import GameSortingReward from "../models/gameSortingReward.js";
import TreeFruit from "../models/treeFruit.js";
import User from "../models/user.js";
import { listVouchers, getUserRedemptions } from "./voucherService.js";
import { listRewards, getUserMilestoneClaims } from "./rewardService.js";

function startOfWeek(current = new Date()) {
  const date = new Date(current);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay(); // Sunday = 0, Monday = 1
  const diff = day === 0 ? 6 : day - 1; // how many days since Monday
  date.setDate(date.getDate() - diff);
  return date;
}

function startOfMonth(current = new Date()) {
  const date = new Date(current.getFullYear(), current.getMonth(), 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateLabel(date) {
  if (!date) return null;
  const formatter = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const map = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }
  const day = map.day ?? "";
  const month = map.month ?? "";
  const year = map.year ?? "";
  const hour = (map.hour ?? "00").padStart(2, "0");
  const minute = (map.minute ?? "00").padStart(2, "0");
  const second = (map.second ?? "00").padStart(2, "0");
  return `${day} ${month} ${year} ${hour}.${minute}.${second}`;
}

function resolveActivityPeriods(timestamp) {
  if (!timestamp) return ["all"];
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return ["all"];
  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const periods = ["all"];
  if (date >= weekStart && date <= now) {
    periods.push("week");
  }
  if (
    date >= monthStart &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  ) {
    periods.push("month");
  }
  return periods;
}

function computeStreakDays(completedTimestamps = []) {
  if (!completedTimestamps.length) {
    return 0;
  }
  const daySet = new Set(
    completedTimestamps.map((ts) => {
      const date = new Date(ts);
      date.setUTCHours(0, 0, 0, 0);
      return date.getTime();
    })
  );

  const sortedDays = Array.from(daySet).sort((a, b) => b - a);
  if (!sortedDays.length) return 0;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (sortedDays[0] < today.getTime()) {
    return 0;
  }

  let streak = 1;
  for (let i = 1; i < sortedDays.length; i += 1) {
    const prev = sortedDays[i - 1];
    const current = sortedDays[i];
    const diff = prev - current;
    if (diff === 86400000) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

function mapLeafActivity(checklist) {
  const task = checklist.dailyTaskId;
  const timestamp =
    checklist.completedAt ?? checklist.updatedAt ?? checklist.createdAt;
  return {
    id: checklist._id?.toString() ?? null,
    type: "leaf",
    metricLabel: "+1 daun hijau",
    title: task?.title ?? "Tugas harian selesai",
    description: task?.description ?? null,
    time: timestamp,
    timeLabel: formatDateLabel(timestamp),
  };
}

function mapVoucherActivity(redemption) {
  const voucher =
    redemption.voucherId && typeof redemption.voucherId === "object"
      ? redemption.voucherId
      : null;
  const timestamp = redemption.redeemedAt ?? redemption.createdAt;
  return {
    id: redemption._id?.toString() ?? null,
    type: "redeem",
    points: -(redemption.pointsDeducted ?? 0),
    title: voucher?.name ?? "Voucher ditukar",
    description: "Voucher berhasil ditukar",
    time: timestamp,
    timeLabel: formatDateLabel(timestamp),
  };
}

function mapEcoenzymActivity(upload) {
  const timestamp = upload.uploadedDate ?? upload.createdAt;
  return {
    id: upload._id?.toString() ?? null,
    type: "gain",
    metricLabel: `+${upload.prePointsEarned ?? 0} poin pra`,
    title: "Progress Ecoenzym diunggah",
    description: "Unggahan progress ecoenzym berhasil diverifikasi",
    time: timestamp,
    timeLabel: formatDateLabel(timestamp),
    prePoints: upload.prePointsEarned ?? 0,
  };
}

function mapEcoenzymProjectActivity(project) {
  const timestamp = project.updatedAt ?? project.endDate ?? project.createdAt;
  const points = project.points ?? 0;
  return {
    id: project._id?.toString() ?? null,
    type: "gain",
    metricLabel: `+${points} poin ecoenzym`,
    points,
    title: "Ecoenzym Project",
    description: `Reward proyek ecoenzym (${project.status ?? "unknown"})`,
    time: timestamp,
    timeLabel: formatDateLabel(timestamp),
  };
}

function mapGameSortingActivity(reward) {
  const timestamp = reward.claimedAt ?? reward.createdAt;
  return {
    id: reward._id?.toString() ?? null,
    type: "gain",
    metricLabel: `+${reward.pointAwarded ?? 0} poin game`,
    points: reward.pointAwarded ?? 0,
    title: "Poin Game Sorting",
    description: `Reward harian game sorting (${
      reward.dayBucket ?? "unknown"
    })`,
    time: timestamp,
    timeLabel: formatDateLabel(timestamp),
  };
}

function mapTreeFruitActivity(fruit) {
  const timestamp = fruit.claimedAt ?? fruit.updatedAt ?? fruit.createdAt;
  const points = fruit.pointsAwarded ?? 0;
  return {
    id: fruit._id?.toString() ?? null,
    type: "gain",
    metricLabel: `+${points} poin panen`,
    points,
    title: "Panen Tree Tracker",
    description: "Poin dari buah pohon berhasil diklaim",
    time: timestamp,
    timeLabel: formatDateLabel(timestamp),
  };
}

export async function getUserProfileSummary(username) {
  const user = await User.findOne({ username })
    .select({
      username: 1,
      name: 1,
      email: 1,
      photoUrl: 1,
      totalPoints: 1,
    })
    .lean();

  if (!user?._id) {
    const error = new Error("USER_NOT_FOUND");
    error.status = 404;
    throw error;
  }

  const userId = user._id;

  const [
    completedChecklists,
    voucherRedemptionsResponse,
    ecoenzymUploads,
    ecoenzymProjects,
    treeFruits,
    gameRewards,
    rewardsResponse,
    milestoneClaimsResponse,
    vouchers,
  ] = await Promise.all([
    DailyTaskChecklist.find({ userId, isCompleted: true })
      .sort({ completedAt: -1, createdAt: -1 })
      .limit(50)
      .populate({
        path: "dailyTaskId",
        model: DailyTask,
        select: { title: 1, description: 1 },
      })
      .lean(),
    getUserRedemptions(userId, { limit: 50 }),
    EcoenzymUploadProgress.find({ userId })
      .sort({ uploadedDate: -1, createdAt: -1 })
      .limit(20)
      .lean(),
    EcoenzymProject.find({ userId, points: { $gt: 0 } })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(10)
      .lean(),
    TreeFruit.find({ userId, pointsAwarded: { $gt: 0 }, isClaimed: true })
      .sort({ claimedAt: -1, updatedAt: -1 })
      .limit(10)
      .lean(),
    GameSortingReward.find({ userId })
      .sort({ claimedAt: -1, createdAt: -1 })
      .limit(20)
      .lean(),
    listRewards({ isActive: true, limit: 100 }),
    getUserMilestoneClaims(userId, { limit: 100 }),
    listVouchers({ userId: userId.toString(), status: "active", limit: 5 }),
  ]);

  const rewardItems = rewardsResponse?.items ?? [];
  const claimItems = milestoneClaimsResponse?.items ?? [];
  const voucherRedemptions = voucherRedemptionsResponse?.items ?? [];

  const claimMap = new Map();
  claimItems.forEach((item) => {
    if (item.rewardId) {
      claimMap.set(item.rewardId, item);
    }
    if (item.code) {
      claimMap.set(item.code, item);
    }
  });

  const rawActivities = [
    ...completedChecklists.map(mapLeafActivity),
    ...voucherRedemptions.map(mapVoucherActivity),
    ...ecoenzymUploads.map(mapEcoenzymActivity),
    ...ecoenzymProjects.map(mapEcoenzymProjectActivity),
    ...treeFruits.map(mapTreeFruitActivity),
    ...gameRewards.map(mapGameSortingActivity),
  ];

  const streak = computeStreakDays(
    completedChecklists.map(
      (item) => item.completedAt ?? item.updatedAt ?? item.createdAt
    )
  );

  const latestCompletedAt =
    completedChecklists[0]?.completedAt ??
    completedChecklists[0]?.updatedAt ??
    completedChecklists[0]?.createdAt ??
    null;

  const milestoneStreak = streak >= 30 ? 30 : streak >= 7 ? 7 : null;

  if (milestoneStreak && latestCompletedAt) {
    rawActivities.push({
      id: `streak-${userId.toString()}`,
      type: "gain",
      metricLabel: `Kamu menjaga streak kebiasaan selama ${milestoneStreak} hari berturut-turut.`,
      title: "Habit streak aktif",
      description: `Teruskan kebiasaanmu! Kamu baru saja menyentuh ${milestoneStreak} hari berturut-turut.`,
      time: latestCompletedAt,
      timeLabel: formatDateLabel(latestCompletedAt),
      periods: resolveActivityPeriods(latestCompletedAt),
    });
  }

  if (latestCompletedAt) {
    const latestDate = new Date(latestCompletedAt);
    latestDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor(
      (today.getTime() - latestDate.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (diffDays >= 2) {
      const breakTime = new Date(today.getTime());
      rawActivities.push({
        id: `streak-break-${userId.toString()}`,
        type: "gain",
        metricLabel: "tidak ada aktivitas kemarin",
        title: "Streak terhenti",
        description:
          "Tidak ada habit yang diselesaikan kemarin. Yuk mulai lagi streak hari ini!",
        time: breakTime,
        timeLabel: formatDateLabel(breakTime),
        periods: resolveActivityPeriods(breakTime),
      });
    }
  }

  const activities = rawActivities
    .filter((item) => !!item.time)
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .map(({ time, ...rest }) => rest);

  const rewardMilestones =
    rewardItems?.map((reward) => {
      const claimEntry =
        (reward.id ? claimMap.get(reward.id) : undefined) ??
        (reward.code ? claimMap.get(reward.code) : undefined) ??
        null;
      const targetDays = reward.targetDays ?? 0;
      const recordedProgress = claimEntry?.progressDays ?? 0;
      const progressDays = Math.max(recordedProgress, streak);
      const pointsAwarded = claimEntry?.pointsAwarded ?? 0;
      const claimed = pointsAwarded > 0;
      const canClaim = !claimed && targetDays > 0 && progressDays >= targetDays;

      return {
        code: reward.code ?? null,
        name: reward.name,
        description: reward.description,
        pointsReward: reward.pointsReward,
        targetDays,
        isActive: reward.isActive,
        image: reward.image,
        claim: {
          progressDays,
          pointsAwarded,
          claimedAt: claimEntry?.claimedAt ?? null,
          canClaim,
        },
      };
    }) ?? [];

  const seenVoucherIds = new Set();
  const available =
    vouchers?.items?.reduce((acc, item) => {
      const key = item.id ?? null;
      if ((key && seenVoucherIds.has(key)) || acc.length >= 5) {
        return acc;
      }
      if (key) {
        seenVoucherIds.add(key);
      }
      const pointsRequired = item.pointsRequired ?? 0;
      const currentPoints = item.progress?.current ?? 0;
      const targetPoints = item.progress?.target ?? Math.max(pointsRequired, 1);

      acc.push({
        id: item.id,
        name: item.name,
        description: item.description,
        image: item.imageUrl ?? null,
        pointsRequired,
        stock: item.stock,
        progress: {
          current: currentPoints,
          target: targetPoints,
        },
      });
      return acc;
    }, []) ?? [];

  const history = voucherRedemptions.map((redemption, index) => {
    const redemptionId = redemption.id ?? redemption._id?.toString() ?? null;
    const redeemedTime = redemption.redeemedAt ?? redemption.createdAt ?? null;
    const timeValue = redeemedTime ? new Date(redeemedTime) : null;
    const baseKey =
      redemptionId ??
      `${redemption.code ?? redemption.name ?? "voucher"}-${index}`;
    const imageSource =
      redemption.image ??
      redemption.imageUrl ??
      redemption.voucher?.imageUrl ??
      null;
    return {
      id: baseKey,
      name: redemption.name ?? redemption.code ?? null,
      image: imageSource,
      redeemedAt: timeValue ? timeValue.toISOString() : null,
      points: redemption.points ?? redemption.pointsDeducted ?? 0,
      status: redemption.status ?? null,
      time: timeValue ? timeValue.toISOString() : null,
      timeLabel: timeValue ? formatDateLabel(timeValue) : null,
    };
  });

  return {
    user: {
      id: userId.toString(),
      username: user.username ?? user.email ?? null,
      name: user.name ?? user.username ?? user.email,
      photoUrl: user.photoUrl ?? null,
      totalPoints: user.totalPoints ?? 0,
    },
    activities,
    rewards: {
      milestone: rewardMilestones,
    },
    vouchers: {
      available,
      history,
    },
  };
}
