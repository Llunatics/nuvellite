import { describe, it, expect } from 'vitest';
import { parseTitleSmart } from '../src/lib/data/volume-parser';

describe('Robust Volume Parser', () => {
  it('should parse standard volume formats', () => {
    expect(parseTitleSmart('Frieren: Beyond Journey\'s End Vol. 11').volume).toBe(11);
    expect(parseTitleSmart('Jujutsu Kaisen Volume 24').volume).toBe(24);
    expect(parseTitleSmart('Spy x Family Vol 12').volume).toBe(12);
    expect(parseTitleSmart('Demon Slayer: Kimetsu no Yaiba Vol.08').volume).toBe(8);
    expect(parseTitleSmart('One Piece Jilid 105').volume).toBe(105);
    expect(parseTitleSmart('Chainsaw Man #14').volume).toBe(14);
  });

  it('should correctly handle titles with numbers without extracting phantom volumes', () => {
    const centuryBoys = parseTitleSmart('20th Century Boys Vol. 3');
    expect(centuryBoys.volume).toBe(3);
    expect(centuryBoys.seriesName).toBe('20th Century Boys');

    const fiveCm = parseTitleSmart('5 Centimeters per Second');
    expect(fiveCm.volume).toBeNull();
    expect(fiveCm.seriesName).toBe('5 Centimeters per Second');

    const sevenDays = parseTitleSmart('Seven Days 02');
    expect(sevenDays.volume).toBe(2);
  });

  it('should parse decimal volumes (e.g. 4.5)', () => {
    const res = parseTitleSmart('Classroom of the Elite Vol. 4.5');
    expect(res.volume).toBe(4);
  });

  it('should clean edition suffixes and detect special edition variants', () => {
    const special = parseTitleSmart('Alya Sometimes Hides Her Feelings in Russian 5 - Special Set');
    expect(special.volume).toBe(5);
    expect(special.isSpecialEdition).toBe(true);
    expect(special.editionName).toBe('Special Set');

    const limited = parseTitleSmart('Blue Lock 25 Limited Edition');
    expect(limited.volume).toBe(25);
    expect(limited.isSpecialEdition).toBe(true);
    expect(limited.editionName).toBe('Limited Edition');

    const tamat = parseTitleSmart('Tokyo Revengers Vol. 31 - Tamat');
    expect(tamat.volume).toBe(31);
    expect(tamat.seriesName).toBe('Tokyo Revengers');
  });
});
