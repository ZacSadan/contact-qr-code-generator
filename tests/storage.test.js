import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, legacyCSVToModel, modelToLegacyCSV, toJSON, fromJSON } from '../js/storage.js';
import { createEmptyModel, normalizeModel } from '../js/state.js';
import { mergeProfile, hasConflicts, mapPeople } from '../js/google.js';
import { getInitials, resolvePalette } from '../js/avatar.js';

test('parseCSV handles quotes, commas, newlines and BOM', () => {
  const rows = parseCSV('﻿a,b,c\r\n"x, y","he said ""hi""","multi\nline"\r\n');
  assert.deepEqual(rows, [['a', 'b', 'c'], ['x, y', 'he said "hi"', 'multi\nline']]);
});

test('legacy CSV from the original app imports', () => {
  const csv = 'firstName,lastName,mobile,workPhone,email,city,notes\r\nZac,Sadan,+972 50,+972 3,z@x.com,Tel Aviv,"a, b"\r\n';
  const { model, matched } = legacyCSVToModel(csv);
  assert.equal(matched, 7);
  assert.equal(model.fields.firstName, 'Zac');
  assert.deepEqual(model.phones, [{ type: 'CELL', value: '+972 50' }, { type: 'WORK', value: '+972 3' }]);
  assert.equal(model.emails[0].value, 'z@x.com');
  assert.equal(model.addresses[0].city, 'Tel Aviv');
  assert.equal(model.fields.notes, 'a, b');
});

test('legacy CSV round trip', () => {
  const m = createEmptyModel();
  m.fields.firstName = 'Zac';
  m.phones = [{ type: 'CELL', value: '1' }];
  m.addresses[0].city = 'TLV';
  const back = legacyCSVToModel(modelToLegacyCSV(m)).model;
  assert.equal(back.fields.firstName, 'Zac');
  assert.equal(back.phones[0].value, '1');
  assert.equal(back.addresses[0].city, 'TLV');
});

test('CSV errors carry i18n codes', () => {
  assert.throws(() => legacyCSVToModel('a,b'), { code: 'csvNeedsRows' });
  assert.throws(() => legacyCSVToModel('foo,bar\n1,2'), { code: 'csvNoColumns' });
});

test('JSON round trip', () => {
  const m = createEmptyModel();
  m.fields.firstName = 'Zac';
  m.fields.birthday = '2000-01-01';
  m.socials = [{ type: 'GITHUB', value: 'zac' }];
  const back = fromJSON(toJSON(m));
  assert.equal(back.fields.firstName, 'Zac');
  assert.deepEqual(back.socials, m.socials);
  assert.ok(back.visibleOptional.includes('birthday'), 'filled optional fields become visible');
});

test('normalizeModel rejects junk', () => {
  const m = normalizeModel({ fields: { firstName: 5, evil: 'x' }, phones: [{ type: 'NOPE', value: 'x' }, null], image: { mode: 'upload', uploadDataUrl: 'javascript:alert(1)' }, ec: 'Z' });
  assert.equal(m.fields.firstName, '5');
  assert.equal(m.fields.evil, undefined);
  assert.deepEqual(m.phones, [{ type: 'CELL', value: 'x' }]);
  assert.equal(m.image.uploadDataUrl, '');
  assert.equal(m.image.mode, 'initials', 'falls back to the default');
  assert.equal(m.ec, 'auto');
});

test('Google profile merge fills empty fields only unless overwrite', () => {
  const prof = mapPeople({
    names: [{ givenName: 'Zac', familyName: 'Sadan', metadata: { primary: true } }],
    emailAddresses: [{ value: 'zac@example.com' }],
    organizations: [{ name: 'Acme', title: 'CTO' }],
    photos: [{ url: 'https://x/photo=s100', default: true }],
  });
  assert.equal(prof.photoUrl, '', 'default (generated) Google photos are ignored');
  const m = createEmptyModel();
  m.fields.firstName = 'Z';
  assert.ok(hasConflicts(m, prof));
  const n = mergeProfile(m, prof, false);
  assert.equal(m.fields.firstName, 'Z');
  assert.equal(m.fields.lastName, 'Sadan');
  assert.equal(m.fields.company, 'Acme');
  assert.equal(m.emails[0].value, 'zac@example.com');
  assert.equal(n, 4);
  mergeProfile(m, prof, true);
  assert.equal(m.fields.firstName, 'Zac');
});

test('default center image is initials', () => {
  assert.equal(createEmptyModel().image.mode, 'initials');
  assert.equal(normalizeModel({ image: { mode: 'none' } }).image.mode, 'initials', 'old saves migrate');
  assert.equal(normalizeModel({ image: { v: 2, mode: 'none' } }).image.mode, 'none', 'a new explicit "none" is kept');
  assert.equal(normalizeModel(JSON.parse(JSON.stringify(createEmptyModel()))).image.mode, 'initials');
});

test('image size and background colour are validated', () => {
  assert.equal(createEmptyModel().image.size, 'normal');
  const ok = normalizeModel({ image: { mode: 'initials', size: 'full', bg: '#AABBCC' } });
  assert.equal(ok.image.size, 'full');
  assert.equal(ok.image.bg, '#aabbcc');
  const bad = normalizeModel({ image: { size: 'huge', bg: 'red; background:url(x)' } });
  assert.equal(bad.image.size, 'normal');
  assert.equal(bad.image.bg, '');
});

test('custom background picks a readable text colour', () => {
  assert.deepEqual(resolvePalette('navy-gold', '#ffffff').fg, ['#1b1b1f', '#3a3a42'], 'dark ink on light bg');
  assert.deepEqual(resolvePalette('navy-gold', '#000000').fg, resolvePalette('navy-gold').fg, 'keeps gold on dark bg');
  assert.deepEqual(resolvePalette('ivory-ink', '#000000').fg, ['#ffffff', '#e5e7eb'], 'light text when palette was light');
  assert.equal(resolvePalette('navy-gold', '#123456').bg[0], '#123456');
});

test('initials', () => {
  assert.equal(getInitials('Zac', 'Sadan'), 'ZS');
  assert.equal(getInitials('zac', 'van der Berg'), 'ZB');
  assert.equal(getInitials('Mary Ann', ''), 'MA');
  assert.equal(getInitials('', 'Sadan'), 'S');
  assert.equal(getInitials('', ''), '');
  assert.equal(getInitials('ישראל', 'ישראלי'), 'יי');
});
