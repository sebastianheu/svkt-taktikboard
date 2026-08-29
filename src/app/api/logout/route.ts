import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

// Eigene Route (statt des Server-Actions `logout` aus login/actions.ts),
// damit der Abmelden-Button per normalem <form>-POST aus dem isolierten
// Taktiktafel-Editor (iframe, eigenes HTML-Dokument ohne Zugriff auf
// Next.js-Server-Actions) ausgeloest werden kann.
export async function POST(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
