import data from './photos.json';

/**
 * The photograph behind each card: a Wikimedia Commons file, public domain or
 * CC BY, cropped by scripts/stellar-plates/photos.mjs into public/cards/photo.
 * Illustrations are official artist's impressions, credited as such.
 */
export type CardPhoto = {
  file: string;
  license: string;
  credit: string;
  kind: 'photo' | 'illustration';
  focus?: string;
  zoom?: number;
};

export const PHOTOS = data as Record<string, CardPhoto>;
