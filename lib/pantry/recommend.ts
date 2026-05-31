import type { EpicureIngredientRecord } from "@/lib/epicure";
import { loadEpicureRecords } from "@/lib/epicure";
import { matchPantryIngredients, parsePantryInput } from "./match";
import { buildTemplateExplanation } from "./template-explanation";
import type { PantryAnalysis, PantryInput, PantryRecommendation } from "./types";
import { cosineSimilarity, meanVector } from "./vector";

const DEFAULT_LIMIT = 8;

export async function analyzePantry(input: PantryInput): Promise<PantryAnalysis> {
  const records = await loadEpicureRecords();
  const parsed = parsePantryInput(input.pantry);
  const { matched, missing } = matchPantryIngredients(parsed, records);
  const pantryRecords = matched.map((match) => match.ingredient);
  const recommendations = recommendIngredients(
    pantryRecords,
    records,
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
    explanation: buildTemplateExplanation(analysis),
  };
}

function recommendIngredients(
  pantry: EpicureIngredientRecord[],
  records: EpicureIngredientRecord[],
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
      scoreCandidate(candidate, center, cuisines, categories),
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(limit, 20)));
}

function scoreCandidate(
  candidate: EpicureIngredientRecord,
  pantryCenter: number[],
  cuisines: Set<string | undefined>,
  categories: Set<string>,
): PantryRecommendation {
  const similarity = cosineSimilarity(candidate.embedding?.vector ?? [], pantryCenter);
  const cuisineMatch = cuisines.has(candidate.tag?.cuisineRegion) ? 0.08 : 0;
  const categoryMatch = categories.has(candidate.primaryCategory) ? 0.05 : 0;
  const universalBoost = candidate.tag?.cuisineRegion === "universal" ? 0.03 : 0;
  const score = round(similarity + cuisineMatch + categoryMatch + universalBoost);

  return {
    ingredient: candidate,
    score,
    reasons: buildReasons(candidate, similarity, cuisineMatch, categoryMatch),
  };
}

function buildReasons(
  candidate: EpicureIngredientRecord,
  similarity: number,
  cuisineMatch: number,
  categoryMatch: number,
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

  if (categoryMatch > 0) {
    reasons.push(`adds another ${humanize(candidate.primaryCategory).toLowerCase()} option`);
  }

  return reasons;
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
