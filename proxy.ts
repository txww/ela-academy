import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("jwt")?.value;

  if (pathname.startsWith("/ela-control-panel") ||
      pathname.startsWith("/teacher") ||
      pathname.startsWith("/dashboard")) {
    if (!token) return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/ela-control-panel/:path*",
    "/teacher/:path*",
    "/dashboard/:path*",
  ],
};