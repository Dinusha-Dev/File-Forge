"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanText, AlertCircle, CheckCircle, X, Copy, BrainCircuit } from "lucide-react";
import DropZone from "../../../components/ui/DropZone";
import { toast } from "../../../components/ui/Toast";

const LANGUAGES = [
  { code: 'eng', label: 'English' },
  { code: 'spa', label: 'Spanish' },
  { code: 'fra', label: 'French' },
  { code: 'deu', label: 'German' },
];

export default function ImageOCRPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [language, setLanguage] = useState('eng');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState("");
  const [progress, setProgress] = useState(0);
  
  const [extractedText, setExtractedText] = useState("");
  const [done, setDone] = useState(false);
  const [errorObj, setErrorObj] = useState<string | null>(null);

  const handleFile = (files: File[]) => {
    if (files.length > 0) {
      setFile(files[0]);
      setPreviewUrl(URL.createObjectURL(files[0]));
      setDone(false);
      setExtractedText("");
      setErrorObj(null);
    }
  };

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setIsProcessing(false);
    setProcessStatus("");
    setProgress(0);
    setExtractedText("");
    setDone(false);
    setErrorObj(null);
  };

  const extractText = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProcessStatus("Initializing Neural Model...");
    setErrorObj(null);
    setProgress(0);

    try {
      const Tesseract = await import("tesseract.js");

      setProcessStatus("Loading language packs into browser cache...");
      
      const result = await Tesseract.recognize(
        file,
        language,
        {
          logger: (m) => {
            if (m.status === "recognizing text") {
              setProcessStatus("Reading text physically...");
              setProgress(Math.round(m.progress * 100));
            } else if (m.status === "loading tesseract core") {
              setProcessStatus("Injecting WebAssembly Payload...");
              setProgress(10);
            } else if (m.status === "loading language traineddata") {
              setProcessStatus(`Downloading & caching ${language} models...`);
              setProgress(30);
            } else if (m.status === "initializing tesseract") {
              setProcessStatus("Waking up ML core...");
              setProgress(50);
            }
          }
        }
      );
      
      setExtractedText(result.data.text);
      setDone(true);
      toast("Pattern extracted beautifully!", "success");

    } catch (err) {
      setErrorObj(err instanceof Error ? err.message : "OCR Extraction failed computationally.");
      toast("Error parsing image mathematically", "error");
    }
    
    setIsProcessing(false);
  };

  const copyToClipboard = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    toast("Copied to clipboard!", "success");
  };

  const downloadTxt = () => {
    if (!extractedText || !file) return;
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file.name.replace(/\.[^/.]+$/, "")}_extracted.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadWord = async () => {
    if (!extractedText || !file) return;
    try {
      const { Document, Packer, Paragraph, TextRun } = await import("docx");

      const lines = extractedText.split('\n');
      const paragraphs = lines.map((line: string) => 
        new Paragraph({ children: [new TextRun({ text: line })] })
      );

      const doc = new Document({
        sections: [{ properties: {}, children: paragraphs }]
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name.replace(/\.[^/.]+$/, "")}_extracted.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Word Doc Generated!", "success");
    } catch {
      toast("Failed compiling Word schema", "error");
    }
  };

  const downloadPDF = async () => {
    if (!extractedText || !file) return;
    try {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      // Calculate layout properties
      const fontSize = 12;
      const margin = 50;
      let page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      
      let cursorY = height - margin;
      const lineHeight = font.heightAtSize(fontSize) + 4;
      
      const lines = extractedText.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const text = lines[i].trim();
        if (!text) {
          cursorY -= lineHeight; // spacing for empty lines
          continue;
        }

        // Extremely native line-wrap slicing by pure character length just for basic PDF injection formatting
        const words = text.split(' ');
        let currentLine = '';

        for (let j = 0; j < words.length; j++) {
          const testLine = currentLine + words[j] + ' ';
          const testWidth = font.widthOfTextAtSize(testLine, fontSize);

          if (testWidth > width - (margin * 2) && currentLine !== '') {
            // Draw current line and drop down
            page.drawText(currentLine.trim(), { x: margin, y: cursorY, size: fontSize, font, color: rgb(0,0,0) });
            cursorY -= lineHeight;
            currentLine = words[j] + ' ';
            
            // Reached bottom boundary, make new page
            if (cursorY < margin) {
              page = pdfDoc.addPage();
              cursorY = height - margin;
            }
          } else {
            currentLine = testLine;
          }
        }
        
        // Push trailing characters 
        if (currentLine.trim()) {
           page.drawText(currentLine.trim(), { x: margin, y: cursorY, size: fontSize, font, color: rgb(0,0,0) });
           cursorY -= lineHeight;
           if (cursorY < margin) {
             page = pdfDoc.addPage();
             cursorY = height - margin;
           }
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name.replace(/\.[^/.]+$/, "")}_extracted.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast("PDF Generated Successfully!", "success");
    } catch {
      toast("Failed formatting PDF structure", "error");
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center">
          <ScanText className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Image to Text (OCR Engine)</h1>
          <p className="text-xs text-white/40">Drop a physical picture/scan of a document and extract the raw characters locally via Machine Learning.</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!file && (
          <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <DropZone
              onFiles={handleFile}
              accept="image/*"
              multiple={false}
              label="Drop your image payload here"
              sublabel="Secure offline Tesseract.js WebAssembly parsing."
            />

            <div className="mt-6 rounded-xl bg-surface-2 border border-border-subtle p-4 flex gap-3 shadow-sm">
              <BrainCircuit className="w-5 h-5 text-pink-400 shrink-0" />
              <p className="text-xs text-white/60">
                <span className="text-white/80 font-semibold block mb-1">Local Model Cache Initialization Notification</span>
                Running literal machine-learning models securely offline without APIs means that the very first time you convert a language today, your browser will locally download a (15-25MB) trained-model parameters file. It will cache and process instantly for all future scans.
              </p>
            </div>
          </motion.div>
        )}

        {file && !done && !isProcessing && (
          <motion.div key="config" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="rounded-2xl border border-border bg-surface-base p-6 space-y-6 shadow-glass">
              
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-2/3 md:w-1/3 bg-surface-2 overflow-hidden border border-border/50 rounded-xl relative flex items-center justify-center min-h-[200px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl!} alt="Preview for OCR Extraction" className="max-w-full max-h-[300px] object-contain opacity-90 hover:opacity-100 transition-opacity" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button onClick={handleReset} className="p-1.5 bg-black/50 backdrop-blur-md rounded-lg border border-white/10 text-white/50 hover:text-white transition-colors" title="Discard Asset">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 space-y-6 flex flex-col justify-center">
                  <div>
                     <label className="block text-sm font-semibold text-white/90 mb-2">Primary Recognition Language</label>
                     <select 
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full bg-surface-2 border border-border text-white text-sm rounded-xl px-4 py-3 appearance-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                     >
                       {LANGUAGES.map(l => (
                         <option key={l.code} value={l.code}>{l.label} ({l.code})</option>
                       ))}
                     </select>
                     <p className="text-xs text-white/30 mt-2 ml-1">The algorithm requires strict adherence to dictionary heuristics to patch handwriting errors. Choose the predominant language inside the image snippet.</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border/50">
                <button
                  onClick={extractText}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(99,102,241,0.4)] tracking-wide"
                >
                  <BrainCircuit className="w-5 h-5" /> Execute Machine Learning Extractor
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {(isProcessing || errorObj) && (
          <motion.div key="status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className={`rounded-2xl p-8 border flex flex-col items-center gap-6 text-center shadow-glass ${
              errorObj ? "bg-accent-rose/10 border-accent-rose/30" : "bg-surface-2 border-border-subtle"
            }`}>
              {errorObj ? (
                <>
                  <AlertCircle className="w-12 h-12 text-accent-rose" />
                  <div>
                    <h2 className="text-xl font-bold text-white">Algorithm Crash Occurred</h2>
                    <p className="text-sm text-accent-rose/80 mt-1">{errorObj}</p>
                  </div>
                  <button onClick={handleReset} className="mt-4 px-6 py-2 rounded-xl bg-surface-3 text-white">Restart Module</button>
                </>
              ) : (
                <>
                  <div className="relative flex items-center justify-center w-20 h-20">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="40" cy="40" r="36" className="stroke-surface-3" strokeWidth="6" fill="transparent" />
                      <circle 
                        cx="40" cy="40" r="36" 
                        className="stroke-indigo-500 transition-all duration-300" 
                        strokeWidth="6" strokeLinecap="round" fill="transparent"
                        strokeDasharray={226.2} strokeDashoffset={226.2 - (226.2 * progress) / 100} 
                      />
                    </svg>
                    <span className="absolute text-sm font-bold text-indigo-400">{progress}%</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-white transition-all tracking-tight">{processStatus}</h2>
                    <p className="text-xs text-white/40 mt-1">Splicing visual structures via WebAssembly matrixes…</p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}

        {done && !errorObj && file && (
          <motion.div key="editor" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden shadow-glass flex flex-col">
              
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-2">
                 <div className="flex items-center gap-3">
                   <div className="w-6 h-6 rounded-md bg-indigo-500/20 flex items-center justify-center">
                     <CheckCircle className="w-4 h-4 text-indigo-400" />
                   </div>
                   <h2 className="text-sm font-bold text-white">String Matrix Retrieved</h2>
                 </div>
                 <button onClick={handleReset} className="text-xs font-semibold text-white/50 hover:text-white bg-surface-3 px-3 py-1.5 rounded-lg transition-colors">
                   Restart Dashboard
                 </button>
              </div>

              <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-border">
                {/* Visual Preview Half */}
                <div className="lg:w-[35%] p-6 bg-surface-base flex items-center justify-center group relative min-h-[300px]">
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img src={previewUrl!} alt="Scanned Template" className="max-w-full max-h-[500px] object-contain rounded-xl border border-border/50 shadow-sm" />
                   <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                     <span className="text-[10px] uppercase tracking-wider font-bold text-white/80">Original Source Reference</span>
                   </div>
                </div>

                {/* Edit & Interact Half */}
                <div className="lg:w-[65%] flex flex-col">
                   <textarea
                     value={extractedText}
                     onChange={(e) => setExtractedText(e.target.value)}
                     className="flex-1 w-full bg-surface-1 text-white p-6 resize-none focus:outline-none min-h-[400px] font-sans text-sm leading-relaxed"
                     spellCheck={false}
                     placeholder="Awaiting text injection..."
                   />
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="p-4 bg-surface-2 border-t border-border flex flex-wrap items-center justify-between gap-4">
                 <button 
                   onClick={copyToClipboard}
                   className="flex items-center gap-2 px-6 py-2 bg-surface-3 hover:bg-surface-base border border-border text-white text-sm font-semibold rounded-xl transition-all"
                 >
                    <Copy className="w-4 h-4" /> Copy Direct to Clipboard
                 </button>

                 <div className="flex gap-2">
                   <button 
                     onClick={downloadTxt}
                     className="flex items-center gap-2 px-4 py-2 bg-surface-3 hover:bg-surface-base border border-border text-white text-sm font-semibold rounded-xl transition-all"
                     title="Export as structural plain text bundle"
                   >
                     TXT
                   </button>
                   <button 
                     onClick={downloadWord}
                     className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-sm font-semibold rounded-xl hover:opacity-90 shadow-sm transition-all"
                     title="Export standard docx payload sequence"
                   >
                     DOCX
                   </button>
                   <button 
                     onClick={downloadPDF}
                     className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-rose-600 to-red-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 shadow-sm transition-all"
                     title="Reconstruct layout as purely searchable PDF strings"
                   >
                     PDF
                   </button>
                 </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
