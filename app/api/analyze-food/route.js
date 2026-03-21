import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const image = formData.get('image');

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // 1. Call HuggingFace for Food Recognition
    // We use the nateraw/food101 model
    const buffer = await image.arrayBuffer();
    
    // HuggingFace free-tier models may need cold-start time — retry with wait
    let hfResponse;
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      hfResponse = await fetch(
        "https://router.huggingface.co/hf-inference/models/nateraw/food",
        {
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/octet-stream",
            "x-wait-for-model": "true",
          },
          method: "POST",
          body: buffer,
        }
      );

      if (hfResponse.ok) break;

      // Model loading — 503 with estimated_time
      if (hfResponse.status === 503 && attempt < maxRetries - 1) {
        try {
          const body = await hfResponse.json();
          const waitTime = Math.min((body.estimated_time || 15) * 1000, 30000);
          console.log(`Model loading, waiting ${waitTime}ms (attempt ${attempt + 1})...`);
          await new Promise((r) => setTimeout(r, waitTime));
          continue;
        } catch {
          await new Promise((r) => setTimeout(r, 10000));
          continue;
        }
      }

      // Non-retryable error
      const errorText = await hfResponse.text();
      console.error("HuggingFace Error:", hfResponse.status, errorText);
      return NextResponse.json(
        { error: `AI model error (${hfResponse.status}). Please try again in a moment.` },
        { status: 500 }
      );
    }

    // HuggingFace sometimes returns text when the model is loading; guard parse
    let hfResult;
    try {
      const hfText = await hfResponse.text();
      hfResult = JSON.parse(hfText);
    } catch (parseErr) {
      console.error("HuggingFace parse error", parseErr);
      return NextResponse.json(
        { error: "AI response was not valid JSON. Please retry in a moment." },
        { status: 502 }
      );
    }

    if (!Array.isArray(hfResult) || hfResult.length === 0) {
      const fallbackMsg = typeof hfResult?.error === "string" ? hfResult.error : "Could not identify food.";
      return NextResponse.json(
        { error: fallbackMsg },
        { status: 400 }
      );
    }

    // Get the top prediction
    const topPrediction = hfResult[0];
    const foodName = topPrediction.label.replace(/_/g, " ");

    // 2. Look up nutrition from built-in database (per 100g, USDA-sourced)
    const { getNutrition } = await import("@/src/data/foodNutrition");
    const nutrition = getNutrition(foodName);

    if (!nutrition) {
      return NextResponse.json({
        name: foodName,
        confidence: topPrediction.score,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        message: "Food identified, but no nutrition data available.",
      });
    }

    const [calories, protein, carbs, fat] = nutrition;

    return NextResponse.json({
      name: foodName,
      confidence: topPrediction.score,
      calories,
      protein,
      carbs,
      fat,
      message: "Success",
    });

  } catch (error) {
    console.error("Error analyzing food:", error);
    return NextResponse.json(
      { error: 'Internal server error analyzing the image.' },
      { status: 500 }
    );
  }
}
