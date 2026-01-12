import type {
  LeaderboardResponse,
  LeaderboardFilters,
} from "@/types/talent";

/* ============================
   Config
============================ */

// Next.js API route proxy (security boundary)
const API_BASE = "/api/builderscore";

/* ============================
   Core Fetch Helper
============================ */

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
    let errorMessage = "API request failed";

    try {
      const error = await response.json();
      errorMessage = error.error || error.message || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }

    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

/* ============================
   Leaderboard Fetch
============================ */

export async function getLeaderboard(
  filters: LeaderboardFilters = {}
): Promise<LeaderboardResponse> {
  const params = new URLSearchParams();

  if (filters.per_page !== undefined) {
    params.set("per_page", filters.per_page.toString());
  }
  if (filters.page !== undefined) {
    params.set("page", filters.page.toString());
  }
  if (filters.sponsor_slug) {
    params.set("sponsor_slug", filters.sponsor_slug);
  }
  if (filters.grant_id !== undefined) {
    params.set("grant_id", filters.grant_id.toString());
  }
  if (filters.search) {
    params.set("search", filters.search);
  }

  const queryString = params.toString();

  return fetchAPI<LeaderboardResponse>(
    `/leaderboards${queryString ? `?${queryString}` : ""}`
  );
}

/* ============================
   Cross-Sponsor Builder Lookup
============================ */

/**
