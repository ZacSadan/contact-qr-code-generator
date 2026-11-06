// Pure vCard 3.0 builder (no DOM) — unit-tested in tests/vcard.test.js

/** Escape a text value per vCard 3.0 (RFC 2426). */
export function esc(s) {
  return String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** Fold a content line to max 75 octets (UTF-8), never splitting a character. */
export function foldLine(line, eol = '\r\n') {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts = [];
  let cur = '';
  let curBytes = 0;
  let limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (curBytes + b > limit) {
      parts.push(cur);
      cur = '';
      curBytes = 0;
      limit = 74; // continuation lines start with a space
    }
    cur += ch;
    curBytes += b;
  }
  parts.push(cur);
  return parts.join(eol + ' ');
}

const TEL_TYPES = { CELL: 'CELL', WORK: 'WORK,VOICE', HOME: 'HOME,VOICE', MAIN: 'MAIN', FAX: 'WORK,FAX', PAGER: 'PAGER', OTHER: 'VOICE' };
const EMAIL_TYPES = { WORK: 'INTERNET,WORK', HOME: 'INTERNET,HOME', OTHER: 'INTERNET' };
const URL_TYPES = { WORK: 'WORK', HOME: 'HOME' };
const URL_LABELS = { BLOG: 'Blog', PORTFOLIO: 'Portfolio' };
const ADR_TYPES = { WORK: 'WORK', HOME: 'HOME' };

const SOCIAL = {
  LINKEDIN: { label: 'LinkedIn', base: 'https://www.linkedin.com/in/' },
  X: { label: 'X', base: 'https://x.com/' },
  GITHUB: { label: 'GitHub', base: 'https://github.com/' },
  INSTAGRAM: { label: 'Instagram', base: 'https://www.instagram.com/' },
  FACEBOOK: { label: 'Facebook', base: 'https://www.facebook.com/' },
  YOUTUBE: { label: 'YouTube', base: 'https://www.youtube.com/@' },
  TIKTOK: { label: 'TikTok', base: 'https://www.tiktok.com/@' },
  OTHER: { label: 'Profile', base: '' },
};

const IM = {
  TELEGRAM: { label: 'Telegram', scheme: 'x-apple' },
  WHATSAPP: { label: 'WhatsApp', scheme: 'x-apple' },
  SIGNAL: { label: 'Signal', scheme: 'x-apple' },
  SKYPE: { label: 'Skype', scheme: 'skype' },
  TEAMS: { label: 'Teams', scheme: 'x-apple' },
  OTHER: { label: 'Other', scheme: 'x-apple' },
};

/** Turn "jdoe" / "@jdoe" / full URL into a profile URL. */
export function socialUrl(type, value) {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[\w-]+(\.[\w-]+)+\//.test(v)) return 'https://' + v; // "linkedin.com/in/x"
  const s = SOCIAL[type] || SOCIAL.OTHER;
  if (!s.base) return v;
  return s.base + v.replace(/^@/, '');
}

const filled = list => (Array.isArray(list) ? list : []).filter(r => r && String(r.value ?? '').trim());

/**
 * Build a vCard 3.0 string from the model, or null when there is no name.
 * Defaults are tuned for QR codes (LF line endings, no folding = fewer bytes);
 * pass { eol: '\r\n', fold: true } for a spec-strict .vcf file.
 */
export function buildVCard(model, { eol = '\n', fold = false } = {}) {
  const f = {};
  for (const [k, v] of Object.entries(model.fields || {})) f[k] = String(v ?? '').trim();
  const g = k => f[k] || '';

  if (!g('firstName') && !g('lastName')) return null;

  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  lines.push(`N:${esc(g('lastName'))};${esc(g('firstName'))};${esc(g('middleName'))};${esc(g('prefix'))};${esc(g('suffix'))}`);
  const fn = [g('prefix'), g('firstName'), g('middleName'), g('lastName'), g('suffix')].filter(Boolean).join(' ');
  lines.push(`FN:${esc(fn)}`);
  if (g('nickname')) lines.push(`NICKNAME:${esc(g('nickname'))}`);
  if (g('phoneticFirst')) lines.push(`X-PHONETIC-FIRST-NAME:${esc(g('phoneticFirst'))}`);
  if (g('phoneticLast')) lines.push(`X-PHONETIC-LAST-NAME:${esc(g('phoneticLast'))}`);

  if (g('company') || g('department')) lines.push(`ORG:${esc(g('company'))}${g('department') ? ';' + esc(g('department')) : ''}`);
  if (g('jobTitle')) lines.push(`TITLE:${esc(g('jobTitle'))}`);
  if (g('role')) lines.push(`ROLE:${esc(g('role'))}`);

  for (const p of filled(model.phones)) {
    lines.push(`TEL;TYPE=${TEL_TYPES[p.type] || 'VOICE'}:${esc(p.value.trim())}`);
  }
  for (const e of filled(model.emails)) {
    lines.push(`EMAIL;TYPE=${EMAIL_TYPES[e.type] || 'INTERNET'}:${esc(e.value.trim())}`);
  }

  // Custom labels use Apple's "itemN.X-ABLabel" grouping; other apps just see a URL.
  let item = 0;
  for (const u of filled(model.websites)) {
    const value = esc(u.value.trim());
    if (URL_TYPES[u.type]) lines.push(`URL;TYPE=${URL_TYPES[u.type]}:${value}`);
    else if (URL_LABELS[u.type]) {
      item++;
      lines.push(`item${item}.URL:${value}`, `item${item}.X-ABLabel:${URL_LABELS[u.type]}`);
    } else lines.push(`URL:${value}`);
  }
  // Social profiles are written as labelled URLs: works on both iOS and Android.
  for (const s of filled(model.socials)) {
    item++;
    const label = (SOCIAL[s.type] || SOCIAL.OTHER).label;
    lines.push(`item${item}.URL:${esc(socialUrl(s.type, s.value))}`, `item${item}.X-ABLabel:${label}`);
  }
  for (const m of filled(model.ims)) {
    const im = IM[m.type] || IM.OTHER;
    lines.push(`IMPP;X-SERVICE-TYPE=${im.label}:${im.scheme}:${esc(m.value.trim())}`);
  }

  for (const a of model.addresses || []) {
    const parts = ['pobox', 'ext', 'street', 'city', 'region', 'zip', 'country'].map(k => String(a[k] ?? '').trim());
    if (!parts.some(Boolean)) continue;
    const type = ADR_TYPES[a.type] ? `;TYPE=${ADR_TYPES[a.type]}` : '';
    lines.push(`ADR${type}:${parts.map(esc).join(';')}`);
  }

  if (g('birthday')) lines.push(`BDAY:${g('birthday')}`);
  if (g('anniversary')) lines.push(`X-ANNIVERSARY:${g('anniversary')}`);
  if (g('categories')) {
    const cats = g('categories').split(',').map(c => c.trim()).filter(Boolean).map(esc);
    if (cats.length) lines.push(`CATEGORIES:${cats.join(',')}`);
  }
  if (g('timezone')) lines.push(`TZ:${esc(g('timezone'))}`);
  if (g('geo')) {
    const m = g('geo').match(/^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (m) lines.push(`GEO:${m[1]};${m[2]}`);
  }
  if (g('notes')) lines.push(`NOTE:${esc(g('notes'))}`);
  lines.push('END:VCARD');

  return (fold ? lines.map(l => foldLine(l, eol)) : lines).join(eol);
}

/** UTF-8 byte length (what the QR code actually has to store). */
export function utf8Length(s) {
  return new TextEncoder().encode(s).length;
}
