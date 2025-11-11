"use client";

import { createAppKit } from "@reown/appkit/react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiAdapter } from "@/config/appkit";
import { mainnet, base, polygon, optimism, arbitrum } from "@reown/appkit/networks";

const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || "placeholder-project-id";

// Always initialize AppKit (will use placeholder if project ID not set)
createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [mainnet, base, polygon, optimism, arbitrum],
  defaultNetwork: mainnet,
  metadata: {
    name: "Builder Checker App",
    description: "Onchain Builder Score & Verification",
    url: typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_BASE_URL || "https://builder-checker-app.vercel.app",
    icons: ['https://avatars.githubusercontent.com/u/37784886?s=200&v=4'],
  },
  features: {
    swaps: false,
    analytics: false,
  },
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

