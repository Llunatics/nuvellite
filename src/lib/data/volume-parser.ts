export interface ParsedTitleResult {
  volume: number | null;
  seriesName: string;
  cleanTitle: string;
  isSpecialEdition: boolean;
  editionName: string | null;
}

const EDITION_SUFFIX_REGEX = /\s*[\-–—:+]?\s*\b(?:Special Set|Complete Set|Birthday Set|Limited Edition|Deluxe Edition|Premium Edition|Bundling(?: Set)?|Box Set|Regular|Reguler|Bookpaper|Edisi Khusus|Merchandise|Merch|Bonus|Akrilik|Standee)\b.*$|\s*(?:[\-–—:+]|\()\s*(?:Tamat|End)\s*\)?$/i;

const PREFIX_REGEX = /^(?:Akasha|LC|Level\s*Comics?|Light\s*Comics?|m&c!|Elex|Koloni|Qanza|Komik|Movie\s*Story|[a-zA-Z])\s*[:：\-]\s*|^(?:Manga|Light\s*Novel|Novel)\s*[:：\-]?\s*/i;

export function parseTitleSmart(title: string): ParsedTitleResult {
  const raw = title.trim();

  // Strip brackets: [Special Set], (Novel), etc.
  let t = raw.replace(/\[.*?\]|\(.*?\)/g, '').trim();
  t = t.replace(PREFIX_REGEX, '').trim();

  // Detect edition
  let isSpecialEdition = false;
  let editionName: string | null = null;
  const tLower = raw.toLowerCase();
  if (tLower.includes('special set')) {
    isSpecialEdition = true;
    editionName = 'Special Set';
  } else if (tLower.includes('birthday set')) {
    isSpecialEdition = true;
    editionName = 'Birthday Set';
  } else if (tLower.includes('limited edition') || tLower.includes('limited')) {
    isSpecialEdition = true;
    editionName = 'Limited Edition';
  } else if (tLower.includes('complete set') || tLower.includes('box set')) {
    isSpecialEdition = true;
    editionName = 'Complete Set';
  }

  const tClean = t.replace(EDITION_SUFFIX_REGEX, '').trim().replace(/^[:\-–—]+|[:\-–—]+$/g, '').trim();

  let vol: number | null = null;
  let sname = tClean;

  // 1. Check explicit "Vol.", "Volume", "Jilid", "#"
  const mVol = tClean.match(/(?:(?:\b(?:Vol\.?|Volume|Jilid|Episode|Ep\.?)|#))\s*(\d{1,3})\b/i);
  if (mVol && mVol.index !== undefined) {
    vol = parseInt(mVol[1], 10);
    sname = tClean.slice(0, mVol.index).trim().replace(/[:\-–—+#]+$/, '').trim();
  } else {
    // 2. Check decimal volume like 4.5
    const mDec = tClean.match(/\b(\d+)\.5\b/);
    if (mDec && mDec.index !== undefined) {
      vol = parseInt(mDec[1], 10);
      sname = tClean.slice(0, mDec.index).trim().replace(/[:\-–—+]+$/, '').trim();
    } else {
      // 3. Check delimited format: "Series Name 3 - Subtitle"
      const mDelim = tClean.match(/^(.*?\S)\s+(\d{1,3})\s*[\-–—:]\s*(.*)$/);
      if (mDelim) {
        vol = parseInt(mDelim[2], 10);
        sname = mDelim[1].trim();
      } else {
        // 4. Check trailing volume number: "Series Name 03"
        const mEnd = tClean.match(/^(.*?\S)\s+(\d{1,3})$/);
        if (mEnd) {
          vol = parseInt(mEnd[2], 10);
          sname = mEnd[1].trim();
        } else {
          sname = tClean;
        }
      }
    }
  }

  // Final cleanup of series name
  sname = sname.replace(/\s*[\-–—:]?\s*\b(?:New Edition|Deluxe Edition|Premium Edition|Edisi Khusus)\b.*$/i, '').trim();
  sname = sname.replace(/^[:\-–—]+|[:\-–—]+$/g, '').trim();

  // If sname still has subtitle delimiter, keep main franchise name
  if (sname.includes(' - ') || sname.includes(' : ') || sname.includes(' – ')) {
    const parts = sname.split(/\s*[\-–—:]\s*/);
    if (parts.length >= 2 && parts[0].length >= 3) {
      sname = parts[0].trim();
    }
  }

  return {
    volume: vol,
    seriesName: sname || tClean || title,
    cleanTitle: tClean || title,
    isSpecialEdition,
    editionName,
  };
}
