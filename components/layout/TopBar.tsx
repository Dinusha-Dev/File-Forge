"use client";

import { usePathname } from "next/navigation";

const titles: Record<string, { title: string; description: string }> = {
  "/": { title: "Dashboard", description: "Welcome to FilForge" },
  "/convert": { title: "Image Converter", description: "Bulk convert between any image format" },
  "/pdf/merge": { title: "PDF Merge", description: "Combine multiple PDFs into one" },
  "/pdf/split": { title: "PDF Split", description: "Extract pages or split into parts" },
  "/pdf/organize": { title: "PDF Organize", description: "Reorder pages with drag & drop" },
};

export default function TopBar() {
  const pathname = usePathname();
  const meta = titles[pathname] ?? { title: "FilForge", description: "Universal File Hub" };

  return (
    <header className="h-14 flex items-center px-6 border-b border-border-subtle bg-surface-1/50 backdrop-blur-sm sticky top-0 z-40">
      <div>
        <h1 className="text-sm font-semibold text-white">{meta.title}</h1>
        <p className="text-[11px] text-white/40 leading-none mt-0.5">{meta.description}</p>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse-slow" />
        <span className="text-xs text-white/40">Server ready</span>
      </div>
    </header>
  );
}
