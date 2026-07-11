import { auth } from "@/lib/auth";

// Protects every route except the login page, the auth API and static assets.
// Unauthenticated users are redirected to /login.
export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isLoginPage = nextUrl.pathname === "/login";

  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL("/login", nextUrl);
    return Response.redirect(loginUrl);
  }

  if (isLoggedIn && isLoginPage) {
    return Response.redirect(new URL("/", nextUrl));
  }
});

export const config = {
  // Skip Next internals, the auth API and common static files.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
