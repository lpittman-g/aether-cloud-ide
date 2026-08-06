# Deploying Aether

Cursor does not host apps. Split hosting like the Replit-clone guide:

## Frontend (Next.js)

Suitable hosts: **Vercel**, **Railway**, **Render**.

```bash
cd frontend
# set NEXT_PUBLIC_API_URL to your backend public URL
npm run build && npm start
```

Env:
- `NEXT_PUBLIC_API_URL` — e.g. `https://aether-api.example.com`

## Backend + sandbox

Because the API runs untrusted code, prefer a **VM** (DigitalOcean, AWS EC2, GCP) with Docker.

```bash
cd backend
export CLIENT_ORIGIN=https://your-frontend.example.com
export WORKSPACE_ROOT=/var/aether/workspace
# optional remote sandbox instead of Docker:
# export JUDGE0_URL=https://judge0-ce.p.rapidapi.com
# export JUDGE0_API_KEY=...
# export JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
npm start
```

Docker Compose (API + docker.sock for sibling containers):

```bash
docker compose up --build
```

### Railway notes

Railway can host the **frontend** and a **process-mode** or **Judge0-backed** API. Native Docker-in-Docker sandboxes usually need a dedicated VM. Example service env for the API:

| Key | Value |
| --- | --- |
| `PORT` | provided by Railway |
| `CLIENT_ORIGIN` | your frontend URL |
| `JUDGE0_URL` | optional |

`railway.toml` / `backend/railway.toml` are included as starting points.

## Security

Never expose process-mode sandboxes on the public internet without extra isolation. Prefer Docker (no network, resource limits) or a hosted execution API (Judge0).
