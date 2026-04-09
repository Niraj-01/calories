import { NextResponse } from "next/server";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB base64
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_TEXT_LENGTH = 500;

export async function POST(request) {
  try {
    const body = await request.json();
    const { imageBase64, mimeType, textDescription } = body || {};
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GOOGLE_AI_API_KEY" },
        { status: 500 },
      );
    }

    // Validate image payload
    if (imageBase64 && typeof imageBase64 === "string" && imageBase64.length > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "Image too large. Please use a smaller photo (max ~7.5MB)." },
        { status: 413 },
      );
    }

    if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: "Unsupported image type. Use JPEG, PNG, or WebP." },
        { status: 400 },
      );
    }

    // Sanitize text description
    const cleanDescription = typeof textDescription === "string"
      ? textDescription.slice(0, MAX_TEXT_LENGTH).trim()
      : undefined;

    const content = [];

    if (imageBase64 && mimeType) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mimeType,
          data: imageBase64,
        },
      });
    }

    if (cleanDescription) {
      content.push({ type: "text", text: cleanDescription });
    }

    if (content.length === 0) {
      return NextResponse.json(
        { error: "No image or description provided" },
        { status: 400 },
      );
    }

    const parts = [];
    if (imageBase64 && mimeType) {
      parts.push({
        inline_data: { mime_type: mimeType, data: imageBase64 },
      });
    }
    if (cleanDescription) {
      parts.push({ text: `User describes the food as: "${cleanDescription}"` });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
      const code = response.status;
      const detail = errJson?.error?.message || JSON.stringify(errJson);
      return NextResponse.json({ error: "Analysis failed", detail }, { status: code });
    }

    const data = await response.json().catch(async () => ({ raw: await response.text() }));
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || data?.raw || "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (e) {
          return NextResponse.json(
            { error: "Model returned non-JSON response", detail: cleaned },
            { status: 502 },
          );
        }
      } else {
        return NextResponse.json(
          { error: "Model returned non-JSON response", detail: cleaned },
          { status: 502 },
        );
      }
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("/api/analyze-food error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
