/**
 * Export staff payment testing guide to PDF via Playwright.
 * Requires: screenshots in docs/testing/assets/staff-payment/
 * Run: node scripts/export-staff-payment-guide-pdf.mjs
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const docsTesting = path.join(root, "docs", "testing");
const htmlPath = path.join(docsTesting, "staff-payment-test-guide.html");
const pdfPath = path.join(docsTesting, "staff-payment-test-guide.pdf");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".css": "text/css",
};

function contentType(filePath) {
  return mime[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

const server = createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
    const rel =
      urlPath === "/"
        ? "staff-payment-test-guide.html"
        : urlPath.replace(/^\//, "");
    const filePath = path.normalize(path.join(docsTesting, rel));
    if (!filePath.startsWith(docsTesting)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": contentType(filePath) });
    res.end(data);
  } catch {
    res.writeHead(404).end("Not found");
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const guideUrl = `http://127.0.0.1:${port}/staff-payment-test-guide.html`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(guideUrl, { waitUntil: "networkidle", timeout: 60000 });
await page.pdf({
  path: pdfPath,
  format: "A4",
  printBackground: true,
  margin: { top: "14mm", bottom: "14mm", left: "12mm", right: "12mm" },
});
await browser.close();
server.close();

console.log(`Wrote ${pdfPath}`);
