"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eraser, Download, RefreshCw, AlertCircle, CheckCircle, X, Layers } from "lucide-react";
import DropZone from "../../../components/ui/DropZone";
import { toast } from "../../../components/ui/Toast";

export default function BackgroundRemovalPage() {
  const [file, setFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState("");
  const [done, setDone] = useState(false);
  const [errorObj, setErrorObj] = useState<string | null>(null);
  const [resultData, setResultData] = useState<{ url: string, name: string } | null>(null);

  const [compareMode, setCompareMode] = useState(false);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setOriginalPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setOriginalPreview(null);
    }
  }, [file]);



  const handleFile = (files: File[]) => {
    if (files.length > 0) {
      setFile(files[0]);
      setDone(false);
      setResultData(null);
      setErrorObj(null);
      setCompareMode(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setIsProcessing(false);
    setProcessStatus("");
    setDone(false);
    setErrorObj(null);
    setCompareMode(false);
    if (resultData) URL.revokeObjectURL(resultData.url);
    setResultData(null);
  };

  const processML = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProcessStatus("AI Subject Isolation in Progress...");
    setErrorObj(null);

    try {
      // Offload all heavy physical tensor math instantly to a background CPU thread
      const worker = new Worker(new URL('./remover.worker.ts', import.meta.url));
      
      worker.postMessage({ file });
      
      worker.onmessage = (e) => {
        if (e.data.type === "success") {
          const resultBlob = e.data.blob;
          const url = URL.createObjectURL(resultBlob);
          const outputName = `${file.name.replace(/\.[^/.]+$/, "")}_extracted.png`;

          setResultData({ url, name: outputName });
          setDone(true);
          toast("Background stripped successfully", "success");
          setIsProcessing(false);
          worker.terminate();
        } else if (e.data.type === "error") {
          setErrorObj(e.data.error);
          toast("Error parsing ONNX model", "error");
          setIsProcessing(false);
          worker.terminate();
        }
      };
      
      worker.onerror = (err) => {
        setErrorObj("Fatal background process crash: " + err.message);
        toast("Web Worker crash", "error");
        setIsProcessing(false);
        worker.terminate();
      };

    } catch (err) {
      console.error(err);
      setErrorObj(err instanceof Error ? err.message : "Thread delegation failed");
      toast("Error spawning Worker", "error");
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
          <Eraser className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Machine-Learning Background Eraser</h1>
          <p className="text-xs text-white/40">Uses client-side ONNX/WASM Neural Networks to instantly trace foreground assets locally.</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!file && (
          <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <DropZone
              onFiles={handleFile}
              accept="image/*"
              multiple={false}
              label="Drop subject photo here"
              sublabel="Runs locally — files never upload to any server."
            />
          </motion.div>
        )}

        {file && !done && (
          <motion.div key="preview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="rounded-2xl border border-border bg-surface-base p-6 space-y-8 shadow-glass">

              <div className="flex items-center gap-4 bg-surface-2 border border-border/50 rounded-xl p-4">
                <Eraser className="w-8 h-8 text-indigo-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{file.name}</p>
                  <p className="text-xs text-white/40">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button onClick={handleReset} className="p-2 hover:bg-surface-3 rounded-lg text-white/50 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {originalPreview && (
                <div className="flex items-center justify-center bg-surface-2 border border-border/50 rounded-2xl relative min-h-[400px] overflow-hidden p-8">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={originalPreview}
                    alt="Original"
                    className={`max-w-full max-h-[500px] object-contain rounded-xl drop-shadow-xl transition-all duration-700 ${isProcessing ? "opacity-30 blur-sm grayscale-[30%]" : ""}`}
                  />

                  {isProcessing && (
                    <>
                      {/* Scanning Laser Using GPU Transform */}
                      <motion.div
                        className="absolute inset-x-0 top-0 h-1 bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,1)] z-20 pointer-events-none"
                        initial={{ y: 0 }}
                        animate={{ y: [0, 400, 0] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                      />

                      {/* HUD Overlay */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none">
                        <div className="bg-surface-base/90 backdrop-blur-xl px-8 py-6 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center">
                          <div className="relative mb-4 flex items-center justify-center">
                            <motion.div
                              animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              className="absolute inset-[-10px] rounded-full border-t-2 border-indigo-400 border-r-2 border-transparent"
                            />
                            <RefreshCw className="w-8 h-8 text-indigo-400" />
                          </div>
                          <h3 className="text-white font-bold text-lg mb-2 text-center">{processStatus}</h3>

                          <div className="w-56 h-2 bg-surface-1 rounded-full overflow-hidden border border-white/5 mt-2">
                            <motion.div
                              className="h-full w-1/3 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                              initial={{ x: "-100%" }}
                              animate={{ x: "300%" }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            />
                          </div>
                          <p className="text-xs text-indigo-300 font-bold mt-4 tracking-widest uppercase font-mono animate-pulse">Computing Deep Alpha...</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {!isProcessing && (
                <div className="pt-2 border-t border-border/50">
                  <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl mb-6">
                    <p className="text-xs font-semibold text-indigo-200">
                      <span className="text-indigo-400 font-bold">Heads up:</span> The first time you ever erase an object, your browser will spend a few seconds silently caching the highly-optimized <span className="font-mono text-indigo-300">40MB u2net</span> neural network matrix offline natively. Future passes will be nearly instant!
                    </p>
                  </div>

                  <button
                    onClick={processML}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                  >
                    <Eraser className="w-5 h-5" /> Execute AI Deep Trace
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {(done || errorObj) && (
          <motion.div key="status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

            {done && resultData ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Result Visual Matrix */}
                <div className="rounded-2xl border border-border bg-surface-base p-6 shadow-glass relative flex flex-col items-center">
                  <div className="w-full flex justify-between items-center mb-6">
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest"><CheckCircle className="inline w-4 h-4 text-emerald-400 mr-2" /> Traced Output</h2>
                    <button
                      onClick={() => setCompareMode(!compareMode)}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                    >
                      <Layers className="w-3 h-3" /> {compareMode ? "Hide Original" : "Compare Original"}
                    </button>
                  </div>

                  {/* Checkerboard Alpha Pattern */}
                  <div
                    className="w-full relative flex items-center justify-center rounded-xl overflow-hidden border border-white/10"
                    style={{
                      backgroundImage: `repeating-linear-gradient(45deg, #1f2937 25%, transparent 25%, transparent 75%, #1f2937 75%, #1f2937), repeating-linear-gradient(45deg, #1f2937 25%, #111827 25%, #111827 75%, #1f2937 75%, #1f2937)`,
                      backgroundPosition: `0 0, 10px 10px`,
                      backgroundSize: `20px 20px`
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resultData.url} alt="Result Object" className={`max-w-full max-h-[400px] object-contain block transition-opacity duration-300 ${compareMode ? 'opacity-0' : 'opacity-100'}`} />
                    {compareMode && originalPreview && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={originalPreview} alt="Original Image Map" className="absolute inset-0 max-w-full max-h-[400px] object-contain mx-auto block pointer-events-none drop-shadow-2xl opacity-100 transition-opacity" />
                    )}
                  </div>
                </div>

                {/* Finalization Output Actions */}
                <div className="rounded-2xl border border-border bg-surface-base p-8 shadow-glass flex flex-col justify-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)] mb-6">
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                  </div>

                  <h2 className="text-2xl font-bold text-white mb-2">Alpha Channel Stripped</h2>
                  <p className="text-sm text-white/50 mb-8">The ONNX algorithm successfully detached the foreground subjects and bound it to a transparent `.png` map structure.</p>

                  <a
                    href={resultData.url}
                    download={resultData.name}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(16,185,129,0.4)] mb-3"
                  >
                    <Download className="w-5 h-5" /> Download Transparent PNG
                  </a>

                  <button onClick={handleReset} className="w-full py-3 rounded-xl border border-border hover:bg-surface-3 text-white/50 hover:text-white text-sm font-medium transition-colors">
                    Process Another Image
                  </button>
                </div>
              </div>
            ) : (
              <div className={`rounded-2xl p-12 border flex flex-col items-center justify-center gap-6 text-center shadow-glass min-h-[400px] ${errorObj ? "bg-accent-rose/10 border-accent-rose/30" : "bg-surface-2 border-border-subtle"
                }`}>
                <>
                  <AlertCircle className="w-12 h-12 text-accent-rose" />
                  <div>
                    <h2 className="text-xl font-bold text-white">Algorithm Crash Occurred</h2>
                    <p className="text-sm text-accent-rose/80 mt-1">{errorObj}</p>
                  </div>
                  <button onClick={handleReset} className="mt-4 px-8 py-2.5 rounded-xl border border-accent-rose/50 hover:bg-accent-rose/20 text-accent-rose text-sm font-medium transition-colors">
                    Try Again
                  </button>
                </>
              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
