// Einfacher Zugangscode-Login fuer ein Einzelnutzer-Tool: kein volles
// Mehrbenutzer-System mit Passwort-Datenbank, sondern ein persoenlicher
// Code (AUTH_PASSCODE, als Umgebungsvariable in Vercel gesetzt) plus ein
// signiertes Session-Cookie. Das Cookie ist geraeteunabhaengig gueltig --
// es identifiziert nicht das Geraet, sondern "kennt den Code" -- und laesst
// sich daher auf jedem Geraet erneut durch Anmelden erzeugen.
//
// Signierung ueber die Web Crypto API (SubtleCrypto), nicht Node's
// `crypto`-Modul: so funktioniert derselbe Code sowohl in der Middleware
// (Edge-Runtime, kein Node-`crypto`) als auch in normalen Route Handlers.

export const SESSION_COOKIE_NAME = "svkt_session";
const SESSION_VALUE = "ok";

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET ist nicht gesetzt. Bitte in den Vercel-Projekteinstellungen " +
        "eine lange zufaellige Zeichenkette als Umgebungsvariable AUTH_SECRET hinterlegen."
    );
  }
  return secret;
}

async function hmac(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Buffer.from(sigBuffer).toString("hex");
}

export async function createSessionToken(): Promise<string> {
  const signature = await hmac(SESSION_VALUE);
  return `${SESSION_VALUE}.${signature}`;
}

export async function isValidSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const [value, signature] = token.split(".");
  if (value !== SESSION_VALUE || !signature) return false;
  const expected = await hmac(value);
  return timingSafeEqual(expected, signature);
}

export function checkPasscode(input: string): boolean {
  const expected = process.env.AUTH_PASSCODE;
  if (!expected) {
    throw new Error(
      "AUTH_PASSCODE ist nicht gesetzt. Bitte in den Vercel-Projekteinstellungen " +
        "einen persoenlichen Zugangscode als Umgebungsvariable AUTH_PASSCODE hinterlegen."
    );
  }
  return timingSafeEqual(input, expected);
}

// Separater API-Key fuer externe, nicht-interaktive Zugriffe (z. B. eine
// Gegner-Vorbereitungs-Integration), die kein Session-Cookie besitzen
// koennen -- bewusst ein eigener Wert statt AUTH_PASSCODE wiederzuverwenden,
// damit sich der externe Zugriff unabhaengig vom persoenlichen Login-Code
// widerrufen/rotieren laesst.
export function checkExternalApiKey(input: string): boolean {
  const expected = process.env.EXTERNAL_API_KEY;
  if (!expected) return false;
  return timingSafeEqual(input, expected);
}

// Vergleicht zwei Strings ohne fruehen Abbruch (schuetzt gegen simple
// Timing-Angriffe auf den Zugangscode).
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
