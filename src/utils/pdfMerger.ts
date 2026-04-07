import { PDFDocument } from 'pdf-lib';

export const mergePdfs = async (files: File[]): Promise<Blob> => {
  const masterPdf = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = await masterPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
    
    for (const page of pages) {
      masterPdf.addPage(page);
    }
  }

  const pdfBytes = await masterPdf.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
};
