// App bootstrap: wires form, image source, Google, QR rendering and storage.
import { createEmptyModel } from './state.js';
import { EC_LEVELS } from './fields-schema.js';
import { buildVCard, utf8Length } from './vcard.js';
import { renderQR, MAX_BYTES } from './qr-render.js';
import { createForm } from './form-ui.js';
import { createImageSource } from './image-source.js';
import * as google from './google.js';
import { toJSON, fromJSON, modelToLegacyCSV, legacyCSVToModel, saveDraft, loadDraft, clearDraft, contactFileName } from './storage.js';
import { toast, downloadBlob, readFile } from './ui.js';
import { parseVCard } from './vcard-parse.js';
import { t, applyStatic, setLang } from './i18n.js';

applyStatic(); // translate static HTML before anything renders

const $ = id => document.getElementById(id);

let model = loadDraft() || createEmptyModel();
// The Google session is never stored, so after a reload the Google photo is gone: use the default.
if (model.image.mode === 'google') model.image.mode = 'initials';
const getModel = () => model;

const canvas = $('qrCanvas');
const thumb = $('qrThumb');
const placeholder = $('placeholder');
const qrError = $('qrError');
const downloadBtn = $('downloadBtn');
const downloadVcfBtn = $('downloadVcfBtn');
const ecSelect = $('ecSelect');
const vcardPreview = $('vcardPreview');

// ===== render pipeline =====
let renderSeq = 0;
let debounce = null;
let lastVCard = null;

function scheduleRender() {
  updateVCardPreview(); // instant, the QR itself is debounced
  clearTimeout(debounce);
  debounce = setTimeout(() => { render(); saveDraft(model); }, 250);
}

function updateVCardPreview() {
  const v = buildVCard(model);
  vcardPreview.textContent = v || `BEGIN:VCARD\nVERSION:3.0\n… (${t('enterName')})\nEND:VCARD`;
  vcardPreview.classList.toggle('empty', !v);
  $('vcardBytes').textContent = v ? t('bytes', utf8Length(v)) : '';
  $('copyVcardBtn').disabled = !v;
}

function setQrVisible(ok, message) {
  canvas.hidden = !ok;
  placeholder.hidden = ok;
  downloadBtn.disabled = !ok;
  $('sharePhotosBtn').disabled = !ok;
  downloadVcfBtn.disabled = !lastVCard;
  qrError.hidden = !message;
  qrError.textContent = message ? '⚠ ' + message : '';
  $('mobileBarSub').textContent = ok ? t('tapToView') : (message || t('enterName'));
  const tctx = thumb.getContext('2d');
  tctx.clearRect(0, 0, thumb.width, thumb.height);
  if (ok) tctx.drawImage(canvas, 0, 0, thumb.width, thumb.height);
}

function updateMeter(bytes, ec) {
  const max = MAX_BYTES[ec];
  const pct = Math.min(100, (bytes / max) * 100);
  const fill = $('meterFill');
  fill.style.width = pct + '%';
  fill.className = pct > 100 * 0.95 ? 'over' : pct > 75 ? 'warn' : '';
  $('meterText').textContent = bytes ? t('capacity', bytes, max, ec) : '';
}

async function render() {
  const seq = ++renderSeq;
  lastVCard = buildVCard(model);
  if (!lastVCard) {
    updateMeter(0, 'H');
    // still refresh the initials preview state
    await imageSource.resolve().catch(() => null);
    return setQrVisible(false);
  }
  let logo = null;
  try { logo = await imageSource.resolve(); } catch { logo = null; }
  if (seq !== renderSeq) return; // a newer render started meanwhile

  const ec = model.ec === 'auto' ? (logo ? 'H' : 'M') : model.ec;
  updateMeter(utf8Length(lastVCard), ec);
  try {
    const logoSize = model.image.mode === 'initials' ? model.image.size : 'normal';
    renderQR(canvas, lastVCard, { ec, logo, logoSize });
    setQrVisible(true);
    prepareShareFile(seq);
  } catch {
    setQrVisible(false, t('tooMuchData'));
  }
}

// ===== Share to Google Photos =====
// The PNG is prepared right after each render, so the click handler can call
// navigator.share() immediately (Safari requires it inside the user gesture).
// No future "date taken" is embedded: Google Photos misreads EXIF dates like
// 2050 as Jan 30, 1970, so the user sets the date in Google Photos instead.
let shareFile = null;

function prepareShareFile(seq) {
  shareFile = null;
  canvas.toBlob(blob => {
    if (!blob || seq !== renderSeq) return;
    shareFile = new File([blob], contactFileName(model, 'qr', 'png'), { type: 'image/png' });
  }, 'image/png');
}

const isMobile = () => navigator.userAgentData?.mobile ??
  (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1));

$('sharePhotosBtn').addEventListener('click', () => {
  if (!shareFile) return toast(t('shareNotReady'), 'error');
  const file = shareFile;
  if (isMobile() && navigator.canShare?.({ files: [file] })) {
    // Phone: system share sheet → the user picks Google Photos
    navigator.share({ files: [file], title: file.name }).catch(err => {
      if (err?.name === 'AbortError') return; // user closed the share sheet
      downloadBlob(file, file.name);
      toast(t('shareFallback'));
    });
    return;
  }
  // Computer: no share target for Google Photos → open it and save the file to drag in
  window.open('https://photos.google.com/', '_blank', 'noopener');
  downloadBlob(file, file.name);
  toast(t('photosDesktop'));
});

// ===== modules =====
const form = createForm({ container: $('formFields'), addSelect: $('addFieldSelect'), getModel, onChange: scheduleRender });
const imageSource = createImageSource({ getModel, onChange: scheduleRender, onGoogleConnect: connectGoogle });

function loadModel(next) {
  model = next;
  form.rebuild();
  imageSource.sync();
  ecSelect.value = model.ec;
  updateVCardPreview();
  render();
  saveDraft(model);
}

// ===== Google =====
function syncGoogleBox() {
  const p = google.getProfile();
  const connected = google.isConnected();
  $('googleDisconnect').hidden = !connected;
  $('googleConnect').textContent = connected ? t('googleRefillBtn') : t('googleConnectBtn');
  const avatar = $('googleAvatar');
  const photo = google.getPhoto();
  avatar.hidden = !(connected && photo);
  if (connected && photo) avatar.src = photo.src;
  $('googleTitle').textContent = connected
    ? t('googleTitleConnected', p.displayName || p.emails?.[0]?.value || t('googleUser'))
    : t('googleTitleIdle');
  $('googleSub').textContent = connected ? t('googleSubConnected')
    : google.isConfigured() ? t('googleSubIdle') : t('googleSubNotConfigured');
  imageSource.syncGoogle();
}

function connectGoogle() {
  if (!google.isConfigured()) return toast(t('googleNotConfigured'), 'error');
  if (!google.isReady()) return toast(t('googleLoading'), 'error');
  google.connect().then(profile => {
    const overwrite = google.hasConflicts(model, profile) ? window.confirm(t('googleOverwrite')) : true;
    const n = google.mergeProfile(model, profile, overwrite);
    // Google photo becomes the default center image — unless the user uploaded their own
    const ownUpload = model.image.mode === 'upload' && model.image.uploadDataUrl;
    if (google.getPhoto() && !ownUpload) model.image.mode = 'google';
    form.rebuild();
    imageSource.sync();
    syncGoogleBox();
    scheduleRender();
    toast(t('googleFilled', n));
  }).catch(() => {
    syncGoogleBox();
    toast(t('googleFailed'), 'error');
  });
}

$('googleConnect').addEventListener('click', connectGoogle);
$('googleDisconnect').addEventListener('click', () => {
  google.disconnect();
  if (model.image.mode === 'google') { model.image.mode = 'initials'; imageSource.sync(); }
  syncGoogleBox();
  scheduleRender();
  toast(t('googleDisconnected'));
});
google.init().then(syncGoogleBox);

// ===== downloads =====
downloadBtn.addEventListener('click', () => {
  canvas.toBlob(blob => {
    if (!blob) return toast(t('pngFailed'), 'error');
    downloadBlob(blob, contactFileName(model, 'qr', 'png'));
    toast(t('pngDownloaded'));
  }, 'image/png');
});

downloadVcfBtn.addEventListener('click', () => {
  const v = buildVCard(model, { eol: '\r\n', fold: true });
  if (!v) return;
  downloadBlob(new Blob([v + '\r\n'], { type: 'text/vcard;charset=utf-8' }), contactFileName(model, 'contact', 'vcf'));
  toast(t('vcfDownloaded'));
});

$('copyVcardBtn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(buildVCard(model) || '');
    toast(t('copied'));
  } catch {
    toast(t('copyFailed'), 'error');
  }
});

ecSelect.addEventListener('change', () => {
  model.ec = EC_LEVELS.includes(ecSelect.value) ? ecSelect.value : 'auto';
  scheduleRender();
});

// ===== save / restore =====
$('saveJsonBtn').addEventListener('click', () => {
  downloadBlob(new Blob([toJSON(model)], { type: 'application/json' }), contactFileName(model, 'contact', 'json'));
  toast(t('jsonSaved'));
});

$('exportCsvBtn').addEventListener('click', () => {
  downloadBlob(new Blob([modelToLegacyCSV(model)], { type: 'text/csv;charset=utf-8' }), contactFileName(model, 'contact', 'csv'));
  toast(t('csvSaved'));
});

$('importInput').addEventListener('change', async e => {
  const file = e.target.files[0];
  e.target.value = ''; // allow re-importing the same file
  if (!file) return;
  try {
    const text = await readFile(file);
    const clean = text.replace(/^﻿/, '').trimStart();
    if (clean.startsWith('{')) {
      const next = fromJSON(text);
      loadModel(next);
      toast(t('restored', countFilled(next)));
    } else if (/^BEGIN:VCARD/i.test(clean)) {
      const { model: next, photo, cards } = parseVCard(text);
      next.image = { ...model.image }; // keep the current image settings
      next.ec = model.ec;
      loadModel(next);
      let photoOk = false;
      if (photo) photoOk = await imageSource.setUploadFromSrc(photo.src).then(() => true, () => false);
      toast(t('restoredVcf', countFilled(next), cards, photoOk));
    } else {
      const { model: next, matched } = legacyCSVToModel(text);
      loadModel(next);
      toast(t('restored', matched));
    }
  } catch (err) {
    toast(t(err.code || 'importFailed'), 'error');
  }
});

$('clearBtn').addEventListener('click', () => {
  if (!window.confirm(t('clearConfirm'))) return;
  clearDraft();
  loadModel(createEmptyModel());
  toast(t('cleared'));
});

function countFilled(m) {
  const singles = Object.values(m.fields).filter(v => v.trim()).length;
  const multis = ['phones', 'emails', 'websites', 'socials', 'ims'].reduce((n, k) => n + m[k].filter(r => r.value.trim()).length, 0);
  const adr = m.addresses.filter(a => ['street', 'city', 'region', 'zip', 'country', 'pobox', 'ext'].some(k => a[k].trim())).length;
  return singles + multis + adr;
}

// ===== mobile bottom sheet =====
const qrPanel = $('qrPanel');
const backdrop = $('sheetBackdrop');
function openSheet(open) {
  qrPanel.classList.toggle('open', open);
  backdrop.classList.toggle('show', open);
  document.body.classList.toggle('sheet-open', open);
}
$('mobileBar').addEventListener('click', () => openSheet(true));
$('sheetClose').addEventListener('click', () => openSheet(false));
backdrop.addEventListener('click', () => openSheet(false));
document.addEventListener('keydown', e => { if (e.key === 'Escape') openSheet(false); });
window.matchMedia('(min-width: 901px)').addEventListener('change', e => { if (e.matches) openSheet(false); });

// ===== language switch (flags) =====
document.querySelectorAll('[data-lang-btn]').forEach(btn => btn.addEventListener('click', () => {
  setLang(btn.dataset.langBtn);
  form.rebuild();
  imageSource.relabel();
  syncGoogleBox();
  updateVCardPreview();
  render();
}));

// ===== start =====
loadModel(model);
syncGoogleBox();
