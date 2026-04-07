import { PDFDocument } from 'pdf-lib';

export const splitPdf = async (file: File, pagesPerFile: number = 20): Promise<Blob[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pageCount = pdfDoc.getPageCount();
  const blobs: Blob[] = [];

  for (let i = 0; i < pageCount; i += pagesPerFile) {
    const newPdf = await PDFDocument.create();
    const end = Math.min(i + pagesPerFile, pageCount);
    
    const pages = await newPdf.copyPages(pdfDoc, Array.from({ length: end - i }, (_, k) => i + k));
    pages.forEach(page => newPdf.addPage(page));

    const pdfBytes = await newPdf.save();
    blobs.push(new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' }));
  }

  return blobs;
};
