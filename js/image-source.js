// Centre-image picker: none / upload / Google photo / generated initials.
import { AVATAR_FONTS, AVATAR_PALETTES, getInitials, generateAvatar } from './avatar.js';
import * as google from './google.js';
import { h, toast, readFile, loadImage, downloadBlob } from './ui.js';
import { contactFileName } from './storage.js';
import { IMAGE_SIZES } from './fields-schema.js';
import { t, tr } from './i18n.js';

const MAX_UPLOAD = 512;

export function createImageSource({ getModel, onChange, onGoogleConnect }) {
  const $ = id => document.getElementById(id);
  const radios = [...document.querySelectorAll('input[name="imageMode"]')];
  const panels = [...document.querySelectorAll('[data-panel]')];
  const logoInput = $('logoInput');
  const uploadZone = $('logoUpload');
  const uploadPreview = $('logoPreview');
  const uploadImg = $('logoImg');
  const fontSelect = $('avatarFont');
  const swatches = $('avatarPalettes');
  const ringBox = $('avatarRing');
  const avatarPreview = $('avatarPreview');
  const avatarMsg = $('avatarMsg');
  const googlePhotoBox = $('googlePhotoBox');
  const bgInput = $('avatarBg');
  const bgReset = $('avatarBgReset');
  const sizeSelect = $('avatarSize');
  const sizeHint = $('avatarSizeHint');

  // Custom background colour (live while dragging the picker)
  bgInput.addEventListener('input', () => { getModel().image.bg = bgInput.value.toLowerCase(); sync(); onChange(); });
  bgReset.addEventListener('click', () => { getModel().image.bg = ''; sync(); onChange(); });
  sizeSelect.addEventListener('change', () => { getModel().image.size = sizeSelect.value; sync(); onChange(); });

  let uploadCache = { src: '', img: null };
  let avatarCache = { key: '', canvas: null };

  // ----- static controls (labels rebuilt on language change) -----
  function relabel() {
    fontSelect.replaceChildren(...AVATAR_FONTS.map(f => h('option', { value: f.id }, tr(`font.${f.id}`, f.label))));
    swatches.replaceChildren(...AVATAR_PALETTES.map(p => {
      const label = tr(`palette.${p.id}`, p.label);
      return h('button', {
        type: 'button', class: 'swatch', title: label, 'aria-label': label, 'data-id': p.id,
        style: `background: linear-gradient(135deg, ${p.bg[0]}, ${p.bg[1]}); color: ${p.fg[1]}`,
        // picking a palette also drops any custom background colour
        onclick: () => { const im = getModel().image; im.palette = p.id; im.bg = ''; sync(); onChange(); },
      }, 'Aa');
    }));
    avatarMsg.textContent = t('needNameForInitials');
    sync();
  }

  radios.forEach(r => r.addEventListener('change', () => {
    getModel().image.mode = r.value;
    sync();
    onChange();
  }));
  fontSelect.addEventListener('change', () => { getModel().image.font = fontSelect.value; onChange(); });
  ringBox.addEventListener('change', () => { getModel().image.ring = ringBox.checked; onChange(); });

  logoInput.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const img = await loadImage(await readFile(file, 'dataURL'));
      getModel().image.uploadDataUrl = downscale(img, file.type);
      sync();
      onChange();
    } catch {
      toast(t('imageReadFailed'), 'error');
    }
    logoInput.value = '';
  });
  $('removeLogo').addEventListener('click', () => {
    getModel().image.uploadDataUrl = '';
    sync();
    onChange();
  });

  $('avatarDownload').addEventListener('click', () => {
    const m = getModel();
    if (!avatarCache.canvas || !getInitials(m.fields.firstName, m.fields.lastName)) return toast(t('needNameForInitials'), 'error');
    avatarCache.canvas.toBlob(b => b && downloadBlob(b, contactFileName(m, 'avatar', 'png')), 'image/png');
  });

  // ----- view sync -----
  function sync() {
    const img = getModel().image;
    radios.forEach(r => { r.checked = r.value === img.mode; });
    panels.forEach(p => { p.hidden = p.dataset.panel !== img.mode; });

    const hasUpload = Boolean(img.uploadDataUrl);
    uploadZone.hidden = hasUpload;
    uploadPreview.hidden = !hasUpload;
    if (hasUpload) uploadImg.src = img.uploadDataUrl;

    fontSelect.value = AVATAR_FONTS.some(f => f.id === img.font) ? img.font : AVATAR_FONTS[0].id;
    ringBox.checked = img.ring;
    const pal = AVATAR_PALETTES.some(p => p.id === img.palette) ? img.palette : AVATAR_PALETTES[0].id;
    swatches.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', !img.bg && s.dataset.id === pal));
    bgInput.value = img.bg || AVATAR_PALETTES.find(p => p.id === pal).bg[0];
    bgReset.hidden = !img.bg;
    sizeSelect.value = IMAGE_SIZES.includes(img.size) ? img.size : 'normal';
    sizeHint.hidden = img.size !== 'full';

    syncGoogle();
  }

  function syncGoogle() {
    const photo = google.getPhoto();
    let content;
    if (!google.isConnected()) {
      content = [h('p', { class: 'hint' }, t('googleNeedConnect')),
        h('button', { type: 'button', class: 'btn btn-secondary btn-inline', onclick: onGoogleConnect }, t('googleConnectBtn'))];
    } else if (!photo) {
      content = [h('p', { class: 'hint' }, t('googleNoPhoto'))];
    } else {
      content = [h('img', { class: 'thumb', src: photo.src, alt: '' }), h('p', { class: 'hint' }, t('googlePhotoReady'))];
    }
    googlePhotoBox.replaceChildren(...content);
  }

  // ----- resolve the drawable for the current mode -----
  async function resolve() {
    const m = getModel();
    const img = m.image;
    switch (img.mode) {
      case 'upload': {
        if (!img.uploadDataUrl) return null;
        if (uploadCache.src !== img.uploadDataUrl) {
          uploadCache = { src: img.uploadDataUrl, img: await loadImage(img.uploadDataUrl) };
        }
        return uploadCache.img;
      }
      case 'google':
        return google.getPhoto();
      case 'initials': {
        const initials = getInitials(m.fields.firstName, m.fields.lastName);
        avatarMsg.hidden = Boolean(initials);
        if (!initials) { clearCanvas(avatarPreview); avatarCache = { key: '', canvas: null }; return null; }
        const key = JSON.stringify([initials, img.font, img.palette, img.bg, img.ring]);
        if (avatarCache.key !== key) {
          const canvas = await generateAvatar({ initials, fontId: img.font, paletteId: img.palette, bg: img.bg, ring: img.ring });
          avatarCache = { key, canvas };
          const ctx = avatarPreview.getContext('2d');
          ctx.clearRect(0, 0, avatarPreview.width, avatarPreview.height);
          ctx.drawImage(canvas, 0, 0, avatarPreview.width, avatarPreview.height);
        }
        return avatarCache.canvas;
      }
      default:
        return null;
    }
  }

  /** Use an image from a data: URL or https URL (e.g. a vCard PHOTO) as the uploaded image. */
  async function setUploadFromSrc(src) {
    let url = src;
    let revoke = null;
    if (/^https:\/\//i.test(src)) {
      const res = await fetch(src, { mode: 'cors' }); // only hosts allowed by the CSP will work
      if (!res.ok) throw new Error('photo');
      url = revoke = URL.createObjectURL(await res.blob());
    }
    try {
      const img = await loadImage(url);
      const im = getModel().image;
      im.uploadDataUrl = downscale(img, /jpe?g/i.test(src.slice(0, 30)) ? 'image/jpeg' : 'image/png');
      im.mode = 'upload';
    } finally {
      if (revoke) URL.revokeObjectURL(revoke);
    }
    sync();
    onChange();
  }

  relabel();
  return { sync, syncGoogle, resolve, relabel, setUploadFromSrc };
}

function clearCanvas(c) {
  c.getContext('2d').clearRect(0, 0, c.width, c.height);
}

/** Keep uploads small so they fit in the local draft. */
function downscale(img, mime) {
  const scale = Math.min(1, MAX_UPLOAD / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return /jpe?g/i.test(mime) ? c.toDataURL('image/jpeg', 0.9) : c.toDataURL('image/png');
}
