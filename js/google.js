// Google sign-in (Google Identity Services token flow) + read-only profile.
// The browser talks to Google directly; there is no backend and no secret.
import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from './config.js';

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const PEOPLE_URL = 'https://people.googleapis.com/v1/people/me?personFields=names,nicknames,emailAddresses,photos,organizations,urls,biographies';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

let tokenClient = null;
let token = null;
let profile = null;
let photo = null; // HTMLImageElement, CORS-safe
let pending = null;

export const isConfigured = () => Boolean(GOOGLE_CLIENT_ID);
export const isReady = () => Boolean(tokenClient);
export const isConnected = () => Boolean(token);
export const getProfile = () => profile;
export const getPhoto = () => photo;

/** Load GIS early so the popup opens directly from the click (no popup blocker). */
export function init() {
  if (!isConfigured()) return Promise.resolve(false);
  return new Promise(resolve => {
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.onload = () => {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_SCOPES,
        callback: r => {
          if (!pending) return;
          const p = pending; pending = null;
          if (r.error) p.reject(new Error(r.error_description || r.error));
          else p.resolve(r.access_token);
        },
        error_callback: e => {
          if (!pending) return;
          const p = pending; pending = null;
          p.reject(new Error(e?.message || e?.type || 'popup_failed'));
        },
      });
      resolve(true);
    };
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

/** Must be called synchronously from a click handler. */
export function connect() {
  if (!tokenClient) return Promise.reject(new Error('not_ready'));
  const tokenPromise = new Promise((resolve, reject) => { pending = { resolve, reject }; });
  tokenClient.requestAccessToken();
  return tokenPromise.then(async accessToken => {
    token = accessToken;
    profile = await fetchProfile(accessToken);
    photo = profile.photoUrl ? await loadPhoto(profile.photoUrl).catch(() => null) : null;
    return profile;
  });
}

export function disconnect() {
  if (token && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(token, () => {});
  token = null;
  profile = null;
  photo = null;
}

async function fetchProfile(accessToken) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  try {
    const res = await fetch(PEOPLE_URL, { headers });
    if (res.ok) return mapPeople(await res.json());
  } catch { /* fall back below */ }
  // Works even when the People API is not enabled in the Cloud project.
  const res = await fetch(USERINFO_URL, { headers });
  if (!res.ok) throw new Error('profile_failed');
  return mapUserInfo(await res.json());
}

const primary = arr => (Array.isArray(arr) ? arr.find(x => x?.metadata?.primary) || arr[0] : undefined);

function emailType(addr, type) {
  if (/work/i.test(type || '')) return 'WORK';
  if (/home/i.test(type || '')) return 'HOME';
  return /@(gmail|googlemail)\.com$/i.test(addr) ? 'HOME' : 'WORK';
}

export function mapPeople(p) {
  const n = primary(p.names) || {};
  const org = primary(p.organizations) || {};
  const photos = (p.photos || []).filter(x => !x.default);
  const ph = photos.find(x => x.metadata?.primary) || photos[0];
  return {
    displayName: n.displayName || '',
    prefix: n.honorificPrefix || '',
    firstName: n.givenName || '',
    middleName: n.middleName || '',
    lastName: n.familyName || '',
    suffix: n.honorificSuffix || '',
    phoneticFirst: n.phoneticGivenName || '',
    phoneticLast: n.phoneticFamilyName || '',
    nickname: primary(p.nicknames)?.value || '',
    company: org.name || '',
    department: org.department || '',
    jobTitle: org.title || '',
    notes: primary(p.biographies)?.value || '',
    emails: (p.emailAddresses || []).filter(e => e.value).map(e => ({ type: emailType(e.value, e.type), value: e.value })),
    websites: (p.urls || []).filter(u => u.value).map(u => ({ type: /work/i.test(u.type || '') ? 'WORK' : /blog/i.test(u.type || '') ? 'BLOG' : 'HOME', value: u.value })),
    photoUrl: ph?.url || '',
  };
}

export function mapUserInfo(u) {
  return {
    displayName: u.name || '',
    firstName: u.given_name || '',
    lastName: u.family_name || '',
    emails: u.email ? [{ type: emailType(u.email), value: u.email }] : [],
    websites: [],
    photoUrl: u.picture || '',
  };
}

/** Ask Google for a 512px version and load it without tainting the canvas. */
async function loadPhoto(url) {
  const sized = /=s\d+(-c)?$/.test(url) ? url.replace(/=s\d+(-c)?$/, '=s512-c') : url;
  try {
    const res = await fetch(sized, { mode: 'cors' });
    if (!res.ok) throw new Error('photo');
    const blobUrl = URL.createObjectURL(await res.blob());
    return await loadImage(blobUrl);
  } catch {
    return loadImage(sized, true);
  }
}

function loadImage(src, cors = false) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (cors) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const SINGLE_KEYS = ['prefix', 'firstName', 'middleName', 'lastName', 'suffix', 'phoneticFirst', 'phoneticLast', 'nickname', 'company', 'department', 'jobTitle', 'notes'];
const OPTIONAL_KEYS = ['phoneticFirst', 'phoneticLast', 'department'];

/** Would merging overwrite anything the user typed? */
export function hasConflicts(model, prof) {
  if (SINGLE_KEYS.some(k => prof[k] && model.fields[k]?.trim() && model.fields[k].trim() !== prof[k])) return true;
  const differs = (list, incoming) => incoming.length && list.some(r => r.value.trim()) &&
    incoming.some(i => !list.some(r => r.value.trim().toLowerCase() === i.value.toLowerCase()));
  return differs(model.emails, prof.emails || []) || differs(model.websites, prof.websites || []);
}

/** Merge a Google profile into the model. Returns the number of fields filled. */
export function mergeProfile(model, prof, overwrite) {
  let n = 0;
  for (const k of SINGLE_KEYS) {
    if (!prof[k]) continue;
    if (!overwrite && model.fields[k]?.trim()) continue;
    if (model.fields[k] === prof[k]) continue;
    model.fields[k] = prof[k];
    if (OPTIONAL_KEYS.includes(k) && !model.visibleOptional.includes(k)) model.visibleOptional.push(k);
    n++;
  }
  const mergeList = (key, incoming) => {
    if (!incoming?.length) return;
    if (overwrite) {
      model[key] = incoming.map(x => ({ ...x }));
      n += incoming.length;
      return;
    }
    for (const item of incoming) {
      if (model[key].some(r => r.value.trim().toLowerCase() === item.value.toLowerCase())) continue;
      const empty = model[key].find(r => !r.value.trim());
      if (empty) { empty.type = item.type; empty.value = item.value; } else model[key].push({ ...item });
      n++;
    }
  };
  mergeList('emails', prof.emails);
  mergeList('websites', prof.websites);
  return n;
}
