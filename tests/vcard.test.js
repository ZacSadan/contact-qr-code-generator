import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildVCard, esc, foldLine, socialUrl, utf8Length } from '../js/vcard.js';
import { createEmptyModel } from '../js/state.js';

const model = (patch = {}) => {
  const m = createEmptyModel();
  Object.assign(m.fields, patch.fields || {});
  for (const k of ['phones', 'emails', 'websites', 'socials', 'ims', 'addresses']) if (patch[k]) m[k] = patch[k];
  return m;
};

test('returns null without a name', () => {
  assert.equal(buildVCard(createEmptyModel()), null);
});

test('minimal card (same output as the original app)', () => {
  const v = buildVCard(model({ fields: { firstName: 'Zac', lastName: 'Sadan' } }));
  assert.equal(v, 'BEGIN:VCARD\nVERSION:3.0\nN:Sadan;Zac;;;\nFN:Zac Sadan\nEND:VCARD');
});

test('escapes special characters', () => {
  assert.equal(esc('a;b,c\\d\ne'), 'a\\;b\\,c\\\\d\\ne');
  const v = buildVCard(model({ fields: { firstName: 'A', notes: 'line1\nline2; x, y' } }));
  assert.match(v, /^NOTE:line1\\nline2\\; x\\, y$/m);
});

test('multiple phones, emails, websites', () => {
  const v = buildVCard(model({
    fields: { firstName: 'A' },
    phones: [{ type: 'CELL', value: '+1 555' }, { type: 'WORK', value: '+1 666' }, { type: 'FAX', value: '+1 777' }, { type: 'CELL', value: '  ' }],
    emails: [{ type: 'WORK', value: 'a@w.com' }, { type: 'HOME', value: 'a@h.com' }],
    websites: [{ type: 'WORK', value: 'https://w.com' }, { type: 'BLOG', value: 'https://b.com' }],
  }));
  assert.match(v, /^TEL;TYPE=CELL:\+1 555$/m);
  assert.match(v, /^TEL;TYPE=WORK,VOICE:\+1 666$/m);
  assert.match(v, /^TEL;TYPE=WORK,FAX:\+1 777$/m);
  assert.equal((v.match(/^TEL/gm) || []).length, 3, 'blank rows are skipped');
  assert.match(v, /^EMAIL;TYPE=INTERNET,WORK:a@w.com$/m);
  assert.match(v, /^EMAIL;TYPE=INTERNET,HOME:a@h.com$/m);
  assert.match(v, /^URL;TYPE=WORK:https:\/\/w.com$/m);
  assert.match(v, /^item1.URL:https:\/\/b.com\nitem1.X-ABLabel:Blog$/m);
});

test('social profiles become labelled URLs', () => {
  assert.equal(socialUrl('LINKEDIN', 'zac'), 'https://www.linkedin.com/in/zac');
  assert.equal(socialUrl('X', '@zac'), 'https://x.com/zac');
  assert.equal(socialUrl('GITHUB', 'https://github.com/zac'), 'https://github.com/zac');
  assert.equal(socialUrl('LINKEDIN', 'linkedin.com/in/zac'), 'https://linkedin.com/in/zac');
  const v = buildVCard(model({ fields: { firstName: 'A' }, socials: [{ type: 'GITHUB', value: 'zac' }] }));
  assert.match(v, /^item1.URL:https:\/\/github.com\/zac\nitem1.X-ABLabel:GitHub$/m);
});

test('addresses, org, dates, geo, categories', () => {
  const v = buildVCard(model({
    fields: { firstName: 'A', company: 'Acme', department: 'R&D', birthday: '1990-02-03', geo: '32.08, 34.78', categories: 'Friends, Work' },
    addresses: [
      { type: 'WORK', pobox: '', ext: '', street: '1 Main', city: 'TLV', region: '', zip: '123', country: 'Israel' },
      { type: 'HOME', pobox: '', ext: '', street: '', city: '', region: '', zip: '', country: '' },
    ],
  }));
  assert.match(v, /^ORG:Acme;R&D$/m);
  assert.match(v, /^ADR;TYPE=WORK:;;1 Main;TLV;;123;Israel$/m);
  assert.equal((v.match(/^ADR/gm) || []).length, 1, 'empty address skipped');
  assert.match(v, /^BDAY:1990-02-03$/m);
  assert.match(v, /^GEO:32.08;34.78$/m);
  assert.match(v, /^CATEGORIES:Friends,Work$/m);
});

test('full name parts', () => {
  const v = buildVCard(model({ fields: { prefix: 'Dr.', firstName: 'John', middleName: 'Q', lastName: 'Doe', suffix: 'Jr.' } }));
  assert.match(v, /^N:Doe;John;Q;Dr\.;Jr\.$/m);
  assert.match(v, /^FN:Dr\. John Q Doe Jr\.$/m);
});

test('Hebrew is kept as UTF-8', () => {
  const v = buildVCard(model({ fields: { firstName: 'ישראל', lastName: 'ישראלי' } }));
  assert.match(v, /^FN:ישראל ישראלי$/m);
  assert.ok(utf8Length(v) > v.length);
});

test('folding keeps lines <= 75 octets and never splits characters', () => {
  const long = 'NOTE:' + 'שלום '.repeat(40);
  const folded = foldLine(long, '\r\n');
  const lines = folded.split('\r\n');
  for (const l of lines) assert.ok(new TextEncoder().encode(l).length <= 75);
  assert.equal(lines.map((l, i) => (i ? l.slice(1) : l)).join(''), long);
});

test('.vcf mode uses CRLF', () => {
  const v = buildVCard(model({ fields: { firstName: 'A' } }), { eol: '\r\n', fold: true });
  assert.ok(v.includes('\r\nVERSION:3.0\r\n'));
});
