import type {
  BuilderScore,
  BuilderProfile,
  SearchFilters,
  SearchResponse,
} from "@/types/talent";

/* ============================
   Config
============================ */

// Next.js API route proxy (security boundary)
const API_BASE = "/api/talent";

/* ============================
   Core Fetch Helper
============================ */

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const params = new URLSearchParams({ endpoint });
