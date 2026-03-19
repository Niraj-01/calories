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
    const hfResponse = await fetch(
      "https://api-inference.huggingface.co/models/nateraw/food101",
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/octet-stream",
        },
        method: "POST",
        body: buffer,
      }
    );

    if (!hfResponse.ok) {
      const errorText = await hfResponse.text();
      console.error("HuggingFace Error:", hfResponse.status, errorText);
      return NextResponse.json(
        { error: 'Failed to analyze image with HuggingFace.' },
        { status: 500 }
      );
    }

    const hfResult = await hfResponse.json();

    if (!Array.isArray(hfResult) || hfResult.length === 0) {
      return NextResponse.json(
        { error: 'Could not identify food.' },
        { status: 400 }
      );
    }

    // Get the top prediction
    const topPrediction = hfResult[0];
    const foodName = topPrediction.label.replace(/_/g, " ");

    // 2. Call Nutrition API (e.g., Edamam) to get macros for 100g of the predicted food
    const edamamAppId = process.env.EDAMAM_APP_ID;
    const edamamAppKey = process.env.EDAMAM_APP_KEY;
    
    if (!edamamAppId || !edamamAppKey) {
        // Fallback if no Edamam keys are set yet, just return the prediction
        return NextResponse.json({
            name: foodName,
            confidence: topPrediction.score,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            message: "Food identified, but Nutrition API keys are missing."
        });
    }

    const nutritionResponse = await fetch(
      `https://api.edamam.com/api/nutrition-data?app_id=${edamamAppId}&app_key=${edamamAppKey}&ingr=100g%20${encodeURIComponent(foodName)}`
    );

    if (!nutritionResponse.ok) {
        return NextResponse.json({
            name: foodName,
            confidence: topPrediction.score,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            message: "Food identified, but failed to fetch nutrition data."
        });
    }

    const nutritionData = await nutritionResponse.json();

    // The API might return 0 if it doesn't understand the query or has no data
    if (!nutritionData.calories) {
        return NextResponse.json({
             name: foodName,
             confidence: topPrediction.score,
             calories: 0,
             protein: 0,
             carbs: 0,
             fat: 0,
             message: "Food identified, but no nutrition data found for this item."
         });
    }

    return NextResponse.json({
      name: foodName,
      confidence: topPrediction.score,
      calories: Math.round(nutritionData.calories),
      protein: Math.round(nutritionData.totalNutrients?.PROCNT?.quantity || 0),
      carbs: Math.round(nutritionData.totalNutrients?.CHOCDF?.quantity || 0),
      fat: Math.round(nutritionData.totalNutrients?.FAT?.quantity || 0),
      message: "Success"
    });

  } catch (error) {
    console.error("Error analyzing food:", error);
    return NextResponse.json(
      { error: 'Internal server error analyzing the image.' },
      { status: 500 }
    );
  }
}
