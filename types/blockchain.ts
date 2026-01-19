/* ============================
   Blockchain & Activity Types
============================ */

export interface Transaction {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  gas: string;
  gasPrice: string;
  input: string;
  blockNumber: string;
  timeStamp: number;
  isError: boolean;
  contractAddress?: string;
}

export interface ContractDeployment {
  address: string;
  creator: string;
  transactionHash: string;
  blockNumber: string;
  timeStamp: number;
  name: string;
  verified: boolean;
}

export interface OnChainActivity {
  transactions: Transaction[];
  contractDeployments: ContractDeployment[];
  totalValue: string;
}

export interface BuilderActivity {
  onChainActivity: OnChainActivity;
  gitHubActivity?: {
    commits: number;
    repositories: number;
    followers: number;
  };
  lensProfile?: {
    handle: string;
    followers: number;
    posts: number;
  };
  ensData?: {
    name: string;
    avatar?: string;
    description?: string;
  };
}
