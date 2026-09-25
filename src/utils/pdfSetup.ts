import * as pdfjsLib from 'pdfjs-dist';

// Configure the PDF.js worker
if (typeof window !== 'undefined') {
  try {
    // Attempt local worker URL via new URL / Vite
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  } catch {
    // Fallback to unpkg CDN if URL resolution fails
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
}

export { pdfjsLib };
