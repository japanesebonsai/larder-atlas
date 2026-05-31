import type { PantryAnalysis, PantryRecommendation } from "./types";

export function buildTemplateExplanation(
  analysis: Omit<PantryAnalysis, "explanation">,
): string {
  const top = analysis.recommendations[0];

  if (!top) {
    return "Add a few pantry ingredients to begin mapping what is already on hand.";
  }

  const pantry = analysis.matched
    .slice(0, 5)
    .map((match) => humanize(match.ingredient.name));
  const cuisine = analysis.cuisineAffinity[0]?.cuisine;
  const meals = mealIdeas(top, cuisine);

  return [
    `Best buy: ${humanize(top.ingredient.name)}.`,
    `It fits with ${formatList(pantry)} and ${top.reasons[0]?.toLowerCase() ?? "adds a useful new direction"}.`,
    cuisine
      ? `Your pantry is closest to ${humanize(cuisine)} cooking right now.`
      : "Your pantry has a flexible, cross-cuisine shape right now.",
    `Try: ${formatList(meals)}.`,
  ].join(" ");
}

function mealIdeas(recommendation: PantryRecommendation, cuisine?: string): string[] {
  const ingredient = humanize(recommendation.ingredient.name);
  const category = recommendation.ingredient.primaryCategory.toLowerCase();

  if (cuisine?.toLowerCase().includes("east")) {
    return [`${ingredient} fried rice`, `${ingredient} rice bowl`, `quick ${ingredient} stir-fry`];
  }

  if (cuisine?.toLowerCase().includes("mediterranean")) {
    return [`${ingredient} tomato plate`, `${ingredient} grain bowl`, `herby ${ingredient} pasta`];
  }

  if (cuisine?.toLowerCase().includes("latin")) {
    return [`${ingredient} tacos`, `${ingredient} rice bowl`, `limey ${ingredient} salad`];
  }

  if (category.includes("spice") || category.includes("pantry")) {
    return [`seasoned rice`, `quick pantry bowl`, `simple weeknight skillet`];
  }

  return [`${ingredient} bowl`, `${ingredient} skillet`, `${ingredient} pantry plate`];
}

function formatList(items: string[]): string {
  if (items.length === 0) return "your pantry";
  if (items.length === 1) return items[0] ?? "your pantry";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;

  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function humanize(value: string): string {
  return value.replaceAll("_", " ");
}
