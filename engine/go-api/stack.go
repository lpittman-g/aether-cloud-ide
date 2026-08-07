package main

var stackPayload = map[string]any{
	"clarification": map[string]string{
		"title": "Built with vs. languages you can code in",
		"body":  "Aether’s engine is built with TypeScript/React/Next.js, Go, Python, and Rust (plus Wasm, Postgres, Redis, Docker on Google Cloud). Sandbox languages are what your Repls execute.",
	},
	"engine": []map[string]string{
		{"name": "TypeScript · React · Next.js", "layer": "frontend", "role": "Browser IDE", "aetherStatus": "shipped"},
		{"name": "Go (Golang)", "layer": "backend", "role": "Orchestration, execution, realtime", "aetherStatus": "shipped"},
		{"name": "Python", "layer": "ai", "role": "AI / agent orchestration", "aetherStatus": "shipped"},
		{"name": "Rust", "layer": "systems", "role": "Sandbox runner", "aetherStatus": "shipped"},
		{"name": "WebAssembly", "layer": "browser", "role": "In-browser JS execution", "aetherStatus": "shipped"},
		{"name": "PostgreSQL", "layer": "infra", "role": "Relational metadata", "aetherStatus": "partial"},
		{"name": "Redis", "layer": "infra", "role": "Realtime fanout", "aetherStatus": "partial"},
		{"name": "Google Cloud · Docker", "layer": "infra", "role": "Hosting & containers", "aetherStatus": "shipped"},
	},
	"sandboxLanguages": []map[string]string{
		{"id": "python", "label": "Python", "category": "runnable"},
		{"id": "javascript", "label": "JavaScript / Node.js", "category": "runnable"},
		{"id": "html", "label": "HTML / CSS / JS", "category": "preview"},
		{"id": "wasm-js", "label": "JS (browser Wasm worker)", "category": "runnable"},
	},
	"cloud": "gcp",
}
