"use client";

// Force IDE cache refresh
import { ImageFormat } from "../../lib/converter";
import { ChevronRight } from "lucide-react";

const FORMATS: { value: ImageFormat; label: string; color: string }[] = [
  { value: "jpg", label: "JPG", color: "from-amber-500 to-orange-500" },
  { value: "jpeg", label: "JPEG", color: "from-orange-500 to-red-500" },
  { value: "png", label: "PNG", color: "from-blue-500 to-cyan-500" },
  { value: "webp", label: "WebP", color: "from-emerald-500 to-teal-500" },
  { value: "avif", label: "AVIF", color: "from-violet-500 to-purple-500" },
  { value: "tiff", label: "TIFF", color: "from-rose-500 to-pink-500" },
  { value: "gif", label: "GIF", color: "from-indigo-500 to-blue-500" },
  { value: "ico", label: "ICO", color: "from-yellow-500 to-amber-600" },
  { value: "pdf", label: "PDF", color: "from-red-600 to-rose-700" },
  { value: "svg", label: "SVG", color: "from-cyan-500 to-blue-600" },
];

interface FormatSelectorProps {
  value: ImageFormat;
  onChange: (fmt: ImageFormat) => void;
  label?: string;
}

export default function FormatSelector({ value, onChange, label = "Convert to" }: FormatSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-white/50 uppercase tracking-wider">{label}</label>
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-2">
        {FORMATS.map((fmt) => {
          const isActive = value === fmt.value;
          return (
            <button
              key={fmt.value}
              type="button"
              onClick={() => onChange(fmt.value)}
              className={`relative py-2.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 border ${
                isActive
                  ? "text-white border-transparent shadow-glow-sm"
                  : "text-white/40 border-border-subtle bg-surface-2 hover:text-white/70 hover:border-border"
              }`}
            >
              {isActive && (
                <span
                  className={`absolute inset-0 rounded-lg bg-gradient-to-br ${fmt.color} opacity-90`}
                />
              )}
              <span className="relative">{fmt.label}</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 text-[11px] text-white/30 mt-1">
        <ChevronRight className="w-3 h-3" />
        <span>HEIC files are pre-converted in your browser before upload</span>
      </div>
    </div>
  );
}
