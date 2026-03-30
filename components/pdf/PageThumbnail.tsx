"use client";

import { useEffect, useRef, useState } from "react";

interface PageThumbnailProps {
  pdfData: ArrayBuffer;
  pageNumber: number; // 1-indexed
  width?: number;
}

export default function PageThumbnail({ pdfData, pageNumber, width = 120 }: PageThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const pdf = await pdfjsLib.getDocument({ data: pdfData.slice(0) }).promise;
        if (cancelled) return;

        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const viewport = page.getViewport({ scale: 1 });
        const scale = width / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
      } catch {
        if (!cancelled) setError(true);
      }
    }

    render();
    return () => { cancelled = true; };
  }, [pdfData, pageNumber, width]);

  if (error) {
    return (
      <div
        style={{ width, height: width * 1.414 }}
        className="rounded-lg bg-surface-3 border border-border-subtle flex items-center justify-center"
      >
        <span className="text-xs text-white/30">Page {pageNumber}</span>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="rounded-lg shadow-glass border border-border-subtle bg-white"
      style={{ maxWidth: width }}
    />
  );
}
