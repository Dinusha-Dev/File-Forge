"use server";

import { v4 as uuidv4 } from "uuid";
import { mergePDFs, splitPDF, reorderPages, advancedReorder, parsePageRanges, getPageCount } from "../lib/pdf-manager";
import { createJob, updateJob, getJob, Job } from "../lib/job-queue";
import { writeTempFile } from "../lib/temp-store";

export async function mergePDFsAction(formData: FormData) {
  const files = formData.getAll("files") as File[];

  if (!files || files.length < 2) {
    throw new Error("At least 2 PDF files required for merge");
  }

  const jobId = uuidv4();
  createJob(jobId, "pdf-merge", [
    { filename: "merged.pdf", originalName: "merged.pdf" },
  ]);

  setImmediate(async () => {
    try {
      updateJob(jobId, { status: "processing" });

      const buffers: Buffer[] = [];
      for (const file of files) {
        const ab = await file.arrayBuffer();
        buffers.push(Buffer.from(ab));
      }

      const merged = await mergePDFs(buffers);
      const outputName = "merged.pdf";
      writeTempFile(jobId, outputName, merged);

      updateJob(jobId, {
        status: "done",
        outputFilename: outputName,
        files: [
          {
            filename: "merged.pdf",
            originalName: "merged.pdf",
            status: "done",
            progress: 100,
            outputFilename: outputName,
          },
        ],
      });
    } catch (err) {
      updateJob(jobId, {
        status: "error",
        error: err instanceof Error ? err.message : "Merge failed",
      });
    }
  });

  return { jobId };
}

export async function splitPDFAction(formData: FormData) {
  const file = formData.get("file") as File;
  const rangeStr = (formData.get("ranges") as string) || "";

  if (!file) throw new Error("No PDF file provided");

  const jobId = uuidv4();
  createJob(jobId, "pdf-split", [
    { filename: "splitting", originalName: file.name },
  ]);

  setImmediate(async () => {
    try {
      updateJob(jobId, { status: "processing" });

      const ab = await file.arrayBuffer();
      const buffer = Buffer.from(ab);
      const totalPages = await getPageCount(buffer);
      const ranges = parsePageRanges(rangeStr, totalPages);
      const parts = await splitPDF(buffer, ranges);

      const fileEntries = parts.map((part: Buffer, i: number) => {
        const fname = `part_${i + 1}.pdf`;
        writeTempFile(jobId, fname, part);
        return {
          filename: fname,
          originalName: fname,
          status: "done" as const,
          progress: 100,
          outputFilename: fname,
        };
      });

      updateJob(jobId, { status: "done", files: fileEntries });
    } catch (err) {
      updateJob(jobId, {
        status: "error",
        error: err instanceof Error ? err.message : "Split failed",
      });
    }
  });

  return { jobId };
}

export async function reorderPDFAction(formData: FormData) {
  const file = formData.get("file") as File;
  const orderStr = formData.get("order") as string;

  if (!file) throw new Error("No PDF file provided");

  const newOrder: number[] = orderStr
    ? JSON.parse(orderStr)
    : [];

  const jobId = uuidv4();
  createJob(jobId, "pdf-reorder", [
    { filename: "reordered.pdf", originalName: file.name },
  ]);

  setImmediate(async () => {
    try {
      updateJob(jobId, { status: "processing" });

      const ab = await file.arrayBuffer();
      const buffer = Buffer.from(ab);
      const reordered = await reorderPages(buffer, newOrder);
      writeTempFile(jobId, "reordered.pdf", reordered);

      updateJob(jobId, {
        status: "done",
        outputFilename: "reordered.pdf",
        files: [
          {
            filename: "reordered.pdf",
            originalName: file.name,
            status: "done",
            progress: 100,
            outputFilename: "reordered.pdf",
          },
        ],
      });
    } catch (err) {
      updateJob(jobId, {
        status: "error",
        error: err instanceof Error ? err.message : "Reorder failed",
      });
    }
  });

  return { jobId };
}

export async function getPDFJobStatusAction(jobId: string): Promise<Job | null> {
  const job = getJob(jobId);
  return job ?? null;
}

export async function advancedReorderAction(formData: FormData) {
  const files = formData.getAll("files") as File[];
  const layoutStr = formData.get("layout") as string;

  if (!files || files.length === 0) throw new Error("No PDF files provided");

  const layout: { fileIndex: number; pageIndex: number }[] = layoutStr
    ? JSON.parse(layoutStr)
    : [];

  const jobId = uuidv4();
  createJob(jobId, "pdf-reorder", [
    { filename: "organized.pdf", originalName: "organized.pdf" },
  ]);

  setImmediate(async () => {
    try {
      updateJob(jobId, { status: "processing" });

      const buffers: Buffer[] = [];
      for (const file of files) {
        const ab = await file.arrayBuffer();
        buffers.push(Buffer.from(ab));
      }

      const reordered = await advancedReorder(buffers, layout);
      writeTempFile(jobId, "organized.pdf", reordered);

      updateJob(jobId, {
        status: "done",
        outputFilename: "organized.pdf",
        files: [
          {
            filename: "organized.pdf",
            originalName: "organized.pdf",
            status: "done",
            progress: 100,
            outputFilename: "organized.pdf",
          },
        ],
      });
    } catch (err) {
      updateJob(jobId, {
        status: "error",
        error: err instanceof Error ? err.message : "Advanced Reorder failed",
      });
    }
  });

  return { jobId };
}
