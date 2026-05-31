export function cosineSimilarity(a: number[], b: number[]): number {
  const denominator = magnitude(a) * magnitude(b);

  if (denominator === 0) {
    return 0;
  }

  return dot(a, b) / denominator;
}

export function meanVector(vectors: number[][]): number[] {
  const width = vectors[0]?.length ?? 0;

  if (width === 0) {
    return [];
  }

  const totals = Array.from({ length: width }, () => 0);

  for (const vector of vectors) {
    for (let index = 0; index < width; index += 1) {
      totals[index] += vector[index] ?? 0;
    }
  }

  return totals.map((value) => value / vectors.length);
}

function dot(a: number[], b: number[]): number {
  return a.reduce((sum, value, index) => sum + value * (b[index] ?? 0), 0);
}

function magnitude(vector: number[]): number {
  return Math.sqrt(dot(vector, vector));
}
