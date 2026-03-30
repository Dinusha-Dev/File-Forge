"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Image as ImageIcon, Download, RefreshCw, FileText, Settings2, CheckCircle, AlertCircle, X } from "lucide-react";
import DropZone from "../../../components/ui/DropZone";
import { toast } from "../../../components/ui/Toast";

type OutputFormat = "png" | "jpeg" | "webp";

export default function PDFToImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [pagesStr, setPagesStr] = useState("");
  const [format, setFormat] = useState<OutputFormat>("png");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [errorObj, setErrorObj] = useState<string | null>(null);
  
  const [downloadBlob, setDownloadBlob] = useState<{ url: string, name: string } | null>(null);

  const handleFile = (files: File[]) => {
    if (files.length > 0) {
      setFile(files[0]);
      setDone(false);
      setDownloadBlob(null);
      setErrorObj(null);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPagesStr("");
    setFormat("png");
    setIsProcessing(false);
    setProcessStatus("");
    setProgress(0);
    setDone(false);
    setErrorObj(null);
    if (downloadBlob) URL.revokeObjectURL(downloadBlob.url);
    setDownloadBlob(null);
  };

  const parseRange = (range: string, max: number): number[] => {
    if (!range.trim()) {
      return Array.from({ length: max }, (_, i) => i + 1);
    }
    const pages = new Set<number>();
    const parts = range.split(",");
    
    for (const p of parts) {
      const trimmed = p.trim();
      if (!trimmed) continue;
      
      if (trimmed.includes("-")) {
        const [start, end] = trimmed.split("-").map(s => parseInt(s.trim()));
        if (!isNaN(start) && !isNaN(end)) {
          const s = Math.max(1, Math.min(start, max));
          const e = Math.max(1, Math.min(end, max));
          const min = Math.min(s, e);
          const maxVal = Math.max(s, e);
          for (let i = min; i <= maxVal; i++) pages.add(i);
        }
      } else {
        const num = parseInt(trimmed);
        if (!isNaN(num) && num >= 1 && num <= max) pages.add(num);
      }
    }
    
    return Array.from(pages).sort((a, b) => a - b);
  };

  const extractImages = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProcessStatus("Loading PDF Engine...");
    setErrorObj(null);
    setProgress(0);

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const ab = await file.arrayBuffer();
      // Use standard loading for full client-side PDF processing
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
      
      const totalPages = pdf.numPages;
      const targetPages = parseRange(pagesStr, totalPages);
      
      if (targetPages.length === 0) {
        throw new Error("No valid pages selected in the range.");
      }

      setProcessStatus(`Extracting ${targetPages.length} pages...`);

      const blobs: { pageNu: number, blob: Blob }[] = [];

      for (let i = 0; i < targetPages.length; i++) {
        const pageNum = targetPages[i];
        
        const page = await pdf.getPage(pageNum);
        // Use a high scale for native high-res export (e.g. scale 2 or 3)
        // Usually, 300 DPI is scale 4.16. Let's use scale 2.0 (approx 144 DPI)
        const viewport = page.getViewport({ scale: 2.5 });
        
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        if (!ctx) throw new Error("Could not construct local canvas");
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Render PDF page to canvas
        await page.render({ canvasContext: ctx, viewport }).promise;
        
        // Convert canvas strictly to blob depending on format
        const mimeType = format === "jpeg" ? "image/jpeg" : `image/${format}`;
        
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => {
            if (b) resolve(b); else reject(new Error("Canvas toBlob failed"));
          }, mimeType, 0.95);
        });
        
        blobs.push({ pageNu: pageNum, blob });
        setProgress(Math.round(((i + 1) / targetPages.length) * 100));
        
        // Let the event loop breathe to not completely lock the UI on immense files
        await new Promise(r => setTimeout(r, 10));
      }

      setProcessStatus("Packaging files...");

      if (blobs.length === 1) {
        // Direct download file
        const blob = blobs[0].blob;
        const ext = format === "jpeg" ? "jpg" : format;
        const name = `${file.name.replace(/\.[^/.]+$/, "")}_page_${blobs[0].pageNu}.${ext}`;
        setDownloadBlob({ url: URL.createObjectURL(blob), name });
      } else {
        // Zip multi-download
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        
        blobs.forEach(b => {
          const ext = format === "jpeg" ? "jpg" : format;
          zip.file(`Page_${b.pageNu}.${ext}`, b.blob);
        });
        
        const zipBlob = await zip.generateAsync({ type: "blob" });
        setDownloadBlob({ url: URL.createObjectURL(zipBlob), name: `${file.name.replace(/\.[^/.]+$/, "")}_images.zip` });
      }
      
      setDone(true);
      toast("Extraction complete!", "success");
    } catch (err) {
      setErrorObj(err instanceof Error ? err.message : "Extraction failed");
      toast("Error extracting images", "error");
    }
    
    setIsProcessing(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <ImageIcon className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">PDF to Image (High-Res)</h1>
          <p className="text-xs text-white/40">Convert PDF pages into crisp images instantly without uploading to any server.</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!file && (
          <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <DropZone
              onFiles={handleFile}
              accept=".pdf,application/pdf"
              multiple={false}
              label="Drop your PDF here"
              sublabel="Secure, local-only extraction engine"
            />
          </motion.div>
        )}

        {file && !done && !isProcessing && (
          <motion.div key="config" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="rounded-2xl border border-border bg-surface-base p-6 space-y-8 shadow-glass">
              {/* File Summary */}
              <div className="flex items-center gap-4 bg-surface-2 border border-border/50 rounded-xl p-4">
                <FileText className="w-8 h-8 text-indigo-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{file.name}</p>
                  <p className="text-xs text-white/40">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button onClick={handleReset} className="p-2 hover:bg-surface-3 rounded-lg text-white/50 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Extraction Configurations */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                  <Settings2 className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-white/90">Extraction Targets</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Output Format */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-white/70">Image Format</label>
                    <div className="flex bg-surface-2 border border-border rounded-xl p-1">
                      {(["png", "jpeg", "webp"] as const).map((fmt) => (
                        <button
                          key={fmt}
                          onClick={() => setFormat(fmt)}
                          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                            format === fmt 
                              ? "bg-indigo-500 text-white shadow-sm" 
                              : "text-white/40 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          {fmt.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Page Range */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-white/70">Pages to Extract</label>
                    <input
                      type="text"
                      placeholder="e.g. 1-5, 8, 11-13 (Leave blank for all)"
                      value={pagesStr}
                      onChange={(e) => setPagesStr(e.target.value)}
                      className="w-full px-4 py-2 bg-surface-2 border border-border rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Execute */}
              <div className="pt-2">
                <button
                  onClick={extractImages}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                >
                  <RefreshCw className="w-4 h-4" /> Convert to Images
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {(isProcessing || done || errorObj) && (
          <motion.div key="status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className={`rounded-2xl p-8 border flex flex-col items-center gap-6 text-center shadow-glass ${
              done ? "bg-indigo-500/10 border-indigo-500/30" :
              errorObj ? "bg-accent-rose/10 border-accent-rose/30" :
              "bg-surface-2 border-border-subtle"
            }`}>
              {done ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                    <CheckCircle className="w-8 h-8 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Extraction Successful!</h2>
                    <p className="text-sm text-white/50 mt-1">Your high-resolution images have been packed and are ready locally.</p>
                  </div>
                  {downloadBlob && (
                    <a
                      href={downloadBlob.url}
                      download={downloadBlob.name}
                      className="mt-2 flex items-center gap-2 px-8 py-3 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-400 transition-colors shadow-[0_0_20px_rgba(99,102,241,0.5)]"
                    >
                      <Download className="w-5 h-5" /> Download {downloadBlob.name.endsWith(".zip") ? "ZIP Archive" : "Image"}
                    </a>
                  )}
                </>
              ) : errorObj ? (
                <>
                  <AlertCircle className="w-12 h-12 text-accent-rose" />
                  <div>
                    <h2 className="text-xl font-bold text-white">Extraction Failed</h2>
                    <p className="text-sm text-accent-rose/80 mt-1">{errorObj}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative flex items-center justify-center w-16 h-16">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="32" cy="32" r="28" className="stroke-surface-3" strokeWidth="6" fill="transparent" />
                      <circle 
                        cx="32" cy="32" r="28" 
                        className="stroke-indigo-500 transition-all duration-300" 
                        strokeWidth="6" strokeLinecap="round" fill="transparent"
                        strokeDasharray={175.93} strokeDashoffset={175.93 - (175.93 * progress) / 100} 
                      />
                    </svg>
                    <span className="absolute text-xs font-bold text-indigo-400">{progress}%</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white transition-all">{processStatus}</h2>
                    <p className="text-xs text-white/40 mt-1">Please keep this tab open during processing.</p>
                  </div>
                </>
              )}
            </div>
            
            {(done || errorObj) && (
              <button onClick={handleReset} className="w-full py-2.5 rounded-xl border border-border hover:bg-surface-3 text-white/50 hover:text-white text-sm font-medium transition-colors">
                Extract Another File
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
