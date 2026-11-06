# 📇 Contact QR Code Generator

<h2 align="center">👉 <a href="https://zacsadan.github.io/qr/">Open the app: zacsadan.github.io/qr</a> 👈</h2>

Turn your contact details into a QR code. Anyone can scan it with a normal phone camera, and their contacts app opens with all your details filled in. They just tap **Save**.

**🔒 Your data never leaves your browser.** There is no server, no database, no uploads and no tracking. The page is static HTML and plain JavaScript; the vCard, the QR code and the images are all generated on your device.

> Original idea by **[Shai Ehud](https://dub.sh/eshai)**.

## Features

- **vCard 3.0 QR code** that works with the built-in iPhone and Android camera apps (UTF-8, so Hebrew and other scripts work).
- **Every common vCard field**, with repeatable rows: several phones, emails, websites, social profiles, messaging accounts and addresses. The name section has first, last and middle name, plus prefix and suffix with suggestion lists (Mr., Dr., Prof., עו״ד… / Jr., PhD, MBA…) that still accept free text. Optional fields (nickname, department, birthday, anniversary, categories, time zone, location…) are behind "＋ Add another field".
- **Center image, 4 modes.** The default is *Initials*, or *Google photo* once you sign in with Google and your account has a photo.
  - *Initials*: a generated monogram (e.g. *Zac Sadan* → **ZS**) with a choice of fonts, color palettes or any custom background color (the text color adapts automatically). Three sizes: *Normal* (center), *Large* (center) and *Full* (spread over the whole code: every square takes its color from the monogram, shaded dark or light so it still scans). It can also be downloaded as an avatar PNG.
  - *Google photo*: your Google profile picture (needs Google sign-in)
  - *Upload*: your own image, blended into the QR pattern
  - *None*: a plain QR code
- **Google sign-in (optional, read-only)** prefills name, email, organization and photo from your basic Google profile.
- **Live vCard view** shows the exact text inside the QR code as you type, with byte count and copy button.
- **Capacity meter + error-correction control** (auto: H with an image, M without).
- **Downloads**: QR as PNG, `.vcf` file, and save/restore as JSON. CSV export/import is compatible with the original single-file app.
- **Share to Google Photos**: on a phone it opens the share menu (pick Google Photos); on a computer it saves the image and opens photos.google.com to drag it in. Then set the photo's date to 2050 in Google Photos (*Edit date & time*) to keep it at the top. An automatic EXIF date was tried and dropped: Google Photos misreads future EXIF dates as Jan 30, 1970.
- **Import a vCard (.vcf)** from Google Contacts, iPhone, Android or Outlook (vCard 2.1 / 3.0 / 4.0), including the contact photo.
- **English + Hebrew (RTL)**. The language is detected from the browser and can be switched with the 🇺🇸 / 🇮🇱 flags.
- **Responsive**: two columns on desktop; on mobile the QR code sits in a bottom sheet with a sticky preview bar.
- Light and dark theme follow the operating system.

## Run locally

Requires [Node.js](https://nodejs.org/) 20+ (only for the dev server and the tests; the app itself has no build step).

```bash
npm start        # serves the folder at http://localhost:8080
npm test         # unit tests (Node's built-in test runner)
```

Open <http://localhost:8080>. Any static server works, e.g. `python -m http.server 8080`. Opening `index.html` straight from disk (`file://`) is **not** supported because ES modules and Google sign-in need an `http://` origin.

Language override for testing: `http://localhost:8080/?lang=he` or `?lang=en`.

## Google sign-in setup (optional)

Without a Client ID the app works fully; only the Google button is disabled.

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create (or pick) a project.
2. **APIs & Services → Library**: enable **People API** (recommended; without it the app falls back to the basic `userinfo` endpoint).
3. **APIs & Services → OAuth consent screen**: user type *External*, add app name and support email, scopes `openid`, `email`, `profile` (all non-sensitive). While in *Testing* mode, add your Google account as a test user.
4. **Credentials → Create credentials → OAuth client ID → Web application**
   - Authorized JavaScript origins: `http://localhost:8080` (later also `https://<your-user>.github.io`)
   - No redirect URI is needed (token popup flow).
5. Paste the Client ID into [`js/config.js`](js/config.js):
   ```js
   export const GOOGLE_CLIENT_ID = '1234567890-abc.apps.googleusercontent.com';
   ```

An OAuth **Client ID is public by design**: it is visible in every web page that uses Google sign-in and is protected by the *authorized origins* list, not by secrecy. **Never** put a *Client secret* or API key with billing in this repository; this app doesn't need one.

## GitHub Pages

Live at **<https://zacsadan.github.io/qr/>**, deployed from branch `main`, folder `/ (root)` (**Settings → Pages**). Every push to `main` redeploys. All paths are relative, so it works under the `/qr/` sub-path. For Google sign-in, `https://zacsadan.github.io` must be in the OAuth client's authorized JavaScript origins.

## Project structure

```
index.html            page markup (static text carries data-i18n keys)
css/styles.css        styles, theme tokens, responsive + RTL rules
js/main.js            bootstrap and wiring
js/fields-schema.js   every supported field (drives form, vCard, import)
js/state.js           contact model + normalisation of untrusted input
js/form-ui.js         schema-driven form with repeatable rows
js/vcard.js           pure vCard 3.0 builder (escaping, folding)
js/vcard-parse.js     vCard 2.1/3.0/4.0 parser for .vcf importjs/qr-render.js       QR drawing + blended center image
js/image-source.js    none / upload / Google / initials picker
js/avatar.js          initials monogram generator
js/google.js          Google Identity Services + People API (read-only)
js/storage.js         JSON / CSV / local draft
js/i18n.js            English + Hebrew strings, language detection
js/config.js          public config (Google Client ID)
tests/                node:test unit tests
```

## Privacy & security

- **No backend.** Nothing you type is sent anywhere. The only network requests are for the libraries and fonts listed below and, if you choose to connect, to Google's own endpoints.
- **Local draft.** Your form is saved in your browser's `localStorage` so a reload doesn't lose it. *Clear form* deletes it.
- **Google access is read-only and minimal.** Only `openid email profile` are requested. The access token is kept in memory (never stored) and revoked on *Disconnect*.
- **Content-Security-Policy** (meta tag) allows scripts only from this site, the pinned QR library on cdnjs and Google's sign-in client.
- **Subresource Integrity**: the QR library is pinned to an exact version and SHA-384 hash.
- **No HTML injection.** User input is only written via `value` / `textContent`, never `innerHTML`. Imported JSON/CSV is validated and normalised, and uploaded images must be `data:image/…` URLs.
- No secrets or personal data are committed. `.gitignore` excludes contact files exported while testing.

## Dependencies: open source and remote resources

The app has **no npm runtime dependencies** and no bundled third-party code. Everything external is listed here.

### JavaScript loaded at runtime (remote)

| Resource | URL | Version | License | When loaded |
|---|---|---|---|---|
| [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) by Kazuhiko Arase | `https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js` | 1.4.4, SRI `sha384-mZT2gIty7ZDdOGkxfP6joZcYdMW1Jvj9dRlfpTmaJAKKXTqzygtB22k7FLe+KZC1` | MIT | Always |
| [Google Identity Services](https://developers.google.com/identity/oauth2/web/guides/overview) client | `https://accounts.google.com/gsi/client` | Served by Google (unversioned) | Proprietary, [Google APIs Terms of Service](https://developers.google.com/terms) | Only if a Google Client ID is configured |

### Remote APIs (only after the user clicks "Connect Google")

| API | URL | Purpose |
|---|---|---|
| Google People API | `https://people.googleapis.com/v1/people/me` | Read name, email, organization, URLs, photo |
| Google OAuth2 userinfo | `https://www.googleapis.com/oauth2/v3/userinfo` | Fallback when People API is not enabled |
| Google profile photo CDN | `https://*.googleusercontent.com` | Download the profile picture |

### Fonts (Google Fonts, `fonts.googleapis.com` / `fonts.gstatic.com`)

Used for the initials monogram and the Hebrew UI. All are licensed under the [SIL Open Font License 1.1](https://openfontlicense.org/).

| Font | Use |
|---|---|
| [Cinzel](https://fonts.google.com/specimen/Cinzel) | Monogram, "classic" |
| [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) | Monogram, "elegant" |
| [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) | Monogram, "editorial" |
| [Inter](https://fonts.google.com/specimen/Inter) | Monogram, "modern" |
| [Frank Ruhl Libre](https://fonts.google.com/specimen/Frank+Ruhl+Libre) | Hebrew monogram (serif styles) |
| [Heebo](https://fonts.google.com/specimen/Heebo) | Hebrew monogram ("modern") and Hebrew UI |

Like any web page, fetching these files lets the CDN providers (Cloudflare, Google) see a normal HTTP request from your browser (IP address, user agent). **None of your contact data is included in these requests.**

### Development only (not shipped to users)

| Tool | License | Use |
|---|---|---|
| [Node.js](https://nodejs.org/) built-in `node:test` | MIT | Unit tests |
| [serve](https://github.com/vercel/serve) 14.2.4 (run via `npx`) | MIT | Local static server |

### Standards

- vCard 3.0, [RFC 2426](https://www.rfc-editor.org/rfc/rfc2426)
- QR Code, ISO/IEC 18004 ("QR Code" is a registered trademark of DENSO WAVE INCORPORATED)

## Credits

Original idea and first version by **[Shai Ehud](https://dub.sh/eshai)**.
