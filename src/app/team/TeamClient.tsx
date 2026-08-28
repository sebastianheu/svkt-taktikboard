"use client";

import { useMemo, useState } from "react";

export type Player = {
  id: string;
  first_name: string;
  last_name: string;
  nickname: string;
  position1: string;
  position2: string;
  birthdate: string | null;
  number: number | null;
  initials: string;
  starting: boolean;
  injured: boolean;
  hidden: boolean;
};

const POSITION_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "-" },
  { value: "TW", label: "TW - Torwart" },
  { value: "AV", label: "AV - Aussenverteidiger" },
  { value: "IV", label: "IV - Innenverteidiger" },
  { value: "DM", label: "DM - Def. Mittelfeld" },
  { value: "ZM", label: "ZM - Zentr. Mittelfeld" },
  { value: "OM", label: "OM - Off. Mittelfeld" },
  { value: "FL", label: "FL - Fluegel" },
  { value: "ST", label: "ST - Sturm" },
];

const emptyForm = {
  firstName: "",
  lastName: "",
  nickname: "",
  position1: "",
  position2: "",
  birthdate: "",
  number: "",
  initials: "",
};

export default function TeamClient({ initialPlayers }: { initialPlayers: Player[] }) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const startingCount = useMemo(() => players.filter((p) => p.starting).length, [players]);

  function setRowError(id: string, message: string | null) {
    setRowErrors((prev) => {
      const next = { ...prev };
      if (message) next[id] = message;
      else delete next[id];
      return next;
    });
  }

  function markSaving(id: string, value: boolean) {
    setSavingIds((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function refreshPlayers() {
    const res = await fetch("/api/players");
    if (res.ok) {
      const data = await res.json();
      setPlayers(data.players);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("Vorname und Nachname sind Pflichtfelder.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Spieler konnte nicht angelegt werden.");
        return;
      }
      setForm(emptyForm);
      await refreshPlayers();
    } catch {
      setError("Netzwerkfehler beim Anlegen des Spielers.");
    } finally {
      setCreating(false);
    }
  }

  async function patchPlayer(id: string, patch: Record<string, unknown>) {
    markSaving(id, true);
    setRowError(id, null);
    // Optimistisches Update, damit Klicks (z. B. Startelf-Toggle) sofort
    // sichtbar reagieren; bei Fehler (z. B. 409 Startelf voll) wird unten
    // wieder neu vom Server geladen.
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? ({ ...p, ...patch } as Player) : p))
    );
    try {
      const res = await fetch(`/api/players/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRowError(id, data.error ?? "Aenderung fehlgeschlagen.");
        await refreshPlayers();
      }
    } catch {
      setRowError(id, "Netzwerkfehler.");
      await refreshPlayers();
    } finally {
      markSaving(id, false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Diesen Spieler wirklich endgueltig loeschen?")) return;
    markSaving(id, true);
    try {
      const res = await fetch(`/api/players/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPlayers((prev) => prev.filter((p) => p.id !== id));
      } else {
        setRowError(id, "Loeschen fehlgeschlagen.");
      }
    } catch {
      setRowError(id, "Netzwerkfehler.");
    } finally {
      markSaving(id, false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-100">Neuen Spieler anlegen</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <input
            placeholder="Vorname *"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
          />
          <input
            placeholder="Nachname *"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
          />
          <input
            placeholder="Spitzname"
            value={form.nickname}
            onChange={(e) => setForm({ ...form, nickname: e.target.value })}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
          />
          <input
            placeholder="Initialen"
            maxLength={4}
            value={form.initials}
            onChange={(e) => setForm({ ...form, initials: e.target.value })}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
          />
          <select
            value={form.position1}
            onChange={(e) => setForm({ ...form, position1: e.target.value })}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
          >
            {POSITION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={form.position2}
            onChange={(e) => setForm({ ...form, position2: e.target.value })}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
          >
            {POSITION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Nr."
            min={0}
            max={99}
            value={form.number}
            onChange={(e) => setForm({ ...form, number: e.target.value })}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
          />
          <input
            type="date"
            value={form.birthdate}
            onChange={(e) => setForm({ ...form, birthdate: e.target.value })}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 focus:border-amber-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={creating}
            className="col-span-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-amber-300 disabled:opacity-50 sm:col-span-4"
          >
            {creating ? "Wird angelegt..." : "Spieler hinzufuegen"}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">Kader ({players.length})</h2>
          <span
            className={`text-sm ${startingCount >= 11 ? "text-amber-400" : "text-slate-400"}`}
          >
            Startelf: {startingCount} / 11
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-2">Nr.</th>
                <th className="py-2 pr-2">Name</th>
                <th className="py-2 pr-2">Spitzname</th>
                <th className="py-2 pr-2">Initialen</th>
                <th className="py-2 pr-2">Position 1</th>
                <th className="py-2 pr-2">Position 2</th>
                <th className="py-2 pr-2">Geburtsdatum</th>
                <th className="py-2 pr-2 text-center">Startelf</th>
                <th className="py-2 pr-2 text-center">Verletzt</th>
                <th className="py-2 pr-2 text-center">Ausgebl.</th>
                <th className="py-2 pr-2"></th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => {
                const saving = savingIds.has(p.id);
                const disableStarting = !p.starting && startingCount >= 11;
                return (
                  <tr key={p.id} className="border-b border-slate-800/60 align-middle">
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        min={0}
                        max={99}
                        defaultValue={p.number ?? ""}
                        onBlur={(e) =>
                          patchPlayer(p.id, {
                            number: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                        className="w-14 rounded border border-slate-700 bg-slate-800 px-2 py-1"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <div className="flex flex-col gap-1 sm:flex-row">
                        <input
                          defaultValue={p.first_name}
                          onBlur={(e) => patchPlayer(p.id, { firstName: e.target.value })}
                          className="w-24 rounded border border-slate-700 bg-slate-800 px-2 py-1"
                        />
                        <input
                          defaultValue={p.last_name}
                          onBlur={(e) => patchPlayer(p.id, { lastName: e.target.value })}
                          className="w-24 rounded border border-slate-700 bg-slate-800 px-2 py-1"
                        />
                      </div>
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        defaultValue={p.nickname}
                        onBlur={(e) => patchPlayer(p.id, { nickname: e.target.value })}
                        className="w-20 rounded border border-slate-700 bg-slate-800 px-2 py-1"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        defaultValue={p.initials}
                        maxLength={4}
                        onBlur={(e) => patchPlayer(p.id, { initials: e.target.value })}
                        className="w-16 rounded border border-slate-700 bg-slate-800 px-2 py-1"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        defaultValue={p.position1}
                        onChange={(e) => patchPlayer(p.id, { position1: e.target.value })}
                        className="rounded border border-slate-700 bg-slate-800 px-2 py-1"
                      >
                        {POSITION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        defaultValue={p.position2}
                        onChange={(e) => patchPlayer(p.id, { position2: e.target.value })}
                        className="rounded border border-slate-700 bg-slate-800 px-2 py-1"
                      >
                        {POSITION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="date"
                        defaultValue={p.birthdate ? p.birthdate.slice(0, 10) : ""}
                        onChange={(e) => patchPlayer(p.id, { birthdate: e.target.value || null })}
                        className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-300"
                      />
                    </td>
                    <td className="py-2 pr-2 text-center">
                      <input
                        type="checkbox"
                        checked={p.starting}
                        disabled={disableStarting}
                        onChange={(e) => patchPlayer(p.id, { starting: e.target.checked })}
                        className="h-4 w-4 accent-amber-400 disabled:opacity-30"
                        title={disableStarting ? "Startelf ist bereits voll (max. 11)" : ""}
                      />
                    </td>
                    <td className="py-2 pr-2 text-center">
                      <input
                        type="checkbox"
                        checked={p.injured}
                        onChange={(e) => patchPlayer(p.id, { injured: e.target.checked })}
                        className="h-4 w-4 accent-red-400"
                      />
                    </td>
                    <td className="py-2 pr-2 text-center">
                      <input
                        type="checkbox"
                        checked={p.hidden}
                        onChange={(e) => patchPlayer(p.id, { hidden: e.target.checked })}
                        className="h-4 w-4 accent-slate-400"
                      />
                    </td>
                    <td className="py-2 pr-2 text-right">
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={saving}
                        className="rounded border border-red-900 px-2 py-1 text-xs text-red-400 transition hover:bg-red-950 disabled:opacity-50"
                      >
                        Loeschen
                      </button>
                      {rowErrors[p.id] && (
                        <p className="mt-1 text-xs text-red-400">{rowErrors[p.id]}</p>
                      )}
                    </td>
                  </tr>
                );
              })}
              {players.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-6 text-center text-slate-500">
                    Noch keine Spielerinnen angelegt.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
