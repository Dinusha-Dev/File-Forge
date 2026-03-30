"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GripVertical as GripIcon, Save, Download, RefreshCw, CheckCircle, AlertCircle, Plus } from "lucide-react";
import DropZone from "../../../components/ui/DropZone";
import PageOrganizer, { PageGroup, PageItem } from "../../../components/pdf/PageOrganizer";
import { toast } from "../../../components/ui/Toast";
import { v4 as uuidv4 } from "uuid";

interface SourceFile {
  id: string;
  file: File;
  name: string;
}

export default function PDFOrganizePage() {
  const [sourceFiles, setSourceFiles] = useState<SourceFile[]>([]);
  const [pdfDataMap, setPdfDataMap] = useState<Record<string, ArrayBuffer>>({});
  const [groups, setGroups] = useState<PageGroup[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleFiles = useCallback(async (incoming: File[]) => {
    if (incoming.length === 0) return;
    setIsLoading(true);

    try {
      const { PDFDocument } = await import("pdf-lib");
      
      const newSourceFiles = [...sourceFiles];
      const newPdfDataMap = { ...pdfDataMap };
      const newGroups = [...groups];

      let addedCount = 0;

      for (const f of incoming) {
        const fileId = uuidv4();
        const ab = await f.arrayBuffer();
        
        newSourceFiles.push({ id: fileId, file: f, name: f.name });
        newPdfDataMap[fileId] = ab;

        const fileIndex = newSourceFiles.length - 1; // Index in the aggregated layout map list

        const doc = await PDFDocument.load(ab, { ignoreEncryption: true });
        const count = doc.getPageCount();
        addedCount += count;

        const pages: PageItem[] = [];
        for (let i = 0; i < count; i++) {
          pages.push({
            id: uuidv4(),
            fileId,
            fileIndex,
            originalIndex: i,
            label: `Pg ${i + 1}`,
            isDisabled: false
          });
        }
        
        newGroups.push({
          id: fileId,
          name: f.name,
          pages
        });
      }

      setSourceFiles(newSourceFiles);
      setPdfDataMap(newPdfDataMap);
      setGroups(newGroups);
      
      toast(`Loaded ${addedCount} pages from ${incoming.length} file(s)`, "info");
    } catch {
      toast("Could not read PDF pages", "error");
    }
    
    setIsLoading(false);
  }, [sourceFiles, pdfDataMap, groups]);

  const handleTogglePage = useCallback((pageId: string, groupId: string) => {
    setGroups((prev) => prev.map(group => {
      if (group.id !== groupId) return group;
      return { 
        ...group, 
        pages: group.pages.map(p => p.id === pageId ? { ...p, isDisabled: !p.isDisabled } : p)
      };
    }));
  }, []);

  const handleReset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setSourceFiles([]);
    setPdfDataMap({});
    setGroups([]);
    setDownloadUrl(null);
    setIsSubmitting(false);
  };

  const handleSave = async () => {
    const totalPages = groups.reduce((acc, g) => acc + g.pages.filter(p => !p.isDisabled).length, 0);
    if (sourceFiles.length === 0 || totalPages === 0) return;
    setIsSubmitting(true);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);

    try {
      // Flatten the grid arrays sequentially from top box to bottom box, EXCLUDING disabled pages!
      const layout: { fileIndex: number, pageIndex: number }[] = [];
      groups.forEach(group => {
        group.pages
          .filter(p => !p.isDisabled)
          .forEach(p => {
            layout.push({
              fileIndex: p.fileIndex,
              pageIndex: p.originalIndex
            });
          });
      });
      
      const formData = new FormData();
      formData.append("action", "advanced-reorder");
      sourceFiles.forEach(sf => formData.append("files", sf.file));
      formData.append("layout", JSON.stringify(layout));

      const res = await fetch("/api/process-pdf", { method: "POST", body: formData });
      if (!res.ok) {
        const errData = await res.json().catch(()=>({}));
        throw new Error(errData.error || "Compilation failed");
      }
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);

      toast("Master PDF compiled successfully!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  const totalPagesCount = groups.reduce((acc, g) => acc + g.pages.filter(p => !p.isDisabled).length, 0);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600 to-pink-600 flex items-center justify-center">
          <GripIcon className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Advanced PDF Organizer</h1>
          <p className="text-xs text-white/40">Combine files manually by dragging pages seamlessly between Document groups</p>
        </div>
        {groups.length > 0 && !downloadUrl && (
          <div className="ml-auto flex items-center gap-2">
            <button
              disabled={isSubmitting || totalPagesCount === 0}
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 shadow-glow-rose"
            >
              {isSubmitting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              {isSubmitting ? "Compiling…" : "Compile PDF"}
            </button>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {sourceFiles.length === 0 && !isLoading && (
          <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <DropZone
              onFiles={handleFiles}
              accept=".pdf,application/pdf"
              multiple={true}
              label="Drop PDFs to merge and organize"
              sublabel="Upload multiple PDFs to manipulate them together in separate shelves"
            />
          </motion.div>
        )}

        {isLoading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="w-8 h-8 text-accent-rose animate-spin" />
            <p className="text-sm text-white/40">Parsing documents…</p>
          </motion.div>
        )}

        {sourceFiles.length > 0 && !isLoading && !downloadUrl && (
          <motion.div key="organizer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            
            {/* Top Toolbar Area for Multi-File Context */}
            <div className="flex items-end justify-between border-b border-border/50 pb-4">
              <div className="space-y-1">
                <p className="text-sm text-white/70 font-medium">
                  {totalPagesCount} Pages Loaded (Active)
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-white/40">
                  {sourceFiles.map((sf, i) => (
                    <span key={sf.id} className="bg-surface-3 px-2 py-1 rounded-md border border-border/50">
                      [{i + 1}] {sf.name}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="flex items-center gap-2 px-4 py-2 bg-surface-2 hover:bg-surface-3 border border-border cursor-pointer rounded-xl text-sm font-medium text-white/70 hover:text-white transition-all shadow-sm">
                  <Plus className="w-4 h-4" /> Add More PDFs
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

            <PageOrganizer groups={groups} pdfDataMap={pdfDataMap} onReorder={setGroups} onToggle={handleTogglePage} />
          </motion.div>
        )}

        {isSubmitting && !downloadUrl && (
          <motion.div key="compile-progress" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className={`rounded-2xl p-8 border flex flex-col items-center gap-4 text-center bg-surface-2 border-border-subtle`}>
               <RefreshCw className="w-10 h-10 text-rose-400 animate-spin" />
               <p className="text-sm text-white/60">Compiling and merging pages into memory buffer…</p>
            </div>
          </motion.div>
        )}

        {downloadUrl && (
          <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="rounded-2xl p-8 border bg-accent-rose/10 border-accent-rose/30 flex flex-col items-center gap-4 text-center shadow-glow-rose">
                  <div className="w-14 h-14 rounded-full bg-rose-500/20 flex items-center justify-center shadow-glow-rose">
                    <CheckCircle className="w-7 h-7 text-rose-400" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white">Master PDF Compiled!</p>
                    <p className="text-xs text-white/40 mt-1">Ready for download.</p>
                  </div>
                  <a
                    href={downloadUrl}
                    download="organized.pdf"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white text-sm font-semibold hover:opacity-90 shadow-glow-rose transition-opacity"
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
