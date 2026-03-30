"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileStack, Merge, Download, RefreshCw, AlertCircle, CheckCircle, X, Plus } from "lucide-react";
import DropZone from "../../../components/ui/DropZone";
import { toast } from "../../../components/ui/Toast";
import { v4 as uuidv4 } from "uuid";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import PageThumbnail from "../../../components/pdf/PageThumbnail";
import { mergePDFsClient } from "../../../lib/client-pdf-manager";

interface MergeFile {
  id: string;
  file: File;
  buffer: ArrayBuffer;
  name: string;
  size: number;
  pageCount: number;
}

export default function PDFMergePage() {
  const [files, setFiles] = useState<MergeFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleFiles = useCallback(async (incoming: File[]) => {
    if (incoming.length === 0) return;
    setIsLoading(true);

    try {
      const parsedFiles: MergeFile[] = [];
      const { PDFDocument } = await import("pdf-lib");

      for (const f of incoming) {
        const ab = await f.arrayBuffer();
        const doc = await PDFDocument.load(ab, { ignoreEncryption: true });

        parsedFiles.push({
          id: uuidv4(),
          file: f,
          buffer: ab,
          name: f.name,
          size: f.size,
          pageCount: doc.getPageCount()
        });
      }

      setFiles((prev) => [...prev, ...parsedFiles]);
    } catch {
      toast("Could not read PDF files", "error");
    }

    setIsLoading(false);
  }, []);

  const handleRemove = useCallback((id: string) => {
    setFiles((prev) => prev.filter(f => f.id !== id));
  }, []);

  const handleReset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setFiles([]);
    setDownloadUrl(null);
    setIsSubmitting(false);
  };

  const handleMerge = async () => {
    if (files.length < 2) { toast("Please add at least 2 PDF files", "error"); return; }
    setIsSubmitting(true);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    
    try {
      const buffers = files.map(f => f.buffer);
      const mergedBytes = await mergePDFsClient(buffers);
      
      const blob = new Blob([mergedBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      
      toast(`Merged ${files.length} PDFs locally!`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Merge failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const reorderedFiles = Array.from(files);
    const [removed] = reorderedFiles.splice(result.source.index, 1);
    reorderedFiles.splice(result.destination.index, 0, removed);
    setFiles(reorderedFiles);
  }, [files]);

  useEffect(() => {
    return () => {
       if (downloadUrl) URL.revokeObjectURL(downloadUrl);
       setFiles([]);
    };
  }, [downloadUrl]);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center">
          <FileStack className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">PDF Merge</h1>
          <p className="text-xs text-white/40">Combine multiple PDFs into a single document visually</p>
        </div>

        {!downloadUrl && files.length >= 2 && (
          <div className="ml-auto">
            <button
              disabled={isSubmitting}
              onClick={handleMerge}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(8,145,178,0.4)]"
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Merge className="w-4 h-4" />}
              {isSubmitting ? "Merging…" : `Merge Files`}
            </button>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!downloadUrl && !isSubmitting && (
          <motion.div key="config" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
            <DropZone
              onFiles={handleFiles}
              accept=".pdf,application/pdf"
              multiple
              label="Drop PDF files here to merge"
              sublabel="Add 2 or more PDFs. You can visually reorder them below."
            />

            {isLoading && (
              <div className="flex flex-col items-center justify-center py-10 gap-4">
                <RefreshCw className="w-8 h-8 text-accent-cyan animate-spin" />
                <p className="text-sm text-white/40">Extracting covers…</p>
              </div>
            )}

            {files.length > 0 && !isLoading && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-white/90">Merge Sequence</h3>
                    <span className="text-xs text-white/40">{files.length} Document(s)</span>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 px-3 py-1.5 bg-surface-2 hover:bg-surface-3 border border-border cursor-pointer rounded-lg text-xs font-medium text-white/70 hover:text-white transition-all shadow-sm">
                      <Plus className="w-3 h-3" /> Add More PDFs
                      <input
                        type="file"
                        multiple
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleFiles(Array.from(e.target.files));
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="merge-list" direction="horizontal">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex flex-wrap gap-6 p-6 rounded-2xl border-2 border-dashed min-h-[240px] transition-colors duration-300 ${snapshot.isDraggingOver
                          ? "border-accent-cyan/50 bg-accent-cyan/5"
                          : "border-border-subtle bg-surface-1"
                          }`}
                      >
                        {files.map((file, index) => (
                          <Draggable key={file.id} draggableId={file.id} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                className={`relative flex flex-col items-center group ${dragSnapshot.isDragging ? "z-50" : ""
                                  }`}
                              >
                                <div
                                  {...dragProvided.dragHandleProps}
                                  className="flex flex-col items-center gap-3 cursor-grab active:cursor-grabbing w-[120px] h-full"
                                >
                                  {/* Thumbnail Element */}
                                  <div
                                    className={`relative w-[120px] h-[170px] rounded-xl overflow-hidden border-2 transition-all duration-200 bg-surface-3 flex items-center justify-center ${dragSnapshot.isDragging
                                      ? "border-accent-cyan shadow-glow-cyan rotate-3 scale-110"
                                      : "border-border hover:border-accent-cyan/40"
                                      }`}
                                  >
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemove(file.id);
                                      }}
                                      className="absolute top-2 right-2 z-30 w-7 h-7 rounded-full bg-zinc-900 shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-white/20 flex items-center justify-center text-white hover:bg-accent-rose hover:border-accent-rose transition-all"
                                      title="Remove Document"
                                    >
                                      <X className="w-3 h-3 text-white/70" />
                                    </button>

                                    <PageThumbnail
                                      pdfData={file.buffer}
                                      pageNumber={1}
                                      width={120}
                                    />

                                    <div className="absolute top-2 left-2 z-20 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center pointer-events-none">
                                      <span className="text-[10px] font-bold text-white shadow-sm">{index + 1}</span>
                                    </div>
                                  </div>

                                  <div className="flex flex-col items-center w-full px-1">
                                    <span className="text-xs font-medium text-white/90 w-full text-center truncate" title={file.name}>
                                      {file.name}
                                    </span>
                                    <div className="flex items-center justify-between w-full mt-1 px-2 text-[10px] text-white/50 font-medium">
                                      <span>{file.pageCount} Pages</span>
                                      <span>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                                    </div>
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

        {isSubmitting && !downloadUrl && (
          <motion.div key="progress" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className={`rounded-2xl p-8 border flex flex-col items-center gap-4 text-center bg-surface-2 border-border-subtle`}>
               <RefreshCw className="w-10 h-10 text-accent-cyan animate-spin" />
               <p className="text-sm text-white/60">Merging your PDFs sequentially…</p>
            </div>
          </motion.div>
        )}

        {downloadUrl && (
          <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className={`rounded-2xl p-8 border flex flex-col items-center gap-4 text-center bg-accent-emerald/10 border-accent-emerald/30`}>
                  <div className="w-14 h-14 rounded-full bg-accent-emerald/20 flex items-center justify-center">
                    <CheckCircle className="w-7 h-7 text-accent-emerald" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white">Merge Complete!</p>
                    <p className="text-xs text-white/40 mt-1">Your merged PDF is ready to download.</p>
                  </div>
                  <a
                    href={downloadUrl}
                    download="merged.pdf"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent-emerald text-white text-sm font-semibold hover:bg-emerald-400 transition-colors shadow-glow-emerald"
                  >
                     <Download className="w-4 h-4" /> Download Final PDF
                  </a>
            </div>
            <button onClick={handleReset} className="w-full py-2.5 rounded-xl border border-border text-white/50 hover:text-white hover:border-white/20 text-sm font-medium transition-colors">
              Start New Session
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
