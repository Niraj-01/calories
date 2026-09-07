/**
 * Shared Gemini client helpers.
 * ----------------------------------------------------------------------------
 * The model id used to be hardcoded at four separate call sites, so swapping
 * models meant hunting through the codebase. It lives here now — change
 * GEMINI_MODEL once and every route follows.
 *
 * `generateStructured` asks Gemini for JSON via `responseMimeType` +
 * `responseSchema` rather than the older "return ONLY JSON" prompt trick. The
 * model is then constrained by the decoder itself, so the response is valid
 * JSON matching the schema — no markdown fences to strip, no regex hunting for
 * the outermost braces.
 */

// gemini-2.5-flash: has a free tier, handles portion reasoning on home-cooked
// food noticeably better than the lite tier. Swap to "gemini-2.5-flash-lite"
// here if cost ever becomes the binding constraint.
export const GEMINI_MODEL = "gemini-2.5-flash";

// Overridable so tests can point at a mock server (mirrors analyzeFood.js).
const BASE_URL =
  process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com";

export class GeminiError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
  }
}

/**
 * Call Gemini and get back a parsed object conforming to `schema`.
 *
 * @param {object}   opts
 * @param {string}   opts.apiKey
 * @param {Array}    opts.contents      Gemini `contents` array (roles + parts).
 * @param {object}   opts.schema        OpenAPI-subset response schema.
 * @param {string}   [opts.systemInstruction]
 * @param {number}   [opts.temperature] Defaults to 0.1 — these are extraction
 *                                      tasks, not creative ones.
 * @param {number}   [opts.thinkingBudget] 0 disables thinking tokens, which is
 *                                      the right call for extraction: much
 *                                      faster and materially cheaper.
 * @param {number}   [opts.timeoutMs]
 * @param {string}   [opts.model]
 * @returns {Promise<object>}
 */
export async function generateStructured({
  apiKey,
  contents,
  schema,
  systemInstruction,
  temperature = 0.1,
  thinkingBudget = 0,
  timeoutMs = 25_000,
  model = GEMINI_MODEL,
}) {
  if (!apiKey) {
    throw new GeminiError("Missing GOOGLE_AI_API_KEY", 500);
  }

  const body = {
    contents,
    generationConfig: {
      temperature,
      responseMimeType: "application/json",
      responseSchema: schema,
      thinkingConfig: { thinkingBudget },
    },
  };

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  // Bound the call so a hung upstream can't hold the route open until the
  // platform's own (much longer) timeout fires.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(
      `${BASE_URL}/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new GeminiError("The AI took too long to respond.", 504);
    }
    throw new GeminiError("Could not reach the AI service.", 502);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    const detail = errJson?.error?.message || `Gemini responded ${response.status}`;
    throw new GeminiError(detail, response.status);
  }

  const data = await response.json().catch(() => null);
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    // Most often a safety block or an empty candidate list.
    const reason = data?.candidates?.[0]?.finishReason || data?.promptFeedback?.blockReason;
    throw new GeminiError(
      reason ? `AI returned no content (${reason}).` : "AI returned no content.",
      502,
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    // Should be unreachable with responseSchema set, but a malformed body must
    // surface as a clean error rather than a raw SyntaxError.
    throw new GeminiError("AI returned malformed JSON.", 502);
  }
}
