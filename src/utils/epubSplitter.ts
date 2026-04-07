import JSZip from 'jszip';

export interface SplitEpubResult {
  title: string;
  file: File;
  wordCount: number;
  chapterCount: number;
}

interface ManifestItem {
  id: string;
  href: string;
  mediaType: string;
}

interface SpineItem {
  idref: string;
}

/**
 * Splits an EPUB file into multiple valid EPUB files based on a splitting strategy.
 * Each output is a real .epub binary that NotebookLM can process natively.
 */
export async function splitEpub(
  file: File,
  chapterGroups: { title: string; hrefs: string[] }[]
): Promise<SplitEpubResult[]> {
  const zip = new JSZip();
  const original = await zip.loadAsync(file);

  // 1. Find and parse the OPF file
  const containerXml = await original.file('META-INF/container.xml')?.async('text');
  if (!containerXml) throw new Error('Invalid EPUB: missing META-INF/container.xml');

  const opfPath = containerXml.match(/full-path="([^"]+)"/)?.[1];
  if (!opfPath) throw new Error('Invalid EPUB: cannot find OPF path in container.xml');

  const opfContent = await original.file(opfPath)?.async('text');
  if (!opfContent) throw new Error(`Invalid EPUB: OPF file not found at ${opfPath}`);

  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

  // 2. Parse manifest and spine from OPF
  const parser = new DOMParser();
  const opfDoc = parser.parseFromString(opfContent, 'application/xml');

  const manifestItems: ManifestItem[] = [];
  const manifestEls = opfDoc.querySelectorAll('manifest > item');
  manifestEls.forEach(el => {
    manifestItems.push({
      id: el.getAttribute('id') || '',
      href: el.getAttribute('href') || '',
      mediaType: el.getAttribute('media-type') || '',
    });
  });

  const spineItems: SpineItem[] = [];
  const spineEls = opfDoc.querySelectorAll('spine > itemref');
  spineEls.forEach(el => {
    spineItems.push({ idref: el.getAttribute('idref') || '' });
  });

  // Build href -> manifest item lookup
  const hrefToManifest = new Map<string, ManifestItem>();
  manifestItems.forEach(item => {
    hrefToManifest.set(item.href, item);
    // Also store without directory prefix for flexible matching
    const baseName = item.href.split('/').pop() || '';
    if (!hrefToManifest.has(baseName)) {
      hrefToManifest.set(baseName, item);
    }
  });

  // Find shared resources (CSS, fonts, images) — items NOT in the spine
  const spineIdrefs = new Set(spineItems.map(s => s.idref));
  const sharedItems = manifestItems.filter(item => !spineIdrefs.has(item.id));

  // The NCX / nav document
  const tocItem = manifestItems.find(item =>
    item.mediaType === 'application/x-dtbncx+xml' ||
    item.id === 'ncx' || item.id === 'toc'
  );

  // 3. For each group, build a new EPUB
  const results: SplitEpubResult[] = [];

  for (const group of chapterGroups) {
    const newZip = new JSZip();

    // mimetype must be first and uncompressed
    newZip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

    // META-INF/container.xml — always points to content.opf
    newZip.file('META-INF/container.xml',
      `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="${opfPath}" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
    );

    // Determine which manifest items to include for this group
    const groupManifestItems: ManifestItem[] = [];
    const groupSpineItems: SpineItem[] = [];
    let totalWordCount = 0;

    console.log(`[bridgeX] Splitting group: ${group.title} (${group.hrefs.length} chapters)`);
    for (const href of group.hrefs) {
      // Find the manifest item for this href
      let item = hrefToManifest.get(href);
      if (!item) {
        const baseName = href.split('/').pop() || '';
        item = hrefToManifest.get(baseName);
      }
      
      if (!item) {
        console.warn(`[bridgeX] Chapter href not found in manifest: ${href}`);
        continue;
      }

      if (groupManifestItems.some(m => m.id === item!.id)) continue;

      groupManifestItems.push(item);
      groupSpineItems.push({ idref: item.id });

      // Copy the file content and count words
      // Normalize path to prevent double slashes or missing slashes
      let fullPath = opfDir + item.href;
      fullPath = fullPath.replace(/\/+/g, '/');
      if (fullPath.startsWith('/')) fullPath = fullPath.substring(1);

      const fileInZip = original.file(fullPath);
      if (fileInZip) {
        const content = await fileInZip.async('text');
        newZip.file(fullPath, content);

        const textContent = extractTextFromXhtml(content);
        totalWordCount += textContent.split(/\s+/).filter(w => w.length > 0).length;
      } else {
        console.error(`[bridgeX] File NOT found in ZIP: ${fullPath}`);
      }
    }

    // Copy shared resources (CSS, images, fonts)
    for (const shared of sharedItems) {
      if (groupManifestItems.some(m => m.id === shared.id)) continue;
      
      let fullPath = opfDir + shared.href;
      fullPath = fullPath.replace(/\/+/g, '/');
      if (fullPath.startsWith('/')) fullPath = fullPath.substring(1);

      const fileInZip = original.file(fullPath);
      if (fileInZip) {
        try {
          if (shared.mediaType.startsWith('image/') ||
              shared.mediaType.includes('font') ||
              shared.mediaType === 'application/x-font-ttf' ||
              shared.mediaType === 'application/x-font-otf') {
            const data = await fileInZip.async('arraybuffer');
            newZip.file(fullPath, data);
          } else {
            const data = await fileInZip.async('text');
            newZip.file(fullPath, data);
          }
          groupManifestItems.push(shared);
        } catch (e) {
          console.warn(`[bridgeX] Failed to copy shared resource ${fullPath}:`, e);
        }
      }
    }

    // Copy NCX/toc if available
    if (tocItem) {
      const fullPath = opfDir + tocItem.href;
      const tocFile = original.file(fullPath);
      if (tocFile) {
        const data = await tocFile.async('text');
        newZip.file(fullPath, data);
        if (!groupManifestItems.find(m => m.id === tocItem.id)) {
          groupManifestItems.push(tocItem);
        }
      }
    }

    // Build new OPF
    const metadata = opfDoc.querySelector('metadata');
    const metadataStr = metadata
      ? new XMLSerializer().serializeToString(metadata)
      : '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>' + escapeXml(group.title) + '</dc:title></metadata>';

    const updatedMetadata = metadataStr.replace(
      /<dc:title[^>]*>.*?<\/dc:title>/,
      `<dc:title>${escapeXml(group.title)}</dc:title>`
    );

    const manifestStr = groupManifestItems
      .map(item => `    <item id="${escapeXml(item.id)}" href="${escapeXml(item.href)}" media-type="${escapeXml(item.mediaType)}"/>`)
      .join('\n');

    const spineStr = groupSpineItems
      .map(item => `    <itemref idref="${escapeXml(item.idref)}"/>`)
      .join('\n');

    const tocAttr = tocItem ? ` toc="${escapeXml(tocItem.id)}"` : '';

    const newOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  ${updatedMetadata}
  <manifest>
${manifestStr}
  </manifest>
  <spine${tocAttr}>
${spineStr}
  </spine>
</package>`;

    newZip.file(opfPath, newOpf);

    // Generate the EPUB blob
    const blob = await newZip.generateAsync({
      type: 'blob',
      mimeType: 'application/epub+zip',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const sanitizedTitle = group.title.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim() || 'split';
    const epubFile = new File([blob], `${sanitizedTitle}.epub`, { type: 'application/epub+zip' });

    results.push({
      title: group.title,
      file: epubFile,
      wordCount: totalWordCount,
      chapterCount: group.hrefs.length,
    });
  }

  return results;
}

/**
 * Extracts plain text from XHTML content (for word counting).
 */
function extractTextFromXhtml(xhtml: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xhtml, 'text/html');
    doc.querySelectorAll('script, style, link, meta').forEach(n => n.remove());
    return doc.body?.textContent || '';
  } catch {
    return xhtml.replace(/<[^>]+>/g, ' ');
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
