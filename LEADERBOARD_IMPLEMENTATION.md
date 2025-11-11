# Leaderboard Implementation Guide

## How the Leaderboard Works

The leaderboard is implemented using a **Next.js API proxy pattern** to avoid CORS issues. Here's how it works:

### Architecture

1. **Client Component** (`components/Leaderboard.tsx`)
   - Fetches data using `getLeaderboard()` from `lib/builderscore-api.ts`
   - Makes requests to `/api/builderscore` (Next.js API route)

2. **API Client** (`lib/builderscore-api.ts`)
   - Uses Next.js API route as proxy: `/api/builderscore`
   - Sends requests to the Next.js server, not directly to external API

3. **API Route** (`app/api/builderscore/route.ts`)
   - Acts as a server-side proxy
   - Makes requests to the external BuilderScore API
   - Returns data to the client
   - **This avoids CORS issues** because:
     - Browser → Next.js server (same origin, no CORS)
     - Next.js server → External API (server-to-server, no CORS)

### Data Flow

```
Browser (Client)
  ↓ fetch('/api/builderscore?endpoint=/leaderboards?...')
Next.js API Route (Server)
  ↓ fetch('https://external-api.com/leaderboards?...')
External BuilderScore API
  ↓ JSON response
Next.js API Route
  ↓ JSON response
Browser (Client)
```

### Why This Solves CORS

- **CORS only applies to browser requests**
- When the browser requests `/api/builderscore`, it's the same origin (no CORS)
- The Next.js server makes the external API call (server-to-server, no CORS)
- The server returns the data to the browser

### If Your Friend Has CORS Errors

If your friend is still getting CORS errors, they might be:

1. **Calling the external API directly from the browser** (should use `/api/builderscore` instead)
2. **Missing CORS headers in the API route** (we've added them below)
3. **Using a different domain/port** (Next.js dev server should handle this)

### Solution: Add CORS Headers

The API route should include CORS headers. See `app/api/builderscore/route.ts` for the implementation with CORS headers added.

