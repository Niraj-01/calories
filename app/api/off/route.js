import { NextResponse } from "next/server";
import { compressedJson } from "@/src/lib/compressedJson";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    if (action === "barcode") {
      const barcode = searchParams.get("barcode");
      if (!barcode) {
        return NextResponse.json({ error: "Missing barcode" }, { status: 400 });
      }

      const res = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json?fields=product_name,brands,nutriments,serving_size,categories_tags,states_tags,code`
      );
      if (!res.ok) {
        throw new Error(`OpenFoodFacts responded with ${res.status}`);
      }
      const data = await res.json();
      return compressedJson(request, data);
    } else if (action === "search") {
      const q = searchParams.get("q");
      if (!q) {
        return NextResponse.json({ error: "Missing query" }, { status: 400 });
      }

      const params = new URLSearchParams({
        search_terms: q,
        search_simple: "1",
        action: "process",
        json: "1",
        page_size: "10",
        fields: "product_name,brands,nutriments,serving_size,image_url,code,categories_tags,states_tags",
      });

      const res = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`
      );
      if (!res.ok) {
        throw new Error(`OpenFoodFacts responded with ${res.status}`);
      }
      const data = await res.json();
      return compressedJson(request, data);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("OpenFoodFacts Proxy Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch from OpenFoodFacts" },
      { status: 500 }
    );
  }
}
