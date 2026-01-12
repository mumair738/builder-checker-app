import type { LeaderboardUser } from "@/types/talent";

/* ============================
   Types
============================ */

export interface BuilderAnalytics {
  userId: number;
  mcap: number;
  category: BuilderCategory;
  rank: number;
}

export type BuilderCategory =
  | "most_earnings"
  | "trending"
  | "highest_score"
  | "featured"
  | "sought_after";

/* ============================
   Constants / Weights
============================ */

const WEIGHTS = {
  EARNINGS_MCAP: 0.4,
  SCORE_MCAP: 3, // score * SCORE_MCAP
  POSITION_MCAP: 0.2,
  TRENDING_BONUS: 5,

  TRENDING_CHANGE_MULTIPLIER: 15,

  HUMAN_CHECKMARK: 150,
  VERIFIED_NATIONALITY: 75,
  BIO: 40,
  LOCATION: 30,
  IMAGE: 20,

  TAG: 15,
};

/* ============================
   Helpers
============================ */

function getRewardAmount(user: LeaderboardUser): number {
  const value = user.reward_amount;
  const parsed = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
}

function getSafePosition(user: LeaderboardUser): number {
  return Math.max(1, user.leaderboard_position ?? 1000);
}

/* ============================
   MCAP Calculation
============================ */

/**
 * Calculate MCAP (Market Cap) for a builder
 */
export function calculateMCAP(
  user: LeaderboardUser,
  tokenPrice: number
): number {
  const rewardAmount = getRewardAmount(user);
  const earningsUSD = rewardAmount * tokenPrice;

  const score = user.profile.builder_score?.points || 0;
  const position = getSafePosition(user);
  const rankingChange = user.ranking_change || 0;

  // Earnings
  const earningsMCAP = earningsUSD * WEIGHTS.EARNINGS_MCAP;

  // Score
  const scoreMCAP = score * WEIGHTS.SCORE_MCAP;

  // Position (inverse relationship)
  const positionMultiplier = Math.max(
    0.1,
    Math.min(1, 1 - (position - 1) / 1000)
  );
  const positionMCAP =
    earningsUSD * positionMultiplier * WEIGHTS.POSITION_MCAP;

  // Trending bonus (only positive change)
  const trendingBonus =
    rankingChange > 0 ? rankingChange * WEIGHTS.TRENDING_BONUS : 0;

  // Activity / profile bonus
  const activityBonus =
    (user.profile.human_checkmark ? 50 : 0) +
    (user.profile.verified_nationality ? 30 : 0) +
    (user.profile.tags?.length || 0) * 5;

  const total =
    earningsMCAP +
    scoreMCAP +
    positionMCAP +
    trendingBonus +
    activityBonus;

  return Math.round(total);
}

/* ============================
   Category Selectors
============================ */

export function getMostEarnings(
  users: LeaderboardUser[]
): LeaderboardUser | null {
  if (!users.length) return null;

  return users.reduce((max, user) =>
    getRewardAmount(user) > getRewardAmount(max) ? user : max
  );
}

export function getTrendingBuilder(
  users: LeaderboardUser[]
): LeaderboardUser | null {
  if (!users.length) return null;

  const positiveTrend = users.filter(u => u.ranking_change > 0);

  const pool = positiveTrend.length ? positiveTrend : users;

  return pool.reduce((best, user) => {
    const score =
      Math.abs(user.ranking_change || 0) *
        WEIGHTS.TRENDING_CHANGE_MULTIPLIER +
      (getSafePosition(user) <= 10
        ? 100
        : getSafePosition(user) <= 50
        ? 50
        : 0) +
      (user.profile.builder_score?.points || 0) * 0.2;

    const bestScore =
      Math.abs(best.ranking_change || 0) *
        WEIGHTS.TRENDING_CHANGE_MULTIPLIER +
      (getSafePosition(best) <= 10
        ? 100
        : getSafePosition(best) <= 50
        ? 50
        : 0) +
      (best.profile.builder_score?.points || 0) * 0.2;

    return score > bestScore ? user : best;
  });
}

export function getHighestScore(
  users: LeaderboardUser[]
): LeaderboardUser | null {
  if (!users.length) return null;

  return users.reduce((max, user) =>
    (user.profile.builder_score?.points || 0) >
    (max.profile.builder_score?.points || 0)
      ? user
      : max
  );
}

export function getFeaturedBuilder(
  users: LeaderboardUser[],
  tokenPrice: number
): LeaderboardUser | null {
  if (!users.length) return null;

  const mcapCache = new Map<number, number>();

  const getMCAP = (user: LeaderboardUser) => {
    if (!mcapCache.has(user.id)) {
      mcapCache.set(user.id, calculateMCAP(user, tokenPrice));
    }
    return mcapCache.get(user.id)!;
  };

  return users.reduce((featured, user) => {
    const featuredScore =
      getMCAP(featured) +
      (featured.profile.human_checkmark
        ? WEIGHTS.HUMAN_CHECKMARK
        : 0) +
      (featured.profile.verified_nationality
        ? WEIGHTS.VERIFIED_NATIONALITY
        : 0) +
      (featured.profile.bio ? 25 : 0);

    const userScore =
      getMCAP(user) +
      (user.profile.human_checkmark
        ? WEIGHTS.HUMAN_CHECKMARK
        : 0) +
      (user.profile.verified_nationality
        ? WEIGHTS.VERIFIED_NATIONALITY
        : 0) +
      (user.profile.bio ? 25 : 0);

    return userScore > featuredScore ? user : featured;
  });
}

export function getSoughtAfterBuilder(
  users: LeaderboardUser[]
): LeaderboardUser | null {
  if (!users.length) return null;

  return users.reduce((best, user) => {
    const score = (u: LeaderboardUser) =>
      (u.profile.human_checkmark ? WEIGHTS.HUMAN_CHECKMARK : 0) +
      (u.profile.verified_nationality
        ? WEIGHTS.VERIFIED_NATIONALITY
        : 0) +
      (u.profile.bio ? WEIGHTS.BIO : 0) +
      (u.profile.location ? WEIGHTS.LOCATION : 0) +
      (u.profile.image_url ? WEIGHTS.IMAGE : 0) +
      (u.profile.tags?.length || 0) * WEIGHTS.TAG +
      (u.profile.builder_score?.points || 0) * 0.8;

    return score(user) > score(best) ? user : best;
  });
}

/* ============================
   Categorization
============================ */

export function categorizeBuilders(
  users: LeaderboardUser[],
  tokenPrice: number
): Map<number, BuilderCategory> {
  const map = new Map<number, BuilderCategory>();
  if (!users.length) return map;

  const mostEarnings = getMostEarnings(users);
  const trending = getTrendingBuilder(users);
  const highestScore = getHighestScore(users);
  const featured = getFeaturedBuilder(users, tokenPrice);
  const soughtAfter = getSoughtAfterBuilder(users);

  if (mostEarnings) map.set(mostEarnings.id, "most_earnings");
  if (trending) map.set(trending.id, "trending");
  if (highestScore) map.set(highestScore.id, "highest_score");
  if (featured) map.set(featured.id, "featured");
  if (soughtAfter) map.set(soughtAfter.id, "sought_after");

  return map;
}

/* ============================
   Labels
============================ */

export function getCategoryLabel(category: BuilderCategory): string {
  switch (category) {
    case "most_earnings":
      return "Most Earnings";
    case "trending":
      return "Trending";
    case "highest_score":
      return "Highest Score";
    case "featured":
      return "Featured";
    case "sought_after":
      return "Sought After";
  }
}
