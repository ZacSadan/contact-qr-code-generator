// Clickjacking protection. GitHub Pages can't send X-Frame-Options /
// frame-ancestors headers (and a <meta> CSP can't set frame-ancestors),
// so refuse to run inside another site's frame.
// Imported first by main.js: throwing here stops the whole app.
if (window.top !== window.self) {
  try {
    window.top.location = window.location.href; // reload as a normal page
  } catch { /* the framing site blocks navigation */ }
  const a = document.createElement('a');
  a.href = window.location.href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = 'Open the Contact QR Code Generator directly';
  document.body.replaceChildren(a);
  throw new Error('Framed: app disabled');
}
