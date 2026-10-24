/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: {
    // The app's routes are force-dynamic (per-request CSP nonce), and by default
    // the client router refetches a dynamic page from the server on every
    // visit. The pages themselves are client-rendered shells that load their
    // own data from Firestore on mount, so a cached copy is never stale in any
    // way that matters — keep visited (dynamic) and prefetched (static) pages
    // for a day, so switching tabs never waits on the server (or on a server
    // cold start) for as long as the app stays open.
    staleTimes: {
      dynamic: 86400,
      static: 86400,
    },
  },
};

export default nextConfig;
