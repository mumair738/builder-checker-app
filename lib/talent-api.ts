import type {
  BuilderScore,
  BuilderProfile,
  SearchFilters,
  SearchResponse,
} from "@/types/talent";

// Use Next.js API route as proxy for security
const API_BASE = "/api/talent";

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

export async function getBuilderScore(address: string): Promise<BuilderScore> {
  try {
    // Talent Protocol API uses /score endpoint with id query parameter
    // API returns: { score: { points: number, rank_position: number, ... } }
    // We transform it to match our BuilderScore type: { score: number, rank?: number, ... }
    const response = await fetchAPI<{ score: { points: number; rank_position: number; last_calculated_at: string; slug: string } }>(`/score?id=${encodeURIComponent(address)}`);
    
    return {
      score: response.score.points,
      rank: response.score.rank_position,
      updatedAt: response.score.last_calculated_at,
    };
  } catch (error) {
    console.error("Error fetching builder score:", error);
    throw error;
  }
}

export async function getBuilderProfile(address: string): Promise<BuilderProfile | null> {
  try {
    // Note: Profile endpoint may not be available in Talent Protocol API
    // The /score endpoint works, but profile endpoints need to be verified
    // Returning null for now until the correct endpoint is found
    // TODO: Check Talent Protocol API docs for correct profile endpoint
    console.warn("Profile endpoint not yet implemented - returning null");
    return null;
  } catch (error) {
    console.error("Error fetching builder profile:", error);
    return null;
  }
}

export async function searchBuilders(
  filters: SearchFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<SearchResponse> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    if (filters.address) params.append("address", filters.address);
    if (filters.ensName) params.append("ensName", filters.ensName);
    if (filters.minScore !== undefined) params.append("minScore", filters.minScore.toString());
    if (filters.maxScore !== undefined) params.append("maxScore", filters.maxScore.toString());
    if (filters.skills?.length) params.append("skills", filters.skills.join(","));
    if (filters.credentials?.length) params.append("credentials", filters.credentials.join(","));

    return await fetchAPI<SearchResponse>(`/builders/search?${params.toString()}`);
  } catch (error) {
    console.error("Error searching builders:", error);
    throw error;
  }
}

