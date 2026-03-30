"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileMinus, Scissors, Download, RefreshCw, CheckCircle, AlertCircle, Info } from "lucide-react";
import DropZone from "@/components/ui/DropZone";
import { splitPDFAction, getPDFJobStatusAction } from "@/actions/pdf-actions";
import { toast } from "@/components/ui/Toast";
import type { Job, FileProgress } from "@/lib/job-queue";

export default function PDFSplitPage() {
  const [file, setFile] = useState<File | null>(null);
  const [ranges, setRanges] = useState("");
  const [splitAll, setSplitAll] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const handleFiles = useCallback((incoming: File[]) => {
    if (incoming[0]) setFile(incoming[0]);
  }, []);

  const handleReset = () => { setFile(null); setRanges(""); setJob(null); setJobId(null); setIsSubmitting(false); };

  const poll = (id: string) => {
    const interval = setInterval(async () => {
      const status = await getPDFJobStatusAction(id);
      if (status) { setJob(status); if (status.status === "done" || status.status === "error") { clearInterval(interval); if (status.status === "done") toast(`Split into ${status.files.length} part(s)!`, "success"); } }
    }, 800);
  };

  const handleSplit = async () => {
    if (!file) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("ranges", splitAll ? "" : ranges);
      const result = await splitPDFAction(formData);
      setJobId(result.jobId);
      setJob({ id: result.jobId, type: "pdf-split", status: "processing", files: [], createdAt: Date.now() });
      poll(result.jobId);
      toast("Splitting PDF…", "info");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Split failed", "error");
      setIsSubmitting(false);
    }
  };

  const allDone = job?.status === "done";
  const hasError = job?.status === "error";

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
        {!job && (
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

        {job && (
          <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className={`rounded-xl p-5 border ${
              allDone ? "bg-accent-emerald/10 border-accent-emerald/30" :
              hasError ? "bg-accent-rose/10 border-accent-rose/30" :
              "bg-surface-2 border-border-subtle"
            }`}>
              {allDone ? (
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-5 h-5 text-accent-emerald" />
                  <p className="text-sm font-medium text-white">Split into <span className="text-accent-emerald">{job.files.length}</span> file(s)</p>
                  {jobId && (
                    <a href={`/api/download/${jobId}`} download className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-emerald/20 text-accent-emerald text-xs font-medium hover:bg-accent-emerald/30 transition-colors">
                      <Download className="w-3 h-3" /> Download All
                    </a>
                  )}
                </div>
              ) : hasError ? (
                <div className="flex items-center gap-2 text-accent-rose text-sm"><AlertCircle className="w-4 h-4" /> {job.error}</div>
              ) : (
                <div className="flex items-center gap-3 text-white/60 text-sm"><RefreshCw className="w-4 h-4 animate-spin text-accent-emerald" /> Splitting PDF…</div>
              )}

              {allDone && (
                <div className="space-y-2 mt-2">
                  {job.files.map((f: FileProgress) => (
                    <div key={f.filename} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-2">
                      <span className="text-xs text-white/70 font-medium">{f.outputFilename ?? f.filename}</span>
                      {jobId && f.outputFilename && (
                        <a href={`/api/download/${jobId}?file=${encodeURIComponent(f.outputFilename)}`} download={f.outputFilename} className="text-[10px] px-2 py-1 rounded bg-accent-emerald/20 text-accent-emerald hover:bg-accent-emerald/30 transition-colors">Download</a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={handleReset} className="w-full py-2.5 rounded-xl border border-border text-white/50 hover:text-white text-sm font-medium transition-colors">Split Another PDF</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
