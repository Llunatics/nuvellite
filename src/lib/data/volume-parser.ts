import domainRules from '@/data/domain-rules.json';

export interface ParsedTitleResult {
  volume: number | null;
  seriesName: string;
  cleanTitle: string;
  isSpecialEdition: boolean;
  editionName: string | null;
}

const TITLE_COUNTER_WORDS = new Set(
  domainRules.titleParsing.titleCounterWords.map((w) => w.toLowerCase())
);

const EDITION_SUFFIX_REGEX =
  /\s*[\-–—:+]?\s*\b(?:Special Set|Complete Set|Birthday Set|Limited Edition|Deluxe Edition|Premium Edition|Bundling(?: Set)?|Box Set|Regular|Reguler|Bookpaper|Edisi Khusus|Merchandise|Merch|Bonus|Akrilik|Standee)\b.*$|\s*(?:[\-–—:+]\s*|\(\s*)(?:Tamat|End)\s*\)?\s*$/i;

const PREFIX_REGEX =
  /^(?:Akasha|LC|Level\s*Comics?|Light\s*Comics?|m&c!|Elex|Koloni|Qanza|Komik|Movie\s*Story)\s*[:：\-]\s*|^(?:A\s+Light\s*Novel|Manga|Light\s*Novel|Novel)\s*[:：\-]?\s*/i;

export function parseTitleSmart(title: string): ParsedTitleResult {
  const raw = (title || '').trim();
  const hasParenBindUp = /\(\s*bind[\s-]?up(?:\s+edition)?\s*\)/i.test(raw);

  // Detect edition before stripping brackets
  let isSpecialEdition = false;
  let editionName: string | null = null;
  const tLower = raw.toLowerCase();
  if (tLower.includes('special set')) {
    isSpecialEdition = true;
    editionName = 'Special Set';
  } else if (tLower.includes('birthday set')) {
    isSpecialEdition = true;
    editionName = 'Birthday Set';
  } else if (tLower.includes('limited edition') || /[\-–—(\[]\s*limited\b/i.test(raw) || /\blimited\s+edition\b/i.test(raw)) {
    isSpecialEdition = true;
    editionName = 'Limited Edition';
  } else if (tLower.includes('complete set') || tLower.includes('box set')) {
    isSpecialEdition = true;
    editionName = 'Complete Set';
  }

  let t = raw.replace(
    /\((?:novel|light\s*novel|manga|komik|omnibus|bind[\s-]?up(?:\s+edition)?|tamat|end|new\s+edition|terbit\s+ulang|cetak\s+ulang|cover\s+baru)\)/gi,
    ''
  ).trim();
  const tNoBrackets = t.replace(/\[.*?\]|\(.*?\)/g, '').trim();
  t = tNoBrackets.length >= 2 ? tNoBrackets : t.replace(/[\[\]()]/g, ' ').trim();

  t = t.replace(PREFIX_REGEX, '').trim();
  const tClean = t
    .replace(EDITION_SUFFIX_REGEX, '')
    .trim()
    .replace(/^[:\-–—]+|[:\-–—]+$/g, '')
    .trim();

  // Protect X-in-1 marker ("4 in 1") so "1" is not misparsed as volume 1
  const xIn1Match = tClean.match(/\b([2-9])\s*(?:[-–])?\s*in\s*(?:[-–])?\s*1\b/i);
  let tWork = tClean;
  if (xIn1Match && xIn1Match.index !== undefined) {
    tWork = `${tClean.slice(0, xIn1Match.index)} ${tClean.slice(xIn1Match.index + xIn1Match[0].length)}`
      .trim()
      .replace(/^[:\-–—]+|[:\-–—]+$/g, '')
      .trim();
  }

  let vol: number | null = null;
  let sname = tWork;

  // 1. Check explicit "Vol.", "Volume", "Jilid", "Episode", "Ep.", or "#"
  const mVol = tWork.match(/(?:(?:\b(?:Vol\.?|Volume|Jilid|Episode|Ep\.?)|#))\s*(\d{1,3})\b/i);
  if (mVol && mVol.index !== undefined) {
    vol = parseInt(mVol[1], 10);
    sname = tWork.slice(0, mVol.index).trim().replace(/[:\-–—+#]+$/, '').trim();
  } else {
    // 2. Check "X of Y" format (e.g. "Jurnal Mukai Usagido 6 of 8")
    const mOf = tWork.match(/^(.*?\S)\s+(\d{1,3})\s+of\s+\d{1,3}\b/i);
    if (mOf) {
      vol = parseInt(mOf[2], 10);
      sname = mOf[1].trim().replace(/[:\-–—]+$/, '').trim();
    } else {
      // 3. Check decimal volume like 4.5
      const mDec = tWork.match(/\b(\d+)\.5\b/);
      if (mDec && mDec.index !== undefined) {
        vol = parseInt(mDec[1], 10);
        sname = tWork.slice(0, mDec.index).trim().replace(/[:\-–—+]+$/, '').trim();
      } else {
        // 4. Check delimited format: "Series Name 3 - Subtitle"
        const mDelim = tWork.match(/^(.*?\S)\s+(\d{1,3})\s*[\-–—:]\s*(.*)$/);
        if (mDelim) {
          const leftWords = mDelim[1].trim();
          const tokens = leftWords.split(/\s+/);
          const lastToken = (tokens[tokens.length - 1] || '').toLowerCase();
          if (TITLE_COUNTER_WORDS.has(lastToken)) {
            if (tokens.length >= 2 && /^\d+$/.test(tokens[tokens.length - 2])) {
              vol = parseInt(mDelim[2], 10);
              sname = leftWords;
            } else {
              sname = `${leftWords} ${mDelim[2]}`;
            }
          } else {
            vol = parseInt(mDelim[2], 10);
            sname = leftWords;
          }
        } else {
          // 5. Check trailing volume number: "Series Name 03"
          const mEnd = tWork.match(/^(.*?\S)\s+(\d{1,3})$/);
          if (mEnd) {
            const leftWords = mEnd[1].trim();
            const tokens = leftWords.split(/\s+/);
            const lastToken = (tokens[tokens.length - 1] || '').toLowerCase();
            if (TITLE_COUNTER_WORDS.has(lastToken)) {
              if (tokens.length >= 2 && /^\d+$/.test(tokens[tokens.length - 2])) {
                vol = parseInt(mEnd[2], 10);
                sname = leftWords;
              } else {
                sname = `${leftWords} ${mEnd[2]}`;
              }
            } else {
              vol = parseInt(mEnd[2], 10);
              sname = leftWords;
            }
          } else {
            sname = tWork;
          }
        }
      }
    }
  }

  sname = sname.replace(/\s*[\-–—:]?\s*\b(?:New Edition|Deluxe Edition|Premium Edition|Edisi Khusus)\b.*$/i, '').trim();
  sname = sname.replace(/^[:\-–—]+|[:\-–—]+$/g, '').trim();

  if (hasParenBindUp && !/\bbind[\s-]?up\b/i.test(sname)) {
    sname = `${sname} Bind Up`.trim();
  }
  sname = sname.replace(/\bBind[\s-]?Up\s+Edition\b/gi, 'Bind Up');
  sname = sname.replace(/\bShaman\s+King\s+Complete$/i, 'Shaman King Complete Edition');

  return {
    volume: vol,
    seriesName: sname || tClean || raw,
    cleanTitle: tClean || raw,
    isSpecialEdition,
    editionName,
  };
}