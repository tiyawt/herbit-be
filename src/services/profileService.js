import DailyTaskChecklist from "../models/dailyTaskChecklist.js";
import DailyTask from "../models/dailyTask.js";
import EcoenzymProject from "../models/ecoenzymProject.js";
import GameSortingReward from "../models/gameSortingReward.js";
import TreeFruit from "../models/treeFruit.js";
import User from "../models/user.js";
import { listVouchers, getUserRedemptions } from "./voucherService.js";
import { listRewards, getUserMilestoneClaims } from "./rewardService.js";

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
  const activity = { type: "leaf" };
  if (checklist.completedAt) {
    activity.time = new Date(checklist.completedAt);
  }
  return activity;
}

function mapVoucherActivity(redemption) {
  const activity = {
    type: "redeem",
    points: -redemption.pointsDeducted,
  };
  if (redemption.redeemedAt) {
    activity.time = new Date(redemption.redeemedAt);
  }
  return activity;
}

function mapCompletedEcoenzymProjectActivity(project) {
  const points = project.points ?? 0;
  const activity = {
    type: "gain",
    points,
    status: project.status ?? "completed",
  };
  const timeSource =
    project.claimedAt ??
    project.endDate ??
    project.updatedAt ??
    project.createdAt ??
    null;
  if (timeSource) {
    activity.time = new Date(timeSource);
  }
  activity.projectId = project._id?.toString() ?? null;
  return activity;
}

function mapOngoingEcoenzymProjectActivity(project) {
  const points = project.prePointsEarned ?? 0;
  const activity = {
    type: "prepoint",
    points,
    status: project.status ?? "ongoing",
  };
  const timeSource = project.updatedAt ?? project.createdAt ?? null;
  if (timeSource) {
    activity.time = new Date(timeSource);
  }
  activity.projectId = project._id?.toString() ?? null;
  return activity;
}

function mapGameSortingActivity(reward) {
  const points = reward.pointAwarded ?? 0;
  const activity = {
    type: "game",
    points,
    dayBucket: reward.dayBucket ?? null,
  };
  if (reward.claimedAt) {
    activity.time = new Date(reward.claimedAt);
  }
  if (Number.isFinite(points)) {
    activity.pointsLabel = `+${points} point`;
  }
  return activity;
}

function mapTreeFruitActivity(fruit) {
  const points = fruit.pointsAwarded ?? 0;
  const activity = {
    type: "fruit",
    points,
  };
  if (fruit.claimedAt) {
    activity.time = new Date(fruit.claimedAt);
  }
  return activity;
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
    ecoenzymProjectsCompleted,
    ecoenzymProjectsOngoing,
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
    EcoenzymProject.find({
      userId,
      status: "completed",
      points: { $gt: 0 },
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(10)
      .lean(),
    EcoenzymProject.find({
      userId,
      status: "ongoing",
      prePointsEarned: { $gt: 0 },
    })
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
    ...ecoenzymProjectsCompleted.map(mapCompletedEcoenzymProjectActivity),
    ...ecoenzymProjectsOngoing.map(mapOngoingEcoenzymProjectActivity),
    ...treeFruits.map(mapTreeFruitActivity),
    ...gameRewards.map(mapGameSortingActivity),
  ];

  const completionTimestamps = completedChecklists
    .map((item) => item.completedAt)
    .filter((value) => !!value);
  const streakDays = computeStreakDays(completionTimestamps);

  const latestCompletedAt =
    completionTimestamps.length > 0 ? completionTimestamps[0] : null;

  if (latestCompletedAt) {
    const baseTime = new Date(latestCompletedAt);

    if (streakDays >= 7) {
      rawActivities.push({
        type: "streak",
        milestone: 7,
        streakDays,
        time: new Date(baseTime.getTime() + 1),
      });
    }

    if (streakDays >= 30) {
      rawActivities.push({
        type: "streak",
        milestone: 30,
        streakDays,
        time: new Date(baseTime.getTime() + 2),
      });
    }

    const latestDate = new Date(latestCompletedAt);
    latestDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor(
      (today.getTime() - latestDate.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (diffDays === 2) {
      const breakTime = new Date(latestDate.getTime() + 86400000);
      rawActivities.push({
        type: "streak",
        streakDays: 0,
        status: "broken",
        missedDays: diffDays,
        time: breakTime,
      });
    }
  }

  const activities = rawActivities
    .filter((item) => !!item.time)
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .map((item) => {
      const { time, ...rest } = item;
      const dateValue = time ? new Date(time) : null;
      const isoTime = dateValue ? dateValue.toISOString() : null;
      return {
        ...rest,
        time: isoTime,
      };
    });

  const rewardMilestones =
    rewardItems?.map((reward) => {
      const claimEntry =
        (reward.id ? claimMap.get(reward.id) : undefined) ??
        (reward.code ? claimMap.get(reward.code) : undefined) ??
        null;
      const targetDays = reward.targetDays ?? 0;
      const recordedProgress = claimEntry?.progressDays ?? 0;
      const progressDays = Math.max(recordedProgress, streakDays);
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
    const redeemedTime = redemption.redeemedAt ?? null;
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
