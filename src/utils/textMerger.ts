export const mergeTexts = async (files: File[]): Promise<Blob> => {
  let mergedContent = '';

  for (const file of files) {
    const text = await file.text();
    mergedContent += `\n\n--- Document: ${file.name} ---\n\n`;
    mergedContent += text;
  }

  return new Blob([mergedContent], { type: 'text/markdown' });
};
