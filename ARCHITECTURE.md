# Aether — Replit-inspired engine on Google Cloud

```
┌──────────────────────────┐
│  Next.js · TypeScript    │  Monaco IDE + Wasm browser worker
└────────────┬─────────────┘
             │ REST / WebSocket
┌────────────▼─────────────┐
│  Go API (engine/go-api)  │  Orchestration · multiplayer hub · /api/agent proxy
└───┬───────────┬──────────┘
    │           │
    ▼           ▼
 Rust sandbox  Python AI     Redis fanout · Postgres catalog
 (aether-      (FastAPI
  sandbox)      agent)
             │
             ▼
        Google Cloud
   GCE + Docker Compose  or  Cloud Run
```

## Clarification — engine vs sandbox languages

**Engine (product):** TypeScript/React/Next.js, Go, Python, Rust, Wasm, Postgres, Redis, GCP/Docker.

**Sandbox (user Repls):** Python, JavaScript/Node, HTML preview, in-browser JS worker; more languages planned.

## Local

See `DEPLOY.md`. Smoke-tested: Go health `engine=go`, run mode `rust`, agent `python-ai`.

## Cloud

Primary: **Google Cloud** — `docs/GCP.md`, `infra/gcp/deploy-gce.sh`.
