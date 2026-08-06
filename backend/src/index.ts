import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import {
  createFile,
  listTree,
  readFile,
  writeFile,
} from "./files.js";
import {
  createProject,
  ensureSeedProjects,
  getProject,
  listProjects,
  projectRoot,
  TEMPLATES,
  touchProject,
  type TemplateId,
} from "./projects.js";
import { getSandboxMode, runCode, type SupportedLanguage } from "./sandbox.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE =
  process.env.WORKSPACE_ROOT ??
  path.resolve(__dirname, "../../workspace");
const PORT = Number(process.env.PORT ?? 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

function projectPath(req: express.Request): string {
  const raw = req.params.path;
  return Array.isArray(raw) ? raw.join("/") : String(raw ?? "");
}

app.get("/api/health", async (_req, res) => {
  const mode = await getSandboxMode();
  res.json({ ok: true, sandbox: mode, workspace: WORKSPACE });
});

app.get("/api/templates", (_req, res) => {
  res.json({
    templates: Object.values(TEMPLATES).map((t) => ({
      id: t.id,
      label: t.label,
      description: t.description,
      entry: t.entry,
    })),
  });
});

app.get("/api/projects", async (_req, res) => {
  try {
    const projects = await listProjects(WORKSPACE);
    res.json({ projects });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/api/projects", async (req, res) => {
  try {
    const name = String(req.body?.name ?? "").trim();
    const language = req.body?.language as TemplateId;
    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    if (!TEMPLATES[language]) {
      res.status(400).json({ error: "Invalid template" });
      return;
    }
    const project = await createProject(WORKSPACE, {
      name,
      language,
      description: req.body?.description,
    });
    res.status(201).json({ project });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get("/api/projects/:slug", async (req, res) => {
  try {
    const project = await getProject(WORKSPACE, req.params.slug);
    res.json({ project });
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

app.get("/api/projects/:slug/files", async (req, res) => {
  try {
    const root = await projectRoot(WORKSPACE, req.params.slug);
    const tree = await listTree(root);
    const filtered = tree.filter((n) => n.name !== ".aether.json");
    res.json({ tree: filtered });
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

app.get("/api/projects/:slug/files/*path", async (req, res) => {
  try {
    const root = await projectRoot(WORKSPACE, req.params.slug);
    const file = await readFile(root, projectPath(req));
    res.json(file);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.put("/api/projects/:slug/files/*path", async (req, res) => {
  try {
    const slug = req.params.slug;
    const root = await projectRoot(WORKSPACE, slug);
    const content = String(req.body?.content ?? "");
    const file = await writeFile(root, projectPath(req), content);
    await touchProject(WORKSPACE, slug);
    res.json(file);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post("/api/projects/:slug/files", async (req, res) => {
  try {
    const slug = req.params.slug;
    const root = await projectRoot(WORKSPACE, slug);
    const rel = String(req.body?.path ?? "");
    const content = String(req.body?.content ?? "");
    const file = await createFile(root, rel, content);
    await touchProject(WORKSPACE, slug);
    res.status(201).json(file);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Legacy unscoped routes (point at whole workspace) kept for health probes
app.get("/api/files", async (_req, res) => {
  try {
    await ensureSeedProjects(WORKSPACE);
    const tree = await listTree(WORKSPACE);
    res.json({ tree });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/api/run", async (req, res) => {
  try {
    const language = req.body?.language as SupportedLanguage;
    const code = String(req.body?.code ?? "");
    if (!["javascript", "python"].includes(language)) {
      res.status(400).json({ error: "Unsupported language" });
      return;
    }
    if (!code.trim()) {
      res.status(400).json({ error: "Code is empty" });
      return;
    }
    const result = await runCode({ language, code, stdin: req.body?.stdin });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN },
});

io.on("connection", (socket) => {
  socket.emit("ready", { message: "Connected to Aether sandbox" });

  socket.on(
    "run",
    async (payload: {
      language?: SupportedLanguage;
      code?: string;
      stdin?: string;
    }) => {
      const language = payload?.language;
      const code = String(payload?.code ?? "");

      if (!language || !["javascript", "python"].includes(language)) {
        socket.emit("run:error", { error: "Unsupported language" });
        return;
      }
      if (!code.trim()) {
        socket.emit("run:error", { error: "Code is empty" });
        return;
      }

      socket.emit("run:start", { language });
      try {
        const result = await runCode({
          language,
          code,
          stdin: payload.stdin,
        });
        if (result.stdout) socket.emit("run:stdout", { data: result.stdout });
        if (result.stderr) socket.emit("run:stderr", { data: result.stderr });
        socket.emit("run:end", {
          exitCode: result.exitCode,
          mode: result.mode,
          timedOut: result.timedOut,
        });
      } catch (err) {
        socket.emit("run:error", { error: (err as Error).message });
      }
    }
  );
});

await ensureSeedProjects(WORKSPACE);

httpServer.listen(PORT, () => {
  console.log(`Aether backend listening on http://localhost:${PORT}`);
  console.log(`Workspace: ${WORKSPACE}`);
});
