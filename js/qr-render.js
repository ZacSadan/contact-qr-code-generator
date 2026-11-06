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

function drawFinders(ctx, n, quiet, cell) {
  for (const [fr, fc] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
    const x = (fc + quiet) * cell;
    const y = (fr + quiet) * cell;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - cell, y - cell, cell * 9, cell * 9); // separator
    ctx.fillStyle = QR_COLOR;
    ctx.fillRect(x, y, cell * 7, cell * 7);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + cell, y + cell, cell * 5, cell * 5);
    ctx.fillStyle = QR_COLOR;
    ctx.fillRect(x + cell * 2, y + cell * 2, cell * 3, cell * 3);
  }
}

/**
 * "Full" mode: the image sits behind the whole code. It is faded so the
 * code keeps contrast, every module becomes a dot, and the three finder
 * patterns stay solid so cameras can lock on.
 */
function renderFull(ctx, qr, modules, quiet, cell, size, logo) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  const x0 = quiet * cell;
  const span = modules * cell;
  ctx.save();
  roundRect(ctx, x0, x0, span, span, cell * 1.5);
  ctx.clip();
  ctx.globalAlpha = 0.5;
  drawCover(ctx, logo, x0, x0, span, span);
  ctx.restore();

  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      if (isFinder(r, c, modules)) continue;
      const dark = qr.isDark(r, c);
      ctx.fillStyle = dark ? QR_COLOR : '#ffffff';
      if (r === 6 || c === 6) {
        // timing patterns: solid squares help cameras find the grid
        ctx.fillRect((c + quiet) * cell, (r + quiet) * cell, cell + 0.5, cell + 0.5);
        continue;
      }
      // big dots so they survive camera downscaling; image shows in the gaps
      ctx.beginPath();
      ctx.arc((c + quiet + 0.5) * cell, (r + quiet + 0.5) * cell, cell * (dark ? 0.43 : 0.36), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  drawFinders(ctx, modules, quiet, cell);
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
