"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";

export type TerminalLine = {
  id: string;
  kind: "stdout" | "stderr" | "system" | "meta";
  text: string;
};

export function TerminalPanel({
  lines,
  running,
  onClear,
}: {
  lines: TerminalLine[];
  running: boolean;
  onClear: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, running]);

  return (
    <div className="flex h-full flex-col bg-[var(--terminal)]">
      <div className="flex items-center justify-end gap-2 px-3 py-1">
        {running && (
          <span className="mr-auto inline-flex items-center gap-1.5 text-[11px] text-[var(--accent)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" />
            Running
          </span>
        )}
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text)]"
        >
          <Trash2 className="h-3 w-3" />
          Clear
        </button>
      </div>
      <div className="mono flex-1 overflow-auto px-3 py-2 text-[12.5px] leading-relaxed">
        {lines.length === 0 && (
          <p className="text-[var(--text-muted)]">
            Output streams here over Socket.io when you run code.
          </p>
        )}
        {lines.map((line) => (
          <pre
            key={line.id}
            className={`whitespace-pre-wrap break-words ${
              line.kind === "stderr"
                ? "text-[var(--danger)]"
                : line.kind === "system"
                  ? "text-[var(--warn)]"
                  : line.kind === "meta"
                    ? "text-[var(--accent)]"
                    : "text-[var(--text)]"
            }`}
          >
            {line.text}
          </pre>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
