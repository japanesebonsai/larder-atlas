import type { EpicureIngredientRecord } from "@/lib/epicure";

export function parsePantryInput(input: string[] | string): string[] {
  if (Array.isArray(input)) {
    return input.map(cleanInput).filter(Boolean);
  }

  return input.split(/[,\n]/).map(cleanInput).filter(Boolean);
}

export function matchPantryIngredients(
  inputs: string[],
  records: EpicureIngredientRecord[],
) {
  const exactIndex = new Map<string, EpicureIngredientRecord>();

  for (const record of records) {
    exactIndex.set(normalize(record.name), record);
    exactIndex.set(normalize(record.name.replaceAll("_", " ")), record);
  }

  const matched = [];
  const missing = [];
  const seen = new Set<number>();

  for (const input of inputs) {
    const match = exactIndex.get(normalize(input)) ?? findLooseMatch(input, records);

    if (!match) {
      missing.push(input);
      continue;
    }

    if (!seen.has(match.nodeId)) {
      seen.add(match.nodeId);
      matched.push({ input, ingredient: match });
    }
  }

  return { matched, missing };
}

function findLooseMatch(
  input: string,
  records: EpicureIngredientRecord[],
): EpicureIngredientRecord | undefined {
  const normalizedInput = normalize(input);

  if (normalizedInput.length < 4) {
    return undefined;
  }

  return records.find((record) => {
    const name = normalize(record.name);
    const spacedName = normalize(record.name.replaceAll("_", " "));

    return (
      name.includes(normalizedInput) ||
      spacedName.includes(normalizedInput) ||
      normalizedInput.includes(name) ||
      normalizedInput.includes(spacedName)
    );
  });
}

function cleanInput(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ").trim();
}
