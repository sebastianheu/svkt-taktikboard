import { getDb } from "@/lib/db";
import { logout } from "../login/actions";
import TeamClient, { type Player } from "./TeamClient";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const sql = await getDb();
  const rows = (await sql`
    SELECT id, first_name, last_name, nickname, position1, position2,
           birthdate, number, initials, starting, injured, hidden
    FROM players
    ORDER BY number NULLS LAST, last_name ASC
  `) as Player[];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">SVKT Taktikboard</h1>
          <p className="text-sm text-slate-400">Team &amp; Kader</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:border-slate-500 hover:text-slate-50"
          >
            Abmelden
          </button>
        </form>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <TeamClient initialPlayers={rows} />
      </main>
    </div>
  );
}
