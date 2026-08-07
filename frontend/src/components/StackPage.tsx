"use client";

import {
  ArrowLeft,
  Boxes,
  Circle,
  Cloud,
  Cpu,
  Database,
  Layers,
  Sparkles,
  Terminal,
} from "lucide-react";
import Link from "next/link";
import {
  ENGINE_STACK,
  LAYER_LABELS,
  SANDBOX_LANGUAGES,
  STACK_CLARIFICATION,
  type EngineComponent,
  type StackLayer,
} from "@/lib/stack";

const LAYER_ORDER: StackLayer[] = [
  "frontend",
  "backend",
  "ai",
  "systems",
  "browser",
  "infra",
];

const LAYER_ICON: Record<StackLayer, typeof Layers> = {
  frontend: Layers,
  backend: Cloud,
  ai: Sparkles,
  systems: Cpu,
  browser: Boxes,
  infra: Database,
};

const STATUS_STYLE = {
  shipped: "text-[var(--accent)] border-[var(--accent)]/40 bg-[var(--accent)]/10",
  partial: "text-[var(--warn)] border-[var(--warn)]/40 bg-[var(--warn)]/10",
  roadmap: "text-[var(--text-muted)] border-[var(--border)] bg-[var(--bg-hover)]/40",
} as const;

const STATUS_LABEL = {
  shipped: "In Aether",
  partial: "Partial",
  roadmap: "Roadmap",
} as const;

function groupByLayer(items: EngineComponent[]) {
  return LAYER_ORDER.map((layer) => ({
    layer,
    items: items.filter((i) => i.layer === layer),
  })).filter((g) => g.items.length > 0);
}

export function StackPage() {
  const groups = groupByLayer(ENGINE_STACK);
  const runnable = SANDBOX_LANGUAGES.filter((l) => l.category !== "planned");
  const planned = SANDBOX_LANGUAGES.filter((l) => l.category === "planned");

  return (
    <div className="min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-20 top-0 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(62,207,142,0.14),transparent_65%)] blur-2xl" />
        <div className="absolute right-0 top-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(56,120,180,0.16),transparent_60%)] blur-2xl" />
      </div>

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 pb-2 pt-8">
        <Link href="/" className="flex items-center gap-3 transition hover:opacity-90">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--bg-deep)] shadow-[0_0_24px_rgba(62,207,142,0.35)]">
            <Circle className="h-4 w-4 fill-current" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">Aether</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Cloud IDE
            </p>
          </div>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Repls
        </Link>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 pb-20 pt-10">
        <section className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[var(--accent)]">
            <Terminal className="h-3.5 w-3.5" />
            Engine · Sandbox · Infra
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-5xl">
            How Aether is built
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[var(--text-muted)] sm:text-lg">
            Modeled on Replit’s stack: TypeScript for the browser IDE, systems
            languages for sandboxes, and separate runtimes for the languages
            you write inside a Repl.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {STACK_CLARIFICATION.title}
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-[var(--text)]">
            {STACK_CLARIFICATION.body}
          </p>
        </section>

        <section className="mt-16 space-y-12">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              Engine stack
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">
              Languages and systems that power the product — not the languages
              inside your Repl.
            </p>
          </div>

          {groups.map(({ layer, items }) => {
            const Icon = LAYER_ICON[layer];
            return (
              <div key={layer}>
                <div className="mb-4 flex items-center gap-2 text-[var(--accent)]">
                  <Icon className="h-4 w-4" />
                  <h3 className="text-sm font-semibold tracking-wide text-[var(--text)]">
                    {LAYER_LABELS[layer]}
                  </h3>
                </div>
                <ul className="space-y-4 border-l border-[var(--border)] pl-5">
                  {items.map((item, index) => (
                    <li
                      key={item.id}
                      className="stack-row opacity-0 animate-[fadeUp_0.5s_ease_forwards]"
                      style={{ animationDelay: `${index * 60}ms` }}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="mono text-sm font-medium text-[var(--text)]">
                          {item.name}
                        </p>
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLE[item.aetherStatus]}`}
                        >
                          {STATUS_LABEL[item.aetherStatus]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
                        {item.role}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                        Aether: {item.aetherNote}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        <section className="mt-16">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Sandbox languages
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">
            What you can code and run in Aether today — with a Replit-style
            runway toward 50+ languages.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {runnable.map((lang, index) => (
              <span
                key={lang.id}
                className="mono rounded-md border border-[var(--accent)]/35 bg-[var(--accent)]/10 px-2.5 py-1.5 text-xs text-[var(--accent)] opacity-0 animate-[fadeUp_0.45s_ease_forwards]"
                style={{ animationDelay: `${80 + index * 40}ms` }}
                title={lang.note}
              >
                {lang.label}
              </span>
            ))}
          </div>

          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Planned runners
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {planned.map((lang) => (
              <span
                key={lang.id}
                className="mono rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--text-muted)]"
                title={lang.note}
              >
                {lang.label}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-16 max-w-3xl">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Aether layers (live)
          </h2>
          <ol className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--text-muted)]">
            <li>
              <span className="font-medium text-[var(--text)]">1. Frontend IDE</span>{" "}
              — Next.js + Monaco + TypeScript.
            </li>
            <li>
              <span className="font-medium text-[var(--text)]">2. API</span>{" "}
              — Express projects / files / run orchestrator + Socket.io.
            </li>
            <li>
              <span className="font-medium text-[var(--text)]">3. Sandbox</span>{" "}
              — Docker containers (Judge0 / process fallback).
            </li>
            <li>
              <span className="font-medium text-[var(--text)]">4. Host</span>{" "}
              — AWS EC2 primary; Azure VMAzule alternate.
            </li>
          </ol>
          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--bg-deep)] transition hover:brightness-110"
          >
            Open the IDE
          </Link>
        </section>
      </main>
    </div>
  );
}
