# Deploying Aether

## Primary cloud: Google Cloud (Replit-style)

Aether’s engine matches Replit’s model: **TypeScript IDE + Go orchestration + Python AI + Rust sandbox on GCP**.

```bash
# Auth
gcloud auth login
export GCP_PROJECT_ID=your-project

# Full stack on Compute Engine (Docker Compose: web, Go API, Python AI, Postgres, Redis)
./infra/gcp/deploy-gce.sh

# Or Cloud Run (API + web; process/Rust sandbox)
./infra/gcp/deploy-cloud-run.sh
```

See `docs/GCP.md`.

### Engine layout

| Path | Language | Role |
| --- | --- | --- |
| `frontend/` | TypeScript · Next.js | Browser IDE + Wasm worker runner |
| `engine/go-api/` | Go | REST, WebSocket, orchestration |
| `engine/ai-python/` | Python | Agent / LLM orchestration |
| `engine/sandbox-rust/` | Rust | Sandbox executor |
| `docker-compose.yml` | — | Local/GCP Compose stack |

## Also live: AWS EC2 (legacy host)

| Surface | URL |
| --- | --- |
| IDE | http://18.225.160.49:3000 |
| API | http://18.225.160.49:4000/api/health |

```bash
export AWS_REGION=us-east-2 KEY_NAME=aether-cursor
./infra/aws/launch.sh
```

## Local development

```bash
# Terminal A — Rust sandbox
cd engine/sandbox-rust && cargo build --release

# Terminal B — Python AI
cd engine/ai-python && pip install -r requirements.txt && python main.py

# Terminal C — Go API
cd engine/go-api && go run .
# WORKSPACE_ROOT=../../workspace AETHER_SANDBOX=../sandbox-rust/target/release/aether-sandbox

# Terminal D — Frontend
cd frontend && npm run dev
```

Or: `docker compose up --build`

## Security

Prefer isolated sandboxes (Rust runner / Docker on GCE). Never expose unconstrained process runners on the public internet without limits.
