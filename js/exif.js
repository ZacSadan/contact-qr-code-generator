// Minimal EXIF writer: stamps a "date taken" into a JPEG so photo apps
// (e.g. Google Photos) sort it by that date. Pure — unit-tested.

/** "2037:09:19 12:00:00" */
export function exifDateString(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}:${p(d.getMonth() + 1)}:${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Build an APP1 "Exif" segment with DateTime, DateTimeOriginal and DateTimeDigitized. */
function exifSegment(dateStr) {
  const tiff = new Uint8Array(88);
  const v = new DataView(tiff.buffer);
  const DATA = 68; // offset of the date string inside the TIFF block
  // TIFF header, little endian, IFD0 at 8
  tiff.set([0x49, 0x49], 0); v.setUint16(2, 42, true); v.setUint32(4, 8, true);
  // IFD0: DateTime (0x0132) + Exif IFD pointer (0x8769)
  v.setUint16(8, 2, true);
  entry(v, 10, 0x0132, 2, 20, DATA);
  entry(v, 22, 0x8769, 4, 1, 38);
  v.setUint32(34, 0, true);
  // Exif IFD at 38: DateTimeOriginal (0x9003) + DateTimeDigitized (0x9004)
  v.setUint16(38, 2, true);
  entry(v, 40, 0x9003, 2, 20, DATA);
  entry(v, 52, 0x9004, 2, 20, DATA);
  v.setUint32(64, 0, true);
  for (let i = 0; i < 19; i++) tiff[DATA + i] = dateStr.charCodeAt(i);
  tiff[DATA + 19] = 0;

  const seg = new Uint8Array(4 + 6 + tiff.length);
  seg.set([0xFF, 0xE1], 0);
  new DataView(seg.buffer).setUint16(2, 2 + 6 + tiff.length); // big endian length
  seg.set([0x45, 0x78, 0x69, 0x66, 0, 0], 4); // "Exif\0\0"
  seg.set(tiff, 10);
  return seg;
}

function entry(v, off, tag, type, count, value) {
  v.setUint16(off, tag, true);
  v.setUint16(off + 2, type, true);
  v.setUint32(off + 4, count, true);
  v.setUint32(off + 8, value, true);
}

/**
 * Return a copy of `jpeg` (Uint8Array) with an EXIF date. The JFIF APP0
 * segment, if present, is replaced so EXIF sits right after SOI.
 */
export function addExifDate(jpeg, date) {
  if (jpeg[0] !== 0xFF || jpeg[1] !== 0xD8) throw new Error('not a JPEG');
  let rest = 2;
  if (jpeg[2] === 0xFF && jpeg[3] === 0xE0) rest = 4 + ((jpeg[4] << 8) | jpeg[5]); // skip JFIF APP0
  const seg = exifSegment(exifDateString(date));
  const out = new Uint8Array(2 + seg.length + jpeg.length - rest);
  out.set([0xFF, 0xD8], 0);
  out.set(seg, 2);
  out.set(jpeg.subarray(rest), 2 + seg.length);
  return out;
}
