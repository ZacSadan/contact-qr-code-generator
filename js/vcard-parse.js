// vCard (.vcf) parser → contact model. Handles vCard 2.1 / 3.0 / 4.0 as
// exported by this app, Google Contacts, iPhone, Android and Outlook.
// Pure (no DOM) — unit-tested in tests/vcard-parse.test.js
import { createEmptyModel, normalizeModel, emptyAddress } from './state.js';

/** Split on an unescaped separator. */
function splitEsc(value, sep) {
  const out = [];
  let cur = '';
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === '\\' && i + 1 < value.length) { cur += ch + value[++i]; continue; }
    if (ch === sep) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

export function unescapeText(s) {
  // also "\:" — Google Contacts escapes colons in URLs (https\://…)
  return s.replace(/\\([\\;,:nN])/g, (_, c) => (c === 'n' || c === 'N' ? '\n' : c));
}

function decodeQP(s, charset = 'utf-8') {
  const bytes = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '=' && /^[0-9A-F]{2}$/i.test(s.slice(i + 1, i + 3))) { bytes.push(parseInt(s.slice(i + 1, i + 3), 16)); i += 2; }
    else bytes.push(s.charCodeAt(i) & 0xff);
  }
  try { return new TextDecoder(charset).decode(new Uint8Array(bytes)); } catch { return new TextDecoder().decode(new Uint8Array(bytes)); }
}

/** Unfold lines (RFC folding + vCard 2.1 quoted-printable soft breaks). */
function toLines(text) {
  const raw = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  const lines = [];
  for (const line of raw) {
    const prev = lines.length - 1;
    if (prev >= 0 && /^[ \t]/.test(line)) { lines[prev] += line.slice(1); continue; }
    if (prev >= 0 && /QUOTED-PRINTABLE/i.test(lines[prev].split(':')[0]) && lines[prev].endsWith('=')) {
      lines[prev] = lines[prev].slice(0, -1) + line;
      continue;
    }
    lines.push(line);
  }
  return lines;
}

function parseLine(line) {
  const colon = line.indexOf(':');
  if (colon < 0) return null;
  const head = line.slice(0, colon);
  let value = line.slice(colon + 1);
  const parts = head.split(';');
  const nameFull = parts.shift();
  const dot = nameFull.indexOf('.');
  const group = dot >= 0 ? nameFull.slice(0, dot).toLowerCase() : '';
  const name = (dot >= 0 ? nameFull.slice(dot + 1) : nameFull).toUpperCase();
  const types = new Set();
  const params = {};
  for (const p of parts) {
    const eq = p.indexOf('=');
    if (eq < 0) { types.add(p.toLowerCase()); continue; } // vCard 2.1 bare type
    const k = p.slice(0, eq).toUpperCase();
    const v = p.slice(eq + 1).replace(/^"|"$/g, '');
    if (k === 'TYPE') v.split(',').forEach(t => types.add(t.toLowerCase()));
    else params[k] = v;
  }
  if (params.PREF) types.add('pref');
  const enc = (params.ENCODING || '').toUpperCase();
  if (enc === 'QUOTED-PRINTABLE' || types.has('quoted-printable')) value = decodeQP(value, params.CHARSET || 'utf-8');
  return { group, name, types, params, value, enc: enc || ([...types].find(t => t === 'base64' || t === 'b') || '').toUpperCase() };
}

const has = (types, ...t) => t.some(x => types.has(x));

function telType(types) {
  if (has(types, 'fax')) return 'FAX';
  if (has(types, 'pager')) return 'PAGER';
  if (has(types, 'cell', 'mobile', 'iphone')) return 'CELL';
  if (has(types, 'main')) return 'MAIN';
  if (has(types, 'work')) return 'WORK';
  if (has(types, 'home')) return 'HOME';
  return 'OTHER';
}
const simpleType = types => (has(types, 'work') ? 'WORK' : has(types, 'home') ? 'HOME' : 'OTHER');

const SOCIAL_HOSTS = [
  ['LINKEDIN', /linkedin\.com/i], ['X', /(^|\.)(x|twitter)\.com/i], ['GITHUB', /github\.com/i],
  ['INSTAGRAM', /instagram\.com/i], ['FACEBOOK', /facebook\.com|fb\.com/i], ['YOUTUBE', /youtube\.com|youtu\.be/i], ['TIKTOK', /tiktok\.com/i],
];
function socialType(label, url) {
  const l = (label || '').toLowerCase().replace(/[^a-z]/g, '');
  const byLabel = { linkedin: 'LINKEDIN', x: 'X', twitter: 'X', github: 'GITHUB', instagram: 'INSTAGRAM', facebook: 'FACEBOOK', youtube: 'YOUTUBE', tiktok: 'TIKTOK' }[l];
  if (byLabel) return byLabel;
  let host = '';
  try { host = new URL(/^https?:/i.test(url) ? url : 'https://' + url).host; } catch { /* not a URL */ }
  return (SOCIAL_HOSTS.find(([, re]) => re.test(host)) || [])[0] || null;
}

function imType(service) {
  const s = (service || '').toLowerCase();
  return ['telegram', 'whatsapp', 'signal', 'skype', 'teams'].find(x => s.includes(x))?.toUpperCase() || 'OTHER';
}

/** "1990-02-03", "19900203", "1990-02-03T00:00:00Z" → "1990-02-03"; year-less dates are dropped. */
export function normDate(v) {
  const s = v.trim();
  let m = s.match(/^(\d{4})-?(\d{2})-?(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

/** Apple custom labels look like "_$!<HomePage>!$_" */
const cleanLabel = l => l.replace(/^_\$!<(.*)>!\$_$/, '$1');

/**
 * Parse the first contact in a .vcf file.
 * @returns {{ model, photo: null | { src: string }, cards: number }}
 */
export function parseVCard(text) {
  const lines = toLines(text);
  const cards = lines.filter(l => /^BEGIN:VCARD$/i.test(l.trim())).length;
  if (!cards) throw Object.assign(new Error('no vcard'), { code: 'vcfInvalid' });

  // properties of the first card
  const props = [];
  let inCard = false;
  for (const line of lines) {
    if (/^BEGIN:VCARD$/i.test(line.trim())) { if (inCard) break; inCard = true; continue; }
    if (/^END:VCARD$/i.test(line.trim())) { if (inCard) break; continue; }
    if (!inCard || !line.trim()) continue;
    const p = parseLine(line);
    if (p) props.push(p);
  }

  const labels = {};
  props.filter(p => p.name === 'X-ABLABEL' && p.group).forEach(p => { labels[p.group] = cleanLabel(unescapeText(p.value)); });

  const m = createEmptyModel();
  const f = m.fields;
  const lists = { phones: [], emails: [], websites: [], socials: [], ims: [], addresses: [] };
  let fn = '';
  let photo = null;
  const text1 = p => unescapeText(p.value).trim();

  for (const p of props) {
    const label = labels[p.group] || '';
    switch (p.name) {
      case 'N': {
        const [last = '', first = '', middle = '', prefix = '', suffix = ''] = splitEsc(p.value, ';').map(x => unescapeText(x).trim());
        Object.assign(f, { lastName: last, firstName: first, middleName: middle, prefix, suffix });
        break;
      }
      case 'FN': fn = text1(p); break;
      case 'NICKNAME': f.nickname = text1(p); break;
      case 'X-PHONETIC-FIRST-NAME': f.phoneticFirst = text1(p); break;
      case 'X-PHONETIC-LAST-NAME': f.phoneticLast = text1(p); break;
      case 'ORG': {
        const [company = '', department = ''] = splitEsc(p.value, ';').map(x => unescapeText(x).trim());
        f.company = company; f.department = department;
        break;
      }
      case 'TITLE': f.jobTitle = text1(p); break;
      case 'ROLE': f.role = text1(p); break;
      case 'TEL': {
        const v = text1(p).replace(/^tel:/i, '');
        if (v) lists.phones.push({ type: telType(p.types), value: v });
        break;
      }
      case 'EMAIL': {
        const v = text1(p).replace(/^mailto:/i, '');
        if (v) lists.emails.push({ type: simpleType(p.types), value: v });
        break;
      }
      case 'URL': {
        const v = text1(p);
        if (!v) break;
        const social = socialType(label, v);
        if (social) { lists.socials.push({ type: social, value: v }); break; }
        const l = label.toLowerCase();
        const type = l.includes('blog') ? 'BLOG' : l.includes('portfolio') ? 'PORTFOLIO' : has(p.types, 'work') ? 'WORK' : has(p.types, 'home') || l === 'homepage' ? 'HOME' : 'OTHER';
        lists.websites.push({ type, value: v });
        break;
      }
      case 'X-SOCIALPROFILE': {
        const v = text1(p);
        if (!v) break;
        const type = socialType([...p.types][0], v) || 'OTHER';
        lists.socials.push({ type, value: v.replace(/^x-apple:/i, '') });
        break;
      }
      case 'IMPP': {
        const v = text1(p).replace(/^[a-z-]+:/i, '');
        if (v) lists.ims.push({ type: imType(p.params['X-SERVICE-TYPE'] || text1(p).split(':')[0]), value: v });
        break;
      }
      case 'ADR': {
        const [pobox = '', ext = '', street = '', city = '', region = '', zip = '', country = ''] = splitEsc(p.value, ';').map(x => unescapeText(x).trim());
        if ([pobox, ext, street, city, region, zip, country].some(Boolean)) {
          lists.addresses.push({ ...emptyAddress(simpleType(p.types)), pobox, ext, street, city, region, zip, country });
        }
        break;
      }
      case 'BDAY': f.birthday = normDate(p.value); break;
      case 'ANNIVERSARY':
      case 'X-ANNIVERSARY': f.anniversary = normDate(p.value); break;
      case 'X-ABDATE': if (/anniversary/i.test(label) && !f.anniversary) f.anniversary = normDate(p.value); break;
      case 'NOTE': f.notes = unescapeText(p.value); break;
      case 'CATEGORIES': f.categories = splitEsc(p.value, ',').map(x => unescapeText(x).trim()).filter(Boolean).join(', '); break;
      case 'TZ': f.timezone = text1(p); break;
      case 'GEO': {
        const g = p.value.replace(/^geo:/i, '').split(/[;,]/).map(x => x.trim());
        if (g.length >= 2 && g.every(x => /^-?\d+(\.\d+)?$/.test(x))) f.geo = `${g[0]}, ${g[1]}`;
        break;
      }
      case 'PHOTO': {
        if (photo) break;
        const v = p.value.trim();
        if (/^data:image\//i.test(v)) photo = { src: v };
        else if (p.enc === 'B' || p.enc === 'BASE64') {
          const sub = ([...p.types].find(t => /^(jpe?g|png|gif|webp)$/.test(t)) || (p.params.TYPE || 'jpeg')).toLowerCase().replace('jpg', 'jpeg');
          photo = { src: `data:image/${sub};base64,${v.replace(/\s+/g, '')}` };
        } else if (/^https:\/\//i.test(v)) photo = { src: v };
        break;
      }
      default: break;
    }
  }

  if (!f.firstName && !f.lastName && fn) {
    const words = fn.split(/\s+/);
    f.firstName = words.shift() || '';
    f.lastName = words.join(' ');
  }
  for (const [k, list] of Object.entries(lists)) if (list.length) m[k] = list;

  return { model: normalizeModel(m), photo, cards };
}
