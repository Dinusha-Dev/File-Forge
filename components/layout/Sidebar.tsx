"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  ImageIcon,
  FileStack,
  FileMinus,
  GripVertical,
  Zap,
  ImageDown,
  ImagePlus,
  FileText,
  FileSpreadsheet,
  ScanText,
  Stamp,
  Eraser
} from "lucide-react";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/convert", icon: ImageIcon, label: "Image Converter" },
  { href: "/image/extract-text", icon: ScanText, label: "Image OCR" },
  { href: "/image/remove-background", icon: Eraser, label: "BG Remover" },
  { href: "/pdf/merge", icon: FileStack, label: "PDF Merge" },
  { href: "/pdf/split", icon: FileMinus, label: "PDF Split" },
  { href: "/pdf/organize", icon: GripVertical, label: "PDF Organize" },
  { href: "/pdf/watermark", icon: Stamp, label: "PDF Watermark" },
  { href: "/pdf/pdf-to-image", icon: ImageDown, label: "PDF to Image" },
  { href: "/pdf/image-to-pdf", icon: ImagePlus, label: "Image to PDF" },
  { href: "/pdf/pdf-to-word", icon: FileText, label: "PDF to Word" },
  { href: "/pdf/pdf-to-excel", icon: FileSpreadsheet, label: "PDF to Excel" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface-1 border-r border-border-subtle flex flex-col z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border-subtle">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-violet to-accent-cyan flex items-center justify-center shadow-glow-violet">
          <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <span className="text-sm font-bold text-white tracking-tight">FilForge</span>
          <p className="text-[10px] text-white/40 leading-none mt-0.5">Universal File Hub</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <div className="relative group">
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute inset-0 bg-gradient-to-r from-accent-violet/20 to-accent-violet/5 rounded-lg border border-accent-violet/30"
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}
                <div
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? "text-accent-violet-light"
                      : "text-white/50 hover:text-white/80 hover:bg-surface-3"
                  }`}
                >
                  <item.icon
                    className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-accent-violet-light" : ""}`}
                    strokeWidth={isActive ? 2 : 1.75}
                  />
                  <span className="text-sm font-medium">{item.label}</span>
                  {isActive && (
                    <div className="ml-auto w-1 h-4 rounded-full bg-accent-violet-light opacity-80" />
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border-subtle">
        <div className="rounded-lg bg-surface-3 border border-border-subtle p-3">
          <p className="text-[11px] text-white/40 leading-relaxed">
            Files auto-deleted after <span className="text-accent-violet-light font-medium">1 hour</span>. Nothing is stored permanently.
          </p>
        </div>
      </div>
    </aside>
  );
}
