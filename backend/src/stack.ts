/** Engine stack vs sandbox languages — mirrored for the public API. */

export const stackPayload = {
  clarification: {
    title: "Built with vs. languages you can code in",
    body: "It is common to confuse the languages used to build a cloud IDE with the languages you can run inside it. Replit’s engine is built with TypeScript, Go, Python, and Rust (plus Wasm, C/C++, Postgres, Redis, and GCP/K8s). Its sandbox supports 50+ languages for users. Aether follows the same split: the IDE engine stack is separate from the languages your Repls can execute.",
  },
  engine: [
    {
      name: "TypeScript · React · Next.js",
      layer: "frontend",
      role: "Web-based code editor, UI, design workspace, and browser IDE.",
      aetherStatus: "shipped",
    },
    {
      name: "Go (Golang)",
      layer: "backend",
      role: "High-performance backend: container orchestration, web execution, real-time multiplayer editing.",
      aetherStatus: "roadmap",
    },
    {
      name: "Python",
      layer: "ai",
      role: "Internal services, data automation, AI / LLM orchestration (Agent workflows).",
      aetherStatus: "roadmap",
    },
    {
      name: "Rust",
      layer: "systems",
      role: "Performance-critical parsing and sandbox container execution.",
      aetherStatus: "roadmap",
    },
    {
      name: "C / C++",
      layer: "systems",
      role: "System-level virtualization, terminal execution, and container layers.",
      aetherStatus: "partial",
    },
    {
      name: "WebAssembly (Wasm)",
      layer: "browser",
      role: "Fast in-browser compilation and language execution inside the browser.",
      aetherStatus: "roadmap",
    },
    {
      name: "PostgreSQL",
      layer: "infra",
      role: "Primary relational data store.",
      aetherStatus: "partial",
    },
    {
      name: "Redis",
      layer: "infra",
      role: "Caching and real-time state sync.",
      aetherStatus: "partial",
    },
    {
      name: "Docker · Kubernetes · Nix",
      layer: "infra",
      role: "Virtual Linux environments (Replit: GCP + K8s + Nix).",
      aetherStatus: "partial",
    },
  ],
  sandboxLanguages: [
    { id: "python", label: "Python", category: "runnable" },
    { id: "javascript", label: "JavaScript / Node.js", category: "runnable" },
    { id: "html", label: "HTML / CSS / JS", category: "preview" },
    { id: "typescript", label: "TypeScript", category: "planned" },
    { id: "go", label: "Go", category: "planned" },
    { id: "rust", label: "Rust", category: "planned" },
    { id: "cpp", label: "C / C++", category: "planned" },
    { id: "java", label: "Java", category: "planned" },
    { id: "php", label: "PHP", category: "planned" },
    { id: "swift", label: "Swift", category: "planned" },
  ],
} as const;
