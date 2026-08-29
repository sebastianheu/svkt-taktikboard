"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkPasscode, createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function login(formData: FormData) {
  const code = String(formData.get("code") ?? "");

  let ok: boolean;
  try {
    ok = checkPasscode(code);
  } catch {
    // AUTH_PASSCODE ist noch nicht gesetzt -- klarer Hinweis statt stillem Fehlschlag.
    redirect("/login?error=config");
  }

  if (!ok) {
    redirect("/login?error=1");
  }

  const token = await createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    // Ein Jahr gueltig -- bewusst lang, weil dies ein persoenliches
    // Geraete-unabhaengiges Tool ist, kein Mehrbenutzer-System mit
    // sicherheitskritischen Daten Dritter.
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/taktik");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
