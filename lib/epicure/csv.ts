export type CsvRow = Record<string, string>;

export function parseCsv(text: string): CsvRow[] {
  const rows = parseCsvRows(text);
  const header = rows.shift();

  if (!header) {
    return [];
  }

  return rows
    .filter((row) => row.some((value) => value.trim().length > 0))
    .map((row) =>
      Object.fromEntries(header.map((key, index) => [key, row[index] ?? ""])),
    );
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  rows.push(row);

  return rows;
}
