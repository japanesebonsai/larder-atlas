import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseCsv } from "./csv";
import type {
  EpicureAtlasCoordinate,
  EpicureEmbedding,
  EpicureIngredient,
  EpicureIngredientRecord,
  EpicureIngredientTag,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data", "epicure");

let cachedIngredients: Promise<EpicureIngredient[]> | undefined;
let cachedTags: Promise<EpicureIngredientTag[]> | undefined;
let cachedAtlas: Promise<EpicureAtlasCoordinate[]> | undefined;
let cachedEmbeddings: Promise<EpicureEmbedding[]> | undefined;
let cachedRecords: Promise<EpicureIngredientRecord[]> | undefined;

export function loadEpicureIngredients(): Promise<EpicureIngredient[]> {
  cachedIngredients ??= readCsv("ingredient_list.csv").then((rows) =>
    rows.map((row) => ({
      nodeId: toNumber(row.node_id),
      name: row.name,
      categories: splitList(row.categories),
      primaryCategory: row.primary_category,
      isVegetarian: toBoolean(row.is_vegetarian),
      isVegan: toBoolean(row.is_vegan),
      originalCount: toNumber(row.original_count),
    })),
  );

  return cachedIngredients;
}

export function loadEpicureIngredientTags(): Promise<EpicureIngredientTag[]> {
  cachedTags ??= readCsv("ingredient_tags.csv").then((rows) =>
    rows.map((row) => ({
      nodeId: toNumber(row.node_id),
      name: row.name,
      foodGroup: row.food_group,
      primaryCategory: row.primary_category,
      isVegetarian: toBoolean(row.is_vegetarian),
      isVegan: toBoolean(row.is_vegan),
      cuisineRegion: row.cuisine_region,
      novaLevel: toNullableNumber(row.nova_level),
    })),
  );

  return cachedTags;
}

export function loadEpicureAtlasCoordinates(): Promise<EpicureAtlasCoordinate[]> {
  cachedAtlas ??= readCsv("umap_coords.csv").then((rows) =>
    rows.map((row) => ({
      name: row.name,
      x: toNumber(row.x),
      y: toNumber(row.y),
    })),
  );

  return cachedAtlas;
}

export function loadEpicureEmbeddings(): Promise<EpicureEmbedding[]> {
  cachedEmbeddings ??= readCsv("embeddings.csv").then((rows) =>
    rows.map((row) => ({
      nodeId: toNumber(row.node_id),
      vector: Object.entries(row)
        .filter(([key]) => key.startsWith("dim_"))
        .sort(([a], [b]) => toDimensionIndex(a) - toDimensionIndex(b))
        .map(([, value]) => toNumber(value)),
    })),
  );

  return cachedEmbeddings;
}

export async function loadEpicureRecords(): Promise<EpicureIngredientRecord[]> {
  cachedRecords ??= Promise.all([
    loadEpicureIngredients(),
    loadEpicureIngredientTags(),
    loadEpicureAtlasCoordinates(),
    loadEpicureEmbeddings(),
  ]).then(([ingredients, tags, atlas, embeddings]) => {
    const tagsByNodeId = new Map(tags.map((tag) => [tag.nodeId, tag]));
    const atlasByName = new Map(atlas.map((point) => [point.name, point]));
    const embeddingsByNodeId = new Map(
      embeddings.map((embedding) => [embedding.nodeId, embedding]),
    );

    return ingredients.map((ingredient) => ({
      ...ingredient,
      tag: tagsByNodeId.get(ingredient.nodeId),
      atlas: atlasByName.get(ingredient.name),
      embedding: embeddingsByNodeId.get(ingredient.nodeId),
    }));
  });

  return cachedRecords;
}

async function readCsv(fileName: string) {
  const text = await readFile(path.join(DATA_DIR, fileName), "utf8");
  return parseCsv(text);
}

function splitList(value: string): string[] {
  return value
    .split(/[|;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toNumber(value: string): number {
  return Number.parseFloat(value || "0");
}

function toNullableNumber(value: string): number | null {
  if (!value) return null;
  const number = Number.parseFloat(value);
  return Number.isNaN(number) ? null : number;
}

function toBoolean(value: string): boolean {
  return value.toLowerCase() === "true";
}

function toDimensionIndex(key: string): number {
  return Number.parseInt(key.replace("dim_", ""), 10);
}
