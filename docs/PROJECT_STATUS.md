# Project status — Aether Cloud IDE

**Repo:** https://github.com/lpittman-g/aether-cloud-ide  
**Updated:** 2026-08-07

## Engine (built)

| Layer | Implementation |
| --- | --- |
| Frontend | TypeScript · Next.js · Monaco · `/stack` · Wasm worker |
| Orchestration | `engine/go-api` (Go) REST + WebSocket |
| AI | `engine/ai-python` (Python FastAPI) |
| Sandbox | `engine/sandbox-rust` (`aether-sandbox`) |
| Data | Postgres + Redis in Compose |
| Cloud | **Google Cloud** deploy scripts (GCE / Cloud Run) |

## Live hosts

| Host | Status |
| --- | --- |
| Google Cloud | Scripts ready — needs `gcloud auth` + `GCP_PROJECT_ID` |
| AWS EC2 `18.225.160.49` | Still up (prior Node/Docker host) |
| Azure VMAzule | Blocked (security defaults / no subscription) |

## Next

1. Complete Google sign-in + set `GCP_PROJECT_ID`
2. Run `./infra/gcp/deploy-gce.sh`
3. Point frontend `NEXT_PUBLIC_API_URL` at the GCE API
