# Aether — four-layer Replit clone

Matches the automation prompt architecture:

```
┌──────────────────┐     Socket.io / REST      ┌──────────────────┐
│  Next.js Frontend │◄────────────────────────►│  Express Backend  │
│  Monaco + file    │                          │  projects / files │
│  tree + console   │                          │  run orchestrator │
└──────────────────┘                          └────────┬─────────┘
                                                       │
                              ┌────────────────────────┼────────────────────────┐
                              ▼                        ▼                        ▼
                         Docker run              Local process              Judge0 API
                      (isolated container)     (dev fallback)           (optional remote)
```

## Layer 1 — Frontend (IDE UI)
- Next.js + Tailwind
- `@monaco-editor/react` for editing
- File tree sidebar, console / HTML preview panel
- Dashboard of Repls + template create flow

## Layer 2 — Backend server
- Express REST for projects, files, health, run
- Workspace root on disk (`WORKSPACE_ROOT`)
- Path-safe file I/O

## Layer 3 — Execution sandbox
Priority order:
1. **Docker** — ephemeral `node`/`python` containers, `--network none`, memory/CPU caps
2. **Judge0** — if `JUDGE0_URL` (+ optional RapidAPI key) is set
3. **Process** — local `node`/`python3` with timeout (dev only)

## Layer 4 — Real-time sync
- Socket.io events: `run`, `run:start`, `run:stdout`, `run:stderr`, `run:end`
- Chunked stdout/stderr while the process runs
- HTTP `POST /api/run` fallback if the socket path stalls

## Deploy
See `DEPLOY.md`. Frontend → Vercel/Railway/Render. Sandbox backend → VM with Docker (or Judge0).
