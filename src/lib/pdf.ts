// Client-side PDF text extraction via pdf.js. The extracted text is sent to the
// backend, which asks LocalMind to pull out balance / APR / minimum payment.
import * as pdfjs from 'pdfjs-dist';
// Vite resolves the worker to a served URL.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export async function extractPdfText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const line = content.items
      .map((it) => ('str' in it ? (it as { str: string }).str : ''))
      .join(' ');
    parts.push(line);
  }
  await doc.cleanup();
  return parts.join('\n').replace(/\s+\n/g, '\n').trim();
}
