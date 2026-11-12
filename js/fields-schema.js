// Declarative description of every contact field the form supports.
// The form UI, vCard builder, storage and Google import all read from here.

/** Sections, in the order they appear in the form. */
export const SECTIONS = [
  { id: 'name', title: 'Name', kind: 'single' },
  { id: 'phones', title: 'Phone numbers', kind: 'multi' },
  { id: 'emails', title: 'Email addresses', kind: 'multi' },
  { id: 'websites', title: 'Websites', kind: 'multi' },
  { id: 'socials', title: 'Social profiles', kind: 'multi' },
  { id: 'ims', title: 'Messaging', kind: 'multi' },
  { id: 'work', title: 'Work', kind: 'single' },
  { id: 'addresses', title: 'Addresses', kind: 'address' },
  { id: 'more', title: 'Notes & more', kind: 'single' },
];

/**
 * Single-value fields. `optional: true` fields are hidden until the user
 * picks them from "Add another field" (or until they hold a value).
 */
export const SINGLE_FIELDS = [
  { key: 'firstName', section: 'name', label: 'First name *', placeholder: 'John' },
  { key: 'lastName', section: 'name', label: 'Last name', placeholder: 'Doe' },
  { key: 'middleName', section: 'name', label: 'Middle name(s)', placeholder: 'Michael' },
  {
    key: 'prefix', section: 'name', label: 'Prefix', placeholder: 'Dr.',
    // suggestions only — free text is always allowed
    suggestions: {
      en: ['Mr.', 'Mrs.', 'Ms.', 'Miss', 'Mx.', 'Dr.', 'Prof.', 'Adv.', 'Eng.', 'Rabbi', 'Rev.', 'Hon.', 'Sir', 'Dame'],
      he: ['מר', 'גב׳', 'ד״ר', 'פרופ׳', 'עו״ד', 'רו״ח', 'מהנדס/ת', 'אדריכל/ית', 'הרב', 'הרבנית', 'רס״ן', 'סא״ל', 'אל״ם', 'תא״ל'],
    },
  },
  {
    key: 'suffix', section: 'name', label: 'Suffix', placeholder: 'Jr., PhD',
    suggestions: {
      en: ['Jr.', 'Sr.', 'II', 'III', 'IV', 'PhD', 'MD', 'DDS', 'MBA', 'MSc', 'MA', 'BSc', 'BA', 'CPA', 'Esq.', 'RN', 'PE'],
    },
  },
  { key: 'birthday', section: 'name', label: 'Birthday', type: 'date' },
  {
    key: 'nickname', section: 'name', label: 'Nickname', placeholder: 'Johnny',
    hint: 'For example, your name in another language, or what friends call you',
  },
  { key: 'phoneticFirst', section: 'name', label: 'Phonetic first name', placeholder: '', optional: true },
  { key: 'phoneticLast', section: 'name', label: 'Phonetic last name', placeholder: '', optional: true },

  { key: 'company', section: 'work', label: 'Company', placeholder: 'Acme Inc.' },
  { key: 'department', section: 'work', label: 'Department', placeholder: 'Product', optional: true },
  { key: 'jobTitle', section: 'work', label: 'Job title', placeholder: 'Product Manager' },
  { key: 'role', section: 'work', label: 'Role', placeholder: 'Team lead', optional: true },

  { key: 'notes', section: 'more', label: 'Notes', placeholder: 'Anything extra…', type: 'textarea' },
  { key: 'anniversary', section: 'more', label: 'Anniversary', type: 'date', optional: true },
  { key: 'categories', section: 'more', label: 'Categories (comma separated)', placeholder: 'Friends, Work', optional: true },
  { key: 'timezone', section: 'more', label: 'Time zone (UTC offset)', placeholder: '+02:00', optional: true },
  { key: 'geo', section: 'more', label: 'Location (latitude, longitude)', placeholder: '32.0853, 34.7818', optional: true },
];

/** Repeatable "type + value" fields. */
export const MULTI_FIELDS = [
  {
    key: 'phones', addLabel: 'Add phone', inputType: 'tel', placeholder: '+972 50 123 4567',
    defaultType: 'CELL',
    types: [['CELL', 'Mobile'], ['WORK', 'Work'], ['HOME', 'Home'], ['MAIN', 'Main'], ['FAX', 'Fax'], ['PAGER', 'Pager'], ['OTHER', 'Other']],
  },
  {
    key: 'emails', addLabel: 'Add email', inputType: 'email', placeholder: 'john@example.com',
    defaultType: 'WORK',
    types: [['WORK', 'Work'], ['HOME', 'Personal'], ['OTHER', 'Other']],
  },
  {
    key: 'websites', addLabel: 'Add website', inputType: 'url', placeholder: 'https://example.com',
    defaultType: 'WORK',
    types: [['WORK', 'Work'], ['HOME', 'Personal'], ['BLOG', 'Blog'], ['PORTFOLIO', 'Portfolio'], ['OTHER', 'Other']],
  },
  {
    key: 'socials', addLabel: 'Add social profile', inputType: 'text', placeholder: 'Username or profile URL',
    defaultType: 'LINKEDIN',
    types: [['LINKEDIN', 'LinkedIn'], ['X', 'X (Twitter)'], ['GITHUB', 'GitHub'], ['INSTAGRAM', 'Instagram'], ['FACEBOOK', 'Facebook'], ['YOUTUBE', 'YouTube'], ['TIKTOK', 'TikTok'], ['OTHER', 'Other']],
  },
  {
    key: 'ims', addLabel: 'Add messaging account', inputType: 'text', placeholder: 'Username',
    defaultType: 'TELEGRAM',
    types: [['TELEGRAM', 'Telegram'], ['WHATSAPP', 'WhatsApp'], ['SIGNAL', 'Signal'], ['SKYPE', 'Skype'], ['TEAMS', 'Teams'], ['OTHER', 'Other']],
  },
];

export const ADDRESS_TYPES = [['WORK', 'Work'], ['HOME', 'Home'], ['OTHER', 'Other']];

export const ADDRESS_PARTS = [
  { key: 'street', label: 'Street', placeholder: '123 Main St', wide: true },
  { key: 'city', label: 'City', placeholder: 'Tel Aviv' },
  { key: 'region', label: 'State / Region', placeholder: '' },
  { key: 'zip', label: 'ZIP', placeholder: '' },
  { key: 'country', label: 'Country', placeholder: 'Israel' },
  { key: 'pobox', label: 'PO box', placeholder: '' },
  { key: 'ext', label: 'Apt / Suite', placeholder: '' },
];

export const IMAGE_MODES = ['none', 'upload', 'google', 'initials'];
/** Size of the initials image inside the QR: centre (today), larger centre, behind the whole code. */
export const IMAGE_SIZES = ['normal', 'large', 'full'];
export const EC_LEVELS = ['auto', 'L', 'M', 'Q', 'H'];
