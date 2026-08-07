"use client";

import {
  ArrowLeft,
  Circle,
  Eye,
  Layers,
  Loader2,
  Play,
  Save,
  TerminalSquare,
  Wifi,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { CodeEditor } from "@/components/CodeEditor";
import { FileTree } from "@/components/FileTree";
import { TerminalPanel, type TerminalLine } from "@/components/TerminalPanel";
import {
  defaultEntry,
  fetchFile,
  fetchProject,
  fetchTree,
  getApiBase,
  runnableLanguage,
  saveFile,
  type FileNode,
  type Project,
} from "@/lib/api";
import { runJavascriptInBrowser } from "@/lib/wasmRunner";

let lineCounter = 0;
function nextId() {
  lineCounter += 1;
  return `line-${Date.now()}-${lineCounter}`;
}

function findFile(nodes: FileNode[], target: string): FileNode | null {
  for (const node of nodes) {
    if (node.type === "file" && node.path === target) return node;
    if (node.children) {
      const hit = findFile(node.children, target);
      if (hit) return hit;
    }
  }
  return null;
}

function firstFile(nodes: FileNode[]): FileNode | null {
  for (const node of nodes) {
    if (node.type === "file") return node;
    if (node.children) {
      const hit = firstFile(node.children);
      if (hit) return hit;
    }
  }
  return null;
}

export function IdeApp({ slug }: { slug: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [tree, setTree] = useState<FileNode[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [loadingFile, setLoadingFile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [sandboxMode, setSandboxMode] = useState<string>("…");
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [terminalHeight, setTerminalHeight] = useState(220);
  const [panelMode, setPanelMode] = useState<"console" | "preview">("console");
  const [previewDoc, setPreviewDoc] = useState("");
  const fileCacheRef = useRef<Record<string, string>>({});
  const socketRef = useRef<Socket | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const engineRef = useRef<"go" | "node">("node");
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  const appendLine = useCallback((kind: TerminalLine["kind"], text: string) => {
    setLines((prev) => [...prev, { id: nextId(), kind, text }]);
  }, []);

  const runViaHttp = useCallback(
    async (language: "javascript" | "python", code: string) => {
      setRunning(true);
      appendLine("system", `› Running ${language}…`);
      try {
        const res = await fetch(`${getApiBase()}/api/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language, code }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error ?? "Run failed");
        if (result.stdout) {
          appendLine("stdout", String(result.stdout).replace(/\n$/, ""));
        }
        if (result.stderr) {
          appendLine("stderr", String(result.stderr).replace(/\n$/, ""));
        }
        setSandboxMode(result.mode ?? "process");
        appendLine(
          "meta",
          `Process exited with code ${result.exitCode} (${result.mode}${
            result.timedOut ? ", timed out" : ""
          })`
        );
      } catch (err) {
        appendLine("stderr", (err as Error).message);
      } finally {
        setRunning(false);
      }
    },
    [appendLine]
  );

  const dirty = activePath !== null && content !== savedContent;
  const runLang = useMemo(
    () => (activePath ? runnableLanguage(activePath) : null),
    [activePath]
  );
  const isHtmlProject = project?.language === "html";



  const refreshTree = useCallback(async () => {
    const next = await fetchTree(slug);
    setTree(next);
    return next;
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [health, proj, next] = await Promise.all([
          fetch(`${getApiBase()}/api/health`).then((r) => r.json()),
          fetchProject(slug),
          refreshTree(),
        ]);
        if (cancelled) return;
        setSandboxMode(health.sandbox ?? "unknown");
        setProject(proj);
        if (proj.language === "html") setPanelMode("preview");
        const prefer =
          findFile(next, defaultEntry(proj)) ?? firstFile(next);
        if (prefer) setActivePath(prefer.path);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, refreshTree]);

  useEffect(() => {
    if (!activePath) return;
    let cancelled = false;
    setLoadingFile(true);
    setError(null);
    fetchFile(slug, activePath)
      .then((file) => {
        if (cancelled) return;
        setContent(file.content);
        setSavedContent(file.content);
        fileCacheRef.current[activePath] = file.content;
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingFile(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activePath, slug]);

  useEffect(() => {
    let cancelled = false;
    let socket: Socket | null = null;
    let ws: WebSocket | null = null;

    (async () => {
      try {
        const health = await fetch(`${getApiBase()}/api/health`).then((r) =>
          r.json()
        );
        if (cancelled) return;
        if (health.engine === "go") {
          engineRef.current = "go";
          const base = getApiBase().replace(/^http/, "ws");
          ws = new WebSocket(`${base}/ws`);
          wsRef.current = ws;
          ws.onopen = () => {
            setConnected(true);
            ws?.send(JSON.stringify({ type: "join", room: slug }));
          };
          ws.onclose = () => setConnected(false);
          ws.onmessage = (ev) => {
            try {
              const msg = JSON.parse(String(ev.data));
              const typ = msg.type as string;
              if (typ === "ready" && msg.message) {
                appendLine("meta", String(msg.message));
              } else if (typ === "run:start") {
                setRunning(true);
                appendLine("system", `› Running ${msg.language}…`);
              } else if (typ === "run:stdout") {
                appendLine(
                  "stdout",
                  String(msg.chunk ?? "").replace(/\n$/, "")
                );
              } else if (typ === "run:stderr") {
                appendLine(
                  "stderr",
                  String(msg.chunk ?? "").replace(/\n$/, "")
                );
              } else if (typ === "run:end") {
                setSandboxMode(msg.mode ?? "rust");
                appendLine(
                  "meta",
                  `Process exited with code ${msg.exitCode} (${msg.mode}${
                    msg.timedOut ? ", timed out" : ""
                  })`
                );
                setRunning(false);
              } else if (typ === "run:error") {
                appendLine("stderr", String(msg.error ?? "Run failed"));
                setRunning(false);
              }
            } catch {
              /* ignore */
            }
          };
          return;
        }
      } catch {
        /* fall through */
      }

      if (cancelled) return;
      engineRef.current = "node";
      socket = io(getApiBase(), {
        transports: ["polling", "websocket"],
        reconnection: true,
        timeout: 8000,
      });
      socketRef.current = socket;
      socket.on("connect", () => setConnected(true));
      socket.on("disconnect", () => setConnected(false));
      socket.on("ready", (payload: { message?: string }) => {
        if (payload?.message) appendLine("meta", payload.message);
      });
      socket.on("run:start", (payload: { language: string }) => {
        setRunning(true);
        appendLine("system", `› Running ${payload.language}…`);
      });
      socket.on("run:stdout", (payload: { data?: string; chunk?: string }) => {
        appendLine(
          "stdout",
          String(payload.data ?? payload.chunk ?? "").replace(/\n$/, "")
        );
      });
      socket.on("run:stderr", (payload: { data?: string; chunk?: string }) => {
        appendLine(
          "stderr",
          String(payload.data ?? payload.chunk ?? "").replace(/\n$/, "")
        );
      });
      socket.on(
        "run:end",
        (payload: { exitCode: number; mode: string; timedOut: boolean }) => {
          setRunning(false);
          setSandboxMode(payload.mode);
          appendLine(
            "meta",
            `Process exited with code ${payload.exitCode} (${payload.mode}${
              payload.timedOut ? ", timed out" : ""
            })`
          );
        }
      );
      socket.on("run:error", (payload: { error: string }) => {
        setRunning(false);
        appendLine("stderr", payload.error);
      });
    })();

    return () => {
      cancelled = true;
      socket?.disconnect();
      ws?.close();
      socketRef.current = null;
      wsRef.current = null;
    };
  }, [appendLine, slug]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = dragRef.current.startY - e.clientY;
      const next = Math.min(
        480,
        Math.max(120, dragRef.current.startH + delta)
      );
      setTerminalHeight(next);
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const buildPreview = useCallback(async () => {
    if (!isHtmlProject) return;
    const cache = { ...fileCacheRef.current };
    if (activePath) cache[activePath] = content;

    const ensure = async (path: string) => {
      if (cache[path] != null) return cache[path];
      try {
        const file = await fetchFile(slug, path);
        cache[path] = file.content;
        return file.content;
      } catch {
        return "";
      }
    };

    let html = await ensure("index.html");
    const css = await ensure("style.css");
    const js = await ensure("script.js");

    if (css) {
      html = html.includes('href="style.css"')
        ? html.replace(
            /<link[^>]*href="style\.css"[^>]*>/i,
            `<style>${css}</style>`
          )
        : html.replace("</head>", `<style>${css}</style></head>`);
    }
    if (js) {
      html = html.includes('src="script.js"')
        ? html.replace(
            /<script[^>]*src="script\.js"[^>]*><\/script>/i,
            `<script>${js}<\/script>`
          )
        : html.replace("</body>", `<script>${js}<\/script></body>`);
    }

    fileCacheRef.current = cache;
    setPreviewDoc(html);
  }, [activePath, content, isHtmlProject, slug]);

  useEffect(() => {
    if (panelMode === "preview" && isHtmlProject) {
      void buildPreview();
    }
  }, [panelMode, isHtmlProject, content, activePath, buildPreview]);

  const handleSave = async () => {
    if (!activePath) return;
    setSaving(true);
    setError(null);
    try {
      await saveFile(slug, activePath, content);
      setSavedContent(content);
      fileCacheRef.current[activePath] = content;
      appendLine("meta", `Saved ${activePath}`);
      if (isHtmlProject) void buildPreview();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    if (isHtmlProject) {
      if (dirty) await handleSave();
      setPanelMode("preview");
      await buildPreview();
      appendLine("meta", "Preview refreshed");
      return;
    }
    if (!runLang || running) return;
    if (dirty) await handleSave();
    setPanelMode("console");
    appendLine("system", `—— ${new Date().toLocaleTimeString()} ——`);

    const language = runLang;
    const codeSnapshot = content;

    // Browser Wasm/worker path for JavaScript (Replit-style in-browser runtime).
    if (language === "javascript" && engineRef.current === "go") {
      // Prefer server Rust sandbox via WS when connected; else Wasm worker.
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        setRunning(true);
        wsRef.current.send(
          JSON.stringify({ type: "run", language, code: codeSnapshot })
        );
        window.setTimeout(() => {
          if (running) {
            appendLine("system", "Live stream slow — HTTP fallback…");
            void runViaHttp(language, codeSnapshot);
          }
        }, 8000);
        return;
      }
      setRunning(true);
      appendLine("system", "› Running javascript (browser worker)…");
      const result = await runJavascriptInBrowser(codeSnapshot);
      if (result.stdout) appendLine("stdout", result.stdout.replace(/\n$/, ""));
      if (result.stderr) appendLine("stderr", result.stderr.replace(/\n$/, ""));
      setSandboxMode(result.mode);
      appendLine(
        "meta",
        `Process exited with code ${result.exitCode} (${result.mode}${
          result.timedOut ? ", timed out" : ""
        })`
      );
      setRunning(false);
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      setRunning(true);
      wsRef.current.send(
        JSON.stringify({ type: "run", language, code: codeSnapshot })
      );
      return;
    }

    if (socketRef.current?.connected) {
      setRunning(true);
      let settled = false;
      const onEnd = () => {
        settled = true;
      };
      socketRef.current.once("run:end", onEnd);
      socketRef.current.once("run:error", onEnd);
      socketRef.current.emit("run", { language, code: codeSnapshot });

      window.setTimeout(() => {
        if (!settled) {
          socketRef.current?.off("run:end", onEnd);
          socketRef.current?.off("run:error", onEnd);
          appendLine("system", "Live stream timed out — using HTTP fallback…");
          void runViaHttp(language, codeSnapshot);
        }
      }, 4000);
      return;
    }

    if (language === "javascript") {
      setRunning(true);
      appendLine("system", "› Running javascript (browser worker)…");
      const result = await runJavascriptInBrowser(codeSnapshot);
      if (result.stdout) appendLine("stdout", result.stdout.replace(/\n$/, ""));
      if (result.stderr) appendLine("stderr", result.stderr.replace(/\n$/, ""));
      setSandboxMode(result.mode);
      appendLine(
        "meta",
        `Process exited with code ${result.exitCode} (${result.mode})`
      );
      setRunning(false);
      return;
    }

    await runViaHttp(language, codeSnapshot);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void handleRun();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePath, content, dirty, runLang, running, isHtmlProject]);

  const canRun = isHtmlProject || Boolean(runLang);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-panel)]/90 px-3 backdrop-blur sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Repls</span>
          </Link>
          <div className="hidden h-4 w-px bg-[var(--border)] sm:block" />
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent)] text-[var(--bg-deep)]">
              <Circle className="h-3 w-3 fill-current" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-tight">
                {project?.name ?? slug}
              </h1>
            </div>
          </div>
          {activePath && (
            <div className="ml-1 hidden items-center gap-2 border-l border-[var(--border)] pl-3 text-sm text-[var(--text-muted)] md:flex">
              <span className="mono text-[12px] text-[var(--text)]">
                {activePath}
              </span>
              {dirty && (
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[var(--warn)]"
                  title="Unsaved"
                />
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/stack"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--accent)]"
            title="Engine vs sandbox stack"
          >
            <Layers className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Stack</span>
          </Link>
          <span className="hidden items-center gap-1.5 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--text-muted)] lg:inline-flex">
            {connected ? (
              <Wifi className="h-3 w-3 text-[var(--accent)]" />
            ) : (
              <WifiOff className="h-3 w-3 text-[var(--danger)]" />
            )}
            {sandboxMode} sandbox
          </span>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!activePath || !dirty || saving}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs font-medium text-[var(--text)] transition hover:border-[var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-40 sm:px-3"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save
          </button>
          <button
            type="button"
            onClick={() => void handleRun()}
            disabled={!canRun || running}
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-2.5 py-1.5 text-xs font-semibold text-[var(--bg-deep)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 sm:px-3"
          >
            {running ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isHtmlProject ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            {isHtmlProject ? "Preview" : "Run"}
          </button>
        </div>
      </header>

      {error && (
        <div className="border-b border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-2 text-xs text-[var(--danger)]">
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-52 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-panel)]/80 md:w-60">
          <div className="border-b border-[var(--border)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Files
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <FileTree
              tree={tree}
              activePath={activePath}
              onSelect={(path) => {
                if (dirty && !window.confirm("Discard unsaved changes?")) return;
                setActivePath(path);
              }}
            />
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            {loadingFile ? (
              <div className="flex h-full items-center justify-center bg-[var(--bg-panel)] text-sm text-[var(--text-muted)]">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening file…
              </div>
            ) : (
              <CodeEditor
                path={activePath}
                value={content}
                onChange={setContent}
              />
            )}
          </div>

          <div
            role="separator"
            aria-orientation="horizontal"
            onMouseDown={(e) => {
              dragRef.current = { startY: e.clientY, startH: terminalHeight };
            }}
            className="group flex h-2 shrink-0 cursor-row-resize items-center justify-center border-y border-[var(--border)] bg-[var(--bg-elevated)]"
          >
            <div className="h-0.5 w-10 rounded-full bg-[var(--border-strong)] transition group-hover:bg-[var(--accent)]" />
          </div>

          <div style={{ height: terminalHeight }} className="flex shrink-0 flex-col">
            <div className="flex items-center gap-1 border-b border-[var(--border)] bg-[var(--terminal)] px-2 py-1">
              <button
                type="button"
                onClick={() => setPanelMode("console")}
                className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] ${
                  panelMode === "console"
                    ? "bg-[var(--bg-hover)] text-[var(--text)]"
                    : "text-[var(--text-muted)]"
                }`}
              >
                <TerminalSquare className="h-3 w-3" />
                Console
              </button>
              {isHtmlProject && (
                <button
                  type="button"
                  onClick={() => setPanelMode("preview")}
                  className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] ${
                    panelMode === "preview"
                      ? "bg-[var(--bg-hover)] text-[var(--text)]"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  <Eye className="h-3 w-3" />
                  Preview
                </button>
              )}
            </div>
            <div className="min-h-0 flex-1">
              {panelMode === "preview" && isHtmlProject ? (
                <iframe
                  title="Preview"
                  sandbox="allow-scripts"
                  srcDoc={previewDoc}
                  className="h-full w-full border-0 bg-white"
                />
              ) : (
                <TerminalPanel
                  lines={lines}
                  running={running}
                  onClear={() => setLines([])}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
