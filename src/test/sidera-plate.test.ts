import { describe, expect, it } from 'vitest';
import { SET_001_CARDS } from '@/lib/sets/set-001';
import { backSvg, cardFace, frameSvg } from '@/lib/sidera/plate/frame';
import { FULL_ART, SURVEYED, plateFile, plateUrl, surveyPlate } from '@/lib/sidera/plate/objects';

const ids = (svg: string) => [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
const refs = (svg: string) => [...svg.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)].map((m) => m[1] ?? m[2]);

describe('survey plates', () => {
  it('draws the four surveyed cards, and nothing for the rest', () => {
    expect([...SURVEYED].sort()).toEqual(['M31', 'M87', 'MOON', 'SATURN']);
    expect(surveyPlate('JUPITER', 'x')).toBeNull();
  });

  it('draws the same plate every time, so the server and the browser agree', () => {
    for (const d of SURVEYED) {
      const a = surveyPlate(d, 'p1');
      const b = surveyPlate(d, 'p2');
      expect(a?.object.replaceAll('p2', 'p1')).toBe(b?.object.replaceAll('p2', 'p1'));
    }
  });

  it('prefixes every id and only points at ids it defines', () => {
    for (const d of SURVEYED) {
      const p = surveyPlate(d, 'q')!;
      for (const layer of [p.sky, p.object, p.survey]) {
        const own = new Set(ids(layer));
        for (const id of own) expect(id.startsWith('q')).toBe(true);
        for (const ref of refs(layer)) expect(own.has(ref)).toBe(true);
        expect(layer).not.toMatch(/NaN|undefined/);
      }
    }
  });

  it('runs M87 to the edge of the card and keeps the others in a window', () => {
    expect(surveyPlate('M87', 'r')?.full).toBe(true);
    expect(surveyPlate('SATURN', 'r')?.full).toBe(false);
  });
});

describe('card frame', () => {
  it('frames every card in the set, front and back', () => {
    for (const { seed } of SET_001_CARDS) {
      const face = cardFace(seed.designation, 7, false)!;
      const front = frameSvg(face, 'f');
      const back = backSvg(face, 'b');
      expect(front).toContain(seed.name.replace(/&/g, '&amp;').replace(/</g, '&lt;'));
      expect(front).toContain('>007<');
      expect(back).toContain('edition 007 of');
      expect(front + back).not.toMatch(/NaN|undefined/);
      expect(front + back).not.toMatch(/\bNFT\b|\bmint/i);
    }
  });

  it('prints the edition size where no edition is held', () => {
    const face = cardFace('SATURN', null, false)!;
    expect(frameSvg(face, 'f')).toContain('>EDITIONS<');
    expect(backSvg(face, 'b')).toContain('One of 30 editions.');
  });

  it('never promises a photograph of a fiction card', () => {
    const fiction = SET_001_CARDS.find(({ seed }) => seed.objectType.toLowerCase().startsWith('fiction'))!;
    const back = backSvg(cardFace(fiction.seed.designation, null, false)!, 'b');
    expect(back).toContain('exists in no sky');
    expect(back).not.toContain('receives the image');
  });
});

describe('plate files', () => {
  it('serves sky and object as standalone SVG documents with no text in them', () => {
    for (const d of SURVEYED) {
      for (const l of ['sky', 'object'] as const) {
        const svg = plateFile(d, l)!;
        expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="582"')).toBe(true);
        expect(svg).not.toContain('<text');
      }
    }
    expect(plateFile('JUPITER', 'sky')).toBeNull();
    expect(plateUrl('SATURN', 'object')).toBe('/cards/plate/SATURN-object.svg');
  });

  it('knows which cards run to the edge without drawing them', () => {
    for (const d of SURVEYED) expect(FULL_ART.has(d)).toBe(surveyPlate(d, 'z')!.full);
  });
});
