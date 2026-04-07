/**
 * Splits text into chunks based on word count while preserving paragraph boundaries.
 * @param text The full text to split
 * @param maxWords Maximum words per chunk (default 450,000 for NotebookLM safety)
 */
export function splitTextByWords(text: string, maxWords: number = 450000): string[] {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return [text];

  const chunks: string[] = [];
  let currentChunkWords: string[] = [];
  
  // A more sophisticated approach would be to split by paragraphs first
  const paragraphs = text.split(/\n\n+/);
  let currentParagraphs: string[] = [];
  let currentWordCount = 0;

  for (const para of paragraphs) {
    const paraWordCount = para.split(/\s+/).length;
    
    if (currentWordCount + paraWordCount > maxWords) {
      if (currentParagraphs.length > 0) {
        chunks.push(currentParagraphs.join('\n\n'));
        currentParagraphs = [para];
        currentWordCount = paraWordCount;
      } else {
        // Single paragraph is larger than maxWords, must split it
        const paraWords = para.split(/\s+/);
        for (let i = 0; i < paraWords.length; i += maxWords) {
          chunks.push(paraWords.slice(i, i + maxWords).join(' '));
        }
        currentWordCount = 0;
        currentParagraphs = [];
      }
    } else {
      currentParagraphs.push(para);
      currentWordCount += paraWordCount;
    }
  }

  if (currentParagraphs.length > 0) {
    chunks.push(currentParagraphs.join('\n\n'));
  }

  return chunks;
}
