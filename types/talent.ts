// Talent Protocol API Types

export interface BuilderScore {
  score: number;
  rank?: number;
  percentile?: number;
  dataPoints?: DataPoint[];
  credentials?: Credential[];
  skills?: Skill[];
  updatedAt?: string;
}

export interface DataPoint {
  id: string;
  source: string;
  type: string;
  value: number;
  verified: boolean;
  createdAt: string;
}

export interface Credential {
  id: string;
  name: string;
  issuer: string;
  description?: string;
  verified: boolean;
  issuedAt?: string;
}

export interface Skill {
  id: string;
  name: string;
  category?: string;
  level?: number;
}

export interface BuilderProfile {
  address: string;
  ensName?: string;
  score: BuilderScore;
  profile?: {
    name?: string;
    bio?: string;
    avatar?: string;
    website?: string;
    twitter?: string;
    github?: string;
  };
}

export interface SearchFilters {
  address?: string;
  ensName?: string;
  minScore?: number;
  maxScore?: number;
  skills?: string[];
  credentials?: string[];
}

export interface SearchResult {
  address: string;
  ensName?: string;
  score: number;
  profile?: BuilderProfile['profile'];
  credentials?: Credential[];
  skills?: Skill[];
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// BuilderScore API Types (builderscore.xyz)
export interface LeaderboardUser {
  id: number;
  distributed_at: string | null;
  hall_of_fame: boolean;
  leaderboard_position: number;
  profile: UserProfile;
  ranking_change: number;
  recipient_wallet: string | null;
  reward_amount: number | string; // API returns as string, but we'll parse it
  reward_transaction_hash: string | null;
  summary: string | null;
}

export interface UserProfile {
  bio: string | null;
  builder_score: Score;
  calculating_score: boolean;
  created_at: string;
  display_name: string;
  human_checkmark: boolean;
  id: string;
  image_url: string;
  location: string | null;
  name: string;
  scores: Score[];
  tags: string[];
  talent_protocol_id: number | null;
  verified_nationality: boolean;
}

export interface Score {
  last_calculated_at: string;
  points: number;
  rank_position: number | null;
  slug: string;
}

export interface LeaderboardResponse {
  users: LeaderboardUser[];
  pagination: Pagination;
}

export interface Pagination {
  current_page: number;
  last_page: number;
  total: number;
}

export interface LeaderboardFilters {
  per_page?: number;
  page?: number;
  sponsor_slug?: string;
  grant_id?: number;
  search?: string;
}

