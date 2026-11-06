// Save / restore: JSON (full model), legacy CSV (original app format),
// local draft in this browser only.
import { createEmptyModel, normalizeModel, emptyAddress } from './state.js';

const DRAFT_KEY = 'contact-qr:draft:v1';

// ===== JSON =====
export function toJSON(model) {
  return JSON.stringify({ app: 'contact-qr', ...model }, null, 2);
}
export function fromJSON(text) {
  return normalizeModel(JSON.parse(text));
}

// ===== CSV (format of the original single-file app) =====
export const LEGACY_FIELDS = ['firstName', 'lastName', 'mobile', 'workPhone', 'homePhone', 'email', 'website', 'company', 'jobTitle', 'street', 'city', 'state', 'zip', 'country', 'notes'];

export function csvEscape(value) {
  const v = String(value ?? '');
  return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

/** Minimal RFC-4180 parser: quoted fields, escaped quotes, commas/newlines in quotes. */
export function parseCSV(text) {
  const rows = [];
  let row = [], cur = '', inQuotes = false;
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else cur += ch;
  }
  if (cur !== '' || row.length > 0) {
    row.push(cur);
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  return rows;
}

const firstOf = (list, type) => (list.find(r => r.type === type && r.value.trim()) || {}).value || '';

export function modelToLegacyCSV(model) {
  const a = model.addresses.find(x => Object.values(x).some((v, i) => i > 0 && String(v).trim())) || emptyAddress();
  const firstFilled = list => (list.find(r => r.value.trim()) || {}).value || '';
  const values = {
    firstName: model.fields.firstName, lastName: model.fields.lastName,
    mobile: firstOf(model.phones, 'CELL'), workPhone: firstOf(model.phones, 'WORK'), homePhone: firstOf(model.phones, 'HOME'),
    email: firstFilled(model.emails), website: firstFilled(model.websites),
    company: model.fields.company, jobTitle: model.fields.jobTitle,
    street: a.street, city: a.city, state: a.region, zip: a.zip, country: a.country,
    notes: model.fields.notes,
  };
  const header = LEGACY_FIELDS.join(',');
  const row = LEGACY_FIELDS.map(f => csvEscape(values[f])).join(',');
  return '﻿' + header + '\r\n' + row + '\r\n'; // BOM so Excel reads UTF-8
}

/** @returns {{model, matched}} */
export function legacyCSVToModel(text) {
  const rows = parseCSV(text);
  if (rows.length < 2) throw Object.assign(new Error('rows'), { code: 'csvNeedsRows' });
  const header = rows[0].map(h => h.trim());
  const data = rows[1];
  const v = {};
  let matched = 0;
  header.forEach((h, i) => {
    if (LEGACY_FIELDS.includes(h) && data[i] !== undefined) { v[h] = data[i]; matched++; }
  });
  if (!matched) throw Object.assign(new Error('cols'), { code: 'csvNoColumns' });

  const m = createEmptyModel();
  ['firstName', 'lastName', 'company', 'jobTitle', 'notes'].forEach(k => { if (v[k]) m.fields[k] = v[k]; });
  const phones = [['mobile', 'CELL'], ['workPhone', 'WORK'], ['homePhone', 'HOME']]
    .filter(([k]) => v[k]).map(([k, type]) => ({ type, value: v[k] }));
  if (phones.length) m.phones = phones;
  if (v.email) m.emails = [{ type: 'OTHER', value: v.email }];
  if (v.website) m.websites = [{ type: 'OTHER', value: v.website }];
  if (v.street || v.city || v.state || v.zip || v.country) {
    m.addresses = [{ ...emptyAddress('HOME'), street: v.street || '', city: v.city || '', region: v.state || '', zip: v.zip || '', country: v.country || '' }];
  }
  return { model: m, matched };
}

// ===== Local draft (this browser only; never leaves the device) =====
export function saveDraft(model) {
  try { globalThis.localStorage?.setItem(DRAFT_KEY, JSON.stringify(model)); } catch { /* quota / private mode */ }
}
export function loadDraft() {
  try {
    const raw = globalThis.localStorage?.getItem(DRAFT_KEY);
    return raw ? normalizeModel(JSON.parse(raw)) : null;
  } catch { return null; }
}
export function clearDraft() {
  try { globalThis.localStorage?.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

export function contactFileName(model, prefix, ext) {
  const first = model.fields.firstName.trim() || 'contact';
  const last = model.fields.lastName.trim();
  const name = (first + (last ? '-' + last : '')).toLowerCase().replace(/\s+/g, '-');
  return `${prefix}-${name}.${ext}`;
}
