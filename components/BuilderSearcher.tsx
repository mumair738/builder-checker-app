"use client";

import { useState } from "react";
import { useDebounce } from "@/lib/hooks";
import type { SearchFilters } from "@/types/talent";
import { motion } from "framer-motion";

interface BuilderSearcherProps {
  onSearch: (filters: SearchFilters) => void;
  loading?: boolean;
}

export function BuilderSearcher({ onSearch, loading }: BuilderSearcherProps) {
  const [address, setAddress] = useState("");
  const [ensName, setEnsName] = useState("");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [skills, setSkills] = useState("");
  const [credentials, setCredentials] = useState("");

  const debouncedSearch = useDebounce((filters: SearchFilters) => {
    onSearch(filters);
  }, 500);

  const handleAddressChange = (value: string) => {
    setAddress(value);
    debouncedSearch({
      address: value || undefined,
      ensName: ensName || undefined,
      minScore: minScore ? Number(minScore) : undefined,
      maxScore: maxScore ? Number(maxScore) : undefined,
      skills: skills ? skills.split(",").map((s) => s.trim()) : undefined,
      credentials: credentials ? credentials.split(",").map((c) => c.trim()) : undefined,
    });
  };

  const handleEnsChange = (value: string) => {
    setEnsName(value);
    debouncedSearch({
      address: address || undefined,
      ensName: value || undefined,
      minScore: minScore ? Number(minScore) : undefined,
      maxScore: maxScore ? Number(maxScore) : undefined,
      skills: skills ? skills.split(",").map((s) => s.trim()) : undefined,
      credentials: credentials ? credentials.split(",").map((c) => c.trim()) : undefined,
    });
  };

  const handleScoreChange = (type: "min" | "max", value: string) => {
    if (type === "min") {
      setMinScore(value);
    } else {
      setMaxScore(value);
    }
    debouncedSearch({
      address: address || undefined,
      ensName: ensName || undefined,
      minScore: type === "min" ? (value ? Number(value) : undefined) : minScore ? Number(minScore) : undefined,
      maxScore: type === "max" ? (value ? Number(value) : undefined) : maxScore ? Number(maxScore) : undefined,
      skills: skills ? skills.split(",").map((s) => s.trim()) : undefined,
      credentials: credentials ? credentials.split(",").map((c) => c.trim()) : undefined,
    });
  };

  const handleSkillsChange = (value: string) => {
    setSkills(value);
    debouncedSearch({
      address: address || undefined,
      ensName: ensName || undefined,
      minScore: minScore ? Number(minScore) : undefined,
      maxScore: maxScore ? Number(maxScore) : undefined,
      skills: value ? value.split(",").map((s) => s.trim()) : undefined,
      credentials: credentials ? credentials.split(",").map((c) => c.trim()) : undefined,
    });
  };

  const handleCredentialsChange = (value: string) => {
    setCredentials(value);
    debouncedSearch({
      address: address || undefined,
      ensName: ensName || undefined,
      minScore: minScore ? Number(minScore) : undefined,
      maxScore: maxScore ? Number(maxScore) : undefined,
      skills: skills ? skills.split(",").map((s) => s.trim()) : undefined,
      credentials: value ? value.split(",").map((c) => c.trim()) : undefined,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      address: address || undefined,
      ensName: ensName || undefined,
      minScore: minScore ? Number(minScore) : undefined,
      maxScore: maxScore ? Number(maxScore) : undefined,
      skills: skills ? skills.split(",").map((s) => s.trim()) : undefined,
      credentials: credentials ? credentials.split(",").map((c) => c.trim()) : undefined,
    });
  };

  const handleClear = () => {
    setAddress("");
    setEnsName("");
    setMinScore("");
    setMaxScore("");
    setSkills("");
    setCredentials("");
    onSearch({});
  };

  const hasFilters = address || ensName || minScore || maxScore || skills || credentials;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-white rounded-xl border-2 border-gray-200 shadow-lg"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Search Builders
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Wallet Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ENS Name
            </label>
            <input
              type="text"
              value={ensName}
              onChange={(e) => handleEnsChange(e.target.value)}
              placeholder="vitalik.eth"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Min Score
            </label>
            <input
              type="number"
              value={minScore}
              onChange={(e) => handleScoreChange("min", e.target.value)}
              placeholder="0"
              min="0"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Max Score
            </label>
            <input
              type="number"
              value={maxScore}
              onChange={(e) => handleScoreChange("max", e.target.value)}
              placeholder="1000"
              min="0"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Skills (comma-separated)
          </label>
          <input
            type="text"
            value={skills}
            onChange={(e) => handleSkillsChange(e.target.value)}
            placeholder="Solidity, React, TypeScript"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Credentials (comma-separated)
          </label>
          <input
            type="text"
            value={credentials}
            onChange={(e) => handleCredentialsChange(e.target.value)}
            placeholder="Ethereum Developer, Open Source Contributor"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="flex-1 md:flex-none px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
          >
            {loading ? "Searching..." : "Search"}
          </motion.button>
          {hasFilters && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleClear}
              disabled={loading}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded-lg font-semibold transition-all shadow-sm hover:shadow"
            >
              Clear
            </motion.button>
          )}
        </div>
      </form>
    </motion.div>
  );
}


