/**
 * Counts the number of words in a given text.
 * @param text The input string to analyze
 * @returns The word count
 */
export function countWords(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  
  // Trim and split by any whitespace character(s)
  const words = text.trim().split(/\s+/);
  
  // If the string was just whitespace, split() might return [""]
  return words.length === 1 && words[0] === '' ? 0 : words.length;
}

/**
 * Formats a word count for display (e.g. "1.2k words").
 * @param count The number of words
 */
export function formatWordCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k words`;
  }
  return `${count} words`;
}
