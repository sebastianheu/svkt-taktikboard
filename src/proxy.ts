import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, isValidSessionToken } from "@/lib/auth";

// Schuetzt alle Seiten ausser /login (und statischen Assets): ohne
// gueltiges, signiertes Session-Cookie geht es zurueck zum Login.
//
// Hinweis (Next.js 16): Diese Datei heisst bewusst "proxy.ts", nicht
// "middleware.ts" -- der Dateiname wurde in Next.js 16 umbenannt, die alte
// "middleware.ts" wird nicht mehr ausgefuehrt.
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isLoggedIn = await isValidSessionToken(token);

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Greift auf alles zu ausser: /login selbst, Next.js-interne Pfade,
  // und statische Dateien mit einer Dateiendung (Icons, etc.).
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
