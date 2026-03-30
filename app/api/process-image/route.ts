import { NextRequest, NextResponse } from "next/server";
import { convertImage, normalizeFormat, getOutputExtension, ImageFormat } from "../../../lib/converter";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const targetFormat = (formData.get("targetFormat") as string) || "webp";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fmt = normalizeFormat(targetFormat) as ImageFormat;
    const ext = getOutputExtension(fmt);

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const result = await convertImage(inputBuffer, fmt);

    let contentType = `image/${ext === "jpg" ? "jpeg" : ext}`;
    if (ext === "ico") contentType = "image/x-icon";
    if (ext === "heic") contentType = "image/heic";

    const outputFilename = `${file.name.replace(/\.[^.]+$/, "")}.${ext}`;

    return new NextResponse(result.buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(outputFilename)}"`,
        "X-Output-Filename": encodeURIComponent(outputFilename),
      },
      status: 200,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Conversion failed" }, 
      { status: 500 }
    );
  }
}
