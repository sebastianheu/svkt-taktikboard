// Bettet den bisherigen (jetzt server-persistenten) Taktiktafel-Editor per
// iframe ein. Das isoliert dessen eigenes CSS/JS vollstaendig vom Rest der
// Next.js-App (u. a. von Tailwinds globalem Preflight-Reset in
// globals.css) -- der Editor laeuft exakt so wie zuvor als eigenstaendige
// Seite, nur dass seine Daten jetzt aus Postgres statt aus localStorage
// kommen.
//
// Die frühere separate "/team"-Kaderliste wurde entfernt: der Team-Tab
// im Editor deckt denselben Datensatz (Tabelle "players") vollstaendig
// ab und zusaetzlich CSV/Excel-Import sowie Drag&Drop aufs Spielfeld --
// die einfache Liste war damit eine reine Teilmenge ohne eigenen Nutzen.
//
// Der Abmelden-Button lebt im Editor-Header selbst (oben rechts neben
// "Neue Taktik", siehe editor.source.html) statt in einer eigenen Leiste
// hier aussen -- ein <form action> per Next.js-Server-Action ist aus dem
// isolierten iframe-Dokument heraus nicht aufrufbar, daher POSTet der
// Button dort stattdessen mit target="_top" auf /api/logout.
export default function TaktikPage() {
  return (
    <iframe
      src="/taktik-app"
      title="Taktiktafel-Editor"
      style={{ height: "100vh", width: "100%", border: "none", display: "block" }}
    />
  );
}
