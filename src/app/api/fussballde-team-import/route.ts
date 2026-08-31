import { NextRequest, NextResponse } from "next/server";

// Liest eine Fussball.de-Mannschaftsseite (nicht Spielseite -- siehe
// /api/fussballde-import fuer Partien) serverseitig aus und extrahiert
// Team-Name und -ID, damit der Editor daraus automatisch den Namen fuer
// Team A (das eigene Team) uebernehmen kann. Die ID wird mitgeliefert,
// weil sie spaeter fuer eine zuverlaessigere Gegner-Erkennung beim
// Partie-Import nuetzlich werden kann.
const FUSSBALLDE_HOST_RE = /(^|\.)fussball\.de$/i;
const FETCH_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export const maxDuration = 10;
const PAGE_FETCH_TIMEOUT_MS = 6000;

function extractVar(html: string, varName: string): string | null {
  const m = html.match(new RegExp(`${varName}='([^']*)'`));
  const value = m?.[1]?.trim();
  return value ? value : null;
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

    return NextResponse.json({ name, teamId });
  } catch (e) {
    console.error("fussballde-team-import: unerwarteter Fehler", e);
    return NextResponse.json(
      { error: "Unerwarteter Fehler beim Import. Bitte erneut versuchen." },
      { status: 500 }
    );
  }
}
