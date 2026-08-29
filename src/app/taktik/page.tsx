import { logout } from "../login/actions";

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
export default function TaktikPage() {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          background: "#0f172a",
          color: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
          fontSize: 14,
        }}
      >
        <strong>SVKT Taktikboard</strong>
        <form action={logout}>
          <button
            type="submit"
            style={{
              color: "#f8fafc",
              background: "transparent",
              border: "1px solid #334155",
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Abmelden
          </button>
        </form>
      </div>
      <iframe
        src="/taktik-app"
        title="Taktiktafel-Editor"
        style={{ flex: 1, border: "none", width: "100%" }}
      />
    </div>
  );
}
