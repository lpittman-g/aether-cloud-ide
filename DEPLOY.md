# Deploying Aether

## Primary: AWS EC2 (live)

Aether runs as a public app on AWS account `583968735276` (`us-east-2`):

| Surface | URL |
| --- | --- |
| IDE app | http://18.225.160.49:3000 |
| API | http://18.225.160.49:4000 |
| Health | http://18.225.160.49:4000/api/health |

Stack: CloudFormation `aether-ide` → EC2 `i-0035b7f203de1905e`, systemd units `aether-frontend` / `aether-backend`, Docker sandboxes.

```bash
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_REGION=us-east-2
export KEY_NAME=aether-cursor
./infra/aws/bootstrap-from-keys.sh
# or: KEY_NAME=aether-cursor KEY_FILE=~/.ssh/aether-cursor.pem ./infra/aws/launch.sh
```

Push to `main` (backend/frontend/infra paths) also triggers **Deploy AWS EC2** via GitHub Actions when secrets are set. Details: `docs/AWS.md`, `docs/RUNBOOK.md`.

## Alternate: Azure VMAzule (pending)

Public IP `20.121.66.136` (`VMAzule-ip`, `VMAzule_group`, East US). See `docs/AZURE.md`. Needs Azure auth or SSH before install.

## Local development

```bash
# Terminal 1
cd backend && npm install && npm run start   # :4000

# Terminal 2
cd frontend && npm install && npm run dev    # :3000
```

Open http://localhost:3000

## Other hosts (optional)

Frontend-only: Vercel / Railway / Render with `NEXT_PUBLIC_API_URL` pointing at the AWS API.

Backend sandbox prefers a **VM with Docker** (as on AWS EC2). Process-mode or Judge0 can run on PaaS without Docker-in-Docker.

## Security

Never expose process-mode sandboxes on the public internet without extra isolation. Prefer Docker (no network, resource limits) or a hosted execution API (Judge0).
