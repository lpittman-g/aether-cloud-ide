import { spawn, execFile } from "node:child_process";
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
  mode: "docker" | "process";
  timedOut: boolean;
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
    };
  }
  return {
    ext: ".js",
    image: "node:22-alpine",
    localCmd: "node",
    dockerCmd: ["node", "/code/main.js"],
  };
}

function truncate(text: string): string {
  if (text.length <= MAX_OUTPUT) return text;
  return `${text.slice(0, MAX_OUTPUT)}\n… [output truncated]`;
}

async function runInDocker(req: RunRequest): Promise<RunResult> {
  const cfg = languageConfig(req.language);
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "aether-"));
  const fileName = `main${cfg.ext}`;
  const filePath = path.join(tmpDir, fileName);

  try {
    await fs.writeFile(filePath, req.code, "utf8");

    return await new Promise<RunResult>((resolve) => {
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
      let stdout = "";
      let stderr = "";
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
      }, TIMEOUT_MS);

      child.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      if (req.stdin) {
        child.stdin.write(req.stdin);
      }
      child.stdin.end();

      child.on("close", (code) => {
        clearTimeout(timer);
        resolve({
          stdout: truncate(stdout),
          stderr: truncate(
            timedOut
              ? `${stderr}\n[error] Execution timed out after ${TIMEOUT_MS / 1000}s`
              : stderr
          ),
          exitCode: timedOut ? 124 : code ?? 1,
          mode: "docker",
          timedOut,
        });
      });
    });
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function runInProcess(req: RunRequest): Promise<RunResult> {
  const cfg = languageConfig(req.language);
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "aether-"));
  const fileName = `main${cfg.ext}`;
  const filePath = path.join(tmpDir, fileName);

  try {
    await fs.writeFile(filePath, req.code, "utf8");

    return await new Promise<RunResult>((resolve) => {
      const child = spawn(cfg.localCmd, [filePath], {
        cwd: tmpDir,
        env: {
          PATH: process.env.PATH,
          HOME: tmpDir,
          NODE_OPTIONS: "--max-old-space-size=128",
        },
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
      }, TIMEOUT_MS);

      child.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      if (req.stdin) {
        child.stdin.write(req.stdin);
      }
      child.stdin.end();

      child.on("error", (err) => {
        clearTimeout(timer);
        resolve({
          stdout: "",
          stderr: err.message,
          exitCode: 1,
          mode: "process",
          timedOut: false,
        });
      });

      child.on("close", (code) => {
        clearTimeout(timer);
        resolve({
          stdout: truncate(stdout),
          stderr: truncate(
            timedOut
              ? `${stderr}\n[error] Execution timed out after ${TIMEOUT_MS / 1000}s`
              : stderr
          ),
          exitCode: timedOut ? 124 : code ?? 1,
          mode: "process",
          timedOut,
        });
      });
    });
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function runCode(req: RunRequest): Promise<RunResult> {
  if (await hasDocker()) {
    return runInDocker(req);
  }
  return runInProcess(req);
}

export async function getSandboxMode(): Promise<"docker" | "process"> {
  return (await hasDocker()) ? "docker" : "process";
}
