"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon, Wand2, Download, RefreshCw, AlertCircle } from "lucide-react";
import DropZone from "../../components/ui/DropZone";
import FormatSelector from "../../components/ui/FormatSelector";
import FileCard, { LocalFileProgress } from "../../components/ui/FileCard";
import { ImageFormat } from "../../lib/converter";
import { toast } from "../../components/ui/Toast";
import JSZip from "jszip";

const compressImageLocally = async (file: File): Promise<File> => {
  if (file.size < 4000000) return file;
  if (!file.type.startsWith("image/") || file.type.includes("svg")) return file;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const maxDim = 3000;
        
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.floor((height * maxDim) / width); width = maxDim; }
          else { width = Math.floor((width * maxDim) / height); height = maxDim; }
        }
        
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(file);
        
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => blob ? resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" })) : resolve(file),
          "image/jpeg",
          0.85
        );
      };
      img.onerror = () => resolve(file);
      if (e.target?.result) img.src = e.target.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

export default function ConvertPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [targetFormat, setTargetFormat] = useState<ImageFormat>("webp");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobStatus, setJobStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [fileProgresses, setFileProgresses] = useState<LocalFileProgress[]>([]);

  const handleFiles = useCallback((incoming: File[]) => {
    setFiles((prev) => {
      const existing = new Set(prev.map((f: File) => f.name));
      return [...prev, ...incoming.filter((f: File) => !existing.has(f.name))];
    });
  }, []);

  const handleRemove = (index: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== index));

  const handleReset = () => {
    fileProgresses.forEach(fp => {
      if (fp.downloadUrl) URL.revokeObjectURL(fp.downloadUrl);
    });
    setFiles([]);
    setJobStatus("idle");
    setFileProgresses([]);
    setIsSubmitting(false);
  };

  const handleDownloadAll = async () => {
    try {
      toast("Zipping files...", "info");
      const zip = new JSZip();
      for (const fp of fileProgresses) {
        if (fp.status === "done" && fp.downloadUrl) {
          const res = await fetch(fp.downloadUrl);
          const blob = await res.blob();
          zip.file(fp.outputFilename || "file", blob);
        }
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(zipBlob);
      a.download = "converted_images.zip";
      a.click();
      toast("Downloaded successfully!", "success");
    } catch {
      toast("Failed to zip files", "error");
    }
  };

  const handleConvert = async () => {
    if (files.length === 0) return;
    setIsSubmitting(true);
    setJobStatus("processing");

    // Client-side HEIC pre-conversion & Limit Compression bounds
    const processedFiles: File[] = [];
    for (const file of files) {
      let finalFile = file;

      if (file.name.toLowerCase().endsWith(".heic") || file.type === "image/heic") {
        try {
          const heic2any = (await import("heic2any")).default;
          const blob = await heic2any({ blob: file, toType: "image/png" }) as Blob;
          finalFile = new File([blob], file.name.replace(/\.heic$/i, ".png"), { type: "image/png" });
          toast(`HEIC → PNG: ${file.name}`, "info");
        } catch {
          // fallback to original if heic failed
        }
      }

      if (finalFile.size > 4000000 && !finalFile.type.includes("svg")) {
        try {
          finalFile = await compressImageLocally(finalFile);
          if (finalFile.size < file.size) toast(`Slightly downscaled ${file.name} to bypass cloud limits`, "info");
        } catch (e) {
          console.error("Compression bypass failed", e);
        }
      }

      processedFiles.push(finalFile);
    }

    const initialProgresses: LocalFileProgress[] = processedFiles.map((f, i) => ({
      filename: `file_${i}`,
      originalName: f.name,
      status: "pending",
      progress: 0,
    }));
    setFileProgresses(initialProgresses);

    let hasError = false;

    // Process files sequentially one by one to avoid overwhelming serverless limits
    for (let i = 0; i < processedFiles.length; i++) {
      const f = processedFiles[i];
      setFileProgresses(prev => {
        const next = [...prev];
        next[i] = { ...next[i], status: "processing", progress: 50 };
        return next;
      });

      try {
        const formData = new FormData();
        formData.append("file", f);
        formData.append("targetFormat", targetFormat);

        const res = await fetch("/api/process-image", { method: "POST", body: formData });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }

        const outFilenameHeader = res.headers.get("X-Output-Filename");
        const outFilename = outFilenameHeader 
          ? decodeURIComponent(outFilenameHeader) 
          : `${f.name.replace(/\.[^.]+$/, "")}.${targetFormat}`;

        const blob = await res.blob();
        const downloadUrl = URL.createObjectURL(blob);

        setFileProgresses(prev => {
          const next = [...prev];
          next[i] = { ...next[i], status: "done", progress: 100, outputFilename: outFilename, downloadUrl };
          return next;
        });
      } catch (err) {
        hasError = true;
        setFileProgresses(prev => {
          const next = [...prev];
          next[i] = { ...next[i], status: "error", progress: 0, error: err instanceof Error ? err.message : "Failed" };
          return next;
        });
      }
    }

    setJobStatus(hasError ? "error" : "done");
    setIsSubmitting(false);

    if (hasError) toast("Some files failed to convert.", "error");
    else toast("All files converted successfully!", "success");
  };

  const allDone = jobStatus === "done";
  const hasError = jobStatus === "error";

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
        {jobStatus === "idle" && (
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

        {jobStatus !== "idle" && (
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
                  <button
                    onClick={handleDownloadAll}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-emerald/20 hover:bg-accent-emerald/30 text-accent-emerald text-xs font-medium transition-colors"
                  >
                    <Download className="w-3 h-3" /> Download All
                  </button>
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
                    {fileProgresses.filter((f) => f.status === "done").length} / {fileProgresses.length} done
                  </span>
                </>
              )}
            </div>

            {/* File cards */}
            <div className="space-y-2">
              {fileProgresses.map((file, i) => (
                <FileCard key={file.filename} file={file} index={i} />
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
