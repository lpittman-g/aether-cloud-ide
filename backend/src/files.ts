import { promises as fs } from "node:fs";
import path from "node:path";

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

const TEXT_EXTENSIONS = new Set([
  ".js",
  ".ts",
  ".tsx",
  ".jsx",
  ".py",
  ".json",
  ".md",
  ".txt",
  ".css",
  ".html",
  ".yml",
  ".yaml",
  ".toml",
  ".env",
  ".sh",
]);

function isSafeRelative(rel: string): boolean {
  if (!rel || rel.includes("\0")) return false;
  const normalized = path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, "");
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) return false;
  return true;
}

export function resolveSafe(workspaceRoot: string, relPath: string): string {
  if (!isSafeRelative(relPath)) {
    throw new Error("Invalid path");
  }
  const absolute = path.resolve(workspaceRoot, relPath);
  const root = path.resolve(workspaceRoot);
  if (!absolute.startsWith(root + path.sep) && absolute !== root) {
    throw new Error("Path escapes workspace");
  }
  return absolute;
}

async function walk(dir: string, root: string): Promise<FileNode[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nodes: FileNode[] = [];

  for (const entry of entries.sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
    return a.name.localeCompare(b.name);
  })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const absolute = path.join(dir, entry.name);
    const relative = path.relative(root, absolute).split(path.sep).join("/");

    if (entry.isDirectory()) {
      nodes.push({
        name: entry.name,
        path: relative,
        type: "directory",
        children: await walk(absolute, root),
      });
    } else {
      nodes.push({ name: entry.name, path: relative, type: "file" });
    }
  }

  return nodes;
}

export async function listTree(workspaceRoot: string): Promise<FileNode[]> {
  await fs.mkdir(workspaceRoot, { recursive: true });
  return walk(workspaceRoot, workspaceRoot);
}

export async function readFile(
  workspaceRoot: string,
  relPath: string
): Promise<{ path: string; content: string }> {
  const absolute = resolveSafe(workspaceRoot, relPath);
  const ext = path.extname(absolute).toLowerCase();
  if (ext && !TEXT_EXTENSIONS.has(ext)) {
    throw new Error("Binary or unsupported file type");
  }
  const content = await fs.readFile(absolute, "utf8");
  return { path: relPath.split(path.sep).join("/"), content };
}

export async function writeFile(
  workspaceRoot: string,
  relPath: string,
  content: string
): Promise<{ path: string }> {
  const absolute = resolveSafe(workspaceRoot, relPath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, content, "utf8");
  return { path: relPath.split(path.sep).join("/") };
}

export async function createFile(
  workspaceRoot: string,
  relPath: string,
  content = ""
): Promise<{ path: string }> {
  const absolute = resolveSafe(workspaceRoot, relPath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  try {
    await fs.writeFile(absolute, content, { flag: "wx" });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error("File already exists");
    }
    throw err;
  }
  return { path: relPath.split(path.sep).join("/") };
}
