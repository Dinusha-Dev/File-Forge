import Link from "next/link";
import { ImageIcon, FileStack, FileMinus, GripVertical, ArrowRight, Zap, Shield, Clock, ImageDown, ImagePlus, FileText, FileSpreadsheet, ScanText, Stamp, Eraser } from "lucide-react";

const modules = [
  {
    href: "/convert",
    icon: ImageIcon,
    title: "Image Converter",
    description: "Bulk convert PNG, JPG, WebP, AVIF, TIFF & more with real-time progress tracking.",
    gradient: "from-violet-600 to-purple-600",
    glow: "shadow-[0_0_30px_rgba(124,58,237,0.3)]",
    badge: "Module A",
    badgeColor: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    formats: ["PNG", "JPG", "WebP", "AVIF", "TIFF"],
  },
  {
    href: "/pdf/merge",
    icon: FileStack,
    title: "PDF Merge",
    description: "Combine any number of PDF documents into a single, seamlessly merged file.",
    gradient: "from-cyan-600 to-blue-600",
    glow: "shadow-[0_0_30px_rgba(6,182,212,0.25)]",
    badge: "Module B · 1",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    formats: [],
  },
  {
    href: "/pdf/split",
    icon: FileMinus,
    title: "PDF Split",
    description: "Extract specific pages or split a PDF into individual files using range notation.",
    gradient: "from-emerald-600 to-teal-600",
    glow: "shadow-[0_0_30px_rgba(16,185,129,0.25)]",
    badge: "Module B · 2",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    formats: [],
  },
  {
    href: "/pdf/organize",
    icon: GripVertical,
    title: "PDF Organize",
    description: "Visually drag & drop PDF pages into your desired order before saving.",
    gradient: "from-rose-600 to-pink-600",
    glow: "shadow-[0_0_30px_rgba(244,63,94,0.25)]",
    badge: "Module B · 3",
    badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    formats: [],
  },
  {
    href: "/pdf/watermark",
    icon: Stamp,
    title: "PDF Watermark",
    description: "Permanently burn custom text transparent overlays securely into PDFs offline.",
    gradient: "from-orange-600 to-amber-600",
    glow: "shadow-[0_0_30px_rgba(234,88,12,0.25)]",
    badge: "Module E · 1",
    badgeColor: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    formats: [],
  },
  {
    href: "/image/extract-text",
    icon: ScanText,
    title: "Image to Text (OCR)",
    description: "Extract raw conversational string data natively from photos using WASM Machine Learning.",
    gradient: "from-fuchsia-600 to-pink-600",
    glow: "shadow-[0_0_30px_rgba(217,70,239,0.25)]",
    badge: "Module A · 2",
    badgeColor: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30",
    formats: ["ENG", "SPA", "FRA", "DEU"],
  },
  {
    href: "/pdf/pdf-to-image",
    icon: ImageDown,
    title: "PDF to Image",
    description: "Extract ultra-HD rasterized image files (PNG/JPG/WEBP) from any PDF page natively.",
    gradient: "from-indigo-600 to-violet-600",
    glow: "shadow-[0_0_30px_rgba(99,102,241,0.25)]",
    badge: "Module C · 1",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    formats: [],
  },
  {
    href: "/image/remove-background",
    icon: Eraser,
    title: "Background Remover",
    description: "Execute raw ONNX neural networks locally into the browser memory to mathematically strip image backgrounds.",
    gradient: "from-indigo-500 to-violet-600",
    glow: "shadow-[0_0_30px_rgba(99,102,241,0.25)]",
    badge: "WASM/ONNX",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    formats: [],
  },
  {
    href: "/pdf/image-to-pdf",
    icon: ImagePlus,
    title: "Image to PDF",
    description: "Visually stitch dozens of images into a single scalable PDF locally without API costs.",
    gradient: "from-blue-600 to-indigo-600",
    glow: "shadow-[0_0_30px_rgba(59,130,246,0.25)]",
    badge: "Module C · 2",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    formats: [],
  },
  {
    href: "/pdf/pdf-to-word",
    icon: FileText,
    title: "PDF to Word (Text)",
    description: "Scrape pure conversational strings into native Microsoft .docx formats instantly.",
    gradient: "from-sky-600 to-blue-600",
    glow: "shadow-[0_0_30px_rgba(2,132,199,0.25)]",
    badge: "Module D · 1",
    badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/30",
    formats: [],
  },
  {
    href: "/pdf/pdf-to-excel",
    icon: FileSpreadsheet,
    title: "PDF to Excel (Data)",
    description: "Heuristically parse unstructured text blobs into active spreadsheet grid arrays.",
    gradient: "from-emerald-600 to-teal-600",
    glow: "shadow-[0_0_30px_rgba(16,185,129,0.25)]",
    badge: "Module D · 2",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    formats: [],
  },
];
const perks = [
  { icon: Zap, title: "Blazing Fast", desc: "Sharp & pdf-lib run server-side for maximum throughput" },
  { icon: Shield, title: "100% Private", desc: "Files never leave your server. No cloud, no tracking." },
  { icon: Clock, title: "Auto-Cleanup", desc: "All processed files are deleted within 1 hour automatically." },
];

export default function DashboardPage() {
  return (
    <div className="p-8 space-y-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-1 border border-border-subtle p-10">
        <div className="absolute inset-0 bg-glow-violet opacity-60 pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent-cyan/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-violet/20 border border-accent-violet/30 text-xs font-medium text-accent-violet-light">
            <Zap className="w-3 h-3" />
            Universal File Hub — v1.0
          </div>
          <h1 className="text-4xl font-bold leading-tight">
            Transform Files
            <br />
            <span className="gradient-text">at Scale, Instantly.</span>
          </h1>
          <p className="text-white/50 text-base leading-relaxed">
            A powerful, privacy-first toolkit for converting images in bulk and manipulating PDFs —
            all running locally on your server with zero cloud dependency.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <Link
              href="/convert"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-violet to-accent-cyan text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-glow-violet"
            >
              Start Converting <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pdf/merge"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-3 border border-border text-white/70 hover:text-white text-sm font-medium transition-colors"
            >
              PDF Tools
            </Link>
          </div>
        </div>
      </div>

      {/* Module Cards */}
      <div>
        <h2 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-5">Feature Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {modules.map((mod) => (
            <Link key={mod.href} href={mod.href}>
              <div
                className="group relative overflow-hidden rounded-2xl bg-surface-1 border border-border-subtle hover:border-white/10 p-5 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer flex flex-col h-[110px]"
              >
                {/* Gradient top accent stripe */}
                <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${mod.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                <div className="flex items-center gap-4 flex-1 min-h-0">
                  {/* Icon */}
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform duration-200`}>
                    <mod.icon className="w-5 h-5 text-white" strokeWidth={1.75} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-white truncate">{mod.title}</h3>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${mod.badgeColor}`}>
                        {mod.badge}
                      </span>
                    </div>
                    <p className="text-xs text-white/40 leading-relaxed line-clamp-2">{mod.description}</p>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="w-4 h-4 text-white/15 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </div>

                {/* Format tags row — always same fixed height (8px gap + tags or empty) */}
                <div className="h-7 flex items-end">
                  {mod.formats.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {mod.formats.map((fmt) => (
                        <span key={fmt} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-3 text-white/50 font-mono border border-border-subtle">
                          {fmt}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>



      {/* Perks */}
      <div className="grid grid-cols-3 gap-4">
        {perks.map((perk) => (
          <div key={perk.title} className="rounded-xl bg-surface-1 border border-border-subtle p-5 flex flex-col gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center">
              <perk.icon className="w-4 h-4 text-accent-violet-light" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{perk.title}</p>
              <p className="text-xs text-white/40 mt-1 leading-relaxed">{perk.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
