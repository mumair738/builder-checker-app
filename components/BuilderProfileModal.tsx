"use client";

import { useState, useEffect } from "react";
import { getBuilderAcrossSponsors } from "@/lib/builderscore-api";
import { getTokenPrice } from "@/lib/coingecko-api";
import type { LeaderboardUser } from "@/types/talent";
import { formatNumber } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface BuilderProfileModalProps {
  builder: LeaderboardUser;
  isOpen: boolean;
  onClose: () => void;
}

interface SponsorData {
  sponsor: string;
  position: number;
  earnings: number;
  earningsUSD: number;
  tokenSymbol: string;
}

export function BuilderProfileModal({ builder, isOpen, onClose }: BuilderProfileModalProps) {
  const [sponsorData, setSponsorData] = useState<SponsorData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && builder) {
      fetchSponsorData();
    }
  }, [isOpen, builder]);

  const fetchSponsorData = async () => {
    setLoading(true);
    try {
      const results = await getBuilderAcrossSponsors(builder.id);
      
      const data = await Promise.all(
        results.map(async (result) => {
          if (!result.data || result.data.users.length === 0) return null;
          
          const user = result.data.users[0];
          const rewardAmount = typeof user.reward_amount === 'string' 
            ? parseFloat(user.reward_amount) 
            : user.reward_amount;
          
          const { price, tokenInfo } = await getTokenPrice(result.sponsor);
          
          return {
            sponsor: result.sponsor,
            position: user.leaderboard_position,
            earnings: rewardAmount,
            earningsUSD: rewardAmount * price,
            tokenSymbol: tokenInfo?.symbol || "TOKEN",
          };
        })
      );
      
      setSponsorData(data.filter((item): item is SponsorData => item !== null));
    } catch (error) {
      console.error("Error fetching sponsor data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSponsorLabel = (slug: string): string => {
    const labels: Record<string, string> = {
      walletconnect: "WalletConnect",
      celo: "Celo",
      base: "Base",
      "base-summer": "Base Summer",
      syndicate: "Syndicate",
      "talent-protocol": "Talent Protocol",
    };
    return labels[slug] || slug;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        >
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {builder.profile.display_name || builder.profile.name || "Anonymous"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">Multi-Sponsor Profile</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-sm text-gray-500 mt-4">Loading sponsor data...</p>
              </div>
            ) : sponsorData.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No data found across sponsors</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sponsorData.map((data) => (
                    <div
                      key={data.sponsor}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">
                          {getSponsorLabel(data.sponsor)}
                        </h3>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                          #{data.position}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-500">Earnings</p>
                          <p className="text-lg font-semibold text-gray-900">
                            ${formatNumber(data.earningsUSD)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatNumber(data.earnings)} {data.tokenSymbol}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Leaderboard Position</p>
                          <p className="text-sm font-medium text-gray-700">
                            #{data.position}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

