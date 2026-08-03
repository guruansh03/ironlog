export type QuantityMode = 'grams' | 'serving';
export type ServingMeasureUnit = 'g' | 'ml';

export interface ParsedServingAmount {
  amount: number;
  unit: ServingMeasureUnit;
}

function cleanAmount(value: number) {
  if (!Number.isFinite(value)) return '1';
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
}

export function parseServingAmount(label: string): ParsedServingAmount | null {
  const normalized = String(label || '').replace(',', '.');
  const matches = Array.from(
    normalized.matchAll(/(\d+(?:\.\d+)?)\s*(g|gram|grams|ml|milliliter|milliliters)\b/gi),
  );
  if (!matches.length) return null;

  const match = matches[matches.length - 1];
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const unitText = match[2].toLowerCase();
  return { amount, unit: unitText.startsWith('ml') || unitText.startsWith('milliliter') ? 'ml' : 'g' };
}

export function servingMeasureUnit(label: string): ServingMeasureUnit {
  return parseServingAmount(label)?.unit ?? 'g';
}

export function defaultQuantityForServing(label: string): { input: string; mode: QuantityMode } {
  const parsed = parseServingAmount(label);
  if (!parsed) return { input: '1', mode: 'serving' };
  return { input: cleanAmount(parsed.amount), mode: 'grams' };
}

export function quantityMultiplierForServing(label: string, amount: number, mode: QuantityMode): number {
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : mode === 'grams' ? 100 : 1;
  if (mode === 'serving') return Math.max(0.01, safeAmount);

  const parsed = parseServingAmount(label);
  const referenceAmount = parsed?.amount && parsed.amount > 0 ? parsed.amount : 100;
  return Math.max(0.01, safeAmount / referenceAmount);
}
