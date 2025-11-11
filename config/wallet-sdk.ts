// Wallet SDK configuration
// Note: Wallet SDK is available through AppKit integration
// This file can be used for additional Wallet SDK functionality if needed

export const getWalletSDKConfig = () => {
  const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

  if (!projectId) {
    throw new Error("NEXT_PUBLIC_PROJECT_ID is not defined");
  }

  return {
    projectId,
    metadata: {
      name: "Builder Score App",
      description: "Onchain builder score and searcher",
      url: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
      icons: [],
    },
  };
};

