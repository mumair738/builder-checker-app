"use client";

import { useState, useEffect } from "react";
import { getAddressTransactions, getContractDeployments } from "@/lib/blockchain-api";
import type { Transaction, ContractDeployment } from "@/types/blockchain";
import { formatNumber } from "@/lib/utils";
import { motion } from "framer-motion";

interface OnChainActivityProps {
  address: string;
}

export function OnChainActivity({ address }: OnChainActivityProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [contracts, setContracts] = useState<ContractDeployment[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"transactions" | "contracts">(
    "transactions"
  );

  useEffect(() => {
    if (address) {
      fetchOnChainData();
    }
  }, [address]);

  const fetchOnChainData = async () => {
    setLoading(true);
    try {
      const [txs, contractDeploys] = await Promise.all([
        getAddressTransactions(address, 10),
        getContractDeployments(address),
      ]);
      setTransactions(txs);
      setContracts(contractDeploys);
    } catch (error) {
      console.error("Error fetching on-chain data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const truncateHash = (hash: string) =>
    `${hash.slice(0, 6)}...${hash.slice(-4)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border border-gray-200/50"
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🔗 Base Chain Activity
        </h3>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("transactions")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "transactions"
                ? "bg-accent text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Transactions ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab("contracts")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "contracts"
                ? "bg-accent text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Contracts ({contracts.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin">
            <div className="w-6 h-6 border-3 border-accent border-t-transparent rounded-full"></div>
          </div>
          <p className="text-gray-600 mt-2">Loading Base chain data...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeTab === "transactions" && (
            <>
              {transactions.length > 0 ? (
                transactions.map((tx, idx) => (
                  <motion.div
                    key={tx.hash}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-4 bg-white rounded-lg border border-gray-100 hover:border-accent/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <a
                          href={`https://basescan.org/tx/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-mono text-accent hover:underline"
                        >
                          {truncateHash(tx.hash)}
                        </a>
                        <p className="text-xs text-gray-500 mt-1">
                          {tx.to
                            ? `To: ${truncateHash(tx.to)}`
                            : "Contract creation"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {(BigInt(tx.value) / BigInt(10 ** 18)).toString()} ETH
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(tx.timeStamp)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No transactions found
                </p>
              )}
            </>
          )}

          {activeTab === "contracts" && (
            <>
              {contracts.length > 0 ? (
                contracts.map((contract, idx) => (
                  <motion.div
                    key={contract.address}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-4 bg-white rounded-lg border border-gray-100 hover:border-accent/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <a
                          href={`https://basescan.org/address/${contract.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-mono text-accent hover:underline"
                        >
                          {truncateHash(contract.address)}
                        </a>
                        <p className="text-xs text-gray-500 mt-1">
                          {contract.verified ? "✓ Verified" : "Not verified"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {contract.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(contract.timeStamp)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No contracts deployed
                </p>
              )}
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}
