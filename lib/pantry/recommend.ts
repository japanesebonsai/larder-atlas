import type { EpicureIngredientRecord } from "@/lib/epicure";
import { loadEpicureRecords } from "@/lib/epicure";
import { matchPantryIngredients, parsePantryInput } from "./match";
import { buildTemplateExplanation } from "./template-explanation";
import type { PantryAnalysis, PantryGoal, PantryInput, PantryRecommendation } from "./types";
import { cosineSimilarity, meanVector } from "./vector";

const DEFAULT_LIMIT = 8;
const CUISINE_GOALS: Partial<Record<PantryGoal, string>> = {
  east_asian: "East_Asian",
  japanese: "Japanese",
  southeast_asian: "Southeast_Asian",
  south_asian: "South_Asian",
  latin_american: "Latin_American",
  mediterranean: "Mediterranean",
};
const SUBSTITUTE_CATEGORIES = new Set(["Meat", "Fish", "Seafood"]);
const COMPLEMENT_CATEGORIES = new Set([
  "Pantry",
  "Vegetable",
  "Grain",
  "Spice",
  "Herb",
  "Fat/Oil",
  "Dairy",
  "Legume",
]);

export async function analyzePantry(input: PantryInput): Promise<PantryAnalysis> {
  const records = await loadEpicureRecords();
  const parsed = parsePantryInput(input.pantry);
  const { matched, missing } = matchPantryIngredients(parsed, records);
  const pantryRecords = matched.map((match) => match.ingredient);
  const recommendations = recommendIngredients(
    pantryRecords,
    records,
    input.goal ?? "more_meals",
    input.limit ?? DEFAULT_LIMIT,
  );
  const analysis = {
    matched,
    missing,
    cuisineAffinity: scoreCuisineAffinity(pantryRecords),
    categoryAffinity: scoreCategoryAffinity(pantryRecords),
    recommendations,
  };

  return {
    ...analysis,
    explanation: buildTemplateExplanation(analysis, input.goal ?? "more_meals"),
  };
}

function recommendIngredients(
  pantry: EpicureIngredientRecord[],
  records: EpicureIngredientRecord[],
  goal: PantryGoal,
  limit: number,
): PantryRecommendation[] {
  const pantryIds = new Set(pantry.map((ingredient) => ingredient.nodeId));
  const pantryVectors = pantry
    .map((ingredient) => ingredient.embedding?.vector)
    .filter((vector): vector is number[] => Boolean(vector?.length));
  const center = meanVector(pantryVectors);
  const cuisines = new Set(
    pantry.map((ingredient) => ingredient.tag?.cuisineRegion).filter(Boolean),
  );
  const categories = new Set(pantry.map((ingredient) => ingredient.primaryCategory));

  if (center.length === 0) {
    return [];
  }

  return records
    .filter((record) => !pantryIds.has(record.nodeId) && record.embedding)
    .map((candidate) =>
      scoreCandidate(candidate, center, cuisines, categories, goal),
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(limit, 20)));
}

function scoreCandidate(
  candidate: EpicureIngredientRecord,
  pantryCenter: number[],
  cuisines: Set<string | undefined>,
  categories: Set<string>,
  goal: PantryGoal,
): PantryRecommendation {
  const similarity = cosineSimilarity(candidate.embedding?.vector ?? [], pantryCenter);
  const cuisineMatch = cuisines.has(candidate.tag?.cuisineRegion) ? 0.08 : 0;
  const categoryUtility = scoreCategoryUtility(candidate, categories, goal);
  const universalBoost =
    candidate.tag?.cuisineRegion === "universal" && categoryUtility >= 0 ? 0.03 : 0;
  const goalBoost = scoreGoalBoost(candidate, goal, cuisines, categories);
  const score = round(similarity + cuisineMatch + categoryUtility + universalBoost + goalBoost);

  return {
    ingredient: candidate,
    score,
    reasons: buildReasons(candidate, similarity, cuisineMatch, categoryUtility, goalBoost, goal),
  };
}

function buildReasons(
  candidate: EpicureIngredientRecord,
  similarity: number,
  cuisineMatch: number,
  categoryUtility: number,
  goalBoost: number,
  goal: PantryGoal,
): string[] {
  const reasons = [];

  if (similarity >= 0.7) {
    reasons.push("sits very close to your pantry on the Epicure map");
  } else if (similarity >= 0.45) {
    reasons.push("fits the same ingredient neighborhood");
  } else {
    reasons.push("adds a nearby new direction");
  }

  if (cuisineMatch > 0) {
    reasons.push(`supports ${humanize(candidate.tag?.cuisineRegion ?? "")} cooking`);
  }

  if (categoryUtility > 0) {
    reasons.push(`adds a ${humanize(candidate.primaryCategory).toLowerCase()} lane`);
  }

  if (goalBoost > 0 && goal !== "less_boring") {
    reasons.push(`answers the ${humanize(goal)} goal`);
  }

  if (goalBoost > 0 && goal === "less_boring") {
    reasons.push("stretches the pantry into a fresher direction");
  }

  return reasons;
}

function scoreCategoryUtility(
  candidate: EpicureIngredientRecord,
  categories: Set<string>,
  goal: PantryGoal,
): number {
  const hasCategory = categories.has(candidate.primaryCategory);

  if (
    hasCategory &&
    SUBSTITUTE_CATEGORIES.has(candidate.primaryCategory) &&
    goal !== "less_boring"
  ) {
    return -0.32;
  }

  if (hasCategory) {
    return -0.08;
  }

  if (COMPLEMENT_CATEGORIES.has(candidate.primaryCategory)) {
    return 0.08;
  }

  return 0.02;
}

function scoreGoalBoost(
  candidate: EpicureIngredientRecord,
  goal: PantryGoal,
  cuisines: Set<string | undefined>,
  categories: Set<string>,
): number {
  const targetCuisine = CUISINE_GOALS[goal];

  if (targetCuisine) {
    return candidate.tag?.cuisineRegion === targetCuisine ? 0.2 : 0;
  }

  if (goal === "less_boring") {
    const cuisineNovelty = cuisines.has(candidate.tag?.cuisineRegion) ? 0 : 0.08;
    const categoryNovelty = categories.has(candidate.primaryCategory) ? 0 : 0.06;

    return cuisineNovelty + categoryNovelty;
  }

  return 0;
}

function scoreCuisineAffinity(records: EpicureIngredientRecord[]) {
  return scoreCounts(records.map((record) => record.tag?.cuisineRegion).filter(isString)).map(
    ({ value, score }) => ({ cuisine: value, score }),
  );
}

function scoreCategoryAffinity(records: EpicureIngredientRecord[]) {
  return scoreCounts(records.map((record) => record.primaryCategory).filter(isString)).map(
    ({ value, score }) => ({ category: value, score }),
  );
}

function scoreCounts(values: string[]) {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([value, count]) => ({ value, score: round(count / Math.max(1, values.length)) }))
    .sort((a, b) => b.score - a.score);
}

function isString(value: string | undefined): value is string {
  return Boolean(value);
}

function humanize(value: string): string {
  return value.replaceAll("_", " ");
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
