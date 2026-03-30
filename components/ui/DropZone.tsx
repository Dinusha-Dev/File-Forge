"use client";

import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FolderOpen, X } from "lucide-react";

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  sublabel?: string;
  files?: File[];
  onRemove?: (index: number) => void;
}

export default function DropZone({
  onFiles,
  accept,
  multiple = true,
  label = "Drop files here",
  sublabel,
  files = [],
  onRemove,
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length > 0) onFiles(dropped);
    },
    [onFiles]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length > 0) onFiles(selected);
    e.target.value = "";
  };

  return (
    <div className="space-y-3">
      <motion.div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        animate={isDragging ? { scale: 1.02 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200 p-10 flex flex-col items-center justify-center gap-3 select-none ${
          isDragging
            ? "border-accent-violet bg-accent-violet/10 shadow-glow-violet"
            : "border-border hover:border-accent-violet/50 hover:bg-surface-3 bg-surface-2"
        }`}
      >
        <motion.div
          animate={isDragging ? { y: -4, scale: 1.1 } : { y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={`w-12 h-12 rounded-full flex items-center justify-center ${
            isDragging
              ? "bg-accent-violet text-white shadow-glow-violet"
              : "bg-surface-3 text-white/40"
          }`}
        >
          <Upload className="w-5 h-5" />
        </motion.div>
        <div className="text-center">
          <p className="text-sm font-medium text-white/80">{label}</p>
          <p className="text-xs text-white/40 mt-1">
            {sublabel ?? "or click to browse files"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-violet/20 hover:bg-accent-violet/30 text-accent-violet-light text-xs font-medium transition-colors border border-accent-violet/30"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Browse Files
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={handleChange}
        />
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 rounded-xl bg-accent-violet/5 pointer-events-none"
          />
        )}
      </motion.div>

      {/* File list */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1.5"
          >
            {files.map((file, i) => (
              <motion.div
                key={`${file.name}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-3 border border-border-subtle group"
              >
                <div className="w-6 h-6 rounded bg-accent-violet/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-bold text-accent-violet-light uppercase">
                    {file.name.split(".").pop()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white/80 truncate">{file.name}</p>
                  <p className="text-[10px] text-white/30">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                {onRemove && (
                  <button
                    onClick={() => onRemove(i)}
                    className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center hover:bg-accent-rose/20 text-white/40 hover:text-accent-rose transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
