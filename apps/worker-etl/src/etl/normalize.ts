const ACCENT_MAP: Record<string, string> = {
  Á: "A",
  À: "A",
  Ä: "A",
  Â: "A",
  É: "E",
  È: "E",
  Ë: "E",
  Ê: "E",
  Í: "I",
  Ì: "I",
  Ï: "I",
  Î: "I",
  Ó: "O",
  Ò: "O",
  Ö: "O",
  Ô: "O",
  Ú: "U",
  Ù: "U",
  Ü: "U",
  Û: "U",
};

export function normalizeKey(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase()
    .replace(/[ÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛ]/g, (char) => ACCENT_MAP[char] ?? char);
}

export function normalizeLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

function countAccents(value: string): number {
  let count = 0;

  for (const char of value) {
    if (ACCENT_MAP[char] !== undefined) {
      count += 1;
    }
  }

  return count;
}

export function chooseLabel(variants: Map<string, number>): string {
  const byLabel = new Map<string, number>();

  for (const [rawLabel, count] of variants) {
    const label = normalizeLabel(rawLabel);
    byLabel.set(label, (byLabel.get(label) ?? 0) + count);
  }

  let best: { label: string; accents: number; count: number } | null = null;

  for (const [label, count] of byLabel) {
    const accents = countAccents(label);

    if (
      best === null ||
      accents > best.accents ||
      (accents === best.accents && count > best.count) ||
      (accents === best.accents && count === best.count && label < best.label)
    ) {
      best = { label, accents, count };
    }
  }

  return best?.label ?? "";
}
