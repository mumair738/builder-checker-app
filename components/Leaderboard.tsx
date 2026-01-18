"use client";

import { useEffect, useState, useMemo } from "reac";
import { getLeaderboard } from "@/lib/builderscore-api";
import { getTokenPrice, type TokenInfo } from "@/lib/coingecko-api";
import type { LeaderboardResponse, LeaderboardFilters } from "@/types/talent";
import { formatNumber } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  categorizeBuilders,
  calculateMCAP,
  getCategoryLabel,
  getMostEarnings,
  getTrendingBuilder,
  getHighestScore,
  getFeaturedBuilder,
  getSoughtAfterBuilder,
  type BuilderCategory,
} from "@/lib/builder-analytics";
import { TrophyIcon } from "@/components/TrophyIcon";
import { BuilderProfileModal } from "@/components/BuilderProfileModal";
import type { LeaderboardUser } from "@/types/talent";

// All sponsor slugs
const ALL_SPONSOR_SLUGS = ["walletconnect", "celo", "base", "base-summer", "syndicate", "talent-protocol"];

// Extended user type with earnings breakdown
interface UserWithEarningsBreakdown extends LeaderboardUser {
  earningsBreakdown?: Array<{
    sponsor: string;
    amount: number;
    amountUSD: number;
    tokenSymbol: string;
  }>;
  totalEarningsUSD?: number;
  sponsors?: string[]; // List of sponsors this builder appears in
}

/**
 * Get the reason/explanation for why a builder was categorized
 */
function getCategoryReason(user: LeaderboardUser, category: Exclude<BuilderCategory, null>, tokenPrice: number): string {
  const rewardAmount = typeof user.reward_amount === 'string' 
    ? parseFloat(user.reward_amount) 
    : user.reward_amount;
  const score = user.profile.builder_score?.points || 0;
  const earningsUSD = rewardAmount * tokenPrice;
  
  switch (category) {
    case "most_earnings":
      return `Highest earnings: ${formatNumber(rewardAmount)} tokens ($${formatNumber(earningsUSD)})`;
    
    case "trending":
      const changeText = user.ranking_change > 0 
        ? `↑${user.ranking_change} positions` 
        : user.ranking_change < 0 
        ? `↓${Math.abs(user.ranking_change)} positions`
        : "stable";
      return `Ranking change: ${changeText} | Position: #${user.leaderboard_position} | Score: ${formatNumber(score)}`;
    
    case "highest_score":
      return `Builder score: ${formatNumber(score)} points (highest among all builders)`;
    
    case "featured":
      const mcap = calculateMCAP(user, tokenPrice);
      const verificationBonus = (user.profile.human_checkmark ? 150 : 0) + (user.profile.verified_nationality ? 75 : 0);
      return `MCAP: $${formatNumber(mcap)} | Verified: ${verificationBonus > 0 ? 'Yes' : 'No'} | Top ${user.leaderboard_position <= 10 ? '10' : user.leaderboard_position <= 50 ? '50' : '100+'} position`;
    
    case "sought_after":
      const completenessScore = 
        (user.profile.human_checkmark ? 150 : 0) +
        (user.profile.verified_nationality ? 75 : 0) +
        (user.profile.bio ? 40 : 0) +
        (user.profile.location ? 30 : 0) +
        (user.profile.tags?.length || 0) * 15 +
        score * 0.8 +
        (user.profile.image_url ? 20 : 0);
      const factors = [];
      if (user.profile.human_checkmark) factors.push("Verified");
      if (user.profile.verified_nationality) factors.push("Nationality verified");
      if (user.profile.bio) factors.push("Bio");
      if (user.profile.location) factors.push("Location");
      if (user.profile.tags?.length) factors.push(`${user.profile.tags.length} tags`);
      if (user.profile.image_url) factors.push("Profile image");
      return `Completeness score: ${Math.round(completenessScore)} | Factors: ${factors.join(", ") || "None"} | Score: ${formatNumber(score)}`;
    
    default:
      return "";
  }
}

interface LeaderboardProps {
  filters?: LeaderboardFilters;
}

export function Leaderboard({ filters = {} }: LeaderboardProps) {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(filters.page || 1);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [tokenPrice, setTokenPrice] = useState<number | null>(null);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [selectedBuilder, setSelectedBuilder] = useState<LeaderboardUser | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [expandedEarnings, setExpandedEarnings] = useState<Set<number>>(new Set());
  
  // For "All Sponsors" lazy loading: track loaded pages per sponsor and all aggregated users
  const [allSponsorsPageMap, setAllSponsorsPageMap] = useState<Map<string, number>>(new Map());
  const [allSponsorsAggregatedUsers, setAllSponsorsAggregatedUsers] = useState<UserWithEarningsBreakdown[]>([]);
  const [allSponsorsHasMore, setAllSponsorsHasMore] = useState(true);
  const [displayedCount, setDisplayedCount] = useState(30); // Display 30 builders at a time

  const handleSearch = () => {
    setActiveSearchQuery(searchQuery);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setActiveSearchQuery("");
    setPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  useEffect(() => {
    // For "all sponsors", we don't need a single token price
    // Earnings are already calculated in USD in fetchAllSponsors
    if (filters.sponsor_slug && filters.sponsor_slug !== "all") {
      getTokenPrice(filters.sponsor_slug)
        .then(({ price, tokenInfo }) => {
          setTokenPrice(price);
          setTokenInfo(tokenInfo);
        })
        .catch((err) => {
          console.error("Failed to fetch token price:", err);
          setTokenPrice(null);
          setTokenInfo(null);
        });
    } else if (!filters.sponsor_slug) {
      // Default to walletconnect if no sponsor selected
      getTokenPrice("walletconnect")
        .then(({ price, tokenInfo }) => {
          setTokenPrice(price);
          setTokenInfo(tokenInfo);
        })
        .catch((err) => {
          console.error("Failed to fetch token price:", err);
          setTokenPrice(null);
          setTokenInfo(null);
        });
    } else {
      // "all sponsors" - no single token price needed
      setTokenPrice(null);
      setTokenInfo(null);
    }
  }, [filters.sponsor_slug]);

  useEffect(() => {
    if (filters.page !== undefined) {
      setPage(filters.page);
    } else {
      setPage(1);
    }
    // Reset lazy loading state when filters change
    if (!filters.sponsor_slug) {
      setAllSponsorsPageMap(new Map());
      setAllSponsorsAggregatedUsers([]);
      setAllSponsorsHasMore(true);
      setDisplayedCount(30); // Reset to show first 30
    }
  }, [JSON.stringify({ sponsor_slug: filters.sponsor_slug, grant_id: filters.grant_id, per_page: filters.per_page })]);

  useEffect(() => {
    fetchLeaderboard({ 
      ...filters, 
      page,
      search: activeSearchQuery || undefined,
    });
  }, [page, activeSearchQuery, JSON.stringify({ sponsor_slug: filters.sponsor_slug, grant_id: filters.grant_id, per_page: filters.per_page })]);

  // Intersection Observer for infinite scroll (All Sponsors mode only)
  useEffect(() => {
    if (filters.sponsor_slug || !allSponsorsHasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !loadingMore && allSponsorsHasMore) {
            fetchLeaderboard({ 
              ...filters, 
              page: 1,
              search: activeSearchQuery || undefined,
            }, true);
          }
        });
      },
      { threshold: 0.1 }
    );

    const trigger = document.getElementById("load-more-trigger");
    if (trigger) {
      observer.observe(trigger);
    }

    return () => {
      if (trigger) {
        observer.unobserve(trigger);
      }
    };
  }, [filters.sponsor_slug, allSponsorsHasMore, loadingMore, activeSearchQuery]);

  const fetchLeaderboard = async (leaderboardFilters: LeaderboardFilters, isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }
    
    try {
      // Check if "all sponsors" is selected (no sponsor_slug)
      if (!leaderboardFilters.sponsor_slug) {
        // Fetch from all sponsors and combine (with lazy loading)
        const allSponsorsData = await fetchAllSponsorsLazy(leaderboardFilters, isLoadMore);
        setData(allSponsorsData);
      } else {
        // Single sponsor fetch
        const response = await getLeaderboard(leaderboardFilters);
        setData(response);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch leaderboard");
      console.error("Error fetching leaderboard:", err);
    } finally {
      if (isLoadMore) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Lazy loading version: fetch one page (100 per page) from each sponsor, then aggregate
  const fetchAllSponsorsLazy = async (filters: LeaderboardFilters, isLoadMore = false): Promise<LeaderboardResponse> => {
    console.log(`🚀 [All Sponsors Lazy] ${isLoadMore ? 'Loading more...' : 'Initial load'}`);
    
    // Fetch token prices for all sponsors (only on initial load)
    let priceMap = new Map<string, number>();
    let tokenInfoMap = new Map<string, TokenInfo>();
    
    if (!isLoadMore) {
      console.log("💰 [All Sponsors Lazy] Fetching token prices for all sponsors...");
      const tokenPrices = await Promise.all(
        ALL_SPONSOR_SLUGS.map(async (slug) => {
          const { price, tokenInfo } = await getTokenPrice(slug);
          console.log(`  ✓ ${slug}: $${price} (${tokenInfo?.symbol || 'N/A'})`);
          return { slug, price, tokenInfo };
        })
      );
      priceMap = new Map(tokenPrices.map(({ slug, price }) => [slug, price]));
      tokenInfoMap = new Map(tokenPrices.filter(({ tokenInfo }) => tokenInfo !== null).map(({ slug, tokenInfo }) => [slug, tokenInfo!]));
    } else {
      // Reuse existing token prices (we'll need to store these or fetch again)
      // For now, fetch them again (could be optimized)
      const tokenPrices = await Promise.all(
        ALL_SPONSOR_SLUGS.map(async (slug) => {
          const { price, tokenInfo } = await getTokenPrice(slug);
          return { slug, price, tokenInfo };
        })
      );
      priceMap = new Map(tokenPrices.map(({ slug, price }) => [slug, price]));
      tokenInfoMap = new Map(tokenPrices.filter(({ tokenInfo }) => tokenInfo !== null).map(({ slug, tokenInfo }) => [slug, tokenInfo!]));
    }

    // Determine which page to fetch for each sponsor
    const currentPageMap = new Map<string, number>();
    ALL_SPONSOR_SLUGS.forEach((slug) => {
      const currentPage = allSponsorsPageMap.get(slug) || 0;
      currentPageMap.set(slug, currentPage + 1);
    });

    console.log(`📡 [All Sponsors Lazy] Fetching page 1 (100 per page) from all sponsors...`);
    
    // Fetch next page from all sponsors in parallel
    const allResponses = await Promise.allSettled(
      ALL_SPONSOR_SLUGS.map((slug) => {
        const pageToFetch = currentPageMap.get(slug) || 1;
        console.log(`   📄 Fetching ${slug} - Page ${pageToFetch} (100 per page)...`);
        return getLeaderboard({
          ...filters,
          sponsor_slug: slug,
          grant_id: undefined,
          per_page: 100,
          page: pageToFetch,
        });
      })
    );

    // Update page map
    const newPageMap = new Map(allSponsorsPageMap);
    let hasMoreData = false;
    
    allResponses.forEach((result, index) => {
      const slug = ALL_SPONSOR_SLUGS[index];
      if (result.status === "fulfilled") {
        const currentPage = currentPageMap.get(slug) || 1;
        newPageMap.set(slug, currentPage);
        if (currentPage < result.value.pagination.last_page) {
          hasMoreData = true;
        }
        console.log(`  ✓ ${slug}: Page ${currentPage} - ${result.value.users.length} builders`);
      } else {
        console.error(`  ✗ ${slug}: Failed -`, result.reason);
      }
    });
    
    setAllSponsorsPageMap(newPageMap);
    setAllSponsorsHasMore(hasMoreData);

    // Helper function to get a unique key for a builder
    const getBuilderKey = (user: LeaderboardUser): string => {
      if (user.profile.talent_protocol_id) {
        return `talent_${user.profile.talent_protocol_id}`;
      }
      const normalizedName = (user.profile.display_name || user.profile.name || '').toLowerCase().trim();
      if (normalizedName) {
        return `name_${normalizedName}`;
      }
      return `id_${user.id}`;
    };

    // Aggregate new data with existing data
    const existingUserMap = new Map<string, UserWithEarningsBreakdown>();
    const existingEarningsBreakdownMap = new Map<string, Array<{
      sponsor: string;
      amount: number;
      amountUSD: number;
      tokenSymbol: string;
    }>>();
    const existingSponsorsMap = new Map<string, Set<string>>();

    // Initialize from existing aggregated users
    if (isLoadMore && allSponsorsAggregatedUsers.length > 0) {
      allSponsorsAggregatedUsers.forEach((user) => {
        const key = getBuilderKey(user);
        existingUserMap.set(key, { ...user });
        existingEarningsBreakdownMap.set(key, [...(user.earningsBreakdown || [])]);
        existingSponsorsMap.set(key, new Set(user.sponsors || []));
      });
    }

    // Process new responses
    allResponses.forEach((result, index) => {
      if (result.status === "fulfilled") {
        const sponsor = ALL_SPONSOR_SLUGS[index];
        const tokenPrice = priceMap.get(sponsor) || 0;
        const tokenInfo = tokenInfoMap.get(sponsor);

        result.value.users.forEach((user) => {
          const rewardAmount = typeof user.reward_amount === 'string' 
            ? parseFloat(user.reward_amount) 
            : user.reward_amount;
          
          const earningsUSD = rewardAmount * tokenPrice;
          const builderKey = getBuilderKey(user);

          if (!existingUserMap.has(builderKey)) {
            existingUserMap.set(builderKey, {
              ...user,
              earningsBreakdown: [],
              totalEarningsUSD: 0,
              sponsors: [],
            });
            existingEarningsBreakdownMap.set(builderKey, []);
            existingSponsorsMap.set(builderKey, new Set());
          }

          const existingUser = existingUserMap.get(builderKey)!;
          const breakdown = existingEarningsBreakdownMap.get(builderKey)!;
          const sponsorsSet = existingSponsorsMap.get(builderKey)!;

          sponsorsSet.add(sponsor);

          if (tokenInfo) {
            breakdown.push({
              sponsor,
              amount: rewardAmount,
              amountUSD: earningsUSD,
              tokenSymbol: tokenInfo.symbol,
            });

            const previousTotal = existingUser.totalEarningsUSD || 0;
            existingUser.totalEarningsUSD = previousTotal + earningsUSD;
          }

          if ((user.profile.builder_score?.points || 0) > (existingUser.profile.builder_score?.points || 0)) {
            existingUser.profile.builder_score = user.profile.builder_score;
          }
          if (user.leaderboard_position < existingUser.leaderboard_position) {
            existingUser.leaderboard_position = user.leaderboard_position;
          }
        });
      }
    });

    // Update reward_amount to total USD
    existingUserMap.forEach((user) => {
      user.reward_amount = user.totalEarningsUSD || 0;
    });

    // Attach earnings breakdown and sponsors list
    existingUserMap.forEach((user, builderKey) => {
      user.earningsBreakdown = existingEarningsBreakdownMap.get(builderKey) || [];
      user.sponsors = Array.from(existingSponsorsMap.get(builderKey) || []);
    });

    // Sort: by total earnings USD (descending) - regardless of sponsor count
    const combinedUsers = Array.from(existingUserMap.values()).sort((a, b) => {
      const aTotal = a.totalEarningsUSD || 0;
      const bTotal = b.totalEarningsUSD || 0;
      return bTotal - aTotal;
    });

    // Update aggregated users state
    setAllSponsorsAggregatedUsers(combinedUsers);

    // Apply search filter if active
    let filteredCombinedUsers = combinedUsers;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredCombinedUsers = combinedUsers.filter((user) => {
        const name = (user.profile.display_name || user.profile.name || '').toLowerCase();
        const bio = (user.profile.bio || '').toLowerCase();
        const wallet = (user.recipient_wallet || '').toLowerCase();
        return name.includes(searchLower) || bio.includes(searchLower) || wallet.includes(searchLower);
      });
      console.log(`🔍 [All Sponsors Lazy] Search "${filters.search}": ${filteredCombinedUsers.length} results from ${combinedUsers.length} builders`);
    }

    // Display 30 builders at a time (or all if less than 30)
    const currentDisplayedCount = isLoadMore ? displayedCount + 30 : Math.min(30, filteredCombinedUsers.length);
    setDisplayedCount(currentDisplayedCount);
    const displayedUsers = filteredCombinedUsers.slice(0, currentDisplayedCount);

    displayedUsers.forEach((user, index) => {
      user.leaderboard_position = index + 1;
    });

    const result = {
      users: displayedUsers,
      pagination: {
        current_page: 1,
        last_page: Math.ceil(filteredCombinedUsers.length / 30), // 30 per display chunk
        total: filteredCombinedUsers.length,
      },
    };

    console.log(`✅ [All Sponsors Lazy] Loaded ${combinedUsers.length} unique builders, ${filters.search ? `filtered to ${filteredCombinedUsers.length}` : ''}, displaying ${displayedUsers.length} of ${filteredCombinedUsers.length}`);
    return result;
  };

  const fetchAllSponsors = async (filters: LeaderboardFilters): Promise<LeaderboardResponse> => {
    console.log("🚀 [All Sponsors] Starting fetchAllSponsors");
    console.log("📋 [All Sponsors] Sponsor slugs:", ALL_SPONSOR_SLUGS);
    console.log("🔍 [All Sponsors] Filters:", filters);

    // Fetch token prices for all sponsors
    console.log("💰 [All Sponsors] Fetching token prices for all sponsors...");
    const tokenPrices = await Promise.all(
      ALL_SPONSOR_SLUGS.map(async (slug) => {
        const { price, tokenInfo } = await getTokenPrice(slug);
        console.log(`  ✓ ${slug}: $${price} (${tokenInfo?.symbol || 'N/A'})`);
        return { slug, price, tokenInfo };
      })
    );

    console.log("✅ [All Sponsors] Token prices fetched:", tokenPrices);

    const priceMap = new Map(
      tokenPrices.map(({ slug, price }) => [slug, price])
    );
    const tokenInfoMap = new Map(
      tokenPrices.map(({ slug, tokenInfo }) => [slug, tokenInfo])
    );

    // Fetch data from all sponsors
    // Fetch all pages sequentially for each sponsor (page=1, 2, 3, ...) with 100 per page
    console.log("📡 [All Sponsors] Fetching leaderboard data from all sponsors (all pages, 100 per page, sequentially)...");
    
    const fetchAllPagesForSponsor = async (slug: string): Promise<LeaderboardUser[]> => {
      const allUsers: LeaderboardUser[] = [];
      let currentPage = 1;
      let hasMorePages = true;
      
      console.log(`\n📦 [All Sponsors] Starting to fetch ${slug}...`);
      
      while (hasMorePages) {
        try {
          console.log(`   📄 Fetching ${slug} - Page ${currentPage} (100 per page)...`);
          const response = await getLeaderboard({
            ...filters,
            sponsor_slug: slug,
            grant_id: undefined, // All time only
            per_page: 100,
            page: currentPage,
          });
          
          if (response.users.length === 0) {
            console.log(`   ✓ ${slug} - Page ${currentPage}: No more data`);
            hasMorePages = false;
          } else {
            allUsers.push(...response.users);
            console.log(`   ✓ ${slug} - Page ${currentPage}: ${response.users.length} builders (Total so far: ${allUsers.length})`);
            
            // Check if we've reached the last page
            if (currentPage >= response.pagination.last_page) {
              console.log(`   ✅ ${slug}: Reached last page (${response.pagination.last_page})`);
              hasMorePages = false;
            } else {
              currentPage++;
            }
          }
        } catch (error) {
          console.error(`   ✗ ${slug} - Page ${currentPage}: Error -`, error);
          hasMorePages = false;
        }
      }
      
      console.log(`   ✅ ${slug}: Completed - Fetched ${allUsers.length} builders across ${currentPage} page(s)`);
      return allUsers;
    };
    
    // Fetch all pages for each sponsor sequentially (one sponsor at a time, one page at a time)
    const allResponses: Array<PromiseSettledResult<LeaderboardResponse>> = [];
    
    for (const slug of ALL_SPONSOR_SLUGS) {
      try {
        console.log(`\n🔄 [All Sponsors] Processing sponsor: ${slug}`);
        const users = await fetchAllPagesForSponsor(slug);
        allResponses.push({
          status: "fulfilled" as const,
          value: {
            users,
            pagination: {
              current_page: 1,
              last_page: 1,
              total: users.length,
            },
          },
        });
      } catch (error) {
        console.error(`\n❌ [All Sponsors] Error processing ${slug}:`, error);
        allResponses.push({
          status: "rejected" as const,
          reason: error,
        });
      }
    }
    
    console.log("📊 [All Sponsors] Responses received:", allResponses.length);
    allResponses.forEach((result, index) => {
      const sponsor = ALL_SPONSOR_SLUGS[index];
      if (result.status === "fulfilled") {
        console.log(`  ✓ ${sponsor}: ${result.value.users.length} builders`);
      } else {
        console.error(`  ✗ ${sponsor}: Failed -`, result.reason);
      }
    });

    // Combine all users by a unique identifier (talent_protocol_id or normalized display_name)
    // Use a composite key: talent_protocol_id if available, otherwise normalized display_name
    const userMap = new Map<string, UserWithEarningsBreakdown>();
    const earningsBreakdownMap = new Map<string, Array<{
      sponsor: string;
      amount: number;
      amountUSD: number;
      tokenSymbol: string;
    }>>();
    const sponsorsMap = new Map<string, Set<string>>(); // Track which sponsors each builder appears in
    
    // Helper function to get a unique key for a builder
    const getBuilderKey = (user: LeaderboardUser): string => {
      // Primary: Use talent_protocol_id if available
      if (user.profile.talent_protocol_id) {
        return `talent_${user.profile.talent_protocol_id}`;
      }
      // Fallback: Use normalized display_name (lowercase, trimmed)
      const normalizedName = (user.profile.display_name || user.profile.name || '').toLowerCase().trim();
      if (normalizedName) {
        return `name_${normalizedName}`;
      }
      // Last resort: Use the user ID (but this won't match across sponsors)
      return `id_${user.id}`;
    };

    // Step 1: Gather all data from each sponsor slug
    console.log("🔄 [All Sponsors] Step 1: Gathering and aggregating data from all sponsors...");
    let totalBuildersProcessed = 0;
    let totalEarningsCalculated = 0;

    allResponses.forEach((result, index) => {
      if (result.status === "fulfilled") {
        const sponsor = ALL_SPONSOR_SLUGS[index];
        const tokenPrice = priceMap.get(sponsor) || 0;
        const tokenInfo = tokenInfoMap.get(sponsor);

        console.log(`\n📦 [All Sponsors] Processing ${sponsor}:`);
        console.log(`   Token Price: $${tokenPrice}, Symbol: ${tokenInfo?.symbol || 'N/A'}`);
        console.log(`   Builders in this sponsor: ${result.value.users.length}`);

        result.value.users.forEach((user) => {
          totalBuildersProcessed++;
          const rewardAmount = typeof user.reward_amount === 'string' 
            ? parseFloat(user.reward_amount) 
            : user.reward_amount;
          
          // Convert token amount to USD immediately
          const earningsUSD = rewardAmount * tokenPrice;

          // Get unique key for this builder (talent_protocol_id or normalized name)
          const builderKey = getBuilderKey(user);
          const builderName = user.profile.display_name || user.profile.name || 'Anonymous';

          if (!userMap.has(builderKey)) {
            // First time seeing this builder - initialize
            console.log(`   🆕 New builder found: ${builderName} (Key: ${builderKey}, Talent ID: ${user.profile.talent_protocol_id || 'N/A'}, Sponsor ID: ${user.id})`);
            userMap.set(builderKey, {
              ...user,
              earningsBreakdown: [],
              totalEarningsUSD: 0,
              sponsors: [],
            });
            earningsBreakdownMap.set(builderKey, []);
            sponsorsMap.set(builderKey, new Set());
          }

          const existingUser = userMap.get(builderKey)!;
          const breakdown = earningsBreakdownMap.get(builderKey)!;
          const sponsorsSet = sponsorsMap.get(builderKey)!;

          // Track that this builder appears in this sponsor
          sponsorsSet.add(sponsor);

          // Add earnings from this sponsor (converted to USD)
          // Include ALL earnings from ALL sponsors, even if 0
          if (tokenInfo) {
            breakdown.push({
              sponsor,
              amount: rewardAmount,
              amountUSD: earningsUSD, // Already in USD
              tokenSymbol: tokenInfo.symbol,
            });

            console.log(`   💵 Builder ${builderKey} (${builderName}, Sponsor ID: ${user.id}): ${rewardAmount} ${tokenInfo.symbol} × $${tokenPrice} = $${earningsUSD.toFixed(2)}`);

            // Accumulate total earnings in USD from ALL sponsors
            // This sums the entire amount made from all sponsors
            const previousTotal = existingUser.totalEarningsUSD || 0;
            existingUser.totalEarningsUSD = previousTotal + earningsUSD;
            totalEarningsCalculated += earningsUSD;

            console.log(`      Previous total: $${previousTotal.toFixed(2)} → New total: $${existingUser.totalEarningsUSD.toFixed(2)}`);
          }

          // Update other fields (take the best/highest values)
          if ((user.profile.builder_score?.points || 0) > (existingUser.profile.builder_score?.points || 0)) {
            existingUser.profile.builder_score = user.profile.builder_score;
          }
          if (user.leaderboard_position < existingUser.leaderboard_position) {
            existingUser.leaderboard_position = user.leaderboard_position;
          }
        });
      }
    });

    console.log(`\n📈 [All Sponsors] Aggregation Summary:`);
    console.log(`   Total builders processed: ${totalBuildersProcessed}`);
    console.log(`   Unique builders: ${userMap.size}`);
    console.log(`   Total earnings calculated: $${totalEarningsCalculated.toFixed(2)}`);

    // Step 2: After gathering all data, update reward_amount to total USD for display
    console.log("\n🔄 [All Sponsors] Step 2: Finalizing user data...");
    userMap.forEach((user) => {
      user.reward_amount = user.totalEarningsUSD || 0;
    });

    // Attach earnings breakdown and sponsors list to users
    let exampleBuilderFound = false;
    
    userMap.forEach((user, builderKey) => {
      user.earningsBreakdown = earningsBreakdownMap.get(builderKey) || [];
      user.sponsors = Array.from(sponsorsMap.get(builderKey) || []);
      
      // Check for example builder: defidevrel.base.eth
      const builderName = (user.profile.display_name || user.profile.name || '').toLowerCase();
      const isExampleBuilder = builderName.includes('defidevrel') || builderName.includes('defidevrel.base.eth');
      
      if (isExampleBuilder) {
        exampleBuilderFound = true;
        const breakdownSum = user.earningsBreakdown.reduce((sum, b) => sum + b.amountUSD, 0);
        
        console.log(`\n🎯 [EXAMPLE BUILDER] ${user.profile.display_name || user.profile.name || 'Anonymous'} (Key: ${builderKey}, Talent ID: ${user.profile.talent_protocol_id || 'N/A'})`);
        console.log(`   Sponsors appeared in: ${user.sponsors.join(', ')} (${user.sponsors.length} sponsors)`);
        console.log(`   Total Earnings (totalEarningsUSD): $${(user.totalEarningsUSD || 0).toFixed(2)}`);
        console.log(`   Breakdown Sum Verification: $${breakdownSum.toFixed(2)}`);
        console.log(`   Match: ${Math.abs((user.totalEarningsUSD || 0) - breakdownSum) < 0.01 ? '✅ CORRECT' : '❌ MISMATCH'}`);
        console.log(`   Earnings Breakdown:`);
        user.earningsBreakdown.forEach((b, idx) => {
          const price = b.amount > 0 ? (b.amountUSD / b.amount) : 0;
          console.log(`      ${idx + 1}. ${b.sponsor}: ${b.amount} ${b.tokenSymbol} × $${price.toFixed(4)} = $${b.amountUSD.toFixed(2)}`);
        });
      }
    });
    
    if (!exampleBuilderFound) {
      console.log("\n⚠️  [EXAMPLE BUILDER] 'defidevrel.base.eth' NOT FOUND in aggregated results");
      console.log("   Searching for similar names...");
      userMap.forEach((user, builderKey) => {
        const builderName = (user.profile.display_name || user.profile.name || '').toLowerCase();
        if (builderName.includes('defi') || builderName.includes('devrel')) {
          console.log(`   Similar match: ${user.profile.display_name || user.profile.name} (Key: ${builderKey}, Talent ID: ${user.profile.talent_protocol_id || 'N/A'}) - Sponsors: ${(user.sponsors || []).join(', ')}`);
        }
      });
    }

    // Convert to array and sort by total earnings USD (descending) - regardless of sponsor count
    console.log("\n🔄 [All Sponsors] Step 3: Sorting builders by earnings...");
    const combinedUsers = Array.from(userMap.values()).sort((a, b) => {
      const aTotal = a.totalEarningsUSD || 0;
      const bTotal = b.totalEarningsUSD || 0;
      return bTotal - aTotal;
    });

    console.log(`   Sorted ${combinedUsers.length} builders`);
    
    // Find example builder's position in sorted list
    const exampleBuilderIndex = combinedUsers.findIndex((user) => {
      const builderName = (user.profile.display_name || user.profile.name || '').toLowerCase();
      return builderName.includes('defidevrel') || builderName.includes('defidevrel.base.eth');
    });
    
    if (exampleBuilderIndex !== -1) {
      const exampleBuilder = combinedUsers[exampleBuilderIndex];
      const pageNumber = Math.floor(exampleBuilderIndex / 30) + 1;
      const positionOnPage = (exampleBuilderIndex % 30) + 1;
      console.log(`\n🎯 [EXAMPLE BUILDER] Position in sorted list:`);
      console.log(`   Name: ${exampleBuilder.profile.display_name || exampleBuilder.profile.name || 'Anonymous'}`);
      console.log(`   Key: ${getBuilderKey(exampleBuilder)}, Talent ID: ${exampleBuilder.profile.talent_protocol_id || 'N/A'}`);
      console.log(`   Rank: #${exampleBuilderIndex + 1} (Position ${positionOnPage} on page ${pageNumber})`);
      console.log(`   Sponsors: ${(exampleBuilder.sponsors || []).length} (${(exampleBuilder.sponsors || []).join(', ')})`);
      console.log(`   Total Earnings: $${(exampleBuilder.totalEarningsUSD || 0).toFixed(2)}`);
      console.log(`   Will appear on page: ${pageNumber}`);
    }
    
    console.log(`   Top 10 builders after sorting:`);
    combinedUsers.slice(0, 10).forEach((user, idx) => {
      const builderName = (user.profile.display_name || user.profile.name || 'Anonymous').toLowerCase();
      const isExample = builderName.includes('defidevrel');
      const marker = isExample ? '🎯' : '';
      console.log(`   ${marker} ${idx + 1}. ${user.profile.display_name || user.profile.name || 'Anonymous'} (Key: ${getBuilderKey(user)}, Talent ID: ${user.profile.talent_protocol_id || 'N/A'})`);
      console.log(`      Sponsors: ${(user.sponsors || []).length} (${(user.sponsors || []).join(', ')})`);
      console.log(`      Total Earnings: $${(user.totalEarningsUSD || 0).toFixed(2)}`);
    });

    // Apply pagination
    // Display 30 per page in the table (regardless of fetch size)
    console.log("\n🔄 [All Sponsors] Step 4: Applying pagination...");
    const perPage = 30; // Always show 30 per page in table
    const currentPage = filters.page || 1;
    const startIndex = (currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedUsers = combinedUsers.slice(startIndex, endIndex);

    console.log(`   Page: ${currentPage}, Per Page: ${perPage}`);
    console.log(`   Showing builders ${startIndex + 1} to ${Math.min(endIndex, combinedUsers.length)} of ${combinedUsers.length}`);

    // Update leaderboard positions based on sorted order
    paginatedUsers.forEach((user, index) => {
      user.leaderboard_position = startIndex + index + 1;
    });

    const result = {
      users: paginatedUsers,
      pagination: {
        current_page: currentPage,
        last_page: Math.ceil(combinedUsers.length / perPage),
        total: combinedUsers.length,
      },
    };

    console.log("\n✅ [All Sponsors] Final Results:");
    console.log(`   Total unique builders: ${combinedUsers.length}`);
    console.log(`   Pagination: Page ${currentPage} of ${result.pagination.last_page}`);
    console.log(`   Users in this page: ${paginatedUsers.length}`);
    console.log(`   Total earnings across all builders: $${combinedUsers.reduce((sum, u) => sum + (u.totalEarningsUSD || 0), 0).toFixed(2)}`);
    console.log("🎉 [All Sponsors] fetchAllSponsors completed!\n");

    return result;
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && data && newPage <= data.pagination.last_page) {
      setPage(newPage);
    }
  };

  const filteredUsers = data?.users || [];
  const isAllSponsors = !filters.sponsor_slug;
  
  // Categorize builders and calculate MCAP (must be before early returns)
  const categories = useMemo(() => {
    if (!filteredUsers.length) return new Map<number, BuilderCategory>();
    // For all sponsors mode, use average token price or default
    const priceForMCAP = isAllSponsors ? 1 : (tokenPrice || 1);
    return categorizeBuilders(filteredUsers, priceForMCAP);
  }, [filteredUsers, tokenPrice, isAllSponsors]);

  // Get top builders for each category in specified order
  const topBuildersByCategory = useMemo(() => {
    if (!filteredUsers.length) return [];
    
    const priceForMCAP = isAllSponsors ? 1 : (tokenPrice || 1);
    const soughtAfter = getSoughtAfterBuilder(filteredUsers);
    const trending = getTrendingBuilder(filteredUsers);
    const highestScore = getHighestScore(filteredUsers);
    const featured = getFeaturedBuilder(filteredUsers, priceForMCAP);
    const mostEarnings = getMostEarnings(filteredUsers);
    
    // Return in specified order: sought after, trending, highest score, featured, most earnings
    return [
      { category: "sought_after" as BuilderCategory, builder: soughtAfter },
      { category: "trending" as BuilderCategory, builder: trending },
      { category: "highest_score" as BuilderCategory, builder: highestScore },
      { category: "featured" as BuilderCategory, builder: featured },
      { category: "most_earnings" as BuilderCategory, builder: mostEarnings },
    ].filter(item => item.builder !== null);
  }, [filteredUsers, tokenPrice, isAllSponsors]);


  if (loading && !data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-50 rounded mb-2 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (!data || data.users.length === 0) {
    // Show "search not found" if there's an active search query
    if (activeSearchQuery) {
      return (
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p className="mt-4 text-gray-500 text-center text-sm font-medium">
              Search not found
            </p>
            <p className="mt-2 text-gray-400 text-center text-xs">
              No builders found matching &quot;{activeSearchQuery}&quot;
            </p>
            <button
              onClick={handleClearSearch}
              className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Clear search
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
        <p className="text-gray-500 text-center text-sm">
          No leaderboard data available
        </p>
      </div>
    );
  }

  const handleViewProfile = (user: LeaderboardUser) => {
    setSelectedBuilder(user);
    setShowProfileModal(true);
  };

  const toggleEarningsBreakdown = (userId: number) => {
    setExpandedEarnings((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200">
      {/* Header Section */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Members
            </h3>
            <p className="text-xs text-gray-500">
              Display all the team members and essential details.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search..."
                className="w-64 pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                disabled={loading}
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {searchQuery && (
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {loading ? "Searching..." : "Search"}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          {activeSearchQuery && (
            <p className="text-xs text-gray-500">
              Showing {filteredUsers.length} of {data.pagination.total} builders
              {activeSearchQuery && ` • Searching for "${activeSearchQuery}"`}
            </p>
          )}
          {!activeSearchQuery && (
            <div className="flex items-center gap-4 text-xs flex-wrap">
              {Array.from(categories.entries()).map(([userId, category]) => {
                const user = filteredUsers.find(u => u.id === userId);
                if (!user) return null;
                return (
                  <div key={userId} className="flex items-center gap-1.5">
                    <TrophyIcon category={category} className="w-4 h-4" />
                    <span className="text-gray-600">
                      {getCategoryLabel(category)}: <span className="font-medium">{user.profile.display_name || user.profile.name}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top Builders by Category Table */}
      {!activeSearchQuery && topBuildersByCategory.length > 0 && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Top Builders by Category
            </h3>
            <p className="text-xs text-gray-500">
              Leading builders across different categories
            </p>
          </div>
          <div className="w-full">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[12%]" />
                <col className="w-[20%]" />
                <col className="w-[10%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[26%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Builder
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Earnings
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    MCAP
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topBuildersByCategory.map((item, idx) => {
                  const user = item.builder!;
                  const category = item.category!; // We filtered out null categories
                  const rewardAmount = typeof user.reward_amount === 'string' 
                    ? parseFloat(user.reward_amount) 
                    : user.reward_amount;
                  const priceForMCAP = isAllSponsors ? 1 : (tokenPrice || 0);
                  const mcap = priceForMCAP ? calculateMCAP(user, priceForMCAP) : 0;
                  
                  const categoryColors: Record<Exclude<BuilderCategory, null>, string> = {
                    sought_after: "bg-green-100 text-green-800 border-green-200",
                    trending: "bg-orange-100 text-orange-800 border-orange-200",
                    highest_score: "bg-blue-100 text-blue-800 border-blue-200",
                    featured: "bg-purple-100 text-purple-800 border-purple-200",
                    most_earnings: "bg-yellow-100 text-yellow-800 border-yellow-200",
                  };

                  return (
                    <motion.tr
                      key={`${category}-${user.id}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${categoryColors[category]}`}>
                          <TrophyIcon category={category} className="w-3 h-3" />
                          <span className="truncate">{getCategoryLabel(category)}</span>
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {user.profile.image_url ? (
                            <img
                              src={user.profile.image_url}
                              alt={user.profile.display_name || user.profile.name}
                              className="w-8 h-8 rounded-lg object-cover flex-shrink-0 shadow-sm"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                              <span className="text-xs font-medium text-gray-500">
                                {user.leaderboard_position}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {user.profile.display_name || user.profile.name || "Anonymous"}
                              </div>
                              {isAllSponsors && (user as UserWithEarningsBreakdown).sponsors && (user as UserWithEarningsBreakdown).sponsors!.length > 1 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 flex-shrink-0" title="Appears in multiple sponsors">
                                  Multi-Sponsor
                                </span>
                              )}
                            </div>
                            {user.profile.bio && (
                              <div className="text-xs text-gray-500 truncate">
                                {user.profile.bio}
                              </div>
                            )}
                            {isAllSponsors && (user as UserWithEarningsBreakdown).sponsors && (user as UserWithEarningsBreakdown).sponsors!.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {(user as UserWithEarningsBreakdown).sponsors!.map((sponsor) => (
                                  <span
                                    key={sponsor}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 capitalize"
                                    title={`Appears in ${sponsor.replace("-", " ")}`}
                                  >
                                    {sponsor.replace("-", " ")}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-semibold text-gray-900">
                          {user.profile.builder_score?.points !== undefined
                            ? formatNumber(user.profile.builder_score.points)
                            : "N/A"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {(() => {
                          const userWithBreakdown = user as UserWithEarningsBreakdown;
                          if (isAllSponsors && userWithBreakdown.totalEarningsUSD !== undefined) {
                            return (
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  ${formatNumber(userWithBreakdown.totalEarningsUSD)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Total (All Sponsors)
                                </div>
                              </div>
                            );
                          } else if (rewardAmount > 0 && tokenPrice && tokenInfo) {
                            return (
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  ${formatNumber(rewardAmount * tokenPrice)}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {formatNumber(rewardAmount)} {tokenInfo.symbol}
                                </div>
                              </div>
                            );
                          } else {
                            return <span className="text-sm text-gray-400">—</span>;
                          }
                        })()}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-semibold text-gray-900">
                          ${formatNumber(mcap)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          #{user.leaderboard_position}
                        </div>
                        {user.ranking_change !== 0 && (
                          <div className={`text-xs ${user.ranking_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {user.ranking_change > 0 ? '↑' : '↓'} {Math.abs(user.ranking_change)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {tokenPrice ? (
                          <div 
                            className="text-xs text-gray-600"
                            title={getCategoryReason(user, category, tokenPrice)}
                          >
                            <div className="truncate" title={getCategoryReason(user, category, tokenPrice)}>
                              {getCategoryReason(user, category, tokenPrice)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Loading...</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Leaderboard Table */}
      <div className="overflow-x-auto rounded-xl">
        <table className="w-full rounded-xl overflow-hidden">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <span>Member Name</span>
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <span>Score</span>
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <span>Earnings</span>
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <span>Rank Change</span>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <span>MCAP</span>
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <span>Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.users.map((user, idx) => {
              const rewardAmount = typeof user.reward_amount === 'string' 
                ? parseFloat(user.reward_amount) 
                : user.reward_amount;
              
              const category = categories.get(user.id) || null;
              // For all sponsors, use totalEarningsUSD as the base for MCAP calculation
              const priceForMCAP = isAllSponsors 
                ? 1 // USD already calculated, so use 1 as multiplier
                : (tokenPrice || 0);
              const mcap = priceForMCAP ? calculateMCAP(user, priceForMCAP) : 0;

              return (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-4">
                    <div className="text-sm font-semibold text-gray-600">
                      {user.leaderboard_position || ((data.pagination.current_page - 1) * 30 + idx + 1)}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 min-w-0">
                      {user.profile.image_url ? (
                        <img
                          src={user.profile.image_url}
                          alt={user.profile.display_name || user.profile.name}
                          className="w-8 h-8 rounded-lg object-cover flex-shrink-0 shadow-sm"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <span className="text-xs font-medium text-gray-500">
                            {user.leaderboard_position}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {user.profile.display_name || user.profile.name || "Anonymous"}
                            </p>
                            {category && (
                              <div className="flex items-center gap-1 flex-shrink-0" title={getCategoryLabel(category)}>
                                <TrophyIcon category={category} className="w-4 h-4" />
                              </div>
                            )}
                            {isAllSponsors && (user as UserWithEarningsBreakdown).sponsors && (user as UserWithEarningsBreakdown).sponsors!.length > 1 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 flex-shrink-0" title="Appears in multiple sponsors">
                                Multi-Sponsor
                              </span>
                            )}
                            {user.profile.human_checkmark && (
                              <span className="text-blue-500 text-xs flex-shrink-0" title="Verified">✓</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {user.profile.bio || user.profile.location || "No description"}
                          </p>
                          {user.profile.location && (
                            <p className="text-xs text-gray-400 truncate">
                              {user.profile.location}
                            </p>
                          )}
                          {isAllSponsors && (user as UserWithEarningsBreakdown).sponsors && (user as UserWithEarningsBreakdown).sponsors!.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {(user as UserWithEarningsBreakdown).sponsors!.map((sponsor) => (
                                <span
                                  key={sponsor}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 capitalize"
                                  title={`Appears in ${sponsor.replace("-", " ")}`}
                                >
                                  {sponsor.replace("-", " ")}
                                </span>
                              ))}
                            </div>
                          )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-semibold text-gray-900">
                      {user.profile.builder_score?.points !== undefined
                        ? formatNumber(user.profile.builder_score.points)
                        : "N/A"}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {(() => {
                      const userWithBreakdown = user as UserWithEarningsBreakdown;
                      const isExpanded = expandedEarnings.has(user.id);
                      
                      if (isAllSponsors && userWithBreakdown.totalEarningsUSD !== undefined) {
                        // All sponsors mode - show total USD and breakdown
                        return (
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              ${formatNumber(userWithBreakdown.totalEarningsUSD)}
                            </div>
                            {userWithBreakdown.earningsBreakdown && userWithBreakdown.earningsBreakdown.length > 0 && (
                              <div className="mt-1">
                                <button
                                  onClick={() => toggleEarningsBreakdown(user.id)}
                                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                >
                                  {isExpanded ? "Hide" : "Show"} Breakdown
                                  <svg
                                    className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                {isExpanded && (
                                  <div className="mt-2 space-y-1.5 bg-gray-50 rounded-lg p-2 border border-gray-200">
                                    {userWithBreakdown.earningsBreakdown.map((breakdown, idx) => {
                                      // Calculate running total up to this point
                                      const runningTotal = userWithBreakdown.earningsBreakdown!
                                        .slice(0, idx + 1)
                                        .reduce((sum, item) => sum + item.amountUSD, 0);
                                      
                                      return (
                                        <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-gray-200 last:border-b-0">
                                          <div className="flex-1">
                                            <span className="text-gray-600 capitalize font-medium">
                                              {breakdown.sponsor.replace("-", " ")}:
                                            </span>
                                            <div className="text-gray-500 mt-0.5">
                                              {formatNumber(breakdown.amount)} {breakdown.tokenSymbol} × ${formatNumber(breakdown.amountUSD / breakdown.amount || 0)} = ${formatNumber(breakdown.amountUSD)}
                                            </div>
                                          </div>
                                          <div className="text-right ml-2">
                                            <div className="font-medium text-gray-900">
                                              ${formatNumber(breakdown.amountUSD)}
                                            </div>
                                            {idx < userWithBreakdown.earningsBreakdown!.length - 1 && (
                                              <div className="text-gray-400 text-xs mt-0.5">
                                                + {idx === 0 ? '' : '... + '}
                                              </div>
                                            )}
                                            {idx === userWithBreakdown.earningsBreakdown!.length - 1 && (
                                              <div className="text-blue-600 font-semibold text-xs mt-1 pt-1 border-t border-gray-300">
                                                = ${formatNumber(runningTotal)}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      } else if (rewardAmount > 0) {
                        // Single sponsor mode
                        return (
                          <div>
                            {tokenPrice !== null && tokenInfo ? (
                              <>
                                <div className="text-sm font-semibold text-gray-900">
                                  ${formatNumber(rewardAmount * tokenPrice)}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {formatNumber(rewardAmount)} {tokenInfo.symbol}
                                </div>
                              </>
                            ) : (
                              <div className="text-sm font-semibold text-gray-900">
                                {formatNumber(rewardAmount)} {tokenInfo?.symbol || "TOKEN"}
                              </div>
                            )}
                          </div>
                        );
                      } else {
                        return <span className="text-sm text-gray-400">—</span>;
                      }
                    })()}
                  </td>
                  <td className="px-4 py-4">
                    {user.ranking_change !== 0 ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.ranking_change > 0
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {user.ranking_change > 0 ? "↑" : "↓"} {Math.abs(user.ranking_change)}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-semibold text-gray-900">
                      ${formatNumber(mcap)}
                    </div>
                    {category && (
                      <div className="text-xs text-gray-500 truncate">
                        {getCategoryLabel(category)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => handleViewProfile(user)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      View Profile
                    </button>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Infinite Scroll Load More Trigger */}
      {!filters.sponsor_slug && (allSponsorsHasMore || (data && displayedCount < allSponsorsAggregatedUsers.length)) && (
        <div
          id="load-more-trigger"
          className="h-20 flex items-center justify-center"
        >
          {loadingMore ? (
            <div className="flex items-center gap-2 text-gray-500">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
              <span className="text-sm">Loading more builders...</span>
            </div>
          ) : (
            <button
              onClick={() => {
                // Apply search filter if active
                let filteredUsers = allSponsorsAggregatedUsers;
                if (activeSearchQuery) {
                  const searchLower = activeSearchQuery.toLowerCase();
                  filteredUsers = allSponsorsAggregatedUsers.filter((user) => {
                    const name = (user.profile.display_name || user.profile.name || '').toLowerCase();
                    const bio = (user.profile.bio || '').toLowerCase();
                    const wallet = (user.recipient_wallet || '').toLowerCase();
                    return name.includes(searchLower) || bio.includes(searchLower) || wallet.includes(searchLower);
                  });
                }

                // If we have more loaded data to show, just increase display count
                if (displayedCount < filteredUsers.length) {
                  const newDisplayedCount = Math.min(displayedCount + 30, filteredUsers.length);
                  setDisplayedCount(newDisplayedCount);
                  // Update displayed users in data
                  const newDisplayedUsers = filteredUsers.slice(0, newDisplayedCount);
                  newDisplayedUsers.forEach((user, index) => {
                    user.leaderboard_position = index + 1;
                  });
                  setData({
                    users: newDisplayedUsers,
                    pagination: {
                      current_page: 1,
                      last_page: Math.ceil(filteredUsers.length / 30),
                      total: filteredUsers.length,
                    },
                  });
                } else {
                  // Need to fetch more data from API
                  fetchLeaderboard({ 
                    ...filters, 
                    page: 1,
                    search: activeSearchQuery || undefined,
                  }, true);
                }
              }}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              {(() => {
                // Apply search filter to determine available count
                let filteredUsers = allSponsorsAggregatedUsers;
                if (activeSearchQuery) {
                  const searchLower = activeSearchQuery.toLowerCase();
                  filteredUsers = allSponsorsAggregatedUsers.filter((user) => {
                    const name = (user.profile.display_name || user.profile.name || '').toLowerCase();
                    const bio = (user.profile.bio || '').toLowerCase();
                    const wallet = (user.recipient_wallet || '').toLowerCase();
                    return name.includes(searchLower) || bio.includes(searchLower) || wallet.includes(searchLower);
                  });
                }
                return displayedCount < filteredUsers.length 
                  ? `Show More (${Math.min(30, filteredUsers.length - displayedCount)} more)` 
                  : "Load More";
              })()}
            </button>
          )}
        </div>
      )}

      {/* Pagination (only for single sponsor mode) */}
      {filters.sponsor_slug && data.pagination.last_page > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {data.pagination.current_page} of {data.pagination.last_page}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(1)}
              disabled={page === 1 || loading}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ««
            </button>
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1 || loading}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ‹
            </button>
            {Array.from({ length: Math.min(5, data.pagination.last_page) }, (_, i) => {
              let pageNum;
              if (data.pagination.last_page <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= data.pagination.last_page - 2) {
                pageNum = data.pagination.last_page - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  disabled={loading}
                  className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                    pageNum === page
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            {data.pagination.last_page > 5 && page < data.pagination.last_page - 2 && (
              <span className="px-2 text-sm text-gray-500">...</span>
            )}
            {data.pagination.last_page > 5 && (
              <button
                onClick={() => handlePageChange(data.pagination.last_page)}
                disabled={loading}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {data.pagination.last_page}
              </button>
            )}
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === data.pagination.last_page || loading}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ›
            </button>
            <button
              onClick={() => handlePageChange(data.pagination.last_page)}
              disabled={page === data.pagination.last_page || loading}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              »»
            </button>
          </div>
        </div>
      )}
      </div>

      {selectedBuilder && (
        <BuilderProfileModal
          builder={selectedBuilder}
          isOpen={showProfileModal}
          onClose={() => {
            setShowProfileModal(false);
            setSelectedBuilder(null);
          }}
        />
      )}
    </>
  );
}
