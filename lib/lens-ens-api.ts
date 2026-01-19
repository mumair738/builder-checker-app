/* ============================
   Lens Protocol & ENS Integration
============================ */

const LENS_API = "https://api-v2.lens.dev";
const ENS_GATEWAY = "https://gateway.pinata.cloud/ipfs";

export interface LensProfile {
  id: string;
  handle: string;
  displayName?: string;
  bio?: string;
  picture?: string;
  followers: number;
  following: number;
  posts: number;
}

export interface ENSRecord {
  name: string;
  address: string;
  avatar?: string;
  description?: string;
  twitter?: string;
  github?: string;
  website?: string;
}

export async function getLensProfile(
  ethereumAddress: string
): Promise<LensProfile | null> {
  try {
    const query = `
      query GetProfile {
        profiles(request: { where: { ownedBy: ["${ethereumAddress.toLowerCase()}"] } }) {
          items {
            id
            handle {
              fullHandle
            }
            metadata {
              displayName
              bio
              picture
            }
            stats {
              followers
              following
              posts
            }
          }
        }
      }
    `;

    const response = await fetch(LENS_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const profile = data.data?.profiles?.items?.[0];

    if (!profile) return null;

    return {
      id: profile.id,
      handle: profile.handle.fullHandle,
      displayName: profile.metadata?.displayName,
      bio: profile.metadata?.bio,
      picture: profile.metadata?.picture,
      followers: profile.stats?.followers || 0,
      following: profile.stats?.following || 0,
      posts: profile.stats?.posts || 0,
    };
  } catch (error) {
    console.error("Error fetching Lens profile:", error);
    return null;
  }
}

export async function getENSName(address: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.ensdata.net/ens/resolve/${address}`
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data.name || null;
  } catch (error) {
    console.error("Error fetching ENS name:", error);
    return null;
  }
}

export async function getENSRecords(
  ensName: string
): Promise<ENSRecord | null> {
  try {
    const response = await fetch(`https://api.ensdata.net/ens/${ensName}`);

    if (!response.ok) return null;

    const data = await response.json();
    return {
      name: data.name,
      address: data.address,
      avatar: data.avatar,
      description: data.description,
      twitter: data.twitter,
      github: data.github,
      website: data.website,
    };
  } catch (error) {
    console.error("Error fetching ENS records:", error);
    return null;
  }
}

export async function resolveLensHandle(handle: string): Promise<string | null> {
  try {
    const query = `
      query GetProfileByHandle {
        profile(request: { forHandle: "${handle}" }) {
          ownedBy {
            address
          }
        }
      }
    `;

    const response = await fetch(LENS_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.data?.profile?.ownedBy?.address || null;
  } catch (error) {
    console.error("Error resolving Lens handle:", error);
    return null;
  }
}
