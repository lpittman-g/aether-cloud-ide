# Replit-inspired stack (engine vs sandbox)

Source of truth in the app:

- UI: `/stack`
- Data: `frontend/src/lib/stack.ts`
- API: `GET /api/stack` (`backend/src/stack.ts`)

## Engine (product)

| Technology | Role |
| --- | --- |
| TypeScript · React · Next.js | Browser IDE, editor, UI |
| Go | Container orchestration, execution, multiplayer |
| Python | Internal services, data automation, LLM / Agent orchestration |
| Rust | Parsing, sandbox execution performance |
| C / C++ | Virtualization, terminal, container layers |
| WebAssembly | In-browser compile & run |
| PostgreSQL | Primary relational store |
| Redis | Cache + realtime state |
| Docker · Kubernetes · Nix | Ephemeral Linux environments (Replit: GCP) |

## Sandbox (user languages)

Replit supports 50+ languages for end users. Aether ships Python, JavaScript/Node,
and HTML/CSS/JS preview; planned runners include TypeScript, Go, Rust, C/C++, Java,
PHP, and Swift.

Do not confuse these lists — engine languages build the IDE; sandbox languages are
what Repls execute.
