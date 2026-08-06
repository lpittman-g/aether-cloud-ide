import { promises as fs } from "node:fs";
import path from "node:path";
import { resolveSafe } from "./files.js";

export type TemplateId = "python" | "javascript" | "html";

export interface ProjectMeta {
  slug: string;
  name: string;
  language: TemplateId;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export const TEMPLATES: Record<
  TemplateId,
  {
    id: TemplateId;
    label: string;
    description: string;
    entry: string;
    files: Record<string, string>;
  }
> = {
  python: {
    id: "python",
    label: "Python",
    description: "Run Python in a sandboxed console",
    entry: "main.py",
    files: {
      "main.py": `# Welcome to Aether
print("Hello from Aether!")
print(2 + 2)
for i in range(3):
    print(f"tick {i}")
`,
      "README.md": `# Python Repl

Edit \`main.py\` and press **Run**.
`,
    },
  },
  javascript: {
    id: "javascript",
    label: "JavaScript (Node)",
    description: "Run JavaScript with Node.js",
    entry: "index.js",
    files: {
      "index.js": `// Welcome to Aether
console.log("Hello from Aether!");
console.log("2 + 2 =", 2 + 2);

const greet = (name) => \`Welcome, \${name}\`;
console.log(greet("builder"));
`,
      "README.md": `# JavaScript Repl

Edit \`index.js\` and press **Run**.
`,
    },
  },
  html: {
    id: "html",
    label: "HTML / CSS / JS",
    description: "Static web page with live preview",
    entry: "index.html",
    files: {
      "index.html": `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Aether Web</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <main>
      <p class="eyebrow">Aether</p>
      <h1>Hello, web</h1>
      <p>Edit this page and open Preview to see it live.</p>
      <button id="pulse">Pulse</button>
    </main>
    <script src="script.js"></script>
  </body>
</html>
`,
      "style.css": `:root {
  color-scheme: dark;
  --bg: #0f1720;
  --ink: #e8eef7;
  --accent: #3ecf8e;
  font-family: Georgia, "Times New Roman", serif;
}

body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 20% 20%, #1b3a2f, transparent 40%),
    radial-gradient(circle at 80% 0%, #243b55, transparent 35%),
    var(--bg);
  color: var(--ink);
}

main {
  text-align: center;
  padding: 2rem;
}

.eyebrow {
  letter-spacing: 0.2em;
  text-transform: uppercase;
  font-size: 0.75rem;
  color: var(--accent);
}

h1 {
  font-size: clamp(2.5rem, 8vw, 4.5rem);
  margin: 0.2em 0 0.4em;
}

button {
  margin-top: 1rem;
  border: 0;
  background: var(--accent);
  color: #04110a;
  padding: 0.7rem 1.2rem;
  font: inherit;
  cursor: pointer;
}
`,
      "script.js": `document.getElementById("pulse")?.addEventListener("click", () => {
  document.body.style.filter =
    document.body.style.filter === "hue-rotate(40deg)"
      ? "none"
      : "hue-rotate(40deg)";
});
`,
      "README.md": `# HTML Repl

Open **Preview** to render \`index.html\` in an iframe.
`,
    },
  },
};

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || `repl-${Date.now().toString(36)}`;
}

async function readMeta(projectDir: string): Promise<ProjectMeta | null> {
  try {
    const raw = await fs.readFile(path.join(projectDir, ".aether.json"), "utf8");
    return JSON.parse(raw) as ProjectMeta;
  } catch {
    return null;
  }
}

async function writeMeta(projectDir: string, meta: ProjectMeta): Promise<void> {
  await fs.writeFile(
    path.join(projectDir, ".aether.json"),
    JSON.stringify(meta, null, 2),
    "utf8"
  );
}

export async function ensureSeedProjects(workspaceRoot: string): Promise<void> {
  await fs.mkdir(workspaceRoot, { recursive: true });
  const entries = await fs.readdir(workspaceRoot, { withFileTypes: true });
  const hasProject = (
    await Promise.all(
      entries
        .filter((e) => e.isDirectory())
        .map(async (e) => Boolean(await readMeta(path.join(workspaceRoot, e.name))))
    )
  ).some(Boolean);

  if (hasProject) return;

  // Migrate any loose files into a starter Python repl, then seed others
  const looseFiles = entries.filter((e) => e.isFile());
  if (looseFiles.length) {
    const dir = path.join(workspaceRoot, "hello-python");
    await fs.mkdir(dir, { recursive: true });
    for (const file of looseFiles) {
      await fs.rename(
        path.join(workspaceRoot, file.name),
        path.join(dir, file.name === "hello.py" ? "main.py" : file.name)
      );
    }
    const now = new Date().toISOString();
    await writeMeta(dir, {
      slug: "hello-python",
      name: "Hello Python",
      language: "python",
      description: "Sample Python repl",
      createdAt: now,
      updatedAt: now,
    });
    if (!(await fs.stat(path.join(dir, "main.py")).catch(() => null))) {
      await fs.writeFile(path.join(dir, "main.py"), TEMPLATES.python.files["main.py"]);
    }
  } else {
    await createProject(workspaceRoot, {
      name: "Hello Python",
      language: "python",
      description: "Sample Python repl",
    });
  }

  await createProject(workspaceRoot, {
    name: "Hello JavaScript",
    language: "javascript",
    description: "Sample Node.js repl",
  }).catch(() => undefined);

  await createProject(workspaceRoot, {
    name: "Hello Web",
    language: "html",
    description: "Sample HTML / CSS / JS repl",
  }).catch(() => undefined);
}

export async function listProjects(workspaceRoot: string): Promise<ProjectMeta[]> {
  await ensureSeedProjects(workspaceRoot);
  const entries = await fs.readdir(workspaceRoot, { withFileTypes: true });
  const projects: ProjectMeta[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const meta = await readMeta(path.join(workspaceRoot, entry.name));
    if (meta) projects.push(meta);
  }

  return projects.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getProject(
  workspaceRoot: string,
  slug: string
): Promise<ProjectMeta> {
  const dir = resolveSafe(workspaceRoot, slug);
  const meta = await readMeta(dir);
  if (!meta) throw new Error("Project not found");
  return meta;
}

export async function projectRoot(
  workspaceRoot: string,
  slug: string
): Promise<string> {
  await getProject(workspaceRoot, slug);
  return resolveSafe(workspaceRoot, slug);
}

export async function createProject(
  workspaceRoot: string,
  input: { name: string; language: TemplateId; description?: string }
): Promise<ProjectMeta> {
  const template = TEMPLATES[input.language];
  if (!template) throw new Error("Unknown template");

  let slug = slugify(input.name);
  let dir = path.join(workspaceRoot, slug);
  let attempt = 1;
  while (await fs.stat(dir).catch(() => null)) {
    slug = `${slugify(input.name)}-${attempt++}`;
    dir = path.join(workspaceRoot, slug);
  }

  await fs.mkdir(dir, { recursive: true });
  for (const [rel, content] of Object.entries(template.files)) {
    const absolute = path.join(dir, rel);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, content, "utf8");
  }

  const now = new Date().toISOString();
  const meta: ProjectMeta = {
    slug,
    name: input.name.trim() || template.label,
    language: input.language,
    description: input.description?.trim() || template.description,
    createdAt: now,
    updatedAt: now,
  };
  await writeMeta(dir, meta);
  return meta;
}

export async function touchProject(
  workspaceRoot: string,
  slug: string
): Promise<void> {
  const dir = resolveSafe(workspaceRoot, slug);
  const meta = await readMeta(dir);
  if (!meta) return;
  meta.updatedAt = new Date().toISOString();
  await writeMeta(dir, meta);
}
