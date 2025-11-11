import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Debug logging
  console.log("Talent API route accessed");
  
  const API_BASE_URL = process.env.NEXT_PUBLIC_TALENT_API_URL;
  const API_KEY = process.env.TALENT_PROTOCOL_API_KEY || "";

  console.log("API_BASE_URL:", API_BASE_URL ? "set" : "missing");
  console.log("API_KEY:", API_KEY ? "set" : "missing");

  if (!API_BASE_URL) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_TALENT_API_URL environment variable is required" },
      { status: 500 }
    );
  }
  const searchParams = request.nextUrl.searchParams;
  const endpoint = searchParams.get("endpoint");

  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint parameter is required" }, { status: 400 });
  }

  try {
    // The endpoint may already contain query parameters (e.g., /score?id=...)
    // So we just append it directly to the base URL
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    if (API_KEY) {
      // Talent Protocol API uses X-API-KEY header (per https://docs.talentprotocol.com/docs/developers/talent-api)
      headers["X-API-KEY"] = API_KEY;
    } else {
      console.warn("TALENT_PROTOCOL_API_KEY is not set");
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
      redirect: "manual", // Don't follow redirects automatically
    });

    // Handle redirects (like 302 to /sign_in) - indicates authentication failure
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      console.error("Talent Protocol API authentication failed:", {
        status: response.status,
        location,
        url,
        hasApiKey: !!API_KEY,
        apiKeyLength: API_KEY?.length || 0
      });
      return NextResponse.json(
        { 
          error: `API authentication failed. The API returned a ${response.status} redirect to: ${location || "unknown location"}. This usually means the API key is invalid, expired, or doesn't have the required permissions. Please verify your API key in the Talent Protocol dashboard.`,
          status: response.status,
          location,
          hint: "Check that your API key is valid and has 'read_only' or 'write' permissions"
        },
        { status: 500 }
      );
    }

    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      // Check if response is HTML (error page) instead of JSON
      if (contentType && contentType.includes("text/html")) {
        const text = await response.text();
        console.error("Talent Protocol API returned HTML:", {
          status: response.status,
          url,
          preview: text.substring(0, 200)
        });
        return NextResponse.json(
          { 
            error: `API returned HTML instead of JSON. This usually means authentication failed or the endpoint is incorrect. Status: ${response.status}`,
            status: response.status,
            url 
          },
          { status: 500 }
        );
      }
      
      // Try to parse error response
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: `API request failed with status ${response.status}` };
      }
      
      console.error("Talent Protocol API error:", {
        status: response.status,
        url,
        error: errorData
      });
      
      return NextResponse.json(
        { 
          error: errorData.message || errorData.error || `API error: ${response.statusText}`,
          status: response.status 
        },
        { status: response.status >= 500 ? 500 : response.status }
      );
    }

    // Verify content type before parsing
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      return NextResponse.json(
        { 
          error: `API returned non-JSON response. Content-Type: ${contentType}`,
          preview: text.substring(0, 200)
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Talent Protocol API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

