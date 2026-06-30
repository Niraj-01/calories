import { createHash } from "node:crypto";

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB base64
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
export const MAX_TEXT_LENGTH = 500;

// Normalize + validate the request payload. Returns { input } or { error,status }.
export function parseAnalyzeInput(body) {
  const { imageBase64, mimeType, textDescription, uid } = body || {};

  if (
    imageBase64 &&
    typeof imageBase64 === "string" &&
    imageBase64.length > MAX_IMAGE_SIZE
  ) {
    return {
      error: "Image too large. Please use a smaller photo (max ~7.5MB).",
      status: 413,
    };
  }
  if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { error: "Unsupported image type. Use JPEG, PNG, or WebP.", status: 400 };
  }

  const cleanDescription =
    typeof textDescription === "string"
      ? textDescription.slice(0, MAX_TEXT_LENGTH).trim()
      : undefined;

  if (!imageBase64 && !cleanDescription) {
    return { error: "No image or description provided", status: 400 };
  }

  return {
    input: {
      uid: typeof uid === "string" ? uid : "anon",
      imageBase64: imageBase64 || "",
      mimeType: mimeType || "",
      textDescription: cleanDescription || "",
    },
  };
}

// Deterministic id from the input → re-submitting the same photo/description maps
// to the same job (idempotent dedupe). Unguessable because it includes the full
// image bytes.
export function analyzeJobId(input) {
  const h = createHash("sha256");
  h.update(`${input.uid}\n${input.mimeType}\n${input.textDescription}\n${input.imageBase64}`);
  return h.digest("hex");
}

// The actual slow work: call Gemini and parse its JSON. Throws on failure.
export async function runAnalyzeFood(input, apiKey) {
  const parts = [];
  if (input.imageBase64 && input.mimeType) {
    parts.push({
      inline_data: { mime_type: input.mimeType, data: input.imageBase64 },
    });
  }
  if (input.textDescription) {
    parts.push({ text: `User describes the food as: "${input.textDescription}"` });
  }

  // Base URL is overridable so tests can point at a mock; defaults to Gemini.
  const base =
    process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com";
  const response = await fetch(
    `${base}/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              ...parts,
              {
                text: `You are a food nutrition expert. Analyze the food in this image. Return ONLY a JSON object (no markdown, no explanation) with this exact shape:
{ "name": string, "estimatedGrams": number, "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "confidence": "high"|"medium"|"low", "items": [{ "name": string, "grams": number, "calories": number }] }
If multiple foods are visible, list each in items[] and sum the totals. Estimate portion sizes from visual cues.`,
              },
            ],
          },
        ],
        generationConfig: { temperature: 0.1 },
      }),
    },
  );

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    const detail = errJson?.error?.message || JSON.stringify(errJson);
    const e = new Error(detail || "Analysis failed");
    e.code = response.status;
    throw e;
  }

  const data = await response
    .json()
    .catch(async () => ({ raw: await response.text() }));
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text || data?.raw || "";
  const cleaned = text.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        /* fall through */
      }
    }
    const e = new Error("Model returned non-JSON response");
    e.code = 502;
    throw e;
  }
}
