"use client";

import { useState, useEffect } from "react";
import {
  getGitHubUser,
  getGitHubCommits,
  getGitHubStats,
} from "@/lib/github-api";
import type { GitHubCommit, GitHubStats } from "@/lib/github-api";
import { motion } from "framer-motion";

interface GitHubActivityProps {
  username?: string;
}

export function GitHubActivity({ username }: GitHubActivityProps) {
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [stats, setStats] = useState<GitHubStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (username) {
      fetchGitHubData();
    }
  }, [username]);

  const fetchGitHubData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [commitsData, statsData] = await Promise.all([
        getGitHubCommits(username!, 10),
        getGitHubStats(username!),
      ]);
      setCommits(commitsData);
      setStats(statsData);
    } catch (err) {
      setError("Failed to load GitHub data");
      console.error("Error fetching GitHub data:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (!username) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border border-gray-200/50"
      >
        <p className="text-gray-500 text-center py-8">
          GitHub username not provided
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border border-gray-200/50"
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          💻 GitHub Activity
        </h3>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin">
              <div className="w-6 h-6 border-3 border-accent border-t-transparent rounded-full"></div>
            </div>
            <p className="text-gray-600 mt-2">Loading GitHub data...</p>
          </div>
        ) : error ? (
          <p className="text-center text-red-500 py-8">{error}</p>
        ) : (
          <>
            {stats && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-lg p-4 border border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Repositories</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalRepos}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Followers</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.followers}
                  </p>
                </div>
                {Object.keys(stats.languages).length > 0 && (
                  <div className="col-span-2 bg-white rounded-lg p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">Languages</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(stats.languages)
                        .slice(0, 5)
                        .map(([lang, count]) => (
                          <span
                            key={lang}
                            className="text-xs bg-accent/10 text-accent px-2 py-1 rounded"
                          >
                            {lang} ({count})
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">
                Recent Commits
              </p>
              {commits.length > 0 ? (
                commits.map((commit, idx) => (
                  <motion.a
                    key={commit.sha}
                    href={commit.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="block p-3 bg-white rounded-lg border border-gray-100 hover:border-accent/30 transition-colors"
                  >
                    <p className="text-sm text-gray-900 font-medium truncate">
                      {commit.message.split("\n")[0]}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        {commit.repoName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(commit.date)}
                      </span>
                    </div>
                  </motion.a>
                ))
              ) : (
                <p className="text-center text-gray-500 py-4">
                  No recent commits found
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
