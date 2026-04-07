import ePub from 'epubjs';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface EpubChapter {
  id: string;
  title: string;
  href: string;
  order: number;
}

/**
 * Extracts formatted text from an XHTML/HTML string safely.
 * Handles both block-level structuring and detached node limitations.
 */
function extractFormattedText(html: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Remote style/scripts/meta to avoid noise
    const noise = doc.querySelectorAll('script, style, link, meta, title, head');
    noise.forEach(n => n.remove());

    const body = doc.body;
    if (!body) return "";

    // Recursive structured text extraction
    function walk(node: Node): string {
      let text = "";
      const blockElements = [
        'P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BR', 
        'LI', 'TR', 'TD', 'SECTION', 'ARTICLE', 'BLOCKQUOTE', 'PRE'
      ];
      
      node.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          text += child.textContent;
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as Element;
          const tagName = el.tagName.toUpperCase();
          
          let childText = walk(el);
          
          // Prepend/append newlines for block elements
          if (blockElements.includes(tagName)) {
             if (text.length > 0 && !text.endsWith('\n')) text += '\n';
             text += childText;
             if (!text.endsWith('\n')) text += '\n';
          } else {
             text += childText;
          }
        }
      });
      return text;
    }

    return walk(body).replace(/\n{3,}/g, '\n\n').trim();
  } catch (err) {
    console.error("[bridgeX] HTML to Text conversion failed:", err);
    // Fallback to basic regex-based tag removal if DOMParser fails
    return html.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();
  }
}

export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'txt':
    case 'md':
      return await file.text();
    case 'epub':
      return await extractTextFromEpub(file);
    case 'docx':
      return await extractTextFromDocx(file);
    case 'pptx':
      return await extractTextFromPptx(file);
    case 'pdf':
      return await extractTextFromPdf(file);
    default:
      return await file.text();
  }
}

export async function extractEpubMetadata(file: File): Promise<EpubChapter[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const book = ePub(arrayBuffer);
    await book.ready;
    
    const chapters: EpubChapter[] = [];
    // @ts-ignore
    const spineItems = book.spine.items;
    const navigation = await book.loaded.navigation;
    const navMap = new Map<string, string>();
    
    const flattenNav = (items: any[]) => {
      items.forEach(item => {
        const href = item.href.split('#')[0];
        if (!navMap.has(href)) navMap.set(href, item.label.trim());
        if (item.subitems) flattenNav(item.subitems);
      });
    };
    if (navigation && navigation.toc) flattenNav(navigation.toc);

    spineItems.forEach((item: any, index: number) => {
      chapters.push({
        id: item.idref,
        href: item.href,
        title: navMap.get(item.href) || `Section ${index + 1}`,
        order: index
      });
    });

    return chapters;
  } catch (err) {
    console.error("[bridgeX] EPUB metadata extraction failed:", err);
    return [];
  }
}

/**
 * Fast, robust extraction of chapter content from EPUB.
 * Uses JSZip to read raw XHTML and a custom recursive parser to bypass CSP/TrustedHTML.
 */
export async function extractEpubChapterContent(file: File, chapterId: string): Promise<string> {
  try {
    // 1. Open ZIP and read file structure
    const zip = new JSZip();
    const zipData = await zip.loadAsync(file);
    
    // 2. Use ePub.js just to find the correct path in the ZIP
    const arrayBuffer = await file.arrayBuffer();
    const book = ePub(arrayBuffer);
    await book.ready;
    // @ts-ignore
    const item = book.spine.get(chapterId);
    if (!item) throw new Error(`Chapter ${chapterId} not found in spine.`);

    // 3. Resolve actual file path in the ZIP container
    // We normalize paths to handle common EPUB variations (OPS/, OEBPS/, etc.)
    const rawPath = (item as any).path || item.href;
    const pathParts = rawPath.split('/');
    const fileName = pathParts.pop()!;
    
    // Search strategy: 
    // a) Exact path match
    // b) Case-insensitive filename suffix match
    let fileInZip = zipData.file(rawPath);
    if (!fileInZip) {
      const candidates = Object.keys(zipData.files).filter(p => 
        p === rawPath || p.toLowerCase().endsWith(fileName.toLowerCase())
      );
      if (candidates.length > 0) fileInZip = zipData.file(candidates[0]);
    }

    // 4. Extract and clean content
    if (fileInZip) {
      const xhtml = await fileInZip.async('text');
      const text = extractFormattedText(xhtml);
      if (text.length > 0) return text;
    }

    // 5. Emergency fallback: try epubjs internal loader (may fail on CSP)
    try {
      const loaded = await item.load(book.load.bind(book));
      const htmlContent = (loaded instanceof Document) ? loaded.documentElement.outerHTML : (typeof loaded === 'string' ? loaded : '');
      if (htmlContent) return extractFormattedText(htmlContent);
    } catch (e) {
      console.warn("[bridgeX] Fallback extraction failed for", chapterId);
    }

    return "";
  } catch (err) {
    console.error(`[bridgeX] Critical extraction error for ${chapterId}:`, err);
    return "";
  }
}

async function extractTextFromEpub(file: File): Promise<string> {
  try {
    const chapters = await extractEpubMetadata(file);
    let fullText = '';
    
    for (const chap of chapters) {
      const content = await extractEpubChapterContent(file, chap.id);
      if (content.trim()) {
         fullText += content + '\n\n---\n\n';
      }
    }

    return fullText.trim() || "[No text content could be successfully extracted from this document.]";
  } catch (err) {
    console.error("[bridgeX] Full EPUB extraction failed:", err);
    throw new Error("Failed to parse EPUB structure.");
  }
}

async function extractTextFromPptx(file: File): Promise<string> {
  try {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    let fullText = '';

    const slideFiles = Object.keys(contents.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
    slideFiles.sort((a, b) => {
      const aNum = parseInt(a.match(/slide(\d+)/)?.[1] || '0');
      const bNum = parseInt(b.match(/slide(\d+)/)?.[1] || '0');
      return aNum - bNum;
    });

    const parser = new DOMParser();
    for (const slidePath of slideFiles) {
      const xml = await contents.files[slidePath].async('text');
      const doc = parser.parseFromString(xml, 'application/xml');
      const textNodes = Array.from(doc.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/main', 't'));
      const slideText = textNodes.map(node => node.textContent).join(' ');
      const slideId = slidePath.match(/slide(\d+)/)?.[1];
      fullText += `## Slide ${slideId}\n\n${slideText}\n\n---\n\n`;
    }
    return fullText.trim();
  } catch (err) {
    throw new Error("Failed to extract content from PPTX.");
  }
}

async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n\n';
  }
  return fullText.trim();
}
