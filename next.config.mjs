/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: {
    // The app's routes are force-dynamic (per-request CSP nonce), and by default
    // the client router refetches a dynamic page from the server on every
    // visit. The pages themselves are client-rendered shells that load their
    // own data from Firestore on mount, so a cached copy is never stale in any
    // way that matters — keep visited and prefetched pages for 5 minutes and
    // switching tabs needs no server round trip.
    staleTimes: {
      dynamic: 300,
    },
  },
};

export default nextConfig;
