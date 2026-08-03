import type { NutritionFoodItem } from '../store/nutritionStore';
import { parseServingAmount } from './nutritionServing';

export interface NutritionProviderResult {
  id: string;
  name: string;
  source: 'verified';
  state: 'cooked' | 'raw';
  servingLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  favorite?: boolean;
  createdAt: string;
  provider: 'openfoodfacts' | 'usda';
  externalId: string;
  barcode?: string;
}

interface SearchOptions {
  query: string;
  localFoods: NutritionFoodItem[];
  limit?: number;
  usdaApiKey?: string;
  /** Pass an AbortSignal to cancel in-flight requests when a new query starts */
  signal?: AbortSignal;
}

// Use the English-specific subdomain for better language-relevant results
const OPEN_FOOD_FACTS_SEARCH = 'https://world.openfoodfacts.org/cgi/search.pl';
const OPEN_FOOD_FACTS_PRODUCT = 'https://world.openfoodfacts.org/api/v2/product';
const USDA_SEARCH = 'https://api.nal.usda.gov/fdc/v1/foods/search';

function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cap(value: number): number {
  return Math.max(0, Number(value.toFixed(1)));
}

function normalizeName(name: string | undefined, fallback = 'Unknown food'): string {
  const clean = (name ?? '').trim();
  return clean.length ? clean : fallback;
}

/**
 * Quick heuristic: does the string look like it's predominantly ASCII / English?
 * Rejects names that are mostly non-Latin or contain zero ASCII letters.
 */
function looksEnglish(text: string): boolean {
  if (!text) return false;
  // Count ASCII letters vs total alpha chars
  const ascii = text.replace(/[^a-zA-Z]/g, '').length;
  const total = text.replace(/[^a-zA-ZÀ-ÿ]/g, '').length;
  if (total === 0) return false;
  return ascii / total > 0.6;
}

/**
 * Compute a relevance score (higher = more relevant).
 * - Exact name match with query → highest
 * - Name starts with query → high
 * - Name contains query word → medium
 * - No match → lowest
 */
function relevanceScore(name: string, query: string): number {
  const n = name.toLowerCase();
  const q = query.toLowerCase();
  if (n === q) return 100;
  if (n.startsWith(q)) return 80;
  // Check if any word in the name starts with the query
  const words = n.split(/[\s,\-()]+/);
  if (words.some((w) => w.startsWith(q))) return 60;
  if (n.includes(q)) return 40;
  // Check if query words appear in name
  const qWords = q.split(/\s+/);
  const matchCount = qWords.filter((qw) => n.includes(qw)).length;
  if (matchCount > 0) return 20 + (matchCount / qWords.length) * 15;
  return 0;
}

function mapOpenFoodFactsProduct(raw: any): NutritionProviderResult | null {
  const product = raw?.product ?? raw;
  const nutriments = product?.nutriments;
  if (!nutriments) return null;

  const servingLabelRaw = product?.serving_size ? String(product.serving_size).trim() : '';
  const parsedServing = servingLabelRaw ? parseServingAmount(servingLabelRaw) : null;
  const servingScale = parsedServing ? parsedServing.amount / 100 : 1;
  const hasServingNutrients = [
    nutriments['energy-kcal_serving'],
    nutriments.proteins_serving,
    nutriments.carbohydrates_serving,
    nutriments.fat_serving,
  ].some((value) => Number.isFinite(Number(value)));
  const useServingLabel = !!servingLabelRaw && (!!parsedServing || hasServingNutrients);
  const servingLabel = useServingLabel ? servingLabelRaw : '100 g';

  const scaled = (servingValue: unknown, per100Value: unknown) => {
    const perServing = Number(servingValue);
    const per100 = Number(per100Value);
    if (useServingLabel && Number.isFinite(perServing)) return perServing;
    if (Number.isFinite(per100)) return parsedServing ? per100 * servingScale : per100;
    return Number.isFinite(perServing) ? perServing : 0;
  };

  const kcal = scaled(nutriments['energy-kcal_serving'], nutriments['energy-kcal_100g']);
  const protein = scaled(nutriments.proteins_serving, nutriments.proteins_100g);
  const carbs = scaled(nutriments.carbohydrates_serving, nutriments.carbohydrates_100g);
  const fats = scaled(nutriments.fat_serving, nutriments.fat_100g);

  const hasAnyNutrient = [kcal, protein, carbs, fats].some((value) => Number.isFinite(value) && value > 0);
  if (!hasAnyNutrient && !('energy-kcal_100g' in nutriments) && !('energy-kcal_serving' in nutriments)) return null;

  const productName = normalizeName(product?.product_name, 'Open Food Facts item');

  // Skip non-English product names to avoid French/Italian/etc results
  if (!looksEnglish(productName)) return null;

  const code = String(product?.code ?? '').trim();
  const idBase = code || String(product?._id ?? product?.id ?? productName);

  return {
    id: `off_${idBase}`,
    name: productName,
    source: 'verified',
    state: 'raw',
    servingLabel,
    calories: cap(kcal),
    protein: cap(protein),
    carbs: cap(carbs),
    fats: cap(fats),
    favorite: false,
    createdAt: new Date().toISOString(),
    provider: 'openfoodfacts',
    externalId: idBase,
    barcode: code || undefined,
  };
}

function mapUsdaFood(raw: any): NutritionProviderResult | null {
  const nutrients: any[] = Array.isArray(raw?.foodNutrients) ? raw.foodNutrients : [];

  const byName = (needle: string) => {
    const lower = needle.toLowerCase();
    const hit = nutrients.find((item) =>
      String(item?.nutrientName ?? '').toLowerCase().includes(lower)
    );
    return asNumber(hit?.value);
  };

  // USDA uses different energy nutrient names across Foundation, SR Legacy, Branded data types
  const calories = byName('energy (atwater') || byName('energy');
  const protein = byName('protein');
  const carbs = byName('carbohydrate');
  const fats = byName('total lipid') || byName('fat');

  if (calories <= 0 && protein <= 0 && carbs <= 0 && fats <= 0) return null;

  const fdcId = String(raw?.fdcId ?? '').trim();
  if (!fdcId) return null;

  return {
    id: `usda_${fdcId}`,
    name: normalizeName(raw?.description, 'USDA item'),
    source: 'verified',
    state: 'raw',
    servingLabel: '100 g',
    calories: cap(calories),
    protein: cap(protein),
    carbs: cap(carbs),
    fats: cap(fats),
    favorite: false,
    createdAt: new Date().toISOString(),
    provider: 'usda',
    externalId: fdcId,
  };
}

function dedupeByNameAndMacros<T extends { name: string; calories: number; protein: number; carbs: number; fats: number }>(items: T[]): T[] {
  const seen = new Set<string>();
  const output: T[] = [];
  items.forEach((item) => {
    const key = `${item.name.toLowerCase()}|${Math.round(item.calories)}|${Math.round(item.protein)}|${Math.round(item.carbs)}|${Math.round(item.fats)}`;
    if (seen.has(key)) return;
    seen.add(key);
    output.push(item);
  });
  return output;
}

async function searchOpenFoodFacts(
  query: string,
  limit: number,
  signal?: AbortSignal,
): Promise<NutritionProviderResult[]> {
  // Request more results than needed so we have enough after filtering non-English
  const fetchLimit = Math.min(limit * 3, 50);
  const url =
    `${OPEN_FOOD_FACTS_SEARCH}?search_terms=${encodeURIComponent(query)}` +
    `&search_simple=1&action=process&json=1&page_size=${fetchLimit}` +
    `&sort_by=unique_scans_n` + // Sort by popularity → common foods first
    `&tagtype_0=languages&tag_contains_0=contains&tag_0=en` + // Prefer English products
    `&fields=product_name,nutriments,serving_size,code,_id`;
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return [];
    const data = await response.json();
    const products = Array.isArray(data?.products) ? data.products : [];
    return products
      .map(mapOpenFoodFactsProduct)
      .filter(Boolean) as NutritionProviderResult[];
  } catch (e: any) {
    if (e?.name === 'AbortError') return [];
    return [];
  }
}

async function searchUsdaFoods(
  query: string,
  limit: number,
  apiKey: string,
  signal?: AbortSignal,
): Promise<NutritionProviderResult[]> {
  try {
    const response = await fetch(`${USDA_SEARCH}?api_key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        pageSize: limit,
        // Prioritize Foundation & SR Legacy (generic whole foods like "eggs", "chicken breast")
        // over Branded (which is often niche products). Survey (FNDDS) has prepared dishes.
        dataType: ['Foundation', 'SR Legacy', 'Survey (FNDDS)', 'Branded'],
        sortBy: 'dataType.keyword',
        sortOrder: 'asc',
      }),
      signal,
    });
    if (!response.ok) return [];
    const data = await response.json();
    const foods = Array.isArray(data?.foods) ? data.foods : [];
    return foods.map(mapUsdaFood).filter(Boolean) as NutritionProviderResult[];
  } catch (e: any) {
    if (e?.name === 'AbortError') return [];
    return [];
  }
}

export async function searchNutritionProviders({
  query,
  localFoods,
  limit = 20,
  usdaApiKey,
  signal,
}: SearchOptions): Promise<NutritionFoodItem[]> {
  const q = query.trim().toLowerCase();
  const local = localFoods.filter((food) => food.name.toLowerCase().includes(q));

  if (!q || q.length < 2) return local.slice(0, limit);

  const [offResults, usdaResults] = await Promise.all([
    searchOpenFoodFacts(q, limit, signal).catch(() => []),
    usdaApiKey
      ? searchUsdaFoods(q, limit, usdaApiKey, signal).catch(() => [])
      : Promise.resolve([]),
  ]);

  // Merge: USDA first (higher quality generic foods), then OFF (branded/packaged), then local
  const allResults = dedupeByNameAndMacros([...usdaResults, ...offResults, ...local]);

  // Sort by relevance to the search query
  allResults.sort((a, b) => {
    const scoreA = relevanceScore(a.name, q);
    const scoreB = relevanceScore(b.name, q);
    if (scoreA !== scoreB) return scoreB - scoreA;
    // Tie-break: USDA > OFF > local (USDA has cleaner generic food data)
    const providerRank = (item: any) =>
      item.provider === 'usda' ? 2 : item.provider === 'openfoodfacts' ? 1 : 0;
    return providerRank(b) - providerRank(a);
  });

  return allResults.slice(0, limit);
}

export async function lookupFoodByBarcode(barcode: string): Promise<NutritionProviderResult | null> {
  const normalized = barcode.trim();
  if (!normalized) return null;
  try {
    const response = await fetch(
      `${OPEN_FOOD_FACTS_PRODUCT}/${encodeURIComponent(normalized)}.json`,
    );
    if (!response.ok) return null;
    const data = await response.json();
    return mapOpenFoodFactsProduct(data);
  } catch {
    return null;
  }
}


