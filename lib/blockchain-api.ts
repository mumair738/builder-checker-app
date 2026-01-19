import type { Transaction, ContractDeployment } from "@/types/blockchain";

/* ============================
   Basescan API for Base Chain Transactions
============================ */

const BASESCAN_API_KEY = process.env.NEXT_PUBLIC_BASESCAN_API_KEY;
const BASESCAN_BASE = "https://api.basescan.org/api";

export async function getAddressTransactions(
  address: string,
  limit: number = 10
): Promise<Transaction[]> {
  try {
    const params = new URLSearchParams({
      module: "account",
      action: "txlist",
      address,
      startblock: "0",
      endblock: "99999999",
      sort: "desc",
      apikey: BASESCAN_API_KEY || "",
    });

    const response = await fetch(`${BASESCAN_BASE}?${params.toString()}`);
    const data = await response.json();

    if (data.status === "1" && Array.isArray(data.result)) {
      return data.result.slice(0, limit).map((tx: any) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        gas: tx.gas,
        gasPrice: tx.gasPrice,
        input: tx.input,
        blockNumber: tx.blockNumber,
        timeStamp: parseInt(tx.timeStamp) * 1000,
        isError: tx.isError === "0",
        contractAddress: tx.contractAddress,
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching Base chain transactions:", error);
    return [];
  }
}

export async function getContractDeployments(
  address: string
): Promise<ContractDeployment[]> {
  try {
    const params = new URLSearchParams({
      module: "account",
      action: "txlistinternal",
      address,
      startblock: "0",
      endblock: "99999999",
      sort: "desc",
      apikey: BASESCAN_API_KEY || "",
    });

    const response = await fetch(`${BASESCAN_BASE}?${params.toString()}`);
    const data = await response.json();

    if (data.status === "1" && Array.isArray(data.result)) {
      return data.result
        .filter((tx: any) => tx.input !== "0x" && tx.isError === "0")
        .slice(0, 10)
        .map((tx: any) => ({
          address: tx.contractAddress,
          creator: tx.from,
          transactionHash: tx.hash,
          blockNumber: tx.blockNumber,
          timeStamp: parseInt(tx.timeStamp) * 1000,
          name: "Contract",
          verified: false,
        }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching Base chain contract deployments:", error);
    return [];
  }
}

export async function getTokenHoldings(
  address: string
): Promise<{ token: string; balance: string; symbol: string }[]> {
  try {
    const params = new URLSearchParams({
      module: "account",
      action: "tokentx",
      address,
      startblock: "0",
      endblock: "99999999",
      sort: "desc",
      apikey: BASESCAN_API_KEY || "",
    });

    const response = await fetch(`${BASESCAN_BASE}?${params.toString()}`);
    const data = await response.json();

    if (data.status === "1" && Array.isArray(data.result)) {
      const tokenMap = new Map();
      data.result.forEach((tx: any) => {
        const key = tx.tokenSymbol;
        if (!tokenMap.has(key)) {
          tokenMap.set(key, {
            token: tx.contractAddress,
            balance: tx.value,
            symbol: tx.tokenSymbol,
          });
        }
      });
      return Array.from(tokenMap.values()).slice(0, 10);
    }
    return [];
  } catch (error) {
    console.error("Error fetching Base chain token holdings:", error);
    return [];
  }
}
