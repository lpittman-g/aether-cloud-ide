"use client";

import { ChevronDown, ChevronRight, FileCode2, Folder, FolderOpen } from "lucide-react";
import { useState } from "react";
import type { FileNode } from "@/lib/api";

function FileIcon({ name }: { name: string }) {
  const color = name.endsWith(".py")
    ? "text-sky-400"
    : name.endsWith(".js")
      ? "text-amber-300"
      : name.endsWith(".md")
        ? "text-emerald-300"
        : "text-[var(--text-muted)]";
  return <FileCode2 className={`h-3.5 w-3.5 shrink-0 ${color}`} />;
}

function TreeItem({
  node,
  depth,
  activePath,
  onSelect,
}: {
  node: FileNode;
  depth: number;
  activePath: string | null;
  onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const isActive = activePath === node.path;

  if (node.type === "directory") {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[13px] text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text)]"
          style={{ paddingLeft: 8 + depth * 12 }}
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          )}
          {open ? (
            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-teal-300/80" />
          ) : (
            <Folder className="h-3.5 w-3.5 shrink-0 text-teal-300/80" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {open &&
          node.children?.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              activePath={activePath}
              onSelect={onSelect}
            />
          ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(node.path)}
      className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[13px] transition ${
        isActive
          ? "bg-[var(--accent-dim)]/25 text-[var(--text)]"
          : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]"
      }`}
      style={{ paddingLeft: 8 + depth * 12 }}
    >
      <span className="w-3.5 shrink-0" />
      <FileIcon name={node.name} />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export function FileTree({
  tree,
  activePath,
  onSelect,
}: {
  tree: FileNode[];
  activePath: string | null;
  onSelect: (path: string) => void;
}) {
  if (!tree.length) {
    return (
      <p className="px-3 py-4 text-xs text-[var(--text-muted)]">
        No files in workspace yet.
      </p>
    );
  }

  return (
    <nav className="space-y-0.5 p-2">
      {tree.map((node) => (
        <TreeItem
          key={node.path}
          node={node}
          depth={0}
          activePath={activePath}
          onSelect={onSelect}
        />
      ))}
    </nav>
  );
}
