/**
 * End-to-end backend test: merges 3 PDFs, splits, and reorders
 * Uses pdf-lib directly (same lib as the server actions)
 */
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const fs = require("fs");
const path = require("path");

const TMP = path.join(__dirname, "..", "tmp");
fs.mkdirSync(TMP, { recursive: true });

async function createPDF(title, pages) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  for (let i = 1; i <= pages; i++) {
    const page = doc.addPage([595, 842]);
    page.drawText(`${title} — Page ${i}`, { x: 50, y: 780, size: 20, font, color: rgb(0.2, 0.2, 0.8) });
    page.drawText(`Page ${i} of ${pages}`, { x: 50, y: 740, size: 12, font });
    page.drawRectangle({ x: 50, y: 200, width: 495, height: 2, color: rgb(0.8, 0.8, 0.8) });
    page.drawText(`— FilForge Test PDF —`, { x: 200, y: 170, size: 10, font, color: rgb(0.5, 0.5, 0.5) });
  }
  return Buffer.from(await doc.save());
}

async function mergePDFs(buffers) {
  const merged = await PDFDocument.create();
  for (const buf of buffers) {
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach(p => merged.addPage(p));
  }
  return Buffer.from(await merged.save());
}

async function splitPDF(buffer, ranges) {
  const src = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const results = [];
  for (const { start, end } of ranges) {
    const newDoc = await PDFDocument.create();
    const indices = Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i);
    const copied = await newDoc.copyPages(src, indices);
    copied.forEach(p => newDoc.addPage(p));
    results.push(Buffer.from(await newDoc.save()));
  }
  return results;
}

async function reorderPages(buffer, order) {
  const src = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const newDoc = await PDFDocument.create();
  const copied = await newDoc.copyPages(src, order);
  copied.forEach(p => newDoc.addPage(p));
  return Buffer.from(await newDoc.save());
}

async function runTests() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║   FilForge — Backend Integration Tests   ║");
  console.log("╚══════════════════════════════════════════╝\n");

  // 1. Create source PDFs
  console.log("► Creating 3 sample source PDFs...");
  const pdfA = await createPDF("Document Alpha", 3);
  const pdfB = await createPDF("Document Beta", 2);
  const pdfC = await createPDF("Document Gamma", 4);
  fs.writeFileSync(path.join(TMP, "test_a.pdf"), pdfA);
  fs.writeFileSync(path.join(TMP, "test_b.pdf"), pdfB);
  fs.writeFileSync(path.join(TMP, "test_c.pdf"), pdfC);
  console.log("  ✓ test_a.pdf (3 pages) — " + pdfA.length + " bytes");
  console.log("  ✓ test_b.pdf (2 pages) — " + pdfB.length + " bytes");
  console.log("  ✓ test_c.pdf (4 pages) — " + pdfC.length + " bytes");

  // 2. Merge test
  console.log("\n► TEST 1: PDF Merge (3 PDFs → 1)");
  const merged = await mergePDFs([pdfA, pdfB, pdfC]);
  const mergedDoc = await PDFDocument.load(merged);
  const mergedPages = mergedDoc.getPageCount();
  fs.writeFileSync(path.join(TMP, "test_merged.pdf"), merged);
  const pass1 = mergedPages === 9;
  console.log(`  ${pass1 ? "✓" : "✗"} Merged page count: ${mergedPages} (expected: 9) — ${pass1 ? "PASS" : "FAIL"}`);
  console.log("  ✓ test_merged.pdf — " + merged.length + " bytes");

  // 3. Split test
  console.log("\n► TEST 2: PDF Split (pages 1-2, 4-5, 7-9)");
  const splitResults = await splitPDF(merged, [
    { start: 1, end: 2 },
    { start: 4, end: 5 },
    { start: 7, end: 9 },
  ]);
  const expectedSizes = [2, 2, 3];
  let splitPass = true;
  for (let i = 0; i < splitResults.length; i++) {
    const doc = await PDFDocument.load(splitResults[i]);
    const pc = doc.getPageCount();
    const ok = pc === expectedSizes[i];
    if (!ok) splitPass = false;
    const fname = `test_split_part${i+1}.pdf`;
    fs.writeFileSync(path.join(TMP, fname), splitResults[i]);
    console.log(`  ${ok ? "✓" : "✗"} ${fname}: ${pc} pages (expected ${expectedSizes[i]}) — ${ok ? "PASS" : "FAIL"}`);
  }

  // 4. Reorder test
  console.log("\n► TEST 3: PDF Reorder (reverse all 9 pages)");
  const originalOrder = [8, 7, 6, 5, 4, 3, 2, 1, 0]; // reversed
  const reordered = await reorderPages(merged, originalOrder);
  const reorderedDoc = await PDFDocument.load(reordered);
  const reorderedPages = reorderedDoc.getPageCount();
  fs.writeFileSync(path.join(TMP, "test_reordered.pdf"), reordered);
  const pass3 = reorderedPages === 9;
  console.log(`  ${pass3 ? "✓" : "✗"} Reordered page count: ${reorderedPages} (expected 9) — ${pass3 ? "PASS" : "FAIL"}`);
  console.log("  ✓ test_reordered.pdf — " + reordered.length + " bytes");

  // 5. Results Summary
  const allPass = pass1 && splitPass && pass3;
  console.log("\n══════════════════════════════════════════");
  console.log(`  Result: ${allPass ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"}`);
  console.log("══════════════════════════════════════════");
  console.log("\n  Output files in ./tmp/:");
  fs.readdirSync(TMP).filter(f => f.startsWith("test_")).forEach(f => {
    const size = fs.statSync(path.join(TMP, f)).size;
    console.log(`    ${f} (${size} bytes)`);
  });
}

runTests().catch(err => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
