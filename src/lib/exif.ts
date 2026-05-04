import exifr from 'exifr';

export interface ExifData {
  make: string | null;
  model: string | null;
  lat: number | null;
  lon: number | null;
  takenAt: Date | null;
  focalLength: number | null;
}

export async function extractExif(buffer: Buffer): Promise<ExifData | null> {
  try {
    const parsed = await exifr.parse(buffer, { gps: true, exif: true, ifd0: { pick: ['Make', 'Model'] } });
    if (!parsed) return null;

    const make = typeof parsed.Make === 'string' ? parsed.Make.trim() : null;
    const model = typeof parsed.Model === 'string' ? parsed.Model.trim() : null;
    const lat = typeof parsed.latitude === 'number' && isFinite(parsed.latitude) ? parsed.latitude : null;
    const lon = typeof parsed.longitude === 'number' && isFinite(parsed.longitude) ? parsed.longitude : null;

    const takenRaw = parsed.DateTimeOriginal ?? parsed.CreateDate ?? parsed.ModifyDate ?? null;
    let takenAt: Date | null = null;
    if (takenRaw instanceof Date && !isNaN(takenRaw.getTime())) {
      takenAt = takenRaw;
    } else if (typeof takenRaw === 'string') {
      const d = new Date(takenRaw);
      if (!isNaN(d.getTime())) takenAt = d;
    }

    const focalLength = typeof parsed.FocalLength === 'number' && isFinite(parsed.FocalLength)
      ? parsed.FocalLength
      : null;

    return { make, model, lat, lon, takenAt, focalLength };
  } catch {
    return null;
  }
}
