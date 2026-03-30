import { NextRequest, NextResponse } from "next/server";
import { mergePDFs, splitPDF, reorderPages, advancedReorder, parsePageRanges, getPageCount } from "../../../lib/pdf-manager";
import JSZip from "jszip";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const action = formData.get("action") as string;

    if (action === "merge") {
      const files = formData.getAll("files") as File[];
      if (!files || files.length < 2) {
        return NextResponse.json({ error: "At least 2 PDF files required" }, { status: 400 });
      }

      const buffers: Buffer[] = [];
      for (const file of files) {
        const ab = await file.arrayBuffer();
        buffers.push(Buffer.from(ab));
      }

      const merged = await mergePDFs(buffers);

      return new NextResponse(merged as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="merged.pdf"`,
        },
      });
    }

    if (action === "split") {
      const file = formData.get("file") as File;
      const rangeStr = (formData.get("ranges") as string) || "";
      if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

      const ab = await file.arrayBuffer();
      const buffer = Buffer.from(ab);
      const totalPages = await getPageCount(buffer);
      const ranges = parsePageRanges(rangeStr, totalPages);
      const parts = await splitPDF(buffer, ranges);

      const zip = new JSZip();
      parts.forEach((part, i) => {
        zip.file(`part_${i + 1}.pdf`, part);
      });

      const zipBuffer = await zip.generateAsync({ type: "uint8array" });

      return new NextResponse(zipBuffer as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="splitted_files.zip"`,
        },
      });
    }

    if (action === "reorder") {
      const file = formData.get("file") as File;
      const orderStr = formData.get("order") as string;
      if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

      const newOrder = orderStr ? JSON.parse(orderStr) : [];
      const ab = await file.arrayBuffer();
      const buffer = Buffer.from(ab);
      const reordered = await reorderPages(buffer, newOrder);

      return new NextResponse(reordered as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="reordered.pdf"`,
        },
      });
    }

    if (action === "advanced-reorder") {
      const files = formData.getAll("files") as File[];
      const layoutStr = formData.get("layout") as string;
      if (!files || files.length === 0) return NextResponse.json({ error: "No files provided" }, { status: 400 });

      const layout = layoutStr ? JSON.parse(layoutStr) : [];
      const buffers: Buffer[] = [];
      for (const file of files) {
        const ab = await file.arrayBuffer();
        buffers.push(Buffer.from(ab));
      }

      const reordered = await advancedReorder(buffers, layout);

      return new NextResponse(reordered as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="organized.pdf"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid action type" }, { status: 400 });

  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "PDF Processing failed" }, { status: 500 });
  }
}
