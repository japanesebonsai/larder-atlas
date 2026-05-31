import { NextResponse } from "next/server";
import { analyzePantry } from "@/lib/pantry";
import type { EpicureIngredientRecord } from "@/lib/epicure";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const analysis = await analyzePantry({
      pantry: body.pantry,
      limit: body.limit,
      goal: body.goal,
    });

    return NextResponse.json({
      ...analysis,
      matched: analysis.matched.map((match) => ({
        input: match.input,
        ingredient: toPublicIngredient(match.ingredient),
      })),
      recommendations: analysis.recommendations.map((recommendation) => ({
        ingredient: toPublicIngredient(recommendation.ingredient),
        score: recommendation.score,
        reasons: recommendation.reasons,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: "Unable to analyze pantry", message },
      { status: 400 },
    );
  }
}

function toPublicIngredient(ingredient: EpicureIngredientRecord) {
  return {
    nodeId: ingredient.nodeId,
    name: ingredient.name,
    categories: ingredient.categories,
    primaryCategory: ingredient.primaryCategory,
    isVegetarian: ingredient.isVegetarian,
    isVegan: ingredient.isVegan,
    tag: ingredient.tag,
    atlas: ingredient.atlas,
  };
}
