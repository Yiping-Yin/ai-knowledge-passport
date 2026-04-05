import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--surface)]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-10 px-6 py-16">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">AI-Mountable Personal Knowledge Base</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight text-[var(--ink)]">
            Help any AI understand your foundation, current goal, and blind spots without starting from zero.
          </h1>
          <p className="mt-6 text-lg leading-8 text-[var(--muted)]">
            This system compiles private materials into signals, postcards, passports, visas, governed avatars, and export bundles. The passport is the canonical AI entry object. Everything deeper stays explicitly authorized.
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <Link href="/dashboard" className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white">
            Open Dashboard
          </Link>
          <Link href="/signals" className="rounded-full border border-[var(--line)] px-6 py-3 text-sm">
            Open Signals
          </Link>
          <Link href="/passport" className="rounded-full border border-[var(--line)] px-6 py-3 text-sm">
            Open Passport
          </Link>
          <Link href="/visas" className="rounded-full border border-[var(--line)] px-6 py-3 text-sm">
            Open Mount Center
          </Link>
        </div>

        <section className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-[28px] border border-[var(--line)] bg-white/70 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Core Loop</p>
            <p className="mt-4 text-xl font-semibold">Import {"->"} Compile {"->"} Signals {"->"} Passport</p>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Turn raw sources into accepted knowledge, capability signals, mistake patterns, and an active focus card before any AI reads deeper.
            </p>
          </article>
          <article className="rounded-[28px] border border-[var(--line)] bg-white/70 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Mount Layer</p>
            <p className="mt-4 text-xl font-semibold">Passport {"->"} Visa {"->"} Feedback</p>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Narrow the passport into a read-only visa bundle with logs, expiry, redaction, and lightweight external flowback.
            </p>
          </article>
          <article className="rounded-[28px] border border-[var(--line)] bg-white/70 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Governed AI</p>
            <p className="mt-4 text-xl font-semibold">Agent Pack {"->"} Avatar {"->"} Export</p>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Bind bounded context to avatars, run governed sessions, and export cross-AI bundles without exposing the whole local base.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
