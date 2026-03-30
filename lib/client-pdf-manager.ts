import { PDFDocument } from "pdf-lib";

export interface PageRange {
  start: number; // 1-indexed
  end: number;
}

export async function mergePDFsClient(buffers: ArrayBuffer[]): Promise<Uint8Array> {
  const mergedDoc = await PDFDocument.create();

  for (const buf of buffers) {
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    const pages = await mergedDoc.copyPages(doc, doc.getPageIndices());
    pages.forEach((page) => mergedDoc.addPage(page));
  }

  const bytes = await mergedDoc.save();
  return bytes;
}

export async function splitPDFClient(
  buffer: ArrayBuffer,
  ranges: PageRange[]
): Promise<Uint8Array[]> {
  const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();
  const results: Uint8Array[] = [];

  for (const range of ranges) {
    const start = Math.max(1, range.start);
    const end = Math.min(totalPages, range.end);
    if (start > end) continue;

    const newDoc = await PDFDocument.create();
    const indices = Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i);
    const copied = await newDoc.copyPages(srcDoc, indices);
    copied.forEach((page) => newDoc.addPage(page));

    const bytes = await newDoc.save();
    results.push(bytes);
  }

  return results;
}

export async function advancedReorderClient(
  buffers: ArrayBuffer[],
  layout: { fileIndex: number; pageIndex: number }[]
): Promise<Uint8Array> {
  // Load all source documents directly into browser memory
  const docs = await Promise.all(
    buffers.map((buf) => PDFDocument.load(buf, { ignoreEncryption: true }))
  );
  
  const newDoc = await PDFDocument.create();

  // Iterate exactly over the specified layout order mapping logically without file IO
  for (const step of layout) {
    if (step.fileIndex < 0 || step.fileIndex >= docs.length) continue;
    const srcDoc = docs[step.fileIndex];
    if (step.pageIndex < 0 || step.pageIndex >= srcDoc.getPageCount()) continue;

    const [copiedPage] = await newDoc.copyPages(srcDoc, [step.pageIndex]);
    newDoc.addPage(copiedPage);
  }

  const bytes = await newDoc.save();
  return bytes;
}

export async function getPageCountClient(buffer: ArrayBuffer): Promise<number> {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  return doc.getPageCount();
}

export function parsePageRangesClient(rangeStr: string, totalPages: number): PageRange[] {
  const ranges: PageRange[] = [];
  const parts = rangeStr.split(",").map((s) => s.trim());

  for (const part of parts) {
    if (part.includes("-")) {
      const [s, e] = part.split("-").map(Number);
      if (!isNaN(s) && !isNaN(e)) {
        ranges.push({ start: Math.min(s, e), end: Math.max(s, e) });
      }
    } else {
      const n = Number(part);
      if (!isNaN(n) && n >= 1 && n <= totalPages) {
        ranges.push({ start: n, end: n });
      }
    }
  }

  return ranges.length > 0 ? ranges : [{ start: 1, end: totalPages }];
}
