const formatterCache = new Map<number, Intl.NumberFormat>();

function getFormatter(maximumFractionDigits: number): Intl.NumberFormat {
  const cached = formatterCache.get(maximumFractionDigits);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.NumberFormat("es-CO", {
    maximumFractionDigits,
  });
  formatterCache.set(maximumFractionDigits, formatter);
  return formatter;
}

export function formatNumber(
  value: number,
  maximumFractionDigits = 0,
): string {
  if (!Number.isFinite(value)) {
    return "—";
  }

  return getFormatter(maximumFractionDigits).format(value);
}

export function formatProduction(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }

  const absolute = Math.abs(value);

  if (absolute >= 1_000_000) {
    return `${formatNumber(value / 1_000_000, 1)} M t`;
  }

  if (absolute >= 1_000) {
    return `${formatNumber(value / 1_000, 0)} mil t`;
  }

  return `${formatNumber(value)} t`;
}

export function formatArea(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }

  const absolute = Math.abs(value);

  if (absolute >= 1_000_000) {
    return `${formatNumber(value / 1_000_000, 1)} M ha`;
  }

  if (absolute >= 1_000) {
    return `${formatNumber(value / 1_000, 0)} mil ha`;
  }

  return `${formatNumber(value)} ha`;
}

export function formatYield(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return `${formatNumber(value, 1)} t/ha`;
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }

  return `${formatNumber(value, 1)} %`;
}

export function formatSignedPercent(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }

  return `${value >= 0 ? "+" : ""}${formatPercent(value)}`;
}

export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }

  const absolute = Math.abs(value);

  if (absolute >= 1_000_000) {
    return `${formatNumber(value / 1_000_000, 1)} M`;
  }

  if (absolute >= 1_000) {
    return `${formatNumber(value / 1_000, 0)} mil`;
  }

  return formatNumber(value);
}
