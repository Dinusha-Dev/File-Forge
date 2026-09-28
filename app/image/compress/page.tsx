"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minimize2, Download, RefreshCw, AlertCircle, CheckCircle, X, Settings, Image as ImageIcon } from "lucide-react";
import DropZone from "../../../components/ui/DropZone";
import { toast } from "../../../components/ui/Toast";
import imageCompression from "browser-image-compression";

export default function ImageCompressionPage() {
  const [file, setFile] = useState<File | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [errorObj, setErrorObj] = useState<string | null>(null);
  
  const [resultData, setResultData] = useState<{ url: string, name: string, size: number } | null>(null);

  // Compression options
  const [outputFormat, setOutputFormat] = useState("image/jpeg");

  const handleFile = (files: File[]) => {
    if (files.length > 0) {
      setFile(files[0]);
      setDone(false);
      setResultData(null);
      setErrorObj(null);
    }
  };

  const handleReset = () => {
    setFile(null);
    setIsProcessing(false);
    setDone(false);
    setErrorObj(null);
    if (resultData) URL.revokeObjectURL(resultData.url);
    setResultData(null);
  };

  const processCompression = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorObj(null);

    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1920,
        initialQuality: 0.6,
        useWebWorker: true,
        fileType: outputFormat,
      };

      const compressedFile = await imageCompression(file, options);
      const url = URL.createObjectURL(compressedFile);
      const ext = outputFormat.split('/')[1] === 'jpeg' ? 'jpg' : outputFormat.split('/')[1];
      const outputName = `${file.name.replace(/\.[^/.]+$/, "")}_compressed.${ext}`;

      setResultData({ url, name: outputName, size: compressedFile.size });
      setDone(true);
      toast("Image compressed successfully", "success");
      setIsProcessing(false);
    } catch (err) {
      console.error(err);
      setErrorObj(err instanceof Error ? err.message : "Compression failed");
      toast("Error compressing image", "error");
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
          <Minimize2 className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Smart Image Compression</h1>
          <p className="text-xs text-white/40">Compress images locally without uploading to any server.</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!file && (
          <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <DropZone
              onFiles={handleFile}
              accept="image/*"
              multiple={false}
              label="Drop image here to compress"
              sublabel="Secure client-side processing."
            />
          </motion.div>
        )}

        {file && !done && (
          <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="rounded-2xl border border-border bg-surface-base p-6 space-y-8 shadow-glass">

              <div className="flex items-center gap-4 bg-surface-2 border border-border/50 rounded-xl p-4">
                <ImageIcon className="w-8 h-8 text-indigo-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{file.name}</p>
                  <p className="text-xs text-white/40">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button onClick={handleReset} className="p-2 hover:bg-surface-3 rounded-lg text-white/50 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!isProcessing && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Settings className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest">Compression Settings</h2>
                  </div>
                  
                  <div className="space-y-4">
                    <label className="text-sm text-white/70 font-medium block mb-2">Select Output Format</label>
                    <div className="flex flex-wrap gap-3">
                      {["image/jpeg", "image/png", "image/webp"].map((fmt) => {
                        const ext = fmt.split('/')[1].toUpperCase().replace('JPEG', 'JPG');
                        return (
                          <button
                            key={fmt}
                            onClick={() => setOutputFormat(fmt)}
                            className={`px-6 py-3 rounded-xl text-sm font-bold border transition-all ${
                              outputFormat === fmt
                                ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                                : "bg-surface-2 border-white/10 text-white/50 hover:bg-surface-3 hover:text-white"
                            }`}
                          >
                            {ext}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-white/40 mt-3 flex items-center gap-2">
                       <CheckCircle className="w-3 h-3 text-emerald-400" /> Max compression automatically applied (High Quality, 1920px).
                    </p>
                  </div>

                  <button
                    onClick={processCompression}
                    className="w-full mt-6 flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                  >
                    <Minimize2 className="w-5 h-5" /> Compress Image
                  </button>
                </div>
              )}

              {isProcessing && (
                 <div className="py-12 flex flex-col items-center justify-center space-y-4">
                    <div className="relative flex items-center justify-center">
                      <motion.div
                        animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-[-10px] rounded-full border-t-2 border-indigo-400 border-r-2 border-transparent"
                      />
                      <RefreshCw className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h3 className="text-white font-bold text-lg">Compressing Image...</h3>
                 </div>
              )}
            </div>
          </motion.div>
        )}

        {(done || errorObj) && (
          <motion.div key="status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {done && resultData ? (
              <div className="grid grid-cols-1 gap-8">
                <div className="rounded-2xl border border-border bg-surface-base p-8 shadow-glass flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)] mb-6">
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                  </div>

                  <h2 className="text-2xl font-bold text-white mb-2">Compression Complete</h2>
                  <div className="flex items-center gap-4 mb-8 text-sm">
                    <span className="text-accent-rose/80 line-through">{(file!.size / 1024 / 1024).toFixed(2)} MB</span>
                    <span className="text-white/50">→</span>
                    <span className="text-emerald-400 font-bold">{(resultData.size / 1024 / 1024).toFixed(2)} MB</span>
                    <span className="text-indigo-300 ml-2">
                       (-{(((file!.size - resultData.size) / file!.size) * 100).toFixed(1)}%)
                    </span>
                  </div>

                  <a
                    href={resultData.url}
                    download={resultData.name}
                    className="w-full max-w-md flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(16,185,129,0.4)] mb-3"
                  >
                    <Download className="w-5 h-5" /> Download Compressed Image
                  </a>

                  <button onClick={handleReset} className="w-full max-w-md py-3 rounded-xl border border-border hover:bg-surface-3 text-white/50 hover:text-white text-sm font-medium transition-colors">
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
                    <h2 className="text-xl font-bold text-white">Compression Failed</h2>
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
