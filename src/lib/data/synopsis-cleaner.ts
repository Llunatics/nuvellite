/**
 * Synopsis Cleaner & Narrative Extractor for Nuvellite
 *
 * Scraped descriptions from Gramedia and publishers often contain:
 * - "Keunggulan Buku" / "Selling Point"
 * - Generic boilerplate ("Pernahkah Anda terpikir...", "Di antara jenis buku lainnya...")
 * - Physical specifications (ISBN, ukuran, jumlah halaman)
 * - Bundling / Special set details ("Terdiri dari: ...", "Pilihan Edisi & Set Resmi: ...")
 * - Marketing / shopping CTAs ("Yuk segera dapatkan...")
 *
 * This module extracts ONLY the clean narrative story synopsis (premise, characters, setting, conflict).
 */

export function cleanStorySynopsis(raw?: string): string {
  if (!raw || typeof raw !== 'string') return '';

  let text = raw.trim();

  // 1. If text starts with a "SINOPSIS" header, remove it
  text = text.replace(/^(?:SINOPSIS|Sinopsis(?:\s+Buku)?)\s*[:\n\-—]+\s*/i, '');

  // 2. Check if a later section starts with "Sinopsis Buku:" or "Sinopsis:" (when boilerplate was placed at the start)
  const lateSinopsisMatch = text.match(/\n\s*(?:Sinopsis(?:\s+Buku)?)\s*[:\-—]+\s*([\s\S]+)/i);
  if (lateSinopsisMatch && lateSinopsisMatch[1]) {
    // Check if the preceding text was boilerplate
    const beforeText = text.substring(0, text.indexOf(lateSinopsisMatch[0]));
    if (
      beforeText.includes('Di antara jenis buku lainnya') ||
      beforeText.includes('Pernahkah Anda terpikir') ||
      beforeText.includes('Selling Point')
    ) {
      text = lateSinopsisMatch[1].trim();
    }
  }

  // 3. Cut off at sections that mark the end of the narrative synopsis
  const cutoffMarkers = [
    /\n\s*Keunggulan(?:\s+Buku)?\s*[:\-—]/i,
    /\n\s*Selling\s+Point\s*[:\-—]/i,
    /\n\s*Profil\s+Penulis\s*[:\-—]/i,
    /\n\s*Tentang\s+Penulis\s*[:\-—]/i,
    /\n\s*Deskripsi\s+Buku\s*[:\-—]/i,
    /\n\s*Detail\s+Spesifikasi\s*[:\-—]/i,
    /\n\s*Spesifikasi(?:\s+Produk)?\s*[:\-—]/i,
    /\n\s*Info\s+Tambahan\s*[:\-—]/i,
    /\n\s*Pilihan\s+Edisi\s*&\s*Set\s+Resmi\s*[:\-—]/i,
    /\n\s*Terdiri\s+dari\s*[:\-—]/i,
    /\n\s*\*{3,}/, // *** or ******
    /\n\s*_{3,}/,
    /\n\s*-{3,}/,
    /\n\s*Pernahkah\s+Anda\s+terpikir/i,
    /\n\s*Di\s+antara\s+jenis\s+buku\s+lainnya/i,
    /\n\s*Untuk\s+membangun\s+kebiasaan\s+membaca/i,
    /\n\s*Yuk\s+(?:segera\s+)?dapatkan/i,
    /\n\s*Jangan\s+lewatkan\s+cerita\s+seru/i,
    /\n\s*Bagi\s+penggemar\s+drama\s+yang\s+menyayat\s+hati/i,
    /\n\s*M&C!\s+Publishing\s+adalah\s+penerbit\s+di\s+bawah/i,
  ];

  for (const marker of cutoffMarkers) {
    const match = text.search(marker);
    if (match !== -1) {
      text = text.substring(0, match).trim();
    }
  }

  // 4. Remove standalone physical spec lines or shopping lines that might still be present
  const lines = text.split('\n');
  const filteredLines = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return true; // keep paragraph breaks

    // Filter out spec lines
    if (
      /^(?:Judul\s+(?:m&c|elex|pgi)|Ukuran|Japanese\s+binding|Jumlah\s+halaman|Format|ISBN|Penerbit|Tanggal\s+Terbit|Berat|Lebar|Panjang|Bahasa)\b/i.test(
        trimmed
      )
    ) {
      return false;
    }
    // Filter out marketing / promo sentences
    if (/^Yuk\s+(?:segera\s+)?dapatkan/i.test(trimmed)) return false;
    if (/^Jangan\s+sampai\s+kehabisan/i.test(trimmed)) return false;
    if (/^Pilihan\s+Edisi\s*&/i.test(trimmed)) return false;

    return true;
  });

  text = filteredLines.join('\n');

  // 5. Clean up redundant empty lines
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return text;
}

/**
 * Returns a concise preview of the synopsis along with an indicator
 * if the synopsis is long enough to warrant an expandable toggle.
 */
export function getSynopsisPreview(
  cleanedText: string,
  maxLength: number = 260
): { preview: string; isLong: boolean } {
  if (!cleanedText) {
    return { preview: '', isLong: false };
  }

  if (cleanedText.length <= maxLength) {
    return { preview: cleanedText, isLong: false };
  }

  // Find a natural sentence or word boundary before maxLength
  const truncated = cleanedText.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('. ');
  const lastQuestion = truncated.lastIndexOf('? ');
  const lastExclamation = truncated.lastIndexOf('! ');
  const bestSentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclamation);

  if (bestSentenceEnd > maxLength * 0.55) {
    return {
      preview: cleanedText.substring(0, bestSentenceEnd + 1).trim(),
      isLong: true,
    };
  }

  // Fallback to word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.6) {
    return {
      preview: cleanedText.substring(0, lastSpace).trim() + '...',
      isLong: true,
    };
  }

  return {
    preview: truncated.trim() + '...',
    isLong: true,
  };
}
