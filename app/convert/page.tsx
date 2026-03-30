// Force IDE cache refresh
"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon, Wand2, Download, RefreshCw, AlertCircle } from "lucide-react";
import DropZone from "../../components/ui/DropZone";
import FormatSelector from "../../components/ui/FormatSelector";
import FileCard from "../../components/ui/FileCard";
import { ImageFormat } from "../../lib/converter";
import { convertImagesAction, getImageJobStatusAction } from "../../actions/image-actions";
import { toast } from "../../components/ui/Toast";
import type { Job, FileProgress } from "../../lib/job-queue";

export default function ConvertPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [targetFormat, setTargetFormat] = useState<ImageFormat>("webp");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleFiles = useCallback((incoming: File[]) => {
    setFiles((prev) => {
      const existing = new Set(prev.map((f: File) => f.name));
      return [...prev, ...incoming.filter((f: File) => !existing.has(f.name))];
    });
  }, []);

  const handleRemove = (index: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== index));

  const handleReset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setFiles([]);
    setJob(null);
    setJobId(null);
    setIsSubmitting(false);
  };

  const startPolling = (id: string) => {
    pollRef.current = setInterval(async () => {
      const status = await getImageJobStatusAction(id);
      if (status) {
        setJob(status);
        if (status.status === "done" || status.status === "error") {
          clearInterval(pollRef.current!);
          if (status.status === "done") toast("All files converted successfully!", "success");
          else toast("Some files failed to convert.", "error");
        }
      }
    }, 800);
  };

  const handleConvert = async () => {
    if (files.length === 0) return;
    setIsSubmitting(true);

    // Client-side HEIC pre-conversion
    const processedFiles: File[] = [];
    for (const file of files) {
      if (file.name.toLowerCase().endsWith(".heic") || file.type === "image/heic") {
        try {
          const heic2any = (await import("heic2any")).default;
          const blob = await heic2any({ blob: file, toType: "image/png" }) as Blob;
          const converted = new File([blob], file.name.replace(/\.heic$/i, ".png"), { type: "image/png" });
          processedFiles.push(converted);
          toast(`HEIC → PNG: ${file.name}`, "info");
        } catch {
          processedFiles.push(file);
        }
      } else {
        processedFiles.push(file);
      }
    }

    try {
      const formData = new FormData();
      processedFiles.forEach((f) => formData.append("files", f));
      formData.append("targetFormat", targetFormat);

      const result = await convertImagesAction(formData);
      setJobId(result.jobId);

      // Seed initial job state
      setJob({
        id: result.jobId,
        type: "image-convert",
        status: "processing",
        files: processedFiles.map((f, i) => ({
          filename: `file_${i}`,
          originalName: f.name,
          status: "pending",
          progress: 0,
        })),
        createdAt: Date.now(),
      });

      startPolling(result.jobId);
      toast(`Started converting ${result.fileCount} files…`, "info");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Conversion failed", "error");
      setIsSubmitting(false);
    }
  };

  const allDone = job?.status === "done";
  const hasError = job?.status === "error";

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-glow-violet">
            <ImageIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Bulk Image Converter</h1>
            <p className="text-xs text-white/40">Convert any image format, any quantity</p>
          </div>
        </div>
      </div>

      {/* Config panel */}
      <AnimatePresence mode="wait">
        {!job && (
          <motion.div
            key="config"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <DropZone
              onFiles={handleFiles}
              accept="image/*,.heic"
              multiple
              label="Drop images here"
              sublabel="Supports PNG, JPG, WebP, AVIF, TIFF, GIF, HEIC"
              files={files}
              onRemove={handleRemove}
            />

            <FormatSelector value={targetFormat} onChange={setTargetFormat} />

            <button
              disabled={files.length === 0 || isSubmitting}
              onClick={handleConvert}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-accent-violet to-accent-cyan text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-glow-violet"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              {isSubmitting
                ? "Submitting..."
                : `Convert ${files.length > 0 ? files.length : ""} File${files.length !== 1 ? "s" : ""} to ${targetFormat.toUpperCase()}`}
            </button>
          </motion.div>
        )}

        {job && (
          <motion.div
            key="progress"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Status banner */}
            <div className={`rounded-xl p-4 border flex items-center gap-3 ${allDone ? "bg-accent-emerald/10 border-accent-emerald/30" :
              hasError ? "bg-accent-rose/10 border-accent-rose/30" :
                "bg-surface-2 border-border-subtle"
              }`}>
              {allDone ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse-slow" />
                  <span className="text-sm font-medium text-accent-emerald">All files converted successfully!</span>
                  {jobId && (
                    <a
                      href={`/api/download/${jobId}`}
                      download
                      className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-emerald/20 hover:bg-accent-emerald/30 text-accent-emerald text-xs font-medium transition-colors"
                    >
                      <Download className="w-3 h-3" /> Download All
                    </a>
                  )}
                </>
              ) : hasError ? (
                <>
                  <AlertCircle className="w-4 h-4 text-accent-rose" />
                  <span className="text-sm text-accent-rose">Some files encountered errors</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 text-accent-violet-light animate-spin" />
                  <span className="text-sm text-white/60">Processing files…</span>
                  <span className="ml-auto text-xs text-white/30">
                    {job.files.filter((f: { status: string }) => f.status === "done").length} / {job.files.length} done
                  </span>
                </>
              )}
            </div>

            {/* File cards */}
            <div className="space-y-2">
              {job.files.map((file: FileProgress, i: number) => (
                <FileCard key={file.filename} file={file} jobId={job.id} index={i} />
              ))}
            </div>

            <button
              onClick={handleReset}
              className="w-full py-2.5 rounded-xl border border-border text-white/50 hover:text-white hover:border-border-strong text-sm font-medium transition-colors"
            >
              Convert More Files
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
