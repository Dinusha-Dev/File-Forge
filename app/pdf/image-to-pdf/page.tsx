"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileStack, Download, RefreshCw, AlertCircle, CheckCircle, X } from "lucide-react";
import DropZone from "../../../components/ui/DropZone";
import { toast } from "../../../components/ui/Toast";
import { v4 as uuidv4 } from "uuid";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface ImageFile {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
}

export default function ImageToPDFPage() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState("");
  const [done, setDone] = useState(false);
  const [errorObj, setErrorObj] = useState<string | null>(null);
  const [downloadBlob, setDownloadBlob] = useState<{ url: string, name: string } | null>(null);

  const handleFiles = useCallback((incoming: File[]) => {
    if (incoming.length === 0) return;
    
    const parsedFiles: ImageFile[] = incoming.map(f => ({
      id: uuidv4(),
      file: f,
      name: f.name,
      previewUrl: URL.createObjectURL(f)
    }));
    
    setImages(prev => [...prev, ...parsedFiles]);
    setDone(false);
    setErrorObj(null);
  }, []);

  const handleRemove = useCallback((id: string) => {
    setImages(prev => {
      const idx = prev.findIndex(i => i.id === id);
      if (idx !== -1) URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter(i => i.id !== id);
    });
  }, []);

  const handleReset = () => {
    images.forEach(i => URL.revokeObjectURL(i.previewUrl));
    setImages([]);
    setIsProcessing(false);
    setProcessStatus("");
    setDone(false);
    setErrorObj(null);
    if (downloadBlob) URL.revokeObjectURL(downloadBlob.url);
    setDownloadBlob(null);
  };

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(images);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    setImages(reordered);
  }, [images]);

  // Utility to convert unsupported images (like WebP) to PNG buffer via canvas
  const convertImageToBuffer = (file: File): Promise<{ buffer: ArrayBuffer, width: number, height: number, type: 'jpg' | 'png' }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Only JPG and pure PNG are fully safe in primitive pdf-lib. Let's force PNG if it's not a standard JPEG.
        const isJpg = file.type === "image/jpeg" || file.type === "image/jpg";
        
        if (isJpg) {
          // Pass raw buffer
          file.arrayBuffer().then(buffer => {
            resolve({ buffer, width: img.naturalWidth, height: img.naturalHeight, type: 'jpg' });
          }).catch(reject);
        } else {
          // Convert to standardized PNG through canvas explicitly
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject("Canvas failure");
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob((blob) => {
            if (!blob) return reject("Blob failure");
            blob.arrayBuffer().then(buffer => {
              resolve({ buffer, width: canvas.width, height: canvas.height, type: 'png' });
            }).catch(reject);
          }, "image/png");
        }
      };
      img.onerror = () => reject("Image decode failure");
      img.src = URL.createObjectURL(file);
    });
  };

  const constructPDF = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    setProcessStatus("Initializing PDF Wrapper...");
    setErrorObj(null);

    try {
      const { PDFDocument } = await import("pdf-lib");
      const doc = await PDFDocument.create();

      for (let i = 0; i < images.length; i++) {
        setProcessStatus(`Embedding image ${i + 1} of ${images.length}...`);
        
        const file = images[i].file;
        const imgParams = await convertImageToBuffer(file);
        
        // Add page matching exact pixel dimensions
        const page = doc.addPage([imgParams.width, imgParams.height]);
        
        let embeddedImage;
        if (imgParams.type === 'jpg') {
          embeddedImage = await doc.embedJpg(imgParams.buffer);
        } else {
          embeddedImage = await doc.embedPng(imgParams.buffer);
        }
        
        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: imgParams.width,
          height: imgParams.height
        });
        
        // Let the event loop rest
        await new Promise(r => setTimeout(r, 10));
      }

      setProcessStatus("Compiling Master PDF...");
      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });

      setDownloadBlob({ 
        url: URL.createObjectURL(blob), 
        name: `Compiled_${images.length}_Images.pdf` 
      });
      setDone(true);
      toast("Conversion highly successful!", "success");
    } catch (err) {
      setErrorObj(err instanceof Error ? err.message : "PDF Construction failed");
      toast("Error creating PDF", "error");
    }
    
    setIsProcessing(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
          <FileStack className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Image to PDF Compiler</h1>
          <p className="text-xs text-white/40">Drop images (JPG, PNG, WEBP) to compile them sequentially into a single secure PDF file.</p>
        </div>
        
        {!done && images.length > 0 && (
          <div className="ml-auto">
            <button
              disabled={isProcessing}
              onClick={constructPDF}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white text-sm font-semibold disabled:opacity-40 hover:opacity-90 shadow-glow-cyan transition-opacity"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isProcessing ? "Building…" : `Compile PDF`}
            </button>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!done && !isProcessing && (
          <motion.div key="config" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
            <DropZone
              onFiles={handleFiles}
              accept="image/*"
              multiple
              label="Drop image files here"
              sublabel="Sequence them directly inside your browser."
            />

            {images.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <h3 className="text-sm font-semibold text-white/90">Page Sequence</h3>
                  <span className="text-xs text-white/40">{images.length} Image(s) Attached</span>
                </div>

                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="image-list" direction="horizontal">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex flex-wrap gap-6 p-6 rounded-2xl border-2 border-dashed min-h-[220px] transition-colors duration-300 ${
                          snapshot.isDraggingOver
                            ? "border-indigo-500/50 bg-indigo-500/5"
                            : "border-border-subtle bg-surface-1"
                        }`}
                      >
                        {images.map((img, index) => (
                          <Draggable key={img.id} draggableId={img.id} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                className={`relative flex flex-col items-center group ${
                                  dragSnapshot.isDragging ? "z-50" : ""
                                }`}
                              >
                                <div
                                  {...dragProvided.dragHandleProps}
                                  className="flex flex-col items-center gap-3 cursor-grab active:cursor-grabbing w-[120px] h-full"
                                >
                                  {/* Thumbnail Element */}
                                  <div
                                    className={`relative w-[120px] h-[120px] rounded-xl overflow-hidden border-2 transition-all duration-200 bg-surface-3 flex items-center justify-center ${
                                      dragSnapshot.isDragging
                                        ? "border-indigo-500 shadow-glow-cyan rotate-3 scale-110"
                                        : "border-border hover:border-indigo-500/40"
                                    }`}
                                  >
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemove(img.id);
                                      }}
                                      className="absolute top-2 right-2 z-30 w-7 h-7 rounded-full bg-zinc-900 shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-white/20 flex items-center justify-center text-white hover:bg-accent-rose hover:border-accent-rose transition-all opacity-0 group-hover:opacity-100"
                                      title="Remove Image"
                                    >
                                      <X className="w-3 h-3 text-white/70" />
                                    </button>

                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={img.previewUrl}
                                      alt={img.name}
                                      className="w-full h-full object-cover"
                                      draggable={false}
                                    />
                                    
                                    <div className="absolute top-2 left-2 z-20 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center pointer-events-none">
                                      <span className="text-[10px] font-bold text-white shadow-sm">{index + 1}</span>
                                    </div>
                                  </div>

                                  {/* Label */}
                                  <div className="flex flex-col items-center w-full px-1">
                                    <span className="text-xs font-medium text-white/90 w-full text-center truncate" title={img.name}>
                                      {img.name}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            )}
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
                    <h2 className="text-xl font-bold text-white">Compilation Complete!</h2>
                    <p className="text-sm text-white/50 mt-1">Your images have been converted seamlessly into an embedded PDF document.</p>
                  </div>
                  {downloadBlob && (
                    <a
                      href={downloadBlob.url}
                      download={downloadBlob.name}
                      className="mt-2 flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(99,102,241,0.5)]"
                    >
                      <Download className="w-5 h-5" /> Download Master PDF
                    </a>
                  )}
                </>
              ) : errorObj ? (
                <>
                  <AlertCircle className="w-12 h-12 text-accent-rose" />
                  <div>
                    <h2 className="text-xl font-bold text-white">Compilation Failed</h2>
                    <p className="text-sm text-accent-rose/80 mt-1">{errorObj}</p>
                  </div>
                </>
              ) : (
                <>
                  <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin" />
                  <div>
                    <h2 className="text-lg font-bold text-white transition-all">{processStatus}</h2>
                    <p className="text-xs text-white/40 mt-1">Stitching images internally…</p>
                  </div>
                </>
              )}
            </div>
            
            {(done || errorObj) && (
              <button onClick={handleReset} className="w-full py-2.5 rounded-xl border border-border hover:bg-surface-3 text-white/50 hover:text-white text-sm font-medium transition-colors">
                Compile More Files
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
