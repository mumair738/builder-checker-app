import { NextRequest, NextResponse } from "next/server";

// CORS headers helper
function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*", // Allow all origins (adjust for production)
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: getCorsHeaders() });
}

export async function GET(request: NextRequest) {
  const API_BASE_URL = process.env.NEXT_PUBLIC_BUILDERSCORE_API_URL;
  const API_KEY = process.env.BUILDERSCORE_API_KEY || "";

  if (!API_BASE_URL) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_BUILDERSCORE_API_URL environment variable is required" },
      { status: 500, headers: getCorsHeaders() }
    );
  }
  const searchParams = request.nextUrl.searchParams;
  const endpoint = searchParams.get("endpoint");

  if (!endpoint) {
    return NextResponse.json(
      { error: "Endpoint parameter is required" },
      { status: 400, headers: getCorsHeaders() }
    );
  }

  try {
    // Build query string from remaining params (excluding endpoint)
    const queryParams = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (key !== "endpoint") {
        queryParams.append(key, value);
      }
    });

    const queryString = queryParams.toString();
    const url = `${API_BASE_URL}${endpoint}${queryString ? `?${queryString}` : ""}`;
    
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (API_KEY) {
      headers["Authorization"] = `Bearer ${API_KEY}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "API request failed" }));
      return NextResponse.json(
        { error: error.message || error.error || `API error: ${response.statusText}` },
        { status: response.status, headers: getCorsHeaders() }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { headers: getCorsHeaders() });
  } catch (error) {
    console.error("BuilderScore API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}

