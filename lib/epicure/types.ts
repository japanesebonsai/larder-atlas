export type EpicureIngredient = {
  nodeId: number;
  name: string;
  categories: string[];
  primaryCategory: string;
  isVegetarian: boolean;
  isVegan: boolean;
  originalCount: number;
};

export type EpicureIngredientTag = {
  nodeId: number;
  name: string;
  foodGroup: string;
  primaryCategory: string;
  isVegetarian: boolean;
  isVegan: boolean;
  cuisineRegion: string;
  novaLevel: number | null;
};

export type EpicureAtlasCoordinate = {
  name: string;
  x: number;
  y: number;
};

export type EpicureEmbedding = {
  nodeId: number;
  vector: number[];
};

export type EpicureIngredientRecord = EpicureIngredient & {
  tag?: EpicureIngredientTag;
  atlas?: EpicureAtlasCoordinate;
  embedding?: EpicureEmbedding;
};
