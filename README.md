# Aether — Cloud IDE

A Replit-style browser IDE implementing the four-layer architecture from the
**Replit 2 IDE** automation prompt:

1. **Frontend** — Next.js, Tailwind, Monaco, file tree, console / preview  
2. **Backend** — Express project/file management API  
3. **Sandbox** — Docker → optional Judge0 → local process fallback  
4. **Realtime** — Socket.io streaming of stdout/stderr (+ HTTP fallback)

See [ARCHITECTURE.md](./ARCHITECTURE.md), [DEPLOY.md](./DEPLOY.md), and the docs vault: **[docs/README.md](./docs/README.md)**.  
AWS launch notes: [infra/aws/README.md](./infra/aws/README.md). Agents must follow [docs/AGENT_PROTOCOL.md](./docs/AGENT_PROTOCOL.md) (persist work to GitHub; never commit secrets).

## Quick start

```bash
cd backend && npm install && npm run start
cd frontend && npm install && npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- Dashboard of **Repls** with Python / JavaScript / HTML templates  
- Monaco editor, save, Run (`Ctrl/Cmd+Enter`)  
- Live console via Socket.io (chunked output)  
- HTML live preview  
- Path-safe workspace I/O  
- AWS EC2 CloudFormation + launch script

## Environment

| Variable | Default | Where |
| --- | --- | --- |
| `PORT` | `4000` | backend |
| `WORKSPACE_ROOT` | `../workspace` | backend |
| `CLIENT_ORIGIN` | `http://localhost:3000` | backend |
| `JUDGE0_URL` | — | backend (optional) |
| `JUDGE0_API_KEY` | — | backend (optional) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | frontend |
