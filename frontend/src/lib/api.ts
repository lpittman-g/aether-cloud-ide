export type FileNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
};

export type SupportedLanguage = "javascript" | "python";
export type TemplateId = "python" | "javascript" | "html";

export type Project = {
  slug: string;
  name: string;
  language: TemplateId;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type Template = {
  id: TemplateId;
  label: string;
  description: string;
  entry: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function getApiBase() {
  return API_BASE;
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE}/api/projects`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load projects");
  const data = await res.json();
  return data.projects as Project[];
}

export async function fetchTemplates(): Promise<Template[]> {
  const res = await fetch(`${API_BASE}/api/templates`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load templates");
  const data = await res.json();
  return data.templates as Template[];
}

export async function createProject(input: {
  name: string;
  language: TemplateId;
  description?: string;
}): Promise<Project> {
  const res = await fetch(`${API_BASE}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to create project");
  }
  const data = await res.json();
  return data.project as Project;
}

export async function fetchProject(slug: string): Promise<Project> {
  const res = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Project not found");
  }
  const data = await res.json();
  return data.project as Project;
}

export async function fetchTree(slug: string): Promise<FileNode[]> {
  const res = await fetch(
    `${API_BASE}/api/projects/${encodeURIComponent(slug)}/files`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("Failed to load files");
  const data = await res.json();
  return data.tree as FileNode[];
}

export async function fetchFile(
  slug: string,
  path: string
): Promise<{ path: string; content: string }> {
  const res = await fetch(
    `${API_BASE}/api/projects/${encodeURIComponent(slug)}/files/${encodeURI(path)}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to load file");
  }
  return res.json();
}

export async function saveFile(
  slug: string,
  path: string,
  content: string
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/projects/${encodeURIComponent(slug)}/files/${encodeURI(path)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to save file");
  }
}

export function languageFromPath(
  path: string
): SupportedLanguage | "markdown" | "html" | "css" | "plaintext" {
  if (path.endsWith(".py")) return "python";
  if (path.endsWith(".js") || path.endsWith(".mjs") || path.endsWith(".cjs")) {
    return "javascript";
  }
  if (path.endsWith(".html") || path.endsWith(".htm")) return "html";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".md")) return "markdown";
  return "plaintext";
}

export function runnableLanguage(path: string): SupportedLanguage | null {
  const lang = languageFromPath(path);
  if (lang === "javascript" || lang === "python") return lang;
  return null;
}

export function defaultEntry(project: Project): string {
  if (project.language === "python") return "main.py";
  if (project.language === "javascript") return "index.js";
  return "index.html";
}
