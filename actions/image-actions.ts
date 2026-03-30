"use server";

import { v4 as uuidv4 } from "uuid";
import { convertImage, normalizeFormat, getOutputExtension, ImageFormat } from "@/lib/converter";
import { createJob, updateJobFile, updateJob, getJob, Job } from "@/lib/job-queue";
import { writeTempFile } from "@/lib/temp-store";

export async function convertImagesAction(formData: FormData) {
  const files = formData.getAll("files") as File[];
  const targetFormat = (formData.get("targetFormat") as string) || "webp";

  if (!files || files.length === 0) {
    throw new Error("No files provided");
  }

  const jobId = uuidv4();
  const fmt = normalizeFormat(targetFormat) as ImageFormat;
  const ext = getOutputExtension(fmt);

  const fileEntries = files.map((file, i) => ({
    filename: `file_${i}`,
    originalName: file.name,
    outputFilename: `${file.name.replace(/\.[^.]+$/, "")}.${ext}`,
  }));

  createJob(jobId, "image-convert", fileEntries);

  // Execute synchronously within the Server Action to prevent Vercel Lambda freeze
  for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileKey = `file_${i}`;
      const outputName = `${file.name.replace(/\.[^.]+$/, "")}.${ext}`;

      try {
        updateJobFile(jobId, fileKey, { status: "processing", progress: 10 });

        const arrayBuffer = await file.arrayBuffer();
        const inputBuffer = Buffer.from(arrayBuffer);

        updateJobFile(jobId, fileKey, { progress: 40 });

        const result = await convertImage(inputBuffer, fmt);

        updateJobFile(jobId, fileKey, { progress: 80 });

        writeTempFile(jobId, outputName, result.buffer);

        updateJobFile(jobId, fileKey, {
          status: "done",
          progress: 100,
          outputFilename: outputName,
        });
      } catch (err) {
        updateJobFile(jobId, fileKey, {
          status: "error",
          progress: 0,
          error: err instanceof Error ? err.message : "Conversion failed",
        });
      }
    }
  return { jobId, fileCount: files.length };
}

export async function getImageJobStatusAction(jobId: string): Promise<Job | null> {
  const job = getJob(jobId);
  return job ?? null;
}
