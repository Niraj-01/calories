// Personalized, auth-gated app routes. These render per-request so the CSP
// nonce (set in middleware.js) can be stamped onto Next's inline scripts, and
// because their content is user-specific and not cacheable anyway.
//
// Scoping force-dynamic to this route group (rather than the root layout) is
// what lets sibling public pages like /privacy be statically generated and
// CDN-cached.
export const dynamic = "force-dynamic";

export default function AppGroupLayout({ children }) {
  return children;
}
