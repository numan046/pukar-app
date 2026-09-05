import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://unpkg.com https://*.tile.openstreetmap.org; font-src 'self' data:; media-src 'self' blob: data:; connect-src 'self' blob: https://*.vercel.app https://*.turso.io https://nominatim.openstreetmap.org https://api-groq.com;"
  );
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(self)");

  // HSTS — only in production
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  return response;
}

export const config = {
  // Apply to all routes except static assets and Next.js internals
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png).*)"],
};
