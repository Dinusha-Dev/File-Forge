"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileMinus, Scissors, Download, RefreshCw, CheckCircle, AlertCircle, Info } from "lucide-react";
import DropZone from "@/components/ui/DropZone";
import { toast } from "@/components/ui/Toast";
import JSZip from "jszip";
import { splitPDFClient, parsePageRangesClient, getPageCountClient } from "@/lib/client-pdf-manager";

export default function PDFSplitPage() {
  const [file, setFile] = useState<File | null>(null);
  const [ranges, setRanges] = useState("");
  const [splitAll, setSplitAll] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleFiles = useCallback((incoming: File[]) => {
    if (incoming[0]) setFile(incoming[0]);
  }, []);

  const handleReset = () => { 
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setFile(null); 
    setRanges(""); 
    setDownloadUrl(null); 
    setIsSubmitting(false); 
  };

  const handleSplit = async () => {
    if (!file) return;
    setIsSubmitting(true);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);

    try {
      const ab = await file.arrayBuffer();
      const totalPages = await getPageCountClient(ab);
      const parsedRanges = parsePageRangesClient(splitAll ? "" : ranges, totalPages);
      
      const parts = await splitPDFClient(ab, parsedRanges);

      const zip = new JSZip();
      parts.forEach((part, i) => {
        zip.file(`part_${i + 1}.pdf`, part);
      });

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      setDownloadUrl(url);

      toast("PDF split into zip file locally!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Split failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center">
          <FileMinus className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">PDF Split</h1>
          <p className="text-xs text-white/40">Extract pages or split by range</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!downloadUrl && !isSubmitting && (
          <motion.div key="config" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <DropZone
              onFiles={handleFiles}
              accept=".pdf,application/pdf"
              multiple={false}
              label="Drop a PDF file here"
              sublabel="Single PDF for splitting"
              files={file ? [file] : []}
              onRemove={() => setFile(null)}
            />

            {/* Mode toggle */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-2 border border-border-subtle">
              <label className="relative inline-flex items-center cursor-pointer gap-3">
                <div
                  onClick={() => setSplitAll(!splitAll)}
                  className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${splitAll ? "bg-accent-emerald" : "bg-surface-4"}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform mt-0.5 ${splitAll ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
                <span className="text-sm font-medium text-white/70">
                  {splitAll ? "Split every page into individual files" : "Use custom page ranges"}
                </span>
              </label>
            </div>

            {!splitAll && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Page Ranges</label>
                <input
                  type="text"
                  value={ranges}
                  onChange={(e) => setRanges(e.target.value)}
                  placeholder="e.g. 1-3, 5, 7-10"
                  className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-accent-emerald/50 transition-colors font-mono"
                />
                <div className="flex items-start gap-2 text-[11px] text-white/30">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>Each comma-separated entry becomes a separate output file. Example: <code className="text-accent-emerald/70">1-3, 5, 7-10</code> → 3 output files.</span>
                </div>
              </div>
            )}

            <button
              disabled={!file || isSubmitting}
              onClick={handleSplit}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
              {isSubmitting ? "Splitting…" : "Split PDF"}
            </button>
          </motion.div>
        )}

        {isSubmitting && !downloadUrl && (
          <motion.div key="progress" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
             <div className="rounded-xl p-5 border bg-surface-2 border-border-subtle flex flex-col items-center gap-3">
               <RefreshCw className="w-8 h-8 animate-spin text-accent-emerald" />
               <p className="text-sm text-white/60">Splitting and generating ZIP archive…</p>
             </div>
          </motion.div>
        )}

        {downloadUrl && (
          <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="rounded-xl p-8 border bg-accent-emerald/10 border-accent-emerald/30 flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-full bg-accent-emerald/20 flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-accent-emerald" />
                </div>
                <div>
                   <p className="text-base font-semibold text-white">Split Complete!</p>
                   <p className="text-xs text-white/40 mt-1">Your split PDFs are packaged together securely.</p>
                </div>
                <a 
                   href={downloadUrl} 
                   download="splitted_files.zip" 
                   className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent-emerald text-white text-sm font-semibold hover:bg-emerald-400 transition-colors shadow-glow-emerald"
                >
                  <Download className="w-4 h-4" /> Download ZIP
                </a>
            </div>
            <button onClick={handleReset} className="w-full py-2.5 rounded-xl border border-border text-white/50 hover:text-white text-sm font-medium transition-colors">Split Another PDF</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
