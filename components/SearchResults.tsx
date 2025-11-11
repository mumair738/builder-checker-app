"use client";

import { useState, useEffect } from "react";
import { searchBuilders } from "@/lib/talent-api";
import type { SearchFilters, SearchResult } from "@/types/talent";
import { formatAddress, formatScore } from "@/lib/utils";
import { motion } from "framer-motion";

interface SearchResultsProps {
  filters: SearchFilters;
}

export function SearchResults({ filters }: SearchResultsProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setPage(1);
    setResults([]);
    performSearch(filters, 1);
  }, [JSON.stringify(filters)]);

  const performSearch = async (searchFilters: SearchFilters, pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await searchBuilders(searchFilters, pageNum, 20);
      if (pageNum === 1) {
        setResults(response.results);
      } else {
        setResults((prev) => [...prev, ...response.results]);
      }
      setHasMore(response.hasMore);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search builders");
      console.error("Error searching builders:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      performSearch(filters, nextPage);
    }
  };

  if (loading && results.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-white rounded-xl border-2 border-gray-200 shadow-md animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </motion.div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-red-50 rounded-xl border-2 border-red-200 shadow-sm"
      >
        <p className="text-red-600 font-medium">{error}</p>
        <p className="text-sm text-red-500 mt-2">
          Note: API key may need to be configured
        </p>
      </motion.div>
    );
  }

  if (results.length === 0 && !loading) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-8 bg-white rounded-xl border-2 border-gray-200 shadow-sm"
      >
        <p className="text-gray-600 text-center text-lg">
          No builders found. Try adjusting your search filters.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {total > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-gray-600 font-medium mb-4"
        >
          Found {total} builder{total !== 1 ? "s" : ""}
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((result, idx) => (
          <motion.div
            key={result.address}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="p-6 bg-white rounded-xl border-2 border-gray-200 shadow-md hover:shadow-lg transition-all"
          >
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {result.profile?.name || result.ensName || formatAddress(result.address)}
              </h3>
              <p className="text-sm font-mono text-gray-500">
                {result.ensName ? result.address : formatAddress(result.address)}
              </p>
            </div>

            <div className="mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {formatScore(result.score)}
                </span>
                <span className="text-xs text-gray-500">score</span>
              </div>
            </div>

            {result.profile?.bio && (
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {result.profile.bio}
              </p>
            )}

            {result.skills && result.skills.length > 0 && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-1">
                  {result.skills.slice(0, 3).map((skill) => (
                    <span
                      key={skill.id}
                      className="px-2 py-1 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 rounded-full text-xs font-medium border border-green-200"
                    >
                      {skill.name}
                    </span>
                  ))}
                  {result.skills.length > 3 && (
                    <span className="px-2 py-1 text-gray-500 text-xs">
                      +{result.skills.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {result.credentials && result.credentials.length > 0 && (
              <div>
                <div className="flex flex-wrap gap-1">
                  {result.credentials.slice(0, 2).map((cred) => (
                    <span
                      key={cred.id}
                      className="px-2 py-1 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200"
                    >
                      {cred.name}
                    </span>
                  ))}
                  {result.credentials.length > 2 && (
                    <span className="px-2 py-1 text-gray-500 text-xs">
                      +{result.credentials.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadMore}
            disabled={loading}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
          >
            {loading ? "Loading..." : "Load More"}
          </motion.button>
        </div>
      )}
    </div>
  );
}


