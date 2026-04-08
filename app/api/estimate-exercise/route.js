import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { exercise, durationMinutes, weightKg } = await request.json();
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GOOGLE_AI_API_KEY" },
        { status: 500 },
      );
    }

    if (!exercise) {
      return NextResponse.json({ error: "exercise is required" }, { status: 400 });
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
                {
                  text: `Return ONLY JSON: { "name": string, "caloriesBurned": number, "metValue": number } for this exercise. Exercise: ${exercise}. If duration or weight missing, estimate using typical values (70kg, 30min) and clearly reflect that in numbers only.`,
                },
              ],
            },
          ],
          generationConfig: { temperature: 0.1 },
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: "Exercise estimate failed", detail },
        { status: response.status },
      );
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleaned);

    const minutes = Number(durationMinutes) || 30;
    const weight = Number(weightKg) || 70;
    const met = Number(result.metValue) || 6;
    const calories = Math.round(met * 3.5 * weight * minutes / 200);

    return NextResponse.json({ ...result, caloriesBurned: calories, metValue: met });
  } catch (err) {
    console.error("/api/estimate-exercise error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
