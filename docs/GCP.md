# Google Cloud — Aether

Replit’s production model is **GCP + Docker/Kubernetes**. Aether targets the same cloud.

## Recommended: Compute Engine + Docker Compose

Full stack (Next.js, Go API, Python AI, Rust sandbox, Postgres, Redis):

```bash
export GCP_PROJECT_ID=your-project
export GCP_ZONE=us-central1-a
./infra/gcp/deploy-gce.sh
```

Requires `gcloud auth login` (or a service account key).

## Alternate: Cloud Run

Stateless web + API (Rust/process sandbox, no nested Docker):

```bash
export GCP_PROJECT_ID=your-project
export GCP_REGION=us-central1
./infra/gcp/deploy-cloud-run.sh
```

## Engine map on GCP

| Component | Language | Role |
| --- | --- | --- |
| `frontend/` | TypeScript · Next.js | Browser IDE |
| `engine/go-api/` | Go | Orchestration, REST, WebSocket multiplayer |
| `engine/ai-python/` | Python | Agent / LLM orchestration |
| `engine/sandbox-rust/` | Rust | Sandbox execution |
| Postgres + Redis | — | Metadata + realtime fanout |

## Auth for agents

Store (never in git):

- `GCP_PROJECT_ID`
- `GCP_REGION` (default `us-central1`)
- `GCP_SERVICE_ACCOUNT_KEY` / `GOOGLE_APPLICATION_CREDENTIALS_JSON`
