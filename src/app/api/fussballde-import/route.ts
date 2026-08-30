import { NextRequest, NextResponse } from "next/server";

// Liest eine einzelne Fussball.de-Spielseite serverseitig aus (der
// Taktiktafel-Editor laeuft als isoliertes iframe im Browser und koennte
// fussball.de wegen CORS ohnehin nicht direkt anfragen) und extrahiert
// Heim-/Gastmannschaftsnamen sowie beide Vereinslogos, damit der Editor
// daraus automatisch Team-A/B-Namen und -Farben ableiten kann.
//
// Bewusst reine Regex-Extraktion statt eines HTML-Parsers (keine
// Abhaengigkeit im Projekt vorhanden): fussball.de liefert auf jeder
// Spielseite einen kleinen, stabilen Analytics-Datenblock
// (edHeimmannschaftName='...'; edGastmannschaftName='...';) sowie genau
// zwei "format/0"-Vereinslogos (alle uebrigen Logos auf der Seite, z. B.
// in Tabellen/Spieltag-Navigation, nutzen "format/1") -- beides jeweils
// einmalig und in Dokumentreihenfolge Heim vor Gast, das macht die
// Extraktion robust genug ohne vollen DOM-Parser.
const FUSSBALLDE_HOST_RE = /(^|\.)fussball\.de$/i;
const FETCH_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// Vercel Hobby killt Serverless-Functions nach 10s hart (auch mitten in
// einem laufenden fetch) -- ohne eigene, deutlich kuerzere Timeouts kann
// das dazu fuehren, dass die Funktion abgewuergt wird, BEVOR unser
// try/catch je eine Antwort zurueckgeben kann. Der Client sieht davon
// nur einen rohen Verbindungsabbruch ("Netzwerkfehler"), keine
// verstaendliche Fehlermeldung.Eigene, konservative Timeouts (Seite 6s,
// beide Logos parallel je 2.5s) plus maxDuration sorgen dafuer, dass wir
// in jedem Fall innerhalb des Limits noch selbst antworten koennen.
export const maxDuration = 10;
const PAGE_FETCH_TIMEOUT_MS = 6000;
const LOGO_FETCH_TIMEOUT_MS = 2500;

function extractName(html: string, varName: string): string | null {
  const m = html.match(new RegExp(`${varName}='([^']*)'`));
  const value = m?.[1]?.trim();
  return value ? value : null;
}

function extractLogoUrls(html: string): string[] {
  const matches = html.matchAll(
    /(?:https?:)?\/\/www\.fussball\.de\/export\.media\/-\/action\/getLogo\/format\/0\/[^"'\s]+/g
  );
  return [...matches].map((m) => {
    const url = m[0];
    return url.startsWith("//") ? `https:${url}` : url;
  });
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
  // Alles in einen aeusseren try/catch gewickelt: schlaegt irgendetwas
  // unerwartet fehl (statt der schon erwarteten Fehlerfaelle unten),
  // bekommt der Client trotzdem eine verstaendliche JSON-Fehlermeldung
  // statt eines rohen Verbindungsabbruchs.
  try {
    const body = await request.json().catch(() => null);
    const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";
    if (!rawUrl) {
      return NextResponse.json(
        { error: "Bitte einen Link zu einer Fußball.de-Partie angeben." },
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

    const homeName = extractName(html, "edHeimmannschaftName");
    const awayName = extractName(html, "edGastmannschaftName");
    const logoUrls = extractLogoUrls(html);

    if (!homeName || !awayName || logoUrls.length !== 2) {
      return NextResponse.json(
        {
          error:
            "Auf dieser Seite konnten nicht eindeutig zwei Mannschaften erkannt werden. Bitte den Link zu einer einzelnen Spielpartie (Spielbericht) verwenden.",
        },
        { status: 422 }
      );
    }

    const [homeLogoDataUrl, awayLogoDataUrl] = await Promise.all([
      fetchLogoAsDataUrl(logoUrls[0]),
      fetchLogoAsDataUrl(logoUrls[1]),
    ]);

    return NextResponse.json({
      home: { name: homeName, logoDataUrl: homeLogoDataUrl },
      away: { name: awayName, logoDataUrl: awayLogoDataUrl },
    });
  } catch (e) {
    console.error("fussballde-import: unerwarteter Fehler", e);
    return NextResponse.json(
      { error: "Unerwarteter Fehler beim Import. Bitte erneut versuchen." },
      { status: 500 }
    );
  }
}
