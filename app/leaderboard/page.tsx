"use client";

import { useState } from "react";
import { WalletButton } from "@/components/WalletButton";
import { Leaderboard } from "@/components/Leaderboard";
import { LeaderboardFilters } from "@/components/LeaderboardFilters";
import type { LeaderboardFilters as LeaderboardFiltersType } from "@/types/talent";
import Link from "next/link";

export default function LeaderboardPage() {
  const [filters, setFilters] = useState<LeaderboardFiltersType>({
    per_page: 20,
    page: 1,
    sponsor_slug: process.env.NEXT_PUBLIC_DEFAULT_SPONSOR_SLUG || undefined,
    grant_id: process.env.NEXT_PUBLIC_DEFAULT_GRANT_ID
      ? Number(process.env.NEXT_PUBLIC_DEFAULT_GRANT_ID)
      : undefined,
  });
  const [loading, setLoading] = useState(false);

  const handleFilterChange = (newFilters: LeaderboardFiltersType) => {
    setFilters({ ...newFilters, page: 1 }); // Reset to page 1 when filters change
    setLoading(true);
    setTimeout(() => setLoading(false), 100);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="mx-[200px] px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">
              Builder Score
            </h1>
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Home
              </Link>
              <Link
                href="/search"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Search
              </Link>
              <WalletButton />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-[200px] px-6 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-3xl font-bold text-gray-900">
              Leaderboard
            </h2>
          </div>
          <p className="text-sm text-gray-500">
            Top builders ranked by their onchain reputation score
          </p>
        </div>

        <div className="mb-6">
          <LeaderboardFilters
            onFilterChange={handleFilterChange}
            loading={loading}
            initialFilters={filters}
          />
        </div>

        <Leaderboard filters={filters} />
      </main>
    </div>
  );
}

