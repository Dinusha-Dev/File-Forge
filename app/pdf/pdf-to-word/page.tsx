"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Download, RefreshCw, AlertCircle, CheckCircle, X } from "lucide-react";
import DropZone from "../../../components/ui/DropZone";
import { toast } from "../../../components/ui/Toast";

export default function PDFToWordPage() {
  const [file, setFile] = useState<File | null>(null);
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
    setIsProcessing(false);
    setProcessStatus("");
    setProgress(0);
    setDone(false);
    setErrorObj(null);
    if (downloadBlob) URL.revokeObjectURL(downloadBlob.url);
    setDownloadBlob(null);
  };

  const extractTextToWord = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProcessStatus("Loading PDF Extraction Engine...");
    setErrorObj(null);
    setProgress(0);

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const ab = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
      const totalPages = pdf.numPages;

      setProcessStatus(`Parsing ${totalPages} pages for text...`);

      let fullTextRaw = "";

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        let lastY = -1;
        let pageText = "";
        
        // Items is an array of text sections with coordinate positioning
        // We do a naive attempt to rebuild layout based on differences in Y position
        for (const item of textContent.items) {
          if (!('str' in item)) continue;
          
          // Try to handle new lines implicitly based on PDF positioning y-deltas
          if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
            pageText += "\n";
          }
          pageText += item.str;
          lastY = item.transform[5];
        }
        
        fullTextRaw += pageText + "\n\n--- Page Break ---\n\n";
        setProgress(Math.round((i / totalPages) * 100));
        
        await new Promise(r => setTimeout(r, 10)); // Breathe thread
      }

      setProcessStatus("Building Word Document...");

      const { Document, Packer, Paragraph, TextRun } = await import("docx");

      // Split raw extracted string back into structured paragraphs to satisfy .docx semantics
      const textLines = fullTextRaw.split("\n");
      const docChildren = textLines.map(line => new Paragraph({
        children: [new TextRun({ text: line })]
      }));

      const docxDoc = new Document({
        sections: [{
          properties: {},
          children: docChildren
        }]
      });

      const blob = await Packer.toBlob(docxDoc);
      const name = `${file.name.replace(/\.[^/.]+$/, "")}_extracted.docx`;
      
      setDownloadBlob({ url: URL.createObjectURL(blob), name });
      setDone(true);
      toast("Microsoft Word File Generated!", "success");

    } catch (err) {
      setErrorObj(err instanceof Error ? err.message : "Extraction failed");
      toast("Error creating Word Document", "error");
    }
    
    setIsProcessing(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
          <FileText className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">PDF to Word (Raw Text)</h1>
          <p className="text-xs text-white/40">Instantly scrape raw text from any PDF into a native Microsoft Word format locally.</p>
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
              sublabel="Runs locally on your device for infinite security."
            />

            <div className="mt-6 rounded-xl bg-surface-2 border border-border-subtle p-4 flex gap-3 shadow-sm">
              <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0" />
              <p className="text-xs text-white/60">
                <span className="text-white/80 font-semibold block mb-1">Text-Only Extraction Warning</span>
                Because this runs entirely inside your browser securely and for free without API keys, this tool natively strips out Tables, Images, and Absolute PDF Positioning, and merely parses raw unformatted conversational text data directly into MS Word format.
              </p>
            </div>
          </motion.div>
        )}

        {file && !done && !isProcessing && (
          <motion.div key="config" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="rounded-2xl border border-border bg-surface-base p-6 space-y-8 shadow-glass">
              <div className="flex items-center gap-4 bg-surface-2 border border-border/50 rounded-xl p-4">
                <FileText className="w-8 h-8 text-blue-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{file.name}</p>
                  <p className="text-xs text-white/40">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button onClick={handleReset} className="p-2 hover:bg-surface-3 rounded-lg text-white/50 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="pt-2">
                <button
                  onClick={extractTextToWord}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                >
                  <RefreshCw className="w-4 h-4" /> Convert PDF to Word
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {(isProcessing || done || errorObj) && (
          <motion.div key="status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className={`rounded-2xl p-8 border flex flex-col items-center gap-6 text-center shadow-glass ${
              done ? "bg-blue-500/10 border-blue-500/30" :
              errorObj ? "bg-accent-rose/10 border-accent-rose/30" :
              "bg-surface-2 border-border-subtle"
            }`}>
              {done ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                    <CheckCircle className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Extraction Successful!</h2>
                    <p className="text-sm text-white/50 mt-1">Your pure text metadata was flawlessly dumped into a native .docx template.</p>
                  </div>
                  {downloadBlob && (
                    <a
                      href={downloadBlob.url}
                      download={downloadBlob.name}
                      className="mt-2 flex items-center gap-2 px-8 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-colors shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                    >
                      <Download className="w-5 h-5" /> Download (.docx) Word Doc
                    </a>
                  )}
                </>
              ) : errorObj ? (
                <>
                  <AlertCircle className="w-12 h-12 text-accent-rose" />
                  <div>
                    <h2 className="text-xl font-bold text-white">Data Scrape Failed</h2>
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
                        className="stroke-blue-500 transition-all duration-300" 
                        strokeWidth="6" strokeLinecap="round" fill="transparent"
                        strokeDasharray={175.93} strokeDashoffset={175.93 - (175.93 * progress) / 100} 
                      />
                    </svg>
                    <span className="absolute text-xs font-bold text-blue-400">{progress}%</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white transition-all">{processStatus}</h2>
                    <p className="text-xs text-white/40 mt-1">Splicing internal DOM layers…</p>
                  </div>
                </>
              )}
            </div>
            
            {(done || errorObj) && (
              <button onClick={handleReset} className="w-full py-2.5 rounded-xl border border-border hover:bg-surface-3 text-white/50 hover:text-white text-sm font-medium transition-colors">
                Extract Text from Another File
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
