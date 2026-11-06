// QR drawing on canvas — ported from the original app, including the
// "blended" centre-image technique (image + halftone module dots).

/** Max bytes in Byte mode for QR version 40, per error-correction level. */
export const MAX_BYTES = { L: 2953, M: 2331, Q: 1663, H: 1273 };

export const QR_COLOR = '#0f172a';

function lib() {
  const qrcode = globalThis.qrcode;
  if (!qrcode) throw new Error('qrcode-generator library not loaded');
  // UTF-8 so Hebrew, Arabic and other non-Latin characters work
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
  return qrcode;
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/** drawImage with "object-fit: cover" behaviour (no stretching). */
function drawCover(ctx, img, x, y, w, h) {
  const sw = img.naturalWidth || img.width;
  const sh = img.naturalHeight || img.height;
  const scale = Math.max(w / sw, h / sh);
  const cw = w / scale;
  const ch = h / scale;
  ctx.drawImage(img, (sw - cw) / 2, (sh - ch) / 2, cw, ch, x, y, w, h);
}

/** Share of the QR width covered by a centre image, per size option. */
export const LOGO_REGION = { normal: 0.32, large: 0.42 };

/** Is (r, c) part of one of the three finder patterns (incl. separator)? */
function isFinder(r, c, n) {
  return (r < 8 && c < 8) || (r < 8 && c >= n - 8) || (r >= n - 8 && c < 8);
}

/** Draw the 3 finder patterns; `colorAt(r, c)` returns the dark colour for a corner. */
function drawFinders(ctx, n, quiet, cell, colorAt = () => QR_COLOR) {
  for (const [fr, fc] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
    const x = (fc + quiet) * cell;
    const y = (fr + quiet) * cell;
    const dark = colorAt(fr + 3, fc + 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - cell, y - cell, cell * 9, cell * 9); // separator
    ctx.fillStyle = dark;
    ctx.fillRect(x, y, cell * 7, cell * 7);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + cell, y + cell, cell * 5, cell * 5);
    ctx.fillStyle = dark;
    ctx.fillRect(x + cell * 2, y + cell * 2, cell * 3, cell * 3);
  }
}

// ----- colour helpers for "full" mode -----
const lin = v => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const css = ([r, g, b]) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
const DARK_MAX = 0.07;  // luminance ceiling for dark modules
const LIGHT_MIN = 0.5;  // luminance floor for light modules (≈ 4.6:1 contrast)

/** Same hue, darkened until it is dark enough to read as a "dark" module. */
function asDark(rgb) {
  let c = rgb;
  for (let i = 0; i < 40 && lum(c) > DARK_MAX; i++) c = c.map(v => v * 0.88);
  return c;
}
/** Same hue, lightened (mixed with white) until it reads as a "light" module. */
function asLight(rgb) {
  let c = rgb;
  for (let i = 0; i < 40 && lum(c) < LIGHT_MIN; i++) c = c.map(v => v + (255 - v) * 0.12);
  return c;
}

/**
 * "Full" mode: the image spreads over the whole code. Every module keeps
 * its normal square shape, but takes its colour from the image underneath:
 * dark modules get a deep shade of that colour, light modules a pale tint.
 * The picture shows through as colour while the dark/light contrast that
 * scanners read stays guaranteed. Finder patterns stay solid.
 */
function renderFull(ctx, qr, modules, quiet, cell, size, logo) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // sample the image: one averaged pixel per module
  const s = document.createElement('canvas');
  s.width = s.height = modules;
  const sctx = s.getContext('2d', { willReadFrequently: true });
  sctx.imageSmoothingQuality = 'high';
  drawCover(sctx, logo, 0, 0, modules, modules);
  const px = sctx.getImageData(0, 0, modules, modules).data;

  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      if (isFinder(r, c, modules)) continue;
      const i = (r * modules + c) * 4;
      const rgb = [px[i], px[i + 1], px[i + 2]];
      ctx.fillStyle = css(qr.isDark(r, c) ? asDark(rgb) : asLight(rgb));
      ctx.fillRect((c + quiet) * cell, (r + quiet) * cell, cell + 0.5, cell + 0.5);
    }
  }
  drawFinders(ctx, modules, quiet, cell, (r, c) => {
    const i = (r * modules + c) * 4;
    return css(asDark([px[i], px[i + 1], px[i + 2]]));
  });
}

/**
 * Render `text` as a QR code into `canvas`.
 * logoSize: 'normal' | 'large' (centre image) | 'full' (behind the whole code).
 * Throws when the data does not fit into a single QR code.
 */
export function renderQR(canvas, text, { ec = 'H', logo = null, logoSize = 'normal', size = 1024 } = {}) {
  const qr = lib()(0, ec);
  qr.addData(text, 'Byte');
  qr.make();

  const ctx = canvas.getContext('2d');
  const modules = qr.getModuleCount();
  const quiet = 4;
  const cell = size / (modules + quiet * 2);

  canvas.width = size;
  canvas.height = size;

  if (logo && logoSize === 'full') {
    renderFull(ctx, qr, modules, quiet, cell, size, logo);
    return { modules, version: (modules - 17) / 4 };
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = QR_COLOR;
  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      if (qr.isDark(r, c)) ctx.fillRect((c + quiet) * cell, (r + quiet) * cell, cell + 0.5, cell + 0.5);
    }
  }

  if (logo) {
    const region = size * (LOGO_REGION[logoSize] || LOGO_REGION.normal);
    const lx = (size - region) / 2;

    // 1. Image at full opacity so it stays clearly recognisable
    ctx.save();
    roundRect(ctx, lx, lx, region, region, region * 0.1);
    ctx.clip();
    drawCover(ctx, logo, lx, lx, region, region);
    ctx.restore();

    // 2. Re-stamp module centres as small halftone dots so the code stays
    //    scannable (scanners sample module centres).
    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        const cx = (c + quiet + 0.5) * cell;
        const cy = (r + quiet + 0.5) * cell;
        if (cx > lx && cx < lx + region && cy > lx && cy < lx + region) {
          const dark = qr.isDark(r, c);
          ctx.fillStyle = dark ? QR_COLOR : 'rgba(255,255,255,0.6)';
          ctx.beginPath();
          ctx.arc(cx, cy, cell * (dark ? 0.27 : 0.24), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  return { modules, version: (modules - 17) / 4 };
}
