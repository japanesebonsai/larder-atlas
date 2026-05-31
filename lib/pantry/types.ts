import type { EpicureIngredientRecord } from "@/lib/epicure";

export type PantryInput = {
  pantry: string[] | string;
  limit?: number;
};

export type MatchedIngredient = {
  input: string;
  ingredient: EpicureIngredientRecord;
};

export type PantryRecommendation = {
  ingredient: EpicureIngredientRecord;
  score: number;
  reasons: string[];
};

export type PantryAnalysis = {
  matched: MatchedIngredient[];
  missing: string[];
  cuisineAffinity: Array<{
    cuisine: string;
    score: number;
  }>;
  categoryAffinity: Array<{
    category: string;
    score: number;
  }>;
  recommendations: PantryRecommendation[];
  explanation: string;
};
