import Link from "next/link";
import type { ReactNode } from "react";

import { Activity, BadgeCheck, BookOpenText, Bot, Database, Download, FileSearch, Files, HeartPulse, Key, LayoutDashboard, LibraryBig, ScrollText, Shield, SlidersHorizontal, Target, Waypoints, Workflow } from "lucide-react";
import clsx from "clsx";

const coreNavigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Files },
  { href: "/knowledge", label: "Knowledge", icon: LibraryBig },
  { href: "/signals", label: "Signals", icon: Target },
  { href: "/postcards", label: "Postcards", icon: Activity },
  { href: "/passport", label: "Passport", icon: Shield },
  { href: "/review", label: "Review Queue", icon: BadgeCheck },
  { href: "/research", label: "Research", icon: FileSearch }
];

const advancedNavigation = [
  { href: "/outputs", label: "Outputs", icon: BookOpenText },
  { href: "/visas", label: "Mount Center", icon: Key },
  { href: "/avatars", label: "Avatars", icon: Bot },
  { href: "/exports", label: "Exports", icon: Download },
  { href: "/policies", label: "Policies", icon: SlidersHorizontal },
  { href: "/grants", label: "Grants", icon: Key },
  { href: "/compilation-runs", label: "Compilation Runs", icon: Workflow },
  { href: "/health", label: "Health Center", icon: HeartPulse },
  { href: "/visuals", label: "Visuals", icon: Waypoints },
  { href: "/audit", label: "Audit Log", icon: ScrollText },
  { href: "/fragments", label: "Fragments", icon: FileSearch }
];

export function PageShell(props: { currentPath: string; title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-5 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-5 backdrop-blur">
          <div className="mb-8 flex items-start gap-3">
            <div className="rounded-2xl bg-[var(--accent-soft)] p-3 text-[var(--accent)]">
              <Database size={24} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">AI-mountable</p>
              <h1 className="mt-1 text-xl font-semibold">Knowledge Base</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Help any AI understand your foundation, current goal, and blind spots under local control and explicit authorization.
              </p>
            </div>
          </div>

          <nav className="space-y-6">
            <div>
              <p className="mb-2 px-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Core</p>
              <div className="space-y-2">
                {coreNavigation.map((item) => {
                  const Icon = item.icon;
                  const active = props.currentPath === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition",
                        active
                          ? "bg-[var(--accent)] text-white shadow-lg shadow-green-900/20"
                          : "text-[var(--muted)] hover:bg-white/70 hover:text-[var(--ink)]"
                      )}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 px-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Advanced</p>
              <div className="space-y-2">
                {advancedNavigation.map((item) => {
                  const Icon = item.icon;
                  const active = props.currentPath === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition",
                        active
                          ? "bg-[var(--accent)] text-white shadow-lg shadow-green-900/20"
                          : "text-[var(--muted)] hover:bg-white/70 hover:text-[var(--ink)]"
                      )}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>

          <div className="mt-8 rounded-3xl border border-[var(--line)] bg-[var(--surface-strong)] p-4 text-sm text-[var(--muted)]">
            <p className="font-medium text-[var(--ink)]">Primary Loop</p>
            <p className="mt-2 leading-6">
              Import, compile, synthesize signals, publish postcards, generate a passport, and mount only what an AI needs.
            </p>
          </div>
        </aside>

        <main className="space-y-6">
          <header className="rounded-[30px] border border-[var(--line)] bg-[var(--surface-strong)] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{props.title}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">{props.subtitle}</h2>
          </header>
          {props.children}
        </main>
      </div>
    </div>
  );
}
