import { spawn, execFile, type ChildProcessWithoutNullStreams } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type SupportedLanguage = "javascript" | "python";

export interface RunRequest {
  language: SupportedLanguage;
  code: string;
  stdin?: string;
}

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  mode: "docker" | "process" | "judge0";
  timedOut: boolean;
}

export interface RunHandlers {
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
}

const TIMEOUT_MS = 10_000;
const MAX_OUTPUT = 200_000;

let dockerAvailable: boolean | null = null;

async function hasDocker(): Promise<boolean> {
  if (dockerAvailable !== null) return dockerAvailable;
  try {
    await execFileAsync("docker", ["info"], { timeout: 3000 });
    dockerAvailable = true;
  } catch {
    dockerAvailable = false;
  }
  return dockerAvailable;
}

function languageConfig(language: SupportedLanguage) {
  if (language === "python") {
    return {
      ext: ".py",
      image: "python:3.12-alpine",
      localCmd: "python3",
      dockerCmd: ["python", "/code/main.py"],
      judge0Id: 71, // Python 3.8.1 on Judge0 CE
    };
  }
  return {
    ext: ".js",
    image: "node:22-alpine",
    localCmd: "node",
    dockerCmd: ["node", "/code/main.js"],
    judge0Id: 63, // JavaScript (Node.js 12.14.0)
  };
}

function truncate(text: string): string {
  if (text.length <= MAX_OUTPUT) return text;
  return `${text.slice(0, MAX_OUTPUT)}\n… [output truncated]`;
}

function attachStreams(
  child: ChildProcessWithoutNullStreams,
  handlers: RunHandlers | undefined,
  mode: RunResult["mode"]
): Promise<RunResult> {
  return new Promise<RunResult>((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let total = 0;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, TIMEOUT_MS);

    const push = (kind: "stdout" | "stderr", chunk: string) => {
      total += chunk.length;
      if (total > MAX_OUTPUT) return;
      if (kind === "stdout") {
        stdout += chunk;
        handlers?.onStdout?.(chunk);
      } else {
        stderr += chunk;
        handlers?.onStderr?.(chunk);
      }
    };

    child.stdout.on("data", (buf: Buffer) => push("stdout", buf.toString()));
    child.stderr.on("data", (buf: Buffer) => push("stderr", buf.toString()));

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        stdout: truncate(stdout),
        stderr: truncate(err.message),
        exitCode: 1,
        mode,
        timedOut: false,
      });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) {
        const msg = `\n[error] Execution timed out after ${TIMEOUT_MS / 1000}s`;
        stderr += msg;
        handlers?.onStderr?.(msg);
      }
      resolve({
        stdout: truncate(stdout),
        stderr: truncate(stderr),
        exitCode: timedOut ? 124 : code ?? 1,
        mode,
        timedOut,
      });
    });
  });
}

async function runInDocker(
  req: RunRequest,
  handlers?: RunHandlers
): Promise<RunResult> {
  const cfg = languageConfig(req.language);
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "aether-"));
  const fileName = `main${cfg.ext}`;
  const filePath = path.join(tmpDir, fileName);

  try {
    await fs.writeFile(filePath, req.code, "utf8");
    const args = [
      "run",
      "--rm",
      "-i",
      "--network",
      "none",
      "--memory",
      "256m",
      "--cpus",
      "0.5",
      "--pids-limit",
      "64",
      "-v",
      `${tmpDir}:/code:ro`,
      cfg.image,
      ...cfg.dockerCmd,
    ];
    const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
    if (req.stdin) child.stdin.write(req.stdin);
    child.stdin.end();
    return await attachStreams(child, handlers, "docker");
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function runInProcess(
  req: RunRequest,
  handlers?: RunHandlers
): Promise<RunResult> {
  const cfg = languageConfig(req.language);
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "aether-"));
  const fileName = `main${cfg.ext}`;
  const filePath = path.join(tmpDir, fileName);

  try {
    await fs.writeFile(filePath, req.code, "utf8");
    const child = spawn(cfg.localCmd, [filePath], {
      cwd: tmpDir,
      env: {
        PATH: process.env.PATH,
        HOME: tmpDir,
        NODE_OPTIONS: "--max-old-space-size=128",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    if (req.stdin) child.stdin.write(req.stdin);
    child.stdin.end();
    return await attachStreams(child, handlers, "process");
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/** Optional remote sandbox (Judge0 CE / RapidAPI compatible). */
async function runViaJudge0(
  req: RunRequest,
  handlers?: RunHandlers
): Promise<RunResult> {
  const base = process.env.JUDGE0_URL?.replace(/\/$/, "");
  if (!base) throw new Error("JUDGE0_URL not configured");

  const cfg = languageConfig(req.language);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (process.env.JUDGE0_API_KEY) {
    headers["X-RapidAPI-Key"] = process.env.JUDGE0_API_KEY;
    if (process.env.JUDGE0_API_HOST) {
      headers["X-RapidAPI-Host"] = process.env.JUDGE0_API_HOST;
    }
  }

  const createRes = await fetch(
    `${base}/submissions?base64_encoded=false&wait=true`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        source_code: req.code,
        language_id: cfg.judge0Id,
        stdin: req.stdin ?? "",
      }),
    }
  );
  if (!createRes.ok) {
    throw new Error(`Judge0 error: ${createRes.status}`);
  }
  const data = (await createRes.json()) as {
    stdout?: string | null;
    stderr?: string | null;
    compile_output?: string | null;
    status?: { id?: number; description?: string };
  };

  const stdout = data.stdout ?? "";
  const stderr = [data.stderr, data.compile_output].filter(Boolean).join("\n");
  if (stdout) handlers?.onStdout?.(stdout);
  if (stderr) handlers?.onStderr?.(stderr);

  const ok = data.status?.id === 3;
  return {
    stdout: truncate(stdout),
    stderr: truncate(stderr),
    exitCode: ok ? 0 : 1,
    mode: "judge0",
    timedOut: data.status?.id === 5,
  };
}

export async function runCode(
  req: RunRequest,
  handlers?: RunHandlers
): Promise<RunResult> {
  if (await hasDocker()) {
    return runInDocker(req, handlers);
  }
  if (process.env.JUDGE0_URL) {
    try {
      return await runViaJudge0(req, handlers);
    } catch {
      // fall through to local process
    }
  }
  return runInProcess(req, handlers);
}

export async function getSandboxMode(): Promise<"docker" | "process" | "judge0"> {
  if (await hasDocker()) return "docker";
  if (process.env.JUDGE0_URL) return "judge0";
  return "process";
}
