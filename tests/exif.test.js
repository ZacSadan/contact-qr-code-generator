import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addExifDate, exifDateString } from '../js/exif.js';

// Tiny fake JPEG: SOI, JFIF APP0, then "image data" and EOI
const JFIF = [0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 1, 1, 0, 0, 1, 0, 1, 0, 0];
const jpeg = new Uint8Array([0xFF, 0xD8, ...JFIF, 0xFF, 0xDB, 0x00, 0x03, 0x99, 0xFF, 0xD9]);

/** Read DateTimeOriginal back the way a photo app would. */
function readDateTimeOriginal(bytes) {
  assert.equal(bytes[2], 0xFF); assert.equal(bytes[3], 0xE1);
  // SOI(2) + APP1 marker(2) + length(2) + "Exif\0\0"(6) → TIFF block at 12
  assert.equal(String.fromCharCode(...bytes.subarray(6, 10)), 'Exif');
  const tiff = 12;
  const v = new DataView(bytes.buffer, bytes.byteOffset + tiff);
  const ifd0 = v.getUint32(4, true);
  const n0 = v.getUint16(ifd0, true);
  let exifIfd = 0;
  for (let i = 0; i < n0; i++) if (v.getUint16(ifd0 + 2 + i * 12, true) === 0x8769) exifIfd = v.getUint32(ifd0 + 2 + i * 12 + 8, true);
  const n1 = v.getUint16(exifIfd, true);
  for (let i = 0; i < n1; i++) {
    const e = exifIfd + 2 + i * 12;
    if (v.getUint16(e, true) === 0x9003) {
      const off = v.getUint32(e + 8, true);
      return String.fromCharCode(...bytes.subarray(tiff + off, tiff + off + 19));
    }
  }
  return null;
}

test('share date 19/09/2037 is before the 32-bit seconds limit', () => {
  const share = new Date(2037, 8, 19, 12, 0, 0);
  assert.equal(exifDateString(share), '2037:09:19 12:00:00');
  assert.ok(share.getTime() / 1000 < 2 ** 31, 'Google Photos misreads larger values (2050 showed as 1970)');
});

test('date string format', () => {
  assert.equal(exifDateString(new Date(2050, 0, 1, 12, 0, 0)), '2050:01:01 12:00:00');
});

test('adds a readable DateTimeOriginal and keeps the image data', () => {
  const out = addExifDate(jpeg, new Date(2050, 0, 1, 12, 0, 0));
  assert.equal(readDateTimeOriginal(out), '2050:01:01 12:00:00');
  const segLen = (out[4] << 8) | out[5];
  const restStart = 4 + segLen;
  assert.deepEqual([...out.subarray(restStart)], [0xFF, 0xDB, 0x00, 0x03, 0x99, 0xFF, 0xD9], 'JFIF replaced, data intact');
});

test('works without a JFIF segment and rejects non-JPEG', () => {
  const bare = new Uint8Array([0xFF, 0xD8, 0xFF, 0xD9]);
  assert.equal(readDateTimeOriginal(addExifDate(bare, new Date(2050, 0, 1))), '2050:01:01 00:00:00');
  assert.throws(() => addExifDate(new Uint8Array([1, 2, 3]), new Date()));
});
