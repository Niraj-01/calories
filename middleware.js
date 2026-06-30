import { NextResponse } from "next/server";

/**
 * Content Security Policy (CSP)
 * ----------------------------------------------------------------------------
 * Goal: limit the blast radius of any cross-site scripting (XSS) bug. Even if an
 * attacker manages to inject markup, the browser will refuse to run scripts that
 * aren't explicitly trusted by this policy.
 *
 * Strategy: a per-request cryptographic `nonce` + `'strict-dynamic'`.
 *   - Next.js automatically stamps this nonce onto the inline bootstrap/RSC
 *     scripts it emits, so those keep working WITHOUT us ever allowing
 *     `'unsafe-inline'` for scripts.
 *   - `'strict-dynamic'` lets a trusted (nonced) script load further scripts it
 *     trusts (e.g. the dynamically-imported confetti module), while ignoring the
 *     host allowlist in modern browsers — so an injected `<script src=evil>` is
 *     still blocked.
 *   - `https:` and `'unsafe-inline'` are listed only as fallbacks for legacy
 *     browsers that don't understand nonces/`strict-dynamic`; CSP3 browsers
 *     ignore them whenever a nonce is present.
 *
 * Report-only first: set the env var CSP_REPORT_ONLY=true to ship the policy as
 * `Content-Security-Policy-Report-Only`. The browser then reports violations to
 * the console (and any report endpoint) WITHOUT blocking anything — use this to
 * shake out false positives, then unset the var to enforce.
 */

const REPORT_ONLY = process.env.CSP_REPORT_ONLY === "true";

// Public pages that are statically generated and CDN-cached (see their route
// segment config). Their HTML is prerendered, so it can't carry a per-request
// nonce — these get a nonce-free CSP instead. Keep this list tiny and limited to
// pages with no user-specific content and no reflected input.
const STATIC_PUBLIC_PATHS = new Set(["/privacy"]);

// Everything in the policy except script-src, which differs between the nonce
// (dynamic) and nonce-free (static) variants. This list is constant — it's
// derived purely from source, so it's assembled ONCE at module load (below) and
// reused on every request rather than rebuilt + re-joined per request. A code
// change + redeploy reloads the module, which is the correct invalidation point.
const COMMON_DIRECTIVES = [
  // Styles: CSS Modules/global CSS are external (self). 'unsafe-inline' covers
  // React inline style attributes and third-party libs (html5-qrcode, recharts)
  // that set inline styles. Inline styles cannot execute code, so this is a
  // deliberate, low-risk tradeoff rather than a script-level hole.
  `style-src 'self' 'unsafe-inline'`,

  // Images: own origin, camera captures (blob:/data:), Google avatars, and
  // Open Food Facts product photos.
  `img-src 'self' blob: data: https://*.googleusercontent.com https://*.openfoodfacts.org`,

  // Fonts are self-hosted by next/font at build time.
  `font-src 'self' data:`,

  // Network (fetch/XHR/WebSocket) destinations the app legitimately talks to:
  //   *.googleapis.com  -> Firestore, Firebase Auth (identitytoolkit/securetoken),
  //                        Firebase Installations, Gemini (generativelanguage)
  //   wss://*.googleapis.com -> Firestore realtime listeners
  //   accounts.google.com    -> Google Sign-In
  //   *.openfoodfacts.org    -> food search / barcode lookup
  //   cdn.jsdelivr.net       -> confetti module fetch
  `connect-src 'self' https://*.googleapis.com wss://*.googleapis.com https://accounts.google.com https://*.openfoodfacts.org https://cdn.jsdelivr.net`,

  // Iframes: Firebase Auth uses a hidden iframe on the authDomain plus the
  // Google sign-in surface.
  `frame-src 'self' https://*.firebaseapp.com https://accounts.google.com`,

  // Service worker / any blob-based workers.
  `worker-src 'self' blob:`,

  // PWA manifest.
  `manifest-src 'self'`,

  // Hardening:
  `object-src 'none'`, // no Flash/<object>/<embed> plugins
  `base-uri 'self'`, // block <base> tag hijacking of relative URLs
  `form-action 'self'`, // forms can only post back to us
  `frame-ancestors 'none'`, // we can't be framed -> clickjacking protection
  `upgrade-insecure-requests`, // auto-upgrade any stray http:// subresource
].join("; ");

// Static/cached pages: no nonce is possible (HTML is prerendered & served from
// cache), so allow our own scripts plus the inline framework bootstrap via
// 'unsafe-inline'. Acceptable here because these pages render no user data and
// reflect no input, so the inline-injection XSS surface is effectively nil.
// Fully constant -> computed once, reused verbatim every request.
const STATIC_CSP = `default-src 'self'; script-src 'self' 'unsafe-inline'; ${COMMON_DIRECTIVES}`;

// Dynamic pages: per-request nonce + strict-dynamic (strongest variant). Only
// the nonce varies, so the rest is a precomputed constant and the per-request
// cost is a single string interpolation — no array rebuild/join.
//   strict-dynamic lets trusted (nonced) scripts pull in what they need (Firebase
//   SDK chunks, the jsDelivr confetti module). https:/unsafe-inline are legacy
//   fallbacks that modern browsers ignore in the presence of the nonce.
function buildNonceCsp(nonce) {
  return `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline'; ${COMMON_DIRECTIVES}`;
}

const CSP_HEADER = REPORT_ONLY
  ? "Content-Security-Policy-Report-Only"
  : "Content-Security-Policy";

export function middleware(request) {
  // Static, CDN-cacheable public pages: emit a nonce-free policy and DON'T touch
  // the request headers (no nonce to inject), so the prerendered/cached HTML is
  // served as-is. Its inline framework scripts are covered by 'unsafe-inline'.
  if (STATIC_PUBLIC_PATHS.has(request.nextUrl.pathname)) {
    const response = NextResponse.next();
    response.headers.set(CSP_HEADER, STATIC_CSP);
    return response;
  }

  // Dynamic pages: a fresh, unguessable nonce per request.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildNonceCsp(nonce);

  // Pass the nonce forward on the *request* so Next.js can read it and stamp it
  // onto the inline scripts it renders for this response.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // Emit the policy on the *response* so the browser actually enforces it.
  response.headers.set(CSP_HEADER, csp);

  return response;
}

export const config = {
  // Apply to every page request. Skip Next's static asset & image-optimizer
  // routes and the prefetch noise — those don't render HTML, so they need no
  // nonce, and skipping them keeps the middleware off the hot path.
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
