"use client";

import { useState, useEffect } from "react";
import {
  getLensProfile,
  getENSName,
  getENSRecords,
} from "@/lib/lens-ens-api";
import type { LensProfile, ENSRecord } from "@/lib/lens-ens-api";
import { motion } from "framer-motion";

interface SocialIdentityProps {
  address: string;
}

export function SocialIdentity({ address }: SocialIdentityProps) {
  const [lensProfile, setLensProfile] = useState<LensProfile | null>(null);
  const [ensName, setEnsName] = useState<string | null>(null);
  const [ensRecords, setEnsRecords] = useState<ENSRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (address) {
      fetchSocialData();
    }
  }, [address]);

  const fetchSocialData = async () => {
    setLoading(true);
    try {
      const [lens, ens] = await Promise.all([
        getLensProfile(address),
        getENSName(address),
      ]);

      setLensProfile(lens);
      setEnsName(ens);

      if (ens) {
        const ensData = await getENSRecords(ens);
        setEnsRecords(ensData);
      }
    } catch (error) {
      console.error("Error fetching social data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border border-gray-200/50"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        🌐 Social Identity
      </h3>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin">
            <div className="w-6 h-6 border-3 border-accent border-t-transparent rounded-full"></div>
          </div>
          <p className="text-gray-600 mt-2">Loading social profiles...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* ENS Section */}
          {ensName || ensRecords ? (
            <div className="bg-white rounded-lg p-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🏷️</span>
                <h4 className="font-semibold text-gray-900">ENS Profile</h4>
              </div>
              {ensName && (
                <p className="text-sm text-accent font-mono mb-2">{ensName}</p>
              )}
              {ensRecords && (
                <div className="space-y-2 text-sm">
                  {ensRecords.description && (
                    <p className="text-gray-600">{ensRecords.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {ensRecords.github && (
                      <a
                        href={`https://github.com/${ensRecords.github}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline"
                      >
                        GitHub
                      </a>
                    )}
                    {ensRecords.twitter && (
                      <a
                        href={`https://twitter.com/${ensRecords.twitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline"
                      >
                        Twitter
                      </a>
                    )}
                    {ensRecords.website && (
                      <a
                        href={ensRecords.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline"
                      >
                        Website
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg p-4 border border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏷️</span>
                <p className="text-sm text-gray-500">No ENS name found</p>
              </div>
            </div>
          )}

          {/* Lens Section */}
          {lensProfile ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg p-4 border border-gray-100"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🔷</span>
                <h4 className="font-semibold text-gray-900">Lens Profile</h4>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-accent font-mono">@{lensProfile.handle}</p>
                {lensProfile.displayName && (
                  <p className="text-gray-900 font-medium">
                    {lensProfile.displayName}
                  </p>
                )}
                {lensProfile.bio && (
                  <p className="text-gray-600">{lensProfile.bio}</p>
                )}
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="bg-accent/5 rounded p-2 text-center">
                    <p className="text-xs text-gray-500">Followers</p>
                    <p className="font-semibold text-accent">
                      {lensProfile.followers}
                    </p>
                  </div>
                  <div className="bg-accent/5 rounded p-2 text-center">
                    <p className="text-xs text-gray-500">Following</p>
                    <p className="font-semibold text-accent">
                      {lensProfile.following}
                    </p>
                  </div>
                  <div className="bg-accent/5 rounded p-2 text-center">
                    <p className="text-xs text-gray-500">Posts</p>
                    <p className="font-semibold text-accent">
                      {lensProfile.posts}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg p-4 border border-gray-100"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🔷</span>
                <p className="text-sm text-gray-500">No Lens profile found</p>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}
