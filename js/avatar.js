// Initials monogram generator, e.g. "Zac Sadan" -> "ZS" in an elegant serif.

// Latin display font first, then a matching Hebrew font for Hebrew initials.
export const AVATAR_FONTS = [
  { id: 'cinzel', label: 'Cinzel — classic', family: '"Cinzel", "Frank Ruhl Libre"', weight: 600 },
  { id: 'cormorant', label: 'Cormorant — elegant', family: '"Cormorant Garamond", "Frank Ruhl Libre"', weight: 600 },
  { id: 'playfair', label: 'Playfair — editorial', family: '"Playfair Display", "Frank Ruhl Libre"', weight: 600 },
  { id: 'inter', label: 'Inter — modern', family: '"Inter", "Heebo"', weight: 600 },
];

export const AVATAR_PALETTES = [
  { id: 'navy-gold', label: 'Navy & gold', bg: ['#0b1a3a', '#1d3266'], fg: ['#f6e3a1', '#c9a13b'], ring: 'rgba(214,178,90,0.8)', shadow: true },
  { id: 'ivory-ink', label: 'Ivory & ink', bg: ['#fbf8f1', '#ece3d0'], fg: ['#1b1b1f', '#3a3a42'], ring: 'rgba(27,27,31,0.55)' },
  { id: 'charcoal-silver', label: 'Charcoal & silver', bg: ['#1c2026', '#363d45'], fg: ['#ffffff', '#b9c1ca'], ring: 'rgba(220,225,230,0.55)', shadow: true },
  { id: 'indigo', label: 'Indigo', bg: ['#3730a3', '#7c3aed'], fg: ['#ffffff', '#e0e7ff'], ring: 'rgba(255,255,255,0.6)', shadow: true },
  { id: 'emerald', label: 'Emerald & cream', bg: ['#04382c', '#0b5e49'], fg: ['#f8f1dc', '#e2d09c'], ring: 'rgba(240,226,180,0.65)', shadow: true },
  { id: 'burgundy', label: 'Burgundy & champagne', bg: ['#45091a', '#7a1630'], fg: ['#fbecd2', '#e3c48f'], ring: 'rgba(243,214,160,0.65)', shadow: true },
];

const firstChar = s => {
  const ch = Array.from(String(s || '').trim())[0];
  return ch ? ch.toLocaleUpperCase('en') : '';
};

/** "Zac" + "Sadan" -> "ZS"; "Mary Ann" + "" -> "MA"; "" + "" -> "". */
export function getInitials(first, last) {
  const f = String(first || '').trim();
  const l = String(last || '').trim();
  if (f && l) return firstChar(f) + firstChar(l.split(/\s+/).pop());
  const words = (f || l).split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  if (words.length === 1) return firstChar(words[0]);
  return firstChar(words[0]) + firstChar(words[words.length - 1]);
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = rgb => '#' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
/** Relative luminance (WCAG), 0 = black, 1 = white. */
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Palette with an optional custom background colour. The text colour is
 * chosen automatically so the initials stay readable on the new background.
 */
export function resolvePalette(paletteId, bg) {
  const pal = AVATAR_PALETTES.find(p => p.id === paletteId) || AVATAR_PALETTES[0];
  if (!bg || !/^#[0-9a-f]{6}$/i.test(bg)) return pal;
  const light = luminance(bg) > 0.4;
  const darker = toHex(hexToRgb(bg).map(v => v * 0.78));
  const palIsDark = luminance(pal.bg[0]) < 0.4;
  const fg = light ? ['#1b1b1f', '#3a3a42'] : palIsDark ? pal.fg : ['#ffffff', '#e5e7eb'];
  return {
    ...pal,
    bg: [bg, darker],
    fg,
    ring: light ? 'rgba(27,27,31,0.55)' : palIsDark ? pal.ring : 'rgba(255,255,255,0.6)',
    shadow: !light,
  };
}

/** Returns a square canvas with the monogram. */
export async function generateAvatar({ initials, fontId, paletteId, bg = '', ring = true, size = 512 }) {
  const font = AVATAR_FONTS.find(f => f.id === fontId) || AVATAR_FONTS[0];
  const pal = resolvePalette(paletteId, bg);
  try { await document.fonts.load(`${font.weight} 100px ${font.family}`, initials); } catch { /* fallback font */ }

  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');

  // Background: diagonal gradient + soft top light
  const bgGrad = ctx.createLinearGradient(0, 0, size, size);
  bgGrad.addColorStop(0, pal.bg[0]);
  bgGrad.addColorStop(1, pal.bg[1]);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);
  const glow = ctx.createRadialGradient(size * 0.3, size * 0.2, 0, size * 0.3, size * 0.2, size * 0.9);
  glow.addColorStop(0, 'rgba(255,255,255,0.12)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  if (ring) {
    ctx.strokeStyle = pal.ring;
    ctx.lineWidth = size * 0.012;
    ctx.beginPath(); ctx.arc(size / 2, size / 2, size * 0.41, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = size * 0.004;
    ctx.beginPath(); ctx.arc(size / 2, size / 2, size * 0.385, 0, Math.PI * 2); ctx.stroke();
  }

  // Draw right-to-left scripts (Hebrew, Arabic) in visual order: first initial on the right.
  const rtl = /[֐-ࣿ]/.test(initials);
  const chars = rtl ? Array.from(initials).reverse() : Array.from(initials);
  if (!chars.length) return c;
  const family = `${font.family}, Georgia, "Times New Roman", serif`;
  let fontSize = size * (chars.length > 1 ? 0.36 : 0.46);
  const maxW = size * (ring ? 0.56 : 0.7);
  const measure = () => {
    ctx.font = `${font.weight} ${fontSize}px ${family}`;
    const widths = chars.map(ch => ctx.measureText(ch).width);
    const gap = fontSize * 0.06;
    return { widths, gap, total: widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1) };
  };
  let m = measure();
  if (m.total > maxW) { fontSize *= maxW / m.total; m = measure(); }

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.direction = 'ltr';
  const tm = ctx.measureText(initials);
  const asc = tm.actualBoundingBoxAscent || fontSize * 0.7;
  const desc = tm.actualBoundingBoxDescent || 0;
  const baseline = size / 2 + (asc - desc) / 2;

  const fg = ctx.createLinearGradient(0, baseline - asc, 0, baseline + desc);
  fg.addColorStop(0, pal.fg[0]);
  fg.addColorStop(1, pal.fg[1]);
  ctx.fillStyle = fg;
  if (pal.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = size * 0.015;
    ctx.shadowOffsetY = size * 0.006;
  }
  let x = (size - m.total) / 2;
  chars.forEach((ch, i) => {
    ctx.fillText(ch, x, baseline);
    x += m.widths[i] + m.gap;
  });
  return c;
}
