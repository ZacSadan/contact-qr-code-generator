// Contact model: creation and normalisation (used for drafts, JSON import, etc.)
import { SINGLE_FIELDS, MULTI_FIELDS, ADDRESS_TYPES, ADDRESS_PARTS, IMAGE_MODES, IMAGE_SIZES, EC_LEVELS } from './fields-schema.js';

export function emptyAddress(type = 'WORK') {
  const a = { type };
  ADDRESS_PARTS.forEach(p => { a[p.key] = ''; });
  return a;
}

export function createEmptyModel() {
  const fields = {};
  SINGLE_FIELDS.forEach(f => { fields[f.key] = ''; });
  return {
    version: 1,
    fields,
    phones: [{ type: 'CELL', value: '' }],
    emails: [{ type: 'WORK', value: '' }],
    websites: [{ type: 'WORK', value: '' }],
    socials: [],
    ims: [],
    addresses: [emptyAddress('WORK')],
    visibleOptional: [],
    image: { mode: 'none', uploadDataUrl: '', font: 'cinzel', palette: 'navy-gold', ring: true, size: 'normal', bg: '' },
    ec: 'auto',
  };
}

const str = v => (typeof v === 'string' ? v : v == null ? '' : String(v));
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

/** Turn any (possibly untrusted / old) object into a valid model. */
export function normalizeModel(raw) {
  const m = createEmptyModel();
  if (!isObj(raw)) return m;

  if (isObj(raw.fields)) {
    SINGLE_FIELDS.forEach(f => { if (f.key in raw.fields) m.fields[f.key] = str(raw.fields[f.key]); });
  }

  for (const def of MULTI_FIELDS) {
    if (!Array.isArray(raw[def.key])) continue;
    m[def.key] = raw[def.key].filter(isObj).map(r => ({
      type: def.types.some(t => t[0] === r.type) ? r.type : def.defaultType,
      value: str(r.value),
    }));
  }

  if (Array.isArray(raw.addresses)) {
    m.addresses = raw.addresses.filter(isObj).map(r => {
      const a = emptyAddress(ADDRESS_TYPES.some(t => t[0] === r.type) ? r.type : 'WORK');
      ADDRESS_PARTS.forEach(p => { a[p.key] = str(r[p.key]); });
      return a;
    });
  }

  if (Array.isArray(raw.visibleOptional)) {
    m.visibleOptional = raw.visibleOptional.filter(k => SINGLE_FIELDS.some(f => f.key === k && f.optional));
  }
  // Optional fields that hold a value are always shown.
  SINGLE_FIELDS.forEach(f => {
    if (f.optional && m.fields[f.key] && !m.visibleOptional.includes(f.key)) m.visibleOptional.push(f.key);
  });

  if (isObj(raw.image)) {
    const img = raw.image;
    if (IMAGE_MODES.includes(img.mode)) m.image.mode = img.mode;
    if (typeof img.uploadDataUrl === 'string' && img.uploadDataUrl.startsWith('data:image/')) m.image.uploadDataUrl = img.uploadDataUrl;
    if (typeof img.font === 'string') m.image.font = img.font;
    if (typeof img.palette === 'string') m.image.palette = img.palette;
    if (typeof img.ring === 'boolean') m.image.ring = img.ring;
    if (IMAGE_SIZES.includes(img.size)) m.image.size = img.size;
    if (typeof img.bg === 'string' && /^#[0-9a-f]{6}$/i.test(img.bg)) m.image.bg = img.bg.toLowerCase();
  }
  if (m.image.mode === 'upload' && !m.image.uploadDataUrl) m.image.mode = 'none';

  if (EC_LEVELS.includes(raw.ec)) m.ec = raw.ec;
  return m;
}
