import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <h1 className="mb-1 text-xl font-semibold text-slate-50">
          SVKT Taktikboard
        </h1>
        <p className="mb-6 text-sm text-slate-400">
          Zugangscode eingeben, um fortzufahren.
        </p>

        <form action={login} className="flex flex-col gap-4">
          <input
            type="password"
            name="code"
            autoFocus
            required
            placeholder="Zugangscode"
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-amber-400 px-4 py-2.5 font-medium text-slate-950 transition hover:bg-amber-300"
          >
            Anmelden
          </button>
        </form>

        {error === "1" && (
          <p className="mt-4 text-sm text-red-400">
            Zugangscode ist falsch. Bitte erneut versuchen.
          </p>
        )}
        {error === "config" && (
          <p className="mt-4 text-sm text-red-400">
            Der Zugangscode ist auf diesem Server noch nicht eingerichtet
            (Umgebungsvariable AUTH_PASSCODE fehlt).
          </p>
        )}
      </div>
    </div>
  );
}
