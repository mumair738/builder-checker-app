import type {
  LeaderboardResponse,
  LeaderboardFilters,
} from "@/types/talent";

// Use Next.js API route as proxy for security
const API_BASE = "/api/builderscore";

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const params = new URLSearchParams({ endpoint });
  const url = `${API_BASE}?${params.toString()}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "API request failed" }));
    throw new Error(error.error || error.message || `API error: ${response.statusText}`);
  }

  return response.json();
}

export async function getLeaderboard(
  filters: LeaderboardFilters = {}
): Promise<LeaderboardResponse> {
  try {
    const params = new URLSearchParams();
    
    if (filters.per_page !== undefined) {
      params.append("per_page", filters.per_page.toString());
    }
    if (filters.page !== undefined) {
      params.append("page", filters.page.toString());
    }
    if (filters.sponsor_slug) {
      params.append("sponsor_slug", filters.sponsor_slug);
    }
    if (filters.grant_id !== undefined) {
      params.append("grant_id", filters.grant_id.toString());
    }
    if (filters.search) {
      params.append("search", filters.search);
    }

    const queryString = params.toString();
    return await fetchAPI<LeaderboardResponse>(
      `/leaderboards${queryString ? `?${queryString}` : ""}`
    );
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    throw error;
  }
}

/**
 * Fetch builder data across multiple sponsors
 */
export async function getBuilderAcrossSponsors(
  builderId: number,
  sponsorSlugs: string[] = ["walletconnect", "celo", "base", "base-summer", "syndicate", "talent-protocol"]
): Promise<Array<{ sponsor: string; data: LeaderboardResponse | null }>> {
  try {
    const results = await Promise.allSettled(
      sponsorSlugs.map(async (sponsor) => {
        // Search for the builder in each sponsor's leaderboard
        const filters: LeaderboardFilters = {
          sponsor_slug: sponsor,
          per_page: 100,
          page: 1,
        };
        
        const response = await getLeaderboard(filters);
        
        // Find the builder in the results
        const builder = response.users.find((u) => u.id === builderId);
        
        if (builder) {
          return {
            sponsor,
            data: {
              users: [builder],
              pagination: response.pagination,
            } as LeaderboardResponse,
          };
        }
        
        return { sponsor, data: null };
      })
    );

    return results
      .filter((result): result is PromiseFulfilledResult<{ sponsor: string; data: LeaderboardResponse | null }> => 
        result.status === "fulfilled"
      )
      .map((result) => result.value)
      .filter((item) => item.data !== null);
  } catch (error) {
    console.error("Error fetching builder across sponsors:", error);
    return [];
  }
}


