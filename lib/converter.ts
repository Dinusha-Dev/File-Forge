import sharp from "sharp";
import { PDFDocument } from "pdf-lib";

export type ImageFormat = "jpeg" | "jpg" | "png" | "webp" | "avif" | "tiff" | "gif" | "ico" | "pdf" | "svg";

export interface ConversionResult {
  buffer: Buffer;
  format: ImageFormat;
  size: number;
  width?: number;
  height?: number;
}

const FORMAT_MAP: Record<string, ImageFormat> = {
  jpg: "jpeg",
  jpeg: "jpeg",
  png: "png",
  webp: "webp",
  avif: "avif",
  tiff: "tiff",
  tif: "tiff",
  gif: "gif",
  ico: "ico",
  icon: "ico",
  pdf: "pdf",
  svg: "svg",
};

export function normalizeFormat(ext: string): ImageFormat {
  return FORMAT_MAP[ext.toLowerCase().replace(".", "")] ?? "jpeg";
}

export async function convertImage(
  input: Buffer,
  targetFormat: ImageFormat
): Promise<ConversionResult> {
  const fmt = targetFormat === "jpg" ? "jpeg" : targetFormat;

  if (fmt === "ico") {
    // Sharp to force valid icon bounds (max 256x256 natively supported universally)
    const pngBuf = await sharp(input)
      .resize({ width: 256, height: 256, fit: "inside" })
      .png()
      .toBuffer();

    // Lazily load ESM to prevent bundle bloat issues locally
    const pngToIco = (await import("png-to-ico")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const MathAny = pngToIco as any; // Ignore type checks on dynamic raw ESM load 
    const icoBuf = await MathAny(pngBuf);
    return { buffer: icoBuf, format: "ico", size: icoBuf.length };
  }

  if (fmt === "pdf") {
    // Embed raster exactly filling a dynamically sized document
    const { data: jpgBuf, info } = await sharp(input).jpeg({ quality: 90 }).toBuffer({ resolveWithObject: true });
    const doc = await PDFDocument.create();
    const image = await doc.embedJpg(jpgBuf);
    const page = doc.addPage([info.width!, info.height!]);
    page.drawImage(image, { x: 0, y: 0, width: info.width!, height: info.height! });

    const pdfBytes = await doc.save();
    const pdfBuf = Buffer.from(pdfBytes);
    return { buffer: pdfBuf, format: "pdf", size: pdfBuf.length, width: info.width, height: info.height };
  }

  if (fmt === "svg") {
    // Wrap raster tightly in a high-fidelity SVG string payload preserving transparency
    const { data: pngBuf, info } = await sharp(input).png().toBuffer({ resolveWithObject: true });
    const b64 = pngBuf.toString("base64");
    const svgStr = `<svg width="${info.width}" height="${info.height}" viewBox="0 0 ${info.width} ${info.height}" xmlns="http://www.w3.org/2000/svg"><image href="data:image/png;base64,${b64}" width="100%" height="100%"/></svg>`;
    const svgBuf = Buffer.from(svgStr);
    return { buffer: svgBuf, format: "svg", size: svgBuf.length, width: info.width, height: info.height };
  }

  let pipeline = sharp(input, { failOn: "none" });

  switch (fmt) {
    case "jpeg":
      pipeline = pipeline.jpeg({ quality: 92, progressive: true });
      break;
    case "png":
      pipeline = pipeline.png({ compressionLevel: 7 });
      break;
    case "webp":
      pipeline = pipeline.webp({ quality: 85, effort: 4 });
      break;
    case "avif":
      pipeline = pipeline.avif({ quality: 70, effort: 4 });
      break;
    case "tiff":
      pipeline = pipeline.tiff({ quality: 90 });
      break;
    case "gif":
      pipeline = pipeline.gif();
      break;
    default:
      pipeline = pipeline.jpeg({ quality: 92 });
  }

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    format: fmt as ImageFormat,
    size: info.size,
    width: info.width,
    height: info.height,
  };
}

export function getOutputExtension(format: ImageFormat): string {
  if (format === "jpeg") return "jpg";
  return format;
}

export function getMimeType(format: ImageFormat): string {
  const map: Record<ImageFormat, string> = {
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    avif: "image/avif",
    tiff: "image/tiff",
    gif: "image/gif",
    ico: "image/x-icon",
    pdf: "application/pdf",
    svg: "image/svg+xml",
  };
  return map[format] ?? "application/octet-stream";
}
