"use client";

import {
  Circle,
  Code2,
  FileCode2,
  Globe,
  Layers,
  Loader2,
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  createProject,
  fetchProjects,
  fetchTemplates,
  type Project,
  type Template,
  type TemplateId,
} from "@/lib/api";
import { ENGINE_STACK, SANDBOX_LANGUAGES, STACK_CLARIFICATION } from "@/lib/stack";

const ICONS: Record<TemplateId, typeof Code2> = {
  python: FileCode2,
  javascript: Code2,
  html: Globe,
};

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<TemplateId>("python");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, t] = await Promise.all([fetchProjects(), fetchTemplates()]);
        if (cancelled) return;
        setProjects(p);
        setTemplates(t);
      } catch (err) {
        if (!cancelled) {
          setError(
            (err as Error).message +
              " — start the backend with `npm run dev` in /backend."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const project = await createProject({ name: name.trim(), language });
      router.push(`/repl/${project.slug}`);
    } catch (err) {
      setError((err as Error).message);
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 top-0 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(62,207,142,0.16),transparent_65%)] blur-2xl" />
        <div className="absolute right-0 top-10 h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,rgba(56,120,180,0.18),transparent_60%)] blur-2xl" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(232,238,247,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(232,238,247,0.6) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 pb-2 pt-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--bg-deep)] shadow-[0_0_24px_rgba(62,207,142,0.35)]">
            <Circle className="h-4 w-4 fill-current" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">Aether</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Cloud IDE
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/stack"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <Layers className="h-4 w-4" />
            Stack
          </Link>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--bg-deep)] transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            Create Repl
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 pb-16 pt-10">
        <section className="max-w-2xl">
          <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[var(--accent)]">
            <Sparkles className="h-3.5 w-3.5" />
            Write · Run · Share
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-5xl">
            Aether
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[var(--text-muted)] sm:text-lg">
            An online IDE in your browser — file explorer, Monaco editor, and a
            live console. Create a Repl, write code, and run it without local
            setup.
          </p>
        </section>

        {error && (
          <div className="mt-8 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        <section className="mt-14 max-w-3xl">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Engine vs sandbox
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
            {STACK_CLARIFICATION.body}
          </p>
          <p className="mt-4 mono text-xs leading-relaxed text-[var(--accent)]">
            Engine: {ENGINE_STACK.slice(0, 4).map((e) => e.name.split("·")[0].trim()).join(" · ")}
            {" · "}…
          </p>
          <p className="mt-2 mono text-xs leading-relaxed text-[var(--text-muted)]">
            Runnable now:{" "}
            {SANDBOX_LANGUAGES.filter((l) => l.category !== "planned")
              .map((l) => l.label)
              .join(" · ")}
          </p>
          <Link
            href="/stack"
            className="mt-4 inline-flex text-sm font-medium text-[var(--accent)] transition hover:underline"
          >
            Full stack map →
          </Link>
        </section>

        <section className="mt-12">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Your Repls
              </h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Open a project or spin up a new one from a template.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-12 text-sm text-[var(--text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading projects…
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => {
                const Icon = ICONS[project.language] ?? Code2;
                return (
                  <Link
                    key={project.slug}
                    href={`/repl/${project.slug}`}
                    prefetch
                    className="group relative z-10 block rounded-xl border border-[var(--border)] bg-[var(--bg-panel)]/80 p-4 transition hover:border-[var(--accent-dim)] hover:bg-[var(--bg-elevated)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--bg-hover)] text-[var(--accent)] transition group-hover:scale-105">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                        {project.language}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-medium text-[var(--text)]">
                      {project.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--text-muted)]">
                      {project.description}
                    </p>
                    <p className="mt-3 text-[11px] text-[var(--text-muted)]">
                      Updated {formatRelative(project.updatedAt)}
                    </p>
                  </Link>
                );
              })}

              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] bg-transparent p-4 text-sm text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <Plus className="h-5 w-5" />
                New Repl
              </button>
            </div>
          )}
        </section>
      </main>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-5 shadow-2xl"
          >
            <h2 className="text-lg font-semibold">Create a Repl</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Pick a language template — Aether sets up the workspace for you.
            </p>

            <label className="mt-5 block text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Name
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-cool-project"
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-deep)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
            </label>

            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Template
            </p>
            <div className="mt-2 space-y-2">
              {templates.map((t) => {
                const Icon = ICONS[t.id] ?? Code2;
                const selected = language === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setLanguage(t.id)}
                    className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                      selected
                        ? "border-[var(--accent)] bg-[var(--accent-dim)]/20"
                        : "border-[var(--border)] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                    <span>
                      <span className="block text-sm font-medium">{t.label}</span>
                      <span className="block text-xs text-[var(--text-muted)]">
                        {t.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-lg px-3 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !name.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--bg-deep)] disabled:opacity-40"
              >
                {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Create & open
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
