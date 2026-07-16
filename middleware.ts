import { NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  // Get the country from Vercel's geolocation header
  const country = request.headers.get("x-vercel-ip-country")

  // Allow access to the blocked page regardless of country
  if (request.nextUrl.pathname === "/blocked") {
    return NextResponse.next()
  }

  // If country is detected and it's not US, redirect to blocked page
  if (country && country !== "US") {
    return NextResponse.redirect(new URL("/blocked", request.url))
  }

  // Allow US users and users with no country detection to proceed
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
