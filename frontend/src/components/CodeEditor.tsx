"use client";

import Editor from "@monaco-editor/react";
import { languageFromPath } from "@/lib/api";

export function CodeEditor({
  path,
  value,
  onChange,
}: {
  path: string | null;
  value: string;
  onChange: (value: string) => void;
}) {
  if (!path) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--bg-panel)]">
        <div className="max-w-sm px-6 text-center">
          <p className="text-lg font-medium tracking-tight text-[var(--text)]">
            Open a file to start
          </p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Pick something from the sidebar, edit it, then run JavaScript or Python
            in the sandbox.
          </p>
        </div>
      </div>
    );
  }

  const language = languageFromPath(path);

  return (
    <Editor
      height="100%"
      theme="vs-dark"
      path={path}
      language={language}
      value={value}
      onChange={(v) => onChange(v ?? "")}
      options={{
        fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
        fontSize: 14,
        lineHeight: 22,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        padding: { top: 16 },
        renderLineHighlight: "line",
        tabSize: 2,
        automaticLayout: true,
        wordWrap: "on",
      }}
      loading={
        <div className="flex h-full items-center justify-center bg-[var(--bg-panel)] text-sm text-[var(--text-muted)]">
          Loading editor…
        </div>
      }
    />
  );
}
