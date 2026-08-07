/**
 * Replit-inspired engine stack vs. languages users can run in the sandbox.
 * Keep this as the single source of truth for the in-app Stack page.
 */

export type StackLayer =
  | "frontend"
  | "backend"
  | "systems"
  | "ai"
  | "infra"
  | "browser";

export type EngineComponent = {
  id: string;
  name: string;
  layer: StackLayer;
  role: string;
  aetherStatus: "shipped" | "partial" | "roadmap";
  aetherNote: string;
};

export type SandboxLanguage = {
  id: string;
  label: string;
  category: "runnable" | "preview" | "planned";
  note: string;
};

export const ENGINE_STACK: EngineComponent[] = [
  {
    id: "ts-react-next",
    name: "TypeScript · React · Next.js",
    layer: "frontend",
    role: "Web-based code editor, UI, design workspace, and browser IDE.",
    aetherStatus: "shipped",
    aetherNote: "Monaco editor, Repl dashboard, file tree, console / HTML preview.",
  },
  {
    id: "go",
    name: "Go (Golang)",
    layer: "backend",
    role: "High-performance backend: container orchestration, web execution, real-time multiplayer editing.",
    aetherStatus: "shipped",
    aetherNote: "engine/go-api — REST, WebSocket multiplayer, run orchestration on Google Cloud.",
  },
  {
    id: "python-ai",
    name: "Python",
    layer: "ai",
    role: "Internal services, data automation, AI / LLM orchestration (Agent workflows).",
    aetherStatus: "shipped",
    aetherNote: "engine/ai-python FastAPI agent at /api/agent (proxied by Go).",
  },
  {
    id: "rust",
    name: "Rust",
    layer: "systems",
    role: "Performance-critical parsing and sandbox container execution.",
    aetherStatus: "shipped",
    aetherNote: "engine/sandbox-rust `aether-sandbox` binary invoked by Go.",
  },
  {
    id: "cpp",
    name: "C / C++",
    layer: "systems",
    role: "System-level virtualization, terminal execution, and container layers.",
    aetherStatus: "partial",
    aetherNote: "Provided by Linux + Docker on GCP Compute Engine hosts.",
  },
  {
    id: "wasm",
    name: "WebAssembly (Wasm)",
    layer: "browser",
    role: "Fast in-browser compilation and language execution inside the browser.",
    aetherStatus: "shipped",
    aetherNote: "Browser worker runner for JavaScript (`wasmRunner.ts`).",
  },
  {
    id: "postgres",
    name: "PostgreSQL",
    layer: "infra",
    role: "Primary relational data store for users, projects, and metadata.",
    aetherStatus: "partial",
    aetherNote: "Included in GCP docker-compose; filesystem catalog still primary.",
  },
  {
    id: "redis",
    name: "Redis",
    layer: "infra",
    role: "Caching and real-time state sync.",
    aetherStatus: "shipped",
    aetherNote: "Go hub publishes room events to Redis when REDIS_URL is set.",
  },
  {
    id: "containers",
    name: "Google Cloud · Docker · Compose",
    layer: "infra",
    role: "Spin up Linux environments (Replit-style GCP hosting).",
    aetherStatus: "shipped",
    aetherNote: "infra/gcp deploy-gce.sh + deploy-cloud-run.sh.",
  },
];

export const SANDBOX_LANGUAGES: SandboxLanguage[] = [
  {
    id: "python",
    label: "Python",
    category: "runnable",
    note: "Docker `python:3.12-alpine` sandbox.",
  },
  {
    id: "javascript",
    label: "JavaScript / Node.js",
    category: "runnable",
    note: "Docker `node:22-alpine` sandbox.",
  },
  {
    id: "html",
    label: "HTML / CSS / JS",
    category: "preview",
    note: "In-browser preview panel (no server run).",
  },
  {
    id: "typescript",
    label: "TypeScript",
    category: "planned",
    note: "Editor-ready; dedicated runner planned.",
  },
  {
    id: "wasm-js",
    label: "JS (browser worker)",
    category: "runnable",
    note: "In-browser worker execution without leaving the IDE.",
  },
  {
    id: "go",
    label: "Go",
    category: "planned",
    note: "Sandbox image + template planned.",
  },
  {
    id: "rust",
    label: "Rust",
    category: "planned",
    note: "Sandbox image + template planned.",
  },
  {
    id: "cpp",
    label: "C / C++",
    category: "planned",
    note: "Compile-and-run sandbox planned.",
  },
  {
    id: "java",
    label: "Java",
    category: "planned",
    note: "JVM sandbox planned.",
  },
  {
    id: "php",
    label: "PHP",
    category: "planned",
    note: "Sandbox template planned.",
  },
  {
    id: "swift",
    label: "Swift",
    category: "planned",
    note: "Sandbox template planned.",
  },
];

export const LAYER_LABELS: Record<StackLayer, string> = {
  frontend: "Frontend IDE",
  backend: "Backend orchestration",
  systems: "Systems & sandbox",
  ai: "AI & automation",
  infra: "Infrastructure & storage",
  browser: "In-browser runtime",
};

export const STACK_CLARIFICATION = {
  title: "Built with vs. languages you can code in",
  body: "It is common to confuse the languages used to build a cloud IDE with the languages you can run inside it. Replit’s engine is built with TypeScript, Go, Python, and Rust (plus Wasm, C/C++, Postgres, Redis, and GCP/K8s). Its sandbox supports 50+ languages for users. Aether follows the same split: the IDE engine stack is separate from the languages your Repls can execute.",
};
