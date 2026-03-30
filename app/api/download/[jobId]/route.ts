import { NextRequest, NextResponse } from "next/server";
import { readTempFile, listTempFiles } from "../../../../lib/temp-store";
import JSZip from "jszip";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get("file");

// Note: We bypass getJob(jobId) here because Next.js often isolates
  // Server Actions and API Routes in development, causing in-memory Maps
  // to be empty in the API Route context. We rely on the filesystem instead.

  // Single file download
  if (filename) {
    const buf = readTempFile(jobId, filename);
    if (!buf) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    const contentType =
      ext === "pdf"
        ? "application/pdf"
        : ext === "png"
        ? "image/png"
        : ext === "webp"
        ? "image/webp"
        : ext === "avif"
        ? "image/avif"
        : ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "tiff" || ext === "tif"
        ? "image/tiff"
        : "application/octet-stream";

    return new NextResponse(buf as unknown as BodyInit, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buf.length.toString(),
      },
    });
  }

  // Multi-file: zip all output files
  const files = listTempFiles(jobId);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files found" }, { status: 404 });
  }

  if (files.length === 1) {
    // Single file — download directly
    const buf = readTempFile(jobId, files[0]);
    if (!buf) return NextResponse.json({ error: "File not found" }, { status: 404 });
    const ext = files[0].split(".").pop()?.toLowerCase() ?? "";
    const contentType = ext === "pdf" ? "application/pdf" : "application/octet-stream";
    return new NextResponse(buf as unknown as BodyInit, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${files[0]}"`,
      },
    });
  }

  // Multiple files — ZIP
  const zip = new JSZip();
  for (const fname of files) {
    const buf = readTempFile(jobId, fname);
    if (buf) zip.file(fname, buf);
  }
  const zipBuffer = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });

  return new NextResponse(zipBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="converted_files.zip"`,
      "Content-Length": zipBuffer.length.toString(),
    },
  });
}
