import ePub from 'epubjs';
import JSZip from 'jszip';

export const mergeEpubs = async (files: File[]): Promise<Blob> => {
  const newZip = new JSZip();
  newZip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  
  // Basic container.xml pointing to our merged OPF
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
    <rootfiles>
        <rootfile full-path="merged.opf" media-type="application/oebps-package+xml"/>
    </rootfiles>
</container>`;
  newZip.file('META-INF/container.xml', containerXml);

  let opfManifest = '';
  let opfSpine = '';
  let idCounter = 0;

  for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
    const file = files[fileIndex];
    const zip = new JSZip();
    const originalZip = await zip.loadAsync(file);

    const book = ePub(await file.arrayBuffer());
    await book.ready;

    const spine = book.spine as any;
    const items = spine.items;

    for (const item of items) {
      const originalPath = item.path;
      // Extract content from original zip
      const content = await originalZip.file(originalPath)?.async('uint8array');
      if (content) {
        // Create a unique path to avoid collisions between epubs
        const newPath = `book${fileIndex}_${originalPath.replace(/[^a-zA-Z0-9.\-]/g, '_')}`;
        newZip.file(newPath, content);

        const itemId = `item_${idCounter++}`;
        opfManifest += `<item id="${itemId}" href="${newPath}" media-type="application/xhtml+xml"/>\n`;
        opfSpine += `<itemref idref="${itemId}"/>\n`;
      }
    }
  }

  // Generate a master OPF file
  const mergedOpf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="uuid_id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Merged EPUB</dc:title>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    ${opfManifest}
  </manifest>
  <spine toc="ncx">
    ${opfSpine}
  </spine>
</package>`;

  newZip.file('merged.opf', mergedOpf);

  const mergedBlob = await newZip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
  return mergedBlob;
};
