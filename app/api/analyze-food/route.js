import { NextResponse } from "next/server";

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

    if (textDescription) {
      content.push({ type: "text", text: textDescription });
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
    if (textDescription) {
      parts.push({ text: textDescription });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("/api/analyze-food error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
