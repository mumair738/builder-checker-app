"use client";

import { useState, useEffect } from "react";
import type { LeaderboardFilters } from "@/types/talent";
import { motion } from "framer-motion";

// Sponsor slugs - ordered list
const SPONSOR_SLUGS = [
  { value: "all", label: "All Sponsors" },
  { value: "walletconnect", label: "WalletConnect" },
  { value: "celo", label: "Celo" },
  { value: "base", label: "Base" },
  { value: "base-summer", label: "Base Summer" },
  { value: "syndicate", label: "Syndicate" },
  { value: "talent-protocol", label: "Talent Protocol" },
];

// Grant IDs by sponsor and duration
const GRANT_IDS: Record<string, { thisWeek: number; lastWeek: number }> = {
  walletconnect: { thisWeek: 710, lastWeek: 704 },
  celo: { thisWeek: 716, lastWeek: 291 },
};

interface LeaderboardFiltersProps {
  onFilterChange: (filters: LeaderboardFilters) => void;
  loading?: boolean;
  initialFilters?: LeaderboardFilters;
}

export function LeaderboardFilters({
  onFilterChange,
  loading,
  initialFilters = {},
}: LeaderboardFiltersProps) {
  const [sponsorSlug, setSponsorSlug] = useState(initialFilters.sponsor_slug || "");
  const [grantDuration, setGrantDuration] = useState<"thisWeek" | "lastWeek" | "allTime">("thisWeek");

  // Auto-set grant ID based on sponsor and duration (controlled from code)
  useEffect(() => {
    if (sponsorSlug && GRANT_IDS[sponsorSlug]) {
      // Grant ID is automatically determined by sponsor and duration
      // No need to store it in state, it's calculated when applying filters
    }
  }, [sponsorSlug, grantDuration]);

  const handleSponsorSlugChange = (value: string) => {
    setSponsorSlug(value);
    // If "all" sponsors selected, force "allTime" duration
    if (value === "all") {
      setGrantDuration("allTime");
    } else if (value && GRANT_IDS[value]) {
      // Reset to "thisWeek" when sponsor changes (if it has grant IDs)
      setGrantDuration("thisWeek");
    } else {
      // For sponsors without grant IDs, default to "allTime"
      setGrantDuration("allTime");
    }
  };

  const handleGrantDurationChange = (value: "thisWeek" | "lastWeek" | "allTime") => {
    setGrantDuration(value);
  };

  const handleApplyFilters = () => {
    const filters: LeaderboardFilters = {
      page: 1,
    };

    // Handle "all sponsors" - don't set sponsor_slug, only works with allTime
    if (sponsorSlug === "all") {
      // For "all sponsors", don't set sponsor_slug (API will return all)
      // Only works with "allTime" (no grant_id)
      if (grantDuration !== "allTime") {
        // Force allTime if somehow not set
        setGrantDuration("allTime");
      }
      // grant_id is undefined (not set) for all sponsors
    } else if (sponsorSlug) {
      filters.sponsor_slug = sponsorSlug;
      // Auto-set grant ID based on sponsor and duration (controlled from code)
      // All time has no grant_id
      if (GRANT_IDS[sponsorSlug] && grantDuration !== "allTime") {
        filters.grant_id = GRANT_IDS[sponsorSlug][grantDuration];
      }
    }

    onFilterChange(filters);
  };

  const handleClear = () => {
    setSponsorSlug("");
    setGrantDuration("allTime");
    onFilterChange({ page: 1 });
  };

  const hasFilters = sponsorSlug;
  const currentGrantId = sponsorSlug && GRANT_IDS[sponsorSlug] && grantDuration !== "allTime"
    ? GRANT_IDS[sponsorSlug][grantDuration] 
    : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Sponsor
          </label>
          <div className="flex flex-wrap gap-2">
            {SPONSOR_SLUGS.map((sponsor) => (
              <button
                key={sponsor.value}
                type="button"
                onClick={() => handleSponsorSlugChange(sponsor.value)}
                className={`px-4 py-2 text-sm font-medium rounded-full border transition-all ${
                  sponsorSlug === sponsor.value
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {sponsor.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Duration
          </label>
          {sponsorSlug ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleGrantDurationChange("allTime")}
                disabled={sponsorSlug === "all"}
                className={`px-4 py-2 text-sm font-medium rounded-full border transition-all ${
                  grantDuration === "allTime"
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : sponsorSlug === "all"
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                All Time
              </button>
              {sponsorSlug !== "all" && GRANT_IDS[sponsorSlug] && (
                <>
                  <button
                    type="button"
                    onClick={() => handleGrantDurationChange("thisWeek")}
                    className={`px-4 py-2 text-sm font-medium rounded-full border transition-all ${
                      grantDuration === "thisWeek"
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    This Week
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGrantDurationChange("lastWeek")}
                    className={`px-4 py-2 text-sm font-medium rounded-full border transition-all ${
                      grantDuration === "lastWeek"
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    Last Week
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-400">
              Select a sponsor to see duration options
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        {hasFilters && (
          <button
            type="button"
            onClick={handleClear}
            disabled={loading}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded-xl transition-colors"
          >
            Clear
          </button>
        )}
        <button
          type="button"
          onClick={handleApplyFilters}
          disabled={loading}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors shadow-sm"
        >
          {loading ? "Applying..." : "Apply"}
        </button>
      </div>
    </div>
  );
}

