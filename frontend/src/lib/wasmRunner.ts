/**
 * In-browser execution path (Wasm / Worker), modeled on Replit's browser runtimes.
 * Runs JavaScript in a dedicated worker without hitting the Go/Rust sandbox.
 */

export type WasmRunResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
  mode: "wasm-worker";
  timedOut: boolean;
};

export async function runJavascriptInBrowser(
  code: string,
  timeoutMs = 5000
): Promise<WasmRunResult> {
  const workerSource = `
    self.onmessage = async (ev) => {
      const { code } = ev.data || {};
      let stdout = '';
      let stderr = '';
      const log = (...args) => {
        stdout += args.map((a) => String(a)).join(' ') + '\\n';
      };
      try {
        const fn = new Function('console', '"use strict";\\n' + code);
        fn({ log, info: log, warn: log, error: (...a) => { stderr += a.map(String).join(' ') + '\\n'; } });
        self.postMessage({ ok: true, stdout, stderr });
      } catch (err) {
        stderr += (err && err.stack) ? err.stack : String(err);
        self.postMessage({ ok: false, stdout, stderr });
      }
    };
  `;
  const blob = new Blob([workerSource], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);

  return new Promise((resolve) => {
    const worker = new Worker(url);
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve({
        stdout: "",
        stderr: "wasm-worker: timed out",
        exitCode: 124,
        mode: "wasm-worker",
        timedOut: true,
      });
    }, timeoutMs);

    worker.onmessage = (ev) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      const data = ev.data || {};
      resolve({
        stdout: String(data.stdout ?? ""),
        stderr: String(data.stderr ?? ""),
        exitCode: data.ok ? 0 : 1,
        mode: "wasm-worker",
        timedOut: false,
      });
    };

    worker.onerror = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve({
        stdout: "",
        stderr: String(err.message || err),
        exitCode: 1,
        mode: "wasm-worker",
        timedOut: false,
      });
    };

    worker.postMessage({ code });
  });
}
