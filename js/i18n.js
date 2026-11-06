// Internationalisation: English (default) + Hebrew (RTL).
//
// Language choice: ?lang=xx in the URL > choice saved in this browser >
// browser language preference (navigator.languages — the same list the
// browser sends in the Accept-Language header; a static GitHub Pages site
// cannot read request headers, so this is the client-side equivalent).
//
// Static HTML: elements with data-i18n="key" get their innerHTML replaced;
// the English text lives in index.html itself and is restored for 'en'.
// data-i18n-attr="placeholder:key;aria-label:key2" does the same for attributes.

export const LANGS = ['en', 'he'];
const RTL = ['he'];
const STORE_KEY = 'contact-qr:lang';

const en = {
  docTitle: 'Contact QR Code Generator',
  enterName: 'Enter a name to generate your QR code',
  tapToView: 'Tap to view & download',
  tooMuchData: 'Too much data for one QR code. Shorten the notes, remove some fields, or lower the error correction.',
  pngDownloaded: 'PNG downloaded.',
  vcfDownloaded: '.vcf file downloaded.',
  jsonSaved: 'Contact saved as JSON.',
  csvSaved: 'CSV downloaded.',
  restored: n => `Restored ${n} field${n === 1 ? '' : 's'}.`,
  importFailed: 'Could not read that file. Use a JSON or CSV saved from this app, or a vCard (.vcf) file.',
  vcfInvalid: 'That file does not contain a vCard contact.',
  shareNotReady: 'The image is still being prepared. Try again in a second.',
  shareFallback: 'Sharing is not available here, so the image was downloaded instead.',
  photosDesktop: 'Image saved. Google Photos opened in a new tab: drag the downloaded file into it to upload.',
  restoredVcf: (n, cards, photo) => `Imported ${n} field${n === 1 ? '' : 's'}${photo ? ' and the photo' : ''} from the vCard.` +
    (cards > 1 ? ` The file has ${cards} contacts, so only the first was imported.` : ''),
  csvNeedsRows: 'CSV must contain a header row and a data row.',
  csvNoColumns: 'No recognised columns found. Use a CSV downloaded from this app.',
  imageReadFailed: 'Could not read that image file.',
  pngFailed: 'Could not generate the PNG image.',
  clearConfirm: 'Clear all fields? This cannot be undone.',
  cleared: 'Form cleared.',
  copied: 'vCard copied to clipboard.',
  copyFailed: 'Could not copy — select the text and copy manually.',
  bytes: n => `${n.toLocaleString('en')} bytes`,
  capacity: (used, max, ec) => `${used.toLocaleString('en')} / ${max.toLocaleString('en')} bytes · error correction ${ec}`,

  googleConnectBtn: 'Connect Google',
  googleRefillBtn: 'Refill from Google',
  googleTitleIdle: 'Fill from your Google account',
  googleTitleConnected: name => `Connected as ${name}`,
  googleSubIdle: 'Reads only your basic profile (name, email, photo) — read-only, straight from Google into this page.',
  googleSubConnected: 'Your browser read your basic profile directly from Google. Nothing was stored or sent anywhere else.',
  googleSubNotConfigured: 'Not configured yet — add a Google OAuth Client ID in js/config.js (see README).',
  googleNotConfigured: 'Google sign-in is not configured yet. Add your OAuth Client ID to js/config.js (see README).',
  googleLoading: 'Google sign-in is still loading — try again in a second.',
  googleFailed: 'Google sign-in was cancelled or failed.',
  googleFilled: n => (n ? `Filled ${n} field${n === 1 ? '' : 's'} from your Google account.` : 'Connected — nothing new to fill.'),
  googleOverwrite: 'Some fields already have values. Replace them with your Google details?\n\nOK = replace, Cancel = only fill empty fields.',
  googleDisconnected: 'Disconnected from Google.',
  googleNeedConnect: 'Connect your Google account to use your profile photo.',
  googleNoPhoto: 'Your Google account has no custom profile photo.',
  googlePhotoReady: 'Using your Google profile photo.',
  googleUser: 'Google user',
  needNameForInitials: 'Enter a first or last name to generate initials.',

  'form.addField': '＋ Add another field…',
  'form.remove': 'Remove',
  'form.type': 'Type',
  'form.addressType': 'Address type',
  'form.removeAddress': 'Remove address',
  'add.addresses': 'Add address',
};

const he = {
  docTitle: 'מחולל QR לכרטיס ביקור',
  enterName: 'הזינו שם כדי ליצור את קוד ה-QR',
  tapToView: 'הקישו לצפייה ולהורדה',
  tooMuchData: 'יותר מדי מידע לקוד QR אחד. קצרו את ההערות, הסירו כמה שדות או הורידו את רמת תיקון השגיאות.',
  pngDownloaded: 'קובץ ה-PNG הורד.',
  vcfDownloaded: 'קובץ ה-vcf הורד.',
  jsonSaved: 'איש הקשר נשמר כקובץ JSON.',
  csvSaved: 'קובץ ה-CSV הורד.',
  restored: n => (n === 1 ? 'שוחזר שדה אחד.' : `שוחזרו ${n} שדות.`),
  importFailed: 'לא ניתן לקרוא את הקובץ. השתמשו בקובץ JSON או CSV שנשמר מהאפליקציה הזו, או בקובץ vCard ‏(vcf).',
  vcfInvalid: 'הקובץ לא מכיל איש קשר בפורמט vCard.',
  shareNotReady: 'התמונה עדיין בהכנה. נסו שוב בעוד רגע.',
  shareFallback: 'שיתוף לא זמין כאן, לכן התמונה הורדה במקום.',
  photosDesktop: 'התמונה נשמרה. Google Photos נפתח בלשונית חדשה: גררו אליו את הקובץ שהורד כדי להעלות אותו.',
  restoredVcf: (n, cards, photo) => `${n === 1 ? 'יובא שדה אחד' : `יובאו ${n} שדות`}${photo ? ' והתמונה' : ''} מקובץ ה-vCard.` +
    (cards > 1 ? ` בקובץ יש ${cards} אנשי קשר, ולכן יובא רק הראשון.` : ''),
  csvNeedsRows: 'קובץ ה-CSV חייב לכלול שורת כותרות ושורת נתונים.',
  csvNoColumns: 'לא נמצאו עמודות מוכרות. השתמשו בקובץ CSV שהורד מהאפליקציה הזו.',
  imageReadFailed: 'לא ניתן לקרוא את קובץ התמונה.',
  pngFailed: 'לא ניתן ליצור את תמונת ה-PNG.',
  clearConfirm: 'לנקות את כל השדות? אי אפשר לבטל את הפעולה.',
  cleared: 'הטופס נוקה.',
  copied: 'ה-vCard הועתק ללוח.',
  copyFailed: 'ההעתקה נכשלה. סמנו את הטקסט והעתיקו ידנית.',
  bytes: n => `${n.toLocaleString('he')} בייטים`,
  capacity: (used, max, ec) => `${used.toLocaleString('he')} / ${max.toLocaleString('he')} בייטים · תיקון שגיאות ${ec}`,

  googleConnectBtn: 'התחברות לגוגל',
  googleRefillBtn: 'מילוי מחדש מגוגל',
  googleTitleIdle: 'מילוי אוטומטי מחשבון הגוגל שלכם',
  googleTitleConnected: name => `מחובר/ת כ-${name}`,
  googleSubIdle: 'קורא רק את הפרופיל הבסיסי (שם, מייל, תמונה), לקריאה בלבד, ישירות מגוגל לדף הזה.',
  googleSubConnected: 'הדפדפן שלכם קרא את הפרופיל הבסיסי ישירות מגוגל. שום דבר לא נשמר ולא נשלח לשום מקום אחר.',
  googleSubNotConfigured: 'עדיין לא הוגדר. יש להוסיף Google OAuth Client ID בקובץ js/config.js (ראו README).',
  googleNotConfigured: 'ההתחברות לגוגל עדיין לא הוגדרה. יש להוסיף OAuth Client ID בקובץ js/config.js (ראו README).',
  googleLoading: 'ההתחברות לגוגל עדיין נטענת. נסו שוב בעוד רגע.',
  googleFailed: 'ההתחברות לגוגל בוטלה או נכשלה.',
  googleFilled: n => (n ? (n === 1 ? 'מולא שדה אחד מחשבון הגוגל שלכם.' : `מולאו ${n} שדות מחשבון הגוגל שלכם.`) : 'מחובר. אין פרטים חדשים למילוי.'),
  googleOverwrite: 'בחלק מהשדות כבר יש ערכים. להחליף אותם בפרטים מגוגל?\n\nאישור = החלפה, ביטול = מילוי שדות ריקים בלבד.',
  googleDisconnected: 'ההתנתקות מגוגל בוצעה.',
  googleNeedConnect: 'התחברו לחשבון הגוגל כדי להשתמש בתמונת הפרופיל שלכם.',
  googleNoPhoto: 'לחשבון הגוגל שלכם אין תמונת פרופיל מותאמת.',
  googlePhotoReady: 'משתמשים בתמונת הפרופיל שלכם מגוגל.',
  googleUser: 'משתמש/ת גוגל',
  needNameForInitials: 'הזינו שם פרטי או שם משפחה כדי ליצור ראשי תיבות.',

  // ----- form (schema labels) -----
  'form.addField': '＋ הוספת שדה נוסף…',
  'form.remove': 'הסרה',
  'form.type': 'סוג',
  'form.addressType': 'סוג כתובת',
  'form.removeAddress': 'הסרת כתובת',

  'section.name': 'שם',
  'section.phones': 'מספרי טלפון',
  'section.emails': 'כתובות מייל',
  'section.websites': 'אתרים',
  'section.socials': 'רשתות חברתיות',
  'section.ims': 'אפליקציות הודעות',
  'section.work': 'עבודה',
  'section.addresses': 'כתובות',
  'section.more': 'הערות ועוד',

  'field.prefix': 'תואר',
  'field.firstName': 'שם פרטי *',
  'field.middleName': 'שם אמצעי',
  'ph.middleName': 'מיכאל',
  'field.lastName': 'שם משפחה',
  'field.suffix': 'סיומת',
  'field.nickname': 'כינוי',
  'field.phoneticFirst': 'שם פרטי (הגייה)',
  'field.phoneticLast': 'שם משפחה (הגייה)',
  'field.company': 'חברה',
  'field.department': 'מחלקה',
  'field.jobTitle': 'תפקיד',
  'field.role': 'תחום אחריות',
  'field.notes': 'הערות',
  'field.birthday': 'יום הולדת',
  'field.anniversary': 'יום נישואין',
  'field.categories': 'קטגוריות (מופרדות בפסיק)',
  'field.timezone': 'אזור זמן (הפרש מ-UTC)',
  'field.geo': 'מיקום (קו רוחב, קו אורך)',

  'ph.prefix': 'ד״ר',
  'ph.firstName': 'ישראל',
  'ph.lastName': 'ישראלי',
  'ph.nickname': 'שרוליק',
  'ph.suffix': 'PhD',
  'ph.company': 'חברה בע״מ',
  'ph.department': 'מוצר',
  'ph.jobTitle': 'מנהל/ת מוצר',
  'ph.role': 'ראש צוות',
  'ph.notes': 'כל דבר נוסף…',
  'ph.categories': 'חברים, עבודה',
  'ph.phones': '050-123-4567',
  'ph.socials': 'שם משתמש או קישור לפרופיל',
  'ph.ims': 'שם משתמש',

  'add.phones': 'הוספת טלפון',
  'add.emails': 'הוספת מייל',
  'add.websites': 'הוספת אתר',
  'add.socials': 'הוספת רשת חברתית',
  'add.ims': 'הוספת חשבון הודעות',
  'add.addresses': 'הוספת כתובת',

  'type.CELL': 'נייד',
  'type.WORK': 'עבודה',
  'type.HOME': 'בית',
  'type.MAIN': 'ראשי',
  'type.FAX': 'פקס',
  'type.PAGER': 'זימונית',
  'type.OTHER': 'אחר',
  'type.BLOG': 'בלוג',
  'type.PORTFOLIO': 'תיק עבודות',
  'type.emails.HOME': 'אישי',
  'type.websites.HOME': 'אישי',

  'adr.street': 'רחוב ומספר',
  'adr.city': 'עיר',
  'adr.region': 'מחוז / אזור',
  'adr.zip': 'מיקוד',
  'adr.country': 'מדינה',
  'adr.pobox': 'ת.ד.',
  'adr.ext': 'דירה / כניסה',
  'adrph.street': 'הרצל 1',
  'adrph.city': 'תל אביב',
  'adrph.country': 'ישראל',

  'font.cinzel': 'Cinzel: קלאסי',
  'font.cormorant': 'Cormorant: אלגנטי',
  'font.playfair': 'Playfair: עיתונאי',
  'font.inter': 'Inter: מודרני',
  'palette.navy-gold': 'כחול כהה וזהב',
  'palette.ivory-ink': 'שנהב ודיו',
  'palette.charcoal-silver': 'פחם וכסף',
  'palette.indigo': 'אינדיגו',
  'palette.emerald': 'ירוק אמרלד ושמנת',
  'palette.burgundy': 'בורדו ושמפניה',

  // ----- static page (index.html data-i18n keys) -----
  'header.title': '📇 מחולל QR לכרטיס ביקור',
  'header.sub': 'ממלאים את הפרטים פעם אחת. כל אחד יכול לסרוק את הקוד במצלמת הטלפון ולשמור אתכם באנשי הקשר בהקשה אחת.',
  'privacy.headline': 'המידע שלכם לא יוצא מהדפדפן.',
  'privacy.text': '<strong>אין שרת. אין מסד נתונים. אין העלאות. אין מעקב.</strong> הדף הזה הוא JavaScript פשוט שרץ על המכשיר שלכם. קוד ה-QR, התמונה וכל שדה שאתם מקלידים נוצרים כאן, ושום דבר לא נשלח אלינו או לשום שרת ענן. זה כל הרעיון, ובגלל זה זה כל כך מגניב.',
  'privacy.small': 'ההתקדמות שלכם נשמרת כטיוטה <em>בדפדפן הזה בלבד</em> (אפשר למחוק אותה בכל רגע עם „ניקוי הטופס”). אם תבחרו להתחבר לגוגל, הדפדפן שלכם קורא את הפרופיל הבסיסי ישירות מגוגל, והמידע לא עובר דרך אף אחד אחר.',
  'google.disconnect': 'התנתקות',
  'image.title': 'תמונה במרכז',
  'image.none': 'ללא',
  'image.upload': 'העלאה',
  'image.google': 'תמונת גוגל',
  'image.initials': 'ראשי תיבות',
  'image.noneHint': 'קוד QR נקי, בלי תמונה באמצע.',
  'image.uploadHint': '📷 לחצו או גררו תמונה לכאן<br>היא משתלבת בדוגמת ה-QR ולא יוצאת מהמכשיר שלכם',
  'image.uploadAria': 'העלאת תמונה',
  'image.remove': '✕ הסרה',
  'image.font': 'גופן',
  'image.colors': 'צבעים',
  'image.ring': 'טבעת דקורטיבית',
  'image.downloadAvatar': '⬇ הורדת תמונת ראשי התיבות',
  'image.bg': 'צבע רקע',
  'image.bgReset': 'חזרה לצבע הערכה',
  'image.size': 'גודל בתוך קוד ה-QR',
  'size.normal': 'רגיל (במרכז)',
  'size.large': 'גדול (במרכז)',
  'size.full': 'מלא (מאחורי כל הקוד)',
  'size.fullHint': 'סגנון אומנותי: סרקו בדיקה עם הטלפון לפני הדפסה או שיתוף.',
  'save.title': 'שמירה / שחזור',
  'save.json': '💾 שמירה (JSON)',
  'save.import': '📂 ייבוא JSON / CSV / vCard',
  'save.importAria': 'ייבוא קובץ JSON, ‏CSV או vCard ‏(vcf)',
  'save.csv': '📄 ייצוא CSV',
  'save.clear': '🗑 ניקוי הטופס',
  'save.hint': 'הקבצים נשמרים במכשיר שלכם ונקראים ממנו בלבד.',
  'qr.close': 'סגירה',
  'qr.placeholder': 'הזינו שם כדי ליצור<br>את קוד ה-QR',
  'qr.png': '⬇ הורדת PNG',
  'qr.vcf': '⬇ הורדת קובץ vcf',
  'qr.photos': '📤 שיתוף ל-Google Photos',
  'qr.photosHint': 'בטלפון: בחרו Google Photos בתפריט השיתוף. במחשב: התמונה נשמרת ו-Google Photos נפתח כדי שתגררו אותה פנימה.<br>התמונה מתוארכת ל-<strong>19/09/2037</strong>, כדי שתישאר תמיד בראש הגלריה. אם מופיע תאריך אחר, פתחו אותה והשתמשו ב-ⓘ ← <em>עריכת תאריך ושעה</em>.',
  'qr.ec': 'תיקון שגיאות',
  'qr.ecAuto': 'אוטומטי (H עם תמונה, M בלי)',
  'qr.ecL': 'L: ‏7%, הכי הרבה מידע',
  'qr.ecM': 'M: ‏15%',
  'qr.ecQ': 'Q: ‏25%',
  'qr.ecH': 'H: ‏30%, הכי עמיד',
  'qr.note': 'מקודד כ-vCard 3.0. סרקו בכל מצלמה של iPhone או Android כדי להוסיף את איש הקשר.',
  'why.title': 'למה זה מגניב?',
  'why.you.title': 'בשבילכם',
  'why.you.p1': '<strong>כרטיס הביקור שלכם תמיד במרחק הקשה.</strong> הורידו את קוד ה-QR ושמרו אותו ב-Google Photos.',
  'why.you.p2': '<strong>טיפ:</strong> השתמשו ב<em>שיתוף ל-Google Photos</em>. התמונה מתוארכת ל-<strong>19/09/2037</strong>, ומאחר ש-Google Photos ממיין לפי תאריך, קוד ה-QR יישאר תמיד בראש הגלריה.',
  'why.you.p3': 'רוצים אותו עוד יותר קרוב? אפליקציות ווידג׳ט לתמונות כמו <a href="https://play.google.com/store/apps/details?id=com.nbow.photowidget" target="_blank" rel="noopener noreferrer">Photo Widget</a> יכולות להציב אותו ישירות במסך הבית של הטלפון.',
  'why.scan.title': 'בשביל מי שסורק',
  'why.scan.p1': '<strong>בלי אפליקציה, בלי הקלדה, בלי שגיאות כתיב.</strong> פשוט מכוונים את מצלמת הטלפון אל הקוד.',
  'why.scan.p2': 'אפליקציית אנשי הקשר נפתחת אוטומטית עם כל הפרטים שלכם כבר ממולאים: שם, טלפונים, מיילים, אתרים, חברה וכתובת. כל מה שנשאר זה ללחוץ <strong>שמירה</strong>.',
  'why.privacy.title': 'בשביל הפרטיות שלכם',
  'why.privacy.p': '<strong>הכול קורה בדפדפן שלכם.</strong> אין שרת מאחורי הדף הזה, אז אין מה לפרוץ, למכור או להדליף. הפרטים שלכם נמצאים רק במכשיר שלכם ובתוך קוד ה-QR שאתם בוחרים לשתף.',
  'vcard.title': 'vCard בזמן אמת',
  'vcard.copy': 'העתקה',
  'vcard.hint': 'זה בדיוק הטקסט שנשמר בתוך קוד ה-QR. הוא מתעדכן תוך כדי הקלדה.',
  'footer.idea': 'הרעיון המקורי: <a href="https://dub.sh/eshai" target="_blank" rel="noopener noreferrer"><strong>Shai Ehud</strong></a>',
  'footer.small': 'JavaScript פשוט · רץ כולו בדפדפן שלכם · שום דבר לא מועלה',
  'mobile.title': 'קוד ה-QR שלכם',
  'mobile.show': 'הצגת QR',
  'mobile.aria': 'הצגת קוד ה-QR',
  'lang.label': 'שפה',
};

const DICTS = { en, he };
let lang = detectLang();

function detectLang() {
  try {
    const q = new URLSearchParams(globalThis.location?.search || '').get('lang');
    if (LANGS.includes(q)) return q;
  } catch { /* ignore */ }
  try {
    const saved = globalThis.localStorage?.getItem(STORE_KEY);
    if (LANGS.includes(saved)) return saved;
  } catch { /* ignore */ }
  const prefs = globalThis.navigator?.languages?.length ? navigator.languages : [globalThis.navigator?.language || 'en'];
  for (const p of prefs) {
    const base = String(p).toLowerCase().split('-')[0];
    if (base === 'he' || base === 'iw') return 'he';
    if (base === 'en') return 'en';
  }
  return 'en';
}

export const getLang = () => lang;
export const isRTL = () => RTL.includes(lang);

/** Translate a key. `fallback` (usually the English text from the schema) is used when missing. */
export function t(key, ...args) {
  const v = DICTS[lang][key] ?? en[key];
  if (v === undefined) return args.length && typeof args[0] === 'string' ? args[0] : key;
  return typeof v === 'function' ? v(...args) : v;
}

/** Translate with an explicit English fallback (schema-driven labels). */
export function tr(key, fallback) {
  const v = lang === 'en' ? undefined : DICTS[lang][key];
  return v === undefined ? (en[key] ?? fallback) : v;
}

export function setLang(next, { persist = true } = {}) {
  if (!LANGS.includes(next)) return;
  lang = next;
  if (persist) { try { localStorage.setItem(STORE_KEY, next); } catch { /* ignore */ } }
  applyStatic();
}

/** Apply translations to the static HTML. */
export function applyStatic(root = document) {
  document.documentElement.lang = lang;
  document.documentElement.dir = isRTL() ? 'rtl' : 'ltr';
  document.title = t('docTitle');

  root.querySelectorAll('[data-i18n]').forEach(el => {
    if (el.__i18nOrig === undefined) el.__i18nOrig = el.innerHTML;
    const v = lang === 'en' ? undefined : DICTS[lang][el.dataset.i18n];
    el.innerHTML = v ?? el.__i18nOrig; // trusted strings from this file only
  });
  root.querySelectorAll('[data-i18n-attr]').forEach(el => {
    el.__i18nAttrOrig ??= {};
    el.dataset.i18nAttr.split(';').forEach(pair => {
      const [attr, key] = pair.split(':').map(s => s.trim());
      if (!(attr in el.__i18nAttrOrig)) el.__i18nAttrOrig[attr] = el.getAttribute(attr) ?? '';
      const v = lang === 'en' ? undefined : DICTS[lang][key];
      el.setAttribute(attr, v ?? el.__i18nAttrOrig[attr]);
    });
  });
  root.querySelectorAll('[data-lang-btn]').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.langBtn === lang));
  });
}
