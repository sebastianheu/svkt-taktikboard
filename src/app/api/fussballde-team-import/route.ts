import { NextRequest, NextResponse } from "next/server";

// Liest eine Fussball.de-Mannschaftsseite (nicht Spielseite -- siehe
// /api/fussballde-import fuer Partien) serverseitig aus und extrahiert
// Team-Name, -ID und Vereinslogo, damit der Editor daraus automatisch
// Name UND Farbe fuer Team A (das eigene Team) uebernehmen kann -- das
// ist die "Prio 1"-Farbquelle fuer Team A: ist ein Team-Link hinterlegt,
// wird IMMER von hier aus die Farbe gezogen statt aus einer einzelnen
// Partie (die "Prio 2"-Quelle, siehe /api/fussballde-import).
//
// Eine Mannschaftsseite listet viele Vereinslogos (Tabelle, naechste
// Spiele der Liga usw.), die alle "format/0" nutzen -- anders als bei
// einer Partie-Seite ist das Format hier also NICHT eindeutig. Das
// eigene Vereinslogo im Seitenkopf ist aber die einzige <img> mit dem
// woertlichen alt="logo" (alle anderen Logos tragen den jeweiligen
// Vereinsnamen als alt-Text) -- damit laesst es sich trotzdem eindeutig
// herausgreifen.
const FUSSBALLDE_HOST_RE = /(^|\.)fussball\.de$/i;
const FETCH_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export const maxDuration = 10;
const PAGE_FETCH_TIMEOUT_MS = 6000;
const LOGO_FETCH_TIMEOUT_MS = 2500;

function extractVar(html: string, varName: string): string | null {
  const m = html.match(new RegExp(`${varName}='([^']*)'`));
  const value = m?.[1]?.trim();
  return value ? value : null;
}

function extractOwnLogoUrl(html: string): string | null {
  const m = html.match(/<img src="([^"]+)" alt="logo">/);
  if (!m) return null;
  const url = m[1];
  return url.startsWith("//") ? `https:${url}` : url;
}

async function fetchLogoAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": FETCH_USER_AGENT },
      signal: AbortSignal.timeout(LOGO_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/png";
    const buffer = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";
    if (!rawUrl) {
      return NextResponse.json(
        { error: "Bitte einen Link zur Mannschaft auf Fußball.de angeben." },
        { status: 400 }
      );
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return NextResponse.json({ error: "Das ist keine gültige URL." }, { status: 400 });
    }
    if (!FUSSBALLDE_HOST_RE.test(parsed.hostname)) {
      return NextResponse.json(
        { error: "Es werden nur Links zu fussball.de unterstützt." },
        { status: 400 }
      );
    }

    let html: string;
    try {
      const res = await fetch(parsed.toString(), {
        headers: {
          "User-Agent": FETCH_USER_AGENT,
          "Accept-Language": "de-DE,de;q=0.9",
        },
        signal: AbortSignal.timeout(PAGE_FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: `Fußball.de hat mit Status ${res.status} geantwortet.` },
          { status: 502 }
        );
      }
      html = await res.text();
    } catch {
      return NextResponse.json(
        {
          error:
            "Die Fußball.de-Seite hat nicht rechtzeitig geantwortet (evtl. Bot-Schutz oder Netzwerkproblem). Bitte später erneut versuchen.",
        },
        { status: 502 }
      );
    }

    const name = extractVar(html, "edMannschaftName");
    const teamId = extractVar(html, "edMannschaftId");

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Auf dieser Seite konnte kein Mannschaftsname erkannt werden. Bitte den Link zu einer einzelnen Mannschaftsseite (nicht Spiel oder Tabelle) verwenden.",
        },
        { status: 422 }
      );
    }

    const ownLogoUrl = extractOwnLogoUrl(html);
    const logoDataUrl = ownLogoUrl ? await fetchLogoAsDataUrl(ownLogoUrl) : null;

    return NextResponse.json({ name, teamId, logoDataUrl });
  } catch (e) {
    console.error("fussballde-team-import: unerwarteter Fehler", e);
    return NextResponse.json(
      { error: "Unerwarteter Fehler beim Import. Bitte erneut versuchen." },
      { status: 500 }
    );
  }
}
