# Aether — four-layer Replit-inspired cloud IDE

Matches the automation prompt architecture, mapped to Replit’s published engine
stack (TypeScript / Go / Python / Rust / Wasm / C++ / Postgres / Redis / containers).

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

## Clarification — engine vs sandbox languages

**Engine (what the product is built with):** TypeScript/React/Next.js for the
browser IDE; Go for high-performance orchestration & multiplayer (roadmap in
Aether); Python for AI / agent orchestration (roadmap); Rust & C/C++ for
parsing / sandbox / virtualization layers; Wasm for in-browser runtimes;
PostgreSQL + Redis for data & realtime state; Docker / Kubernetes / Nix for
ephemeral Linux environments (Replit on GCP).

**Sandbox (what users write):** 50+ languages on Replit. Aether currently runs
Python, JavaScript/Node, and HTML preview, with a runway for Go, Rust, C/C++,
Java, PHP, Swift, TypeScript runners.

In-app map: `/stack` · API: `GET /api/stack`

## Layer 1 — Frontend (IDE UI)
- Next.js + Tailwind + TypeScript
- `@monaco-editor/react` for editing
- File tree sidebar, console / HTML preview panel
- Dashboard of Repls + template create flow
- Stack / architecture page documenting engine vs sandbox

## Layer 2 — Backend server
- Express REST for projects, files, health, run, **stack**
- Workspace root on disk (`WORKSPACE_ROOT`)
- Path-safe file I/O
- Roadmap: Go orchestration service for multiplayer + denser container control

## Layer 3 — Execution sandbox
Priority order:
1. **Docker** — ephemeral `node`/`python` containers, `--network none`, memory/CPU caps
2. **Judge0** — if `JUDGE0_URL` (+ optional RapidAPI key) is set
3. **Process** — local `node`/`python3` with timeout (dev only)

Roadmap: Rust/C++-backed runners, Wasm client execution, Nix-defined environments.

## Layer 4 — Real-time sync
- Socket.io events: `run`, `run:start`, `run:stdout`, `run:stderr`, `run:end`
- Chunked stdout/stderr while the process runs
- HTTP `POST /api/run` fallback if the socket path stalls
- Roadmap: Redis-backed presence / CRDT multiplayer editing

## Deploy
See `DEPLOY.md`. Primary host: AWS EC2. Alternate: Azure VMAzule (`docs/AZURE.md`).
