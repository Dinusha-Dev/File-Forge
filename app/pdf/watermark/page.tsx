"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Stamp, Download, RefreshCw, AlertCircle, CheckCircle, X, Settings2 } from "lucide-react";
import DropZone from "../../../components/ui/DropZone";
import { toast } from "../../../components/ui/Toast";

const COLORS = [
  { id: 'gray', label: 'Ghost Gray', rgb: [0.5, 0.5, 0.5] },
  { id: 'red', label: 'Classified Red', rgb: [0.8, 0.1, 0.1] },
  { id: 'blue', label: 'Corporate Blue', rgb: [0.1, 0.4, 0.8] },
  { id: 'black', label: 'Pitch Black', rgb: [0, 0, 0] },
];

export default function PDFWatermarkPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [pdfDimensions, setPdfDimensions] = useState<{ width: number, height: number } | null>(null);
  
  // Conf Parameters
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [opacity, setOpacity] = useState(0.25);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [rotation, setRotation] = useState(45); // 45 (diagonal) or 0 (horizontal)
  const [fontSize, setFontSize] = useState(72);
  const [pageRange, setPageRange] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState("");
  const [done, setDone] = useState(false);
  const [errorObj, setErrorObj] = useState<string | null>(null);
  const [downloadBlob, setDownloadBlob] = useState<{ url: string, name: string } | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewImage(null);
      return;
    }

    let isSubscribed = true;
    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const ab = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({ canvasContext: ctx!, viewport }).promise;
        
        if (isSubscribed) {
          setPreviewImage(canvas.toDataURL("image/jpeg", 0.9));
          
          // Capture raw 1:1 PDF point dimensions
          const unscaledViewport = page.getViewport({ scale: 1.0 });
          setPdfDimensions({ width: unscaledViewport.width, height: unscaledViewport.height });
        }
      } catch (err) {
        console.error("Preview generation failed", err);
      }
    })();
    
    return () => { isSubscribed = false; };
  }, [file]);

  const handleFile = (files: File[]) => {
    if (files.length > 0) {
      setFile(files[0]);
      setDone(false);
      setDownloadBlob(null);
      setErrorObj(null);
      setPageRange(""); // reset filter
    }
  };

  const handleReset = () => {
    setFile(null);
    setIsProcessing(false);
    setProcessStatus("");
    setDone(false);
    setErrorObj(null);
    if (downloadBlob) URL.revokeObjectURL(downloadBlob.url);
    setDownloadBlob(null);
  };

  const getTargetPages = (rangeStr: string, total: number): Set<number> => {
    if (!rangeStr.trim()) {
      return new Set(Array.from({ length: total }, (_, i) => i)); // 0-indexed set
    }
    
    const pages = new Set<number>();
    const parts = rangeStr.split(',').map(s => s.trim());
    
    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        let start = parseInt(startStr, 10);
        let end = parseInt(endStr, 10);
        
        if (!isNaN(start) && !isNaN(end)) {
          if (start < 1) start = 1;
          if (end > total) end = total;
          if (start <= end) {
            for (let i = start; i <= end; i++) pages.add(i - 1);
          }
        }
      } else {
        const pageNum = parseInt(part, 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= total) {
          pages.add(pageNum - 1);
        }
      }
    }
    return pages;
  };

  const applyWatermark = async () => {
    if (!file || !watermarkText.trim()) return;
    setIsProcessing(true);
    setProcessStatus("Initializing PDF Matrix...");
    setErrorObj(null);

    try {
      const { PDFDocument, StandardFonts, rgb, degrees } = await import("pdf-lib");

      const ab = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(ab, { ignoreEncryption: true });
      
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const textWidth = helveticaFont.widthOfTextAtSize(watermarkText, fontSize);
      const textHeight = helveticaFont.heightAtSize(fontSize);

      const pages = pdfDoc.getPages();
      const targetPages = getTargetPages(pageRange, pages.length);
      
      for (let i = 0; i < pages.length; i++) {
        if (!targetPages.has(i)) continue;

        setProcessStatus(`Stamping layer ${i + 1} of ${pages.length}...`);
        
        const page = pages[i];
        const { width, height } = page.getSize();
        
        // Exact centering coordinate mathematics correcting for the exact string length
        let x = width / 2;
        let y = height / 2;

        if (rotation === 45) {
          const dx = textWidth / 2;
          const dy = textHeight / 2;
          x = (width / 2) - (dx * Math.cos(Math.PI / 4)) + (dy * Math.sin(Math.PI / 4));
          y = (height / 2) - (dx * Math.sin(Math.PI / 4)) - (dy * Math.cos(Math.PI / 4));
        } else {
          x = (width / 2) - (textWidth / 2);
          y = (height / 2) - (textHeight / 2);
        }

        page.drawText(watermarkText, {
          x,
          y,
          size: fontSize,
          font: helveticaFont,
          color: rgb(selectedColor.rgb[0], selectedColor.rgb[1], selectedColor.rgb[2]),
          opacity: opacity,
          rotate: degrees(rotation),
        });
        
        await new Promise(r => setTimeout(r, 10)); // Breathe thread
      }

      setProcessStatus("Finalizing Document Export...");
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });

      const name = `${file.name.replace(/\.[^/.]+$/, "")}_watermarked.pdf`;
      
      setDownloadBlob({ url: URL.createObjectURL(blob), name });
      setDone(true);
      toast("Watermark applied natively!", "success");

    } catch (err) {
      setErrorObj(err instanceof Error ? err.message : "PDF stamping failed");
      toast("Error modifying PDF layers", "error");
    }
    
    setIsProcessing(false);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
          <Stamp className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">PDF Secure Watermark</h1>
          <p className="text-xs text-white/40">Permanently burn custom text watermarks securely over sensitive documents offline.</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!file && (
          <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <DropZone
              onFiles={handleFile}
              accept=".pdf,application/pdf"
              multiple={false}
              label="Drop PDF payload here"
              sublabel="Runs locally — files never leave your browser."
            />
          </motion.div>
        )}

        {file && !done && !isProcessing && (
          <motion.div key="config" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="rounded-2xl border border-border bg-surface-base p-6 space-y-6 shadow-glass flex flex-col">
              
              <div className="flex items-center gap-4 bg-surface-2 border border-border/50 rounded-xl p-4 shrink-0">
                <Stamp className="w-8 h-8 text-orange-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{file.name}</p>
                  <p className="text-xs text-white/40">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button onClick={handleReset} className="p-2 hover:bg-surface-3 rounded-lg text-white/50 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Advanced Configuration Settings Layout */}
              <div className="flex flex-col lg:flex-row gap-8 pt-2">
                 
                 {/* Live Canvas Preview Panel (Exactly Constrained to Physical Page Bonds) */}
                 <div className="lg:w-[45%] flex items-center justify-center bg-surface-base lg:bg-surface-2 border border-border/50 rounded-2xl relative min-h-[400px] overflow-hidden">
                    <div className="absolute top-4 left-4 z-20">
                      <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest bg-black/60 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">Live Preview Filter</span>
                    </div>

                    {previewImage && pdfDimensions ? (
                      <div className="relative w-full h-full p-4 md:p-8 flex items-center justify-center pointer-events-none">
                        {/* We use inline-block wrapper to shrink-wrap identical dimension layout for the absolute text mask */}
                        <div className="relative inline-block max-w-full max-h-[500px] shadow-2xl overflow-hidden border border-black/20 bg-white">
                           {/* Explicit underlying physical page canvas slice */}
                           {/* eslint-disable-next-line @next/next/no-img-element */}
                           <img 
                             src={previewImage} 
                             alt="First Page Preview" 
                             className="block max-w-[100%] max-h-[500px] pointer-events-auto object-contain" 
                           />
                           {/* Constrained Masking mathematically synced to boundary limits via precise SVG ViewBox Coordinate mapping */}
                           <svg 
                             className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-sm"
                             viewBox={`0 0 ${pdfDimensions.width} ${pdfDimensions.height}`}
                             preserveAspectRatio="xMidYMid meet"
                           >
                             <text
                               x="50%"
                               y="50%"
                               dominantBaseline="middle"
                               textAnchor="middle"
                               fill={`rgba(${selectedColor.rgb[0]*255}, ${selectedColor.rgb[1]*255}, ${selectedColor.rgb[2]*255}, ${opacity})`}
                               fontSize={fontSize} // Direct 1:1 Point Mapping matching pdf-lib
                               fontWeight="bold"
                               fontFamily="Helvetica, Arial, sans-serif"
                               style={{
                                 transformOrigin: "center center",
                                 transform: `rotate(${rotation === 45 ? '-45deg' : '0deg'})`
                               }}
                             >
                               {watermarkText}
                             </text>
                           </svg>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 opacity-50">
                        <RefreshCw className="w-6 h-6 animate-spin text-orange-400" />
                        <span className="text-xs font-semibold text-white">Rendering Canvas Engine...</span>
                      </div>
                    )}
                 </div>

                 {/* Configuration Settings Panel */}
                 <div className="lg:w-[55%] space-y-6">
                   <div className="flex items-center gap-2 mb-2 text-white/80 border-b border-border/50 pb-2">
                     <Settings2 className="w-4 h-4" />
                     <h3 className="text-sm font-bold">Stamp Configuration Options</h3>
                   </div>

                   <div className="space-y-6">
                     <div>
                       <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-wide">Watermark Text Payload</label>
                       <input 
                         type="text" 
                         value={watermarkText}
                         onChange={(e) => setWatermarkText(e.target.value)}
                         className="w-full bg-surface-1 border border-border text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-mono"
                         placeholder="e.g. CONFIDENTIAL"
                       />
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div>
                         <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-wide">Stamp Orientation</label>
                         <div className="flex bg-surface-1 p-1 rounded-xl border border-border mt-1">
                            <button
                              onClick={() => setRotation(45)}
                              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                rotation === 45
                                  ? "bg-orange-500 text-white shadow-md"
                                  : "text-white/50 hover:text-white hover:bg-surface-2"
                              }`}
                            >
                              Diagonal
                            </button>
                            <button
                              onClick={() => setRotation(0)}
                              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                rotation === 0
                                  ? "bg-orange-500 text-white shadow-md"
                                  : "text-white/50 hover:text-white hover:bg-surface-2"
                              }`}
                            >
                              Horizontal
                            </button>
                         </div>
                       </div>
                       
                       <div>
                         <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-wide">Filter Set (Page Range)</label>
                         <input 
                           type="text" 
                           value={pageRange}
                           onChange={(e) => setPageRange(e.target.value)}
                           className="w-full bg-surface-1 border border-border text-white text-sm rounded-xl px-4 py-2 focus:outline-none focus:border-orange-500 transition-all"
                           placeholder="e.g. 1-5, 8 (blank for all)"
                         />
                       </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div>
                         <label className="flex justify-between items-center mb-2 mt-4">
                            <span className="text-xs font-bold text-white/60 uppercase tracking-wide">Layer Opacity</span>
                            <span className="text-xs font-bold text-orange-400">{Math.round(opacity * 100)}%</span>
                         </label>
                         <input 
                           type="range" 
                           min="0.05" max="0.9" step="0.05"
                           value={opacity}
                           onChange={(e) => setOpacity(parseFloat(e.target.value))}
                           className="w-full mt-2 accent-orange-500 h-1.5 bg-surface-2 rounded-lg appearance-none cursor-pointer"
                         />
                       </div>
                       
                       <div>
                         <label className="flex justify-between items-center mb-2 mt-4">
                            <span className="text-xs font-bold text-white/60 uppercase tracking-wide">Font Scale Radius</span>
                            <span className="text-xs font-bold text-orange-400">{fontSize}px</span>
                         </label>
                         <input 
                           type="range" 
                           min="24" max="156" step="2"
                           value={fontSize}
                           onChange={(e) => setFontSize(parseInt(e.target.value))}
                           className="w-full mt-2 accent-orange-500 h-1.5 bg-surface-2 rounded-lg appearance-none cursor-pointer"
                         />
                       </div>
                     </div>

                     <div>
                       <label className="block text-xs font-bold text-white/60 mb-3 mt-4 uppercase tracking-wide">Overlay Tone</label>
                       <div className="flex flex-wrap gap-3">
                         {COLORS.map(c => (
                           <button
                             key={c.id}
                             onClick={() => setSelectedColor(c)}
                             className={`px-3 py-2 flex-grow sm:flex-grow-0 rounded-xl text-[11px] font-bold transition-all border ${
                               selectedColor.id === c.id
                                 ? "bg-surface-2 border-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.2)]"
                                 : "bg-surface-1 border-border text-white/50 hover:text-white hover:bg-surface-2"
                             }`}
                           >
                             <div className="flex items-center justify-center gap-2">
                               <div 
                                 className="w-2.5 h-2.5 rounded-full border border-white/20" 
                                 style={{ backgroundColor: `rgb(${c.rgb[0]*255}, ${c.rgb[1]*255}, ${c.rgb[2]*255})` }} 
                               />
                               {c.label}
                             </div>
                           </button>
                         ))}
                       </div>
                     </div>
                   </div>
                 </div>
              </div>

              <div className="pt-6 border-t border-border/50 shrink-0">
                <button
                  onClick={applyWatermark}
                  disabled={!watermarkText.trim()}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(249,115,22,0.4)] disabled:opacity-40"
                >
                  <Stamp className="w-5 h-5" /> Burn Watermark Natively
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {(isProcessing || done || errorObj) && (
          <motion.div key="status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className={`rounded-2xl p-8 border flex flex-col items-center gap-6 text-center shadow-glass ${
              done ? "bg-orange-500/10 border-orange-500/30" :
              errorObj ? "bg-accent-rose/10 border-accent-rose/30" :
              "bg-surface-2 border-border-subtle"
            }`}>
              {done ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.3)]">
                    <CheckCircle className="w-8 h-8 text-orange-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Stamping Completed!</h2>
                    <p className="text-sm text-white/50 mt-1">Your document has been physically modified with an aggressive transparent text layer.</p>
                  </div>
                  {downloadBlob && (
                    <a
                      href={downloadBlob.url}
                      download={downloadBlob.name}
                      className="mt-2 flex items-center gap-2 px-8 py-3 rounded-xl bg-orange-600 text-white text-sm font-bold hover:bg-orange-500 transition-colors shadow-[0_0_20px_rgba(249,115,22,0.5)]"
                    >
                      <Download className="w-5 h-5" /> Download Protected File
                    </a>
                  )}
                </>
              ) : errorObj ? (
                <>
                  <AlertCircle className="w-12 h-12 text-accent-rose" />
                  <div>
                    <h2 className="text-xl font-bold text-white">Algorithm Crash Occurred</h2>
                    <p className="text-sm text-accent-rose/80 mt-1">{errorObj}</p>
                  </div>
                </>
              ) : (
                <>
                  <RefreshCw className="w-10 h-10 text-orange-400 animate-spin" />
                  <div>
                    <h2 className="text-lg font-bold text-white transition-all">{processStatus}</h2>
                    <p className="text-xs text-white/40 mt-1">Injecting strict coordinate boundaries…</p>
                  </div>
                </>
              )}
            </div>
            
            {(done || errorObj) && (
              <button onClick={handleReset} className="w-full py-2.5 rounded-xl border border-border hover:bg-surface-3 text-white/50 hover:text-white text-sm font-medium transition-colors">
                Process New PDF Document
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
