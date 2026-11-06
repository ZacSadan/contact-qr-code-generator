import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVCard, normDate } from '../js/vcard-parse.js';
import { buildVCard } from '../js/vcard.js';
import { createEmptyModel } from '../js/state.js';

test('round trip: everything this app exports comes back', () => {
  const m = createEmptyModel();
  Object.assign(m.fields, {
    prefix: 'Dr.', firstName: 'Zac', middleName: 'Q', lastName: 'Sadan', suffix: 'Jr.', nickname: 'Z',
    company: 'Example; Ltd', department: 'R&D', jobTitle: 'CTO', role: 'Lead',
    notes: 'line1\nline2, with comma', birthday: '1990-02-03', anniversary: '2015-06-07',
    categories: 'Friends, Work', timezone: '+02:00', geo: '32.08, 34.78',
  });
  m.phones = [{ type: 'CELL', value: '+972 50' }, { type: 'WORK', value: '+972 3' }, { type: 'FAX', value: '+972 4' }];
  m.emails = [{ type: 'WORK', value: 'a@w.com' }, { type: 'HOME', value: 'a@h.com' }];
  m.websites = [{ type: 'WORK', value: 'https://w.com' }, { type: 'BLOG', value: 'https://b.com' }];
  m.socials = [{ type: 'GITHUB', value: 'https://github.com/zac' }];
  m.ims = [{ type: 'TELEGRAM', value: 'zac' }];
  m.addresses = [{ type: 'WORK', pobox: '', ext: 'Apt 2', street: '1 Main', city: 'TLV', region: '', zip: '123', country: 'Israel' }];

  for (const opts of [{}, { eol: '\r\n', fold: true }]) {
    const { model: back, cards, photo } = parseVCard(buildVCard(m, opts));
    assert.equal(cards, 1);
    assert.equal(photo, null);
    for (const [k, v] of Object.entries(m.fields)) assert.equal(back.fields[k], v, `field ${k}`);
    for (const k of ['phones', 'emails', 'websites', 'socials', 'ims', 'addresses']) assert.deepEqual(back[k], m[k], k);
  }
});

test('Google Contacts export (vCard 3.0, photo URL, item labels)', () => {
  const vcf = [
    'BEGIN:VCARD', 'VERSION:3.0', 'FN:Zac Sadan', 'N:Sadan;Zac;;;',
    'EMAIL;TYPE=INTERNET;TYPE=WORK:zac@example.com',
    'TEL;TYPE=CELL:+972 50-000-0000',
    'ADR;TYPE=HOME:;;Herzl 1;Tel Aviv;;6100000;Israel',
    'ORG:Example Ltd', 'TITLE:CTO',
    'item1.URL:https\\://www.linkedin.com/in/zac', 'item1.X-ABLabel:PROFILE',
    'PHOTO:https://lh3.googleusercontent.com/contacts/abc',
    'BDAY:1990-02-03',
    'END:VCARD',
  ].join('\r\n');
  const { model, photo } = parseVCard(vcf);
  assert.equal(model.fields.firstName, 'Zac');
  assert.equal(model.fields.company, 'Example Ltd');
  assert.deepEqual(model.emails, [{ type: 'WORK', value: 'zac@example.com' }]);
  assert.deepEqual(model.socials, [{ type: 'LINKEDIN', value: 'https://www.linkedin.com/in/zac' }], 'detected by host');
  assert.equal(model.addresses[0].city, 'Tel Aviv');
  assert.equal(model.addresses[0].type, 'HOME');
  assert.equal(photo.src, 'https://lh3.googleusercontent.com/contacts/abc');
  assert.ok(!model.visibleOptional.includes('birthday'), 'birthday is always shown');
});

test('iPhone export (folded base64 photo, Apple labels, IMPP)', () => {
  const vcf = [
    'BEGIN:VCARD', 'VERSION:3.0', 'N:ישראלי;ישראל;;;', 'FN:ישראל ישראלי',
    'TEL;type=CELL;type=VOICE;type=pref:050-123-4567',
    'TEL;type=IPHONE;type=CELL:052-1',
    'item1.URL;type=pref:https://blog.example.com', 'item1.X-ABLabel:_$!<HomePage>!$_',
    'item2.X-ABDATE:2015-06-07', 'item2.X-ABLabel:_$!<Anniversary>!$_',
    'IMPP;X-SERVICE-TYPE=Skype;type=pref:skype:zac.s',
    'X-SOCIALPROFILE;type=twitter:x-apple:zacs',
    'PHOTO;ENCODING=b;TYPE=JPEG:/9j/4AAQ',
    ' SkZJRg==',
    'END:VCARD',
  ].join('\n');
  const { model, photo } = parseVCard(vcf);
  assert.equal(model.fields.firstName, 'ישראל');
  assert.deepEqual(model.phones.map(p => p.type), ['CELL', 'CELL']);
  assert.deepEqual(model.websites, [{ type: 'HOME', value: 'https://blog.example.com' }]);
  assert.equal(model.fields.anniversary, '2015-06-07');
  assert.deepEqual(model.ims, [{ type: 'SKYPE', value: 'zac.s' }]);
  assert.deepEqual(model.socials, [{ type: 'X', value: 'zacs' }]);
  assert.equal(photo.src, 'data:image/jpeg;base64,/9j/4AAQSkZJRg==');
});

test('vCard 2.1 with quoted-printable UTF-8 (old Android / Outlook)', () => {
  const vcf = [
    'BEGIN:VCARD', 'VERSION:2.1',
    'N;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:=D7=99=D7=A9=D7=A8=D7=90=D7=9C=D7=99;=D7=99=D7=A9=',
    '=D7=A8=D7=90=D7=9C;;;',
    'TEL;CELL;PREF:+972501234567',
    'TEL;WORK;FAX:+97231234567',
    'EMAIL;HOME:a@b.com',
    'END:VCARD',
  ].join('\r\n');
  const { model } = parseVCard(vcf);
  assert.equal(model.fields.lastName, 'ישראלי');
  assert.equal(model.fields.firstName, 'ישראל');
  assert.deepEqual(model.phones, [{ type: 'CELL', value: '+972501234567' }, { type: 'FAX', value: '+97231234567' }]);
  assert.deepEqual(model.emails, [{ type: 'HOME', value: 'a@b.com' }]);
});

test('vCard 4.0 with data: photo, FN only, multiple cards', () => {
  const vcf = 'BEGIN:VCARD\nVERSION:4.0\nFN:Mary Ann Smith\nTEL;VALUE=uri;TYPE=work:tel:+1-555\nPHOTO:data:image/png;base64,iVBORw0KGgo=\nEND:VCARD\nBEGIN:VCARD\nVERSION:4.0\nFN:Other\nEND:VCARD\n';
  const { model, photo, cards } = parseVCard(vcf);
  assert.equal(cards, 2);
  assert.equal(model.fields.firstName, 'Mary');
  assert.equal(model.fields.lastName, 'Ann Smith');
  assert.deepEqual(model.phones, [{ type: 'WORK', value: '+1-555' }]);
  assert.equal(photo.src, 'data:image/png;base64,iVBORw0KGgo=');
});

test('not a vCard / bad dates', () => {
  assert.throws(() => parseVCard('hello'), { code: 'vcfInvalid' });
  assert.equal(normDate('19900203'), '1990-02-03');
  assert.equal(normDate('1990-02-03T00:00:00Z'), '1990-02-03');
  assert.equal(normDate('--0203'), '');
});
