import Link from "next/link";

// Bettet den bisherigen (jetzt server-persistenten) Taktiktafel-Editor per
// iframe ein. Das isoliert dessen eigenes CSS/JS vollstaendig vom Rest der
// Next.js-App (u. a. von Tailwinds globalem Preflight-Reset in
// globals.css) -- der Editor laeuft exakt so wie zuvor als eigenstaendige
// Seite, nur dass seine Daten jetzt aus Postgres statt aus localStorage
// kommen.
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
        <Link href="/team" style={{ color: "#f8fafc", textDecoration: "underline" }}>
          Einfache Kaderliste
        </Link>
      </div>
      <iframe
        src="/taktik-app"
        title="Taktiktafel-Editor"
        style={{ flex: 1, border: "none", width: "100%" }}
      />
    </div>
  );
}
