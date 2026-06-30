import { NextResponse } from "next/server";
import { promisify } from "node:util";
import zlib from "node:zlib";

/**
 * compressedJson — JSON Route Handler response with negotiated compression.
 * ----------------------------------------------------------------------------
 * Next.js gzips its HTML and static assets automatically, but that built-in
 * compression does NOT apply to App Router Route Handlers (responses built with
 * NextResponse.json ship uncompressed). This helper closes that gap: it
 * serializes the payload once, then — if the body is worth it and the client
 * advertised support via Accept-Encoding — compresses with Brotli or gzip and
 * sets the matching Content-Encoding / Vary headers.
 *
 * It only ever sees JSON we serialize here, so it can never double-compress an
 * already-compressed payload (images, gzip blobs, etc. never flow through it).
 */

const gzip = promisify(zlib.gzip);
const brotli = promisify(zlib.brotliCompress);

// Below ~1KB the gzip/brotli framing overhead tends to cancel out the savings,
// so don't spend CPU compressing tiny responses (validation errors, etc.).
const MIN_COMPRESS_BYTES = 1024;

// Choose the best encoding the client actually advertised: Brotli first (best
// ratio), then gzip. Anything else → identity (send uncompressed).
function negotiate(acceptEncoding = "") {
  const ae = acceptEncoding.toLowerCase();
  if (/(^|[\s,])br($|[\s,;])/.test(ae)) return "br";
  if (/(^|[\s,])gzip($|[\s,;])/.test(ae)) return "gzip";
  return null;
}

export async function compressedJson(request, data, init = {}) {
  const raw = Buffer.from(JSON.stringify(data), "utf-8");

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  // Tell caches/proxies the body varies by Accept-Encoding so a compressed
  // response is never handed to a client that can't decode it.
  headers.set("Vary", "Accept-Encoding");

  const encoding =
    raw.length >= MIN_COMPRESS_BYTES
      ? negotiate(request.headers.get("accept-encoding"))
      : null;

  if (!encoding) {
    return new NextResponse(raw, { status: init.status ?? 200, headers });
  }

  const compressed =
    encoding === "br"
      ? await brotli(raw, {
          params: {
            // Quality 5 ≈ gzip-level ratio at a fraction of Brotli's max cost —
            // the right tradeoff for per-request dynamic responses.
            [zlib.constants.BROTLI_PARAM_QUALITY]: 5,
            [zlib.constants.BROTLI_PARAM_SIZE_HINT]: raw.length,
          },
        })
      : await gzip(raw, { level: 6 });

  headers.set("Content-Encoding", encoding);
  headers.set("Content-Length", String(compressed.length));
  return new NextResponse(compressed, { status: init.status ?? 200, headers });
}
