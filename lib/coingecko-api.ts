// CoinGecko API utility for token price conversion

const COINGECKO_API_BASE = "https://api.coingecko.com/api/v3";

export interface TokenPrice {
  usd: number;
  usd_24h_change?: number;
}

export interface TokenInfo {
  symbol: string;
  name: string;
  fallbackPrice: number;
}

// Token mapping by sponsor slug
export const SPONSOR_TOKENS: Record<string, TokenInfo> = {
  walletconnect: {
    symbol: "WCT",
    name: "WalletConnect Token",
    fallbackPrice: 0.1249,
  },
  celo: {
    symbol: "CELO",
    name: "Celo",
    fallbackPrice: 0.5, // Approximate fallback
  },
  base: {
    symbol: "ETH",
    name: "Ethereum",
    fallbackPrice: 3000, // Approximate fallback
  },
  "base-summer": {
    symbol: "ETH",
    name: "Ethereum",
    fallbackPrice: 3000,
  },
  "talent-protocol": {
    symbol: "TALENT",
    name: "Talent Protocol",
    fallbackPrice: 0.1, // Approximate fallback
  },
  syndicate: {
    symbol: "SYND",
    name: "Syndicate",
    fallbackPrice: 0.24, // Approximate fallback based on current price
  },
};

// Get token price by CoinGecko ID or contract address
async function getTokenPriceById(coinId: string, fallbackPrice: number): Promise<number> {
  try {
    const url = `${COINGECKO_API_BASE}/simple/price?ids=${coinId}&vs_currencies=usd`;
    
    const response = await fetch(url, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.statusText}`);
    }

    const data = await response.json();
    const price = data[coinId]?.usd;
    
    if (!price) {
      throw new Error(`${coinId} price not found`);
    }

    return price;
  } catch (error) {
    console.error(`Error fetching ${coinId} price:`, error);
    return fallbackPrice;
  }
}

// Get token price by contract address
async function getTokenPriceByContract(
  contractAddress: string,
  chain: string,
  fallbackPrice: number
): Promise<number> {
  try {
    const url = `${COINGECKO_API_BASE}/simple/token_price/${chain}?contract_addresses=${contractAddress}&vs_currencies=usd`;
    
    const response = await fetch(url, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.statusText}`);
    }

    const data = await response.json();
    const price = data[contractAddress.toLowerCase()]?.usd;
    
    if (!price) {
      throw new Error("Token price not found");
    }

    return price;
  } catch (error) {
    console.error(`Error fetching token price for ${contractAddress}:`, error);
    return fallbackPrice;
  }
}

// Get token price based on sponsor slug
export async function getTokenPrice(sponsorSlug: string | undefined): Promise<{
  price: number;
  tokenInfo: TokenInfo | null;
}> {
  if (!sponsorSlug) {
    return { price: 0, tokenInfo: null };
  }

  const tokenInfo = SPONSOR_TOKENS[sponsorSlug];
  if (!tokenInfo) {
    return { price: 0, tokenInfo: null };
  }

  let price: number;

  switch (sponsorSlug) {
    case "walletconnect":
      // WCT contract: 0x6a39909e805A3eaDd2b61fFf61147796ca6abb47
      price = await getTokenPriceByContract(
        "0x6a39909e805A3eaDd2b61fFf61147796ca6abb47",
        "ethereum",
        tokenInfo.fallbackPrice
      );
      break;
    case "celo":
      // CELO native token
      price = await getTokenPriceById("celo", tokenInfo.fallbackPrice);
      break;
    case "base":
    case "base-summer":
      // ETH price
      price = await getTokenPriceById("ethereum", tokenInfo.fallbackPrice);
      break;
            case "talent-protocol":
              // TALENT token - try to find by contract or use fallback
              // Note: Update with actual TALENT contract address if available
              price = tokenInfo.fallbackPrice;
              break;
            case "syndicate":
              // SYND token - Syndicate Network
              price = await getTokenPriceById("syndicate", tokenInfo.fallbackPrice);
              break;
            default:
              price = tokenInfo.fallbackPrice;
  }

  return { price, tokenInfo };
}

// Legacy function for backward compatibility
export async function getWCTPrice(): Promise<number> {
  const result = await getTokenPrice("walletconnect");
  return result.price;
}

