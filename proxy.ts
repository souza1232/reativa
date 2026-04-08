import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const isLoggedIn = req.cookies.get("reativa_session")?.value === "true";
  const path = req.nextUrl.pathname;

  if (path.startsWith("/dashboard") && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if ((path === "/login" || path === "/cadastro") && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/cadastro"],
};
