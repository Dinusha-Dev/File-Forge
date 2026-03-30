"use client";

import { motion } from "framer-motion";
import { CheckCircle, AlertCircle, Loader2, Download } from "lucide-react";

export interface LocalFileProgress {
  filename: string;
  originalName: string;
  status: "pending" | "processing" | "done" | "error";
  progress: number;
  error?: string;
  outputFilename?: string;
  downloadUrl?: string;
}

interface FileCardProps {
  file: LocalFileProgress;
  index: number;
}

export default function FileCard({ file, index }: FileCardProps) {
  const isDone = file.status === "done";
  const isError = file.status === "error";
  const isProcessing = file.status === "processing";

  const downloadUrl = file.downloadUrl || null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className={`rounded-xl border p-4 bg-surface-2 transition-colors ${isDone
        ? "border-accent-emerald/30"
        : isError
          ? "border-accent-rose/30"
          : "border-border-subtle"
        }`}
    >
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDone
            ? "bg-accent-emerald/20"
            : isError
              ? "bg-accent-rose/20"
              : "bg-surface-3"
            }`}
        >
          {isDone ? (
            <CheckCircle className="w-4 h-4 text-accent-emerald" />
          ) : isError ? (
            <AlertCircle className="w-4 h-4 text-accent-rose" />
          ) : (
            <Loader2
              className={`w-4 h-4 text-accent-violet-light ${isProcessing ? "animate-spin" : "opacity-30"}`}
            />
          )}
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white/90 truncate">
            {file.originalName}
          </p>
          {file.outputFilename && (
            <p className="text-[10px] text-white/40 mt-0.5 truncate">
              → {file.outputFilename}
            </p>
          )}
          {isError && (
            <p className="text-[10px] text-accent-rose mt-1">{file.error}</p>
          )}

          {/* Progress bar */}
          {!isError && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-white/30 capitalize">
                  {file.status}
                </span>
                <span className="text-[10px] text-white/30">{file.progress}%</span>
              </div>
              <div className="h-1 bg-surface-4 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${isDone
                    ? "bg-accent-emerald"
                    : "bg-gradient-to-r from-accent-violet to-accent-cyan"
                    }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${file.progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Download button */}
        {downloadUrl && file.outputFilename && (
          <a
            href={downloadUrl}
            download={file.outputFilename}
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent-violet/20 hover:bg-accent-violet/40 border border-accent-violet/30 flex items-center justify-center transition-colors group"
          >
            <Download className="w-3.5 h-3.5 text-accent-violet-light group-hover:text-white transition-colors" />
          </a>
        )}
      </div>
    </motion.div>
  );
}
