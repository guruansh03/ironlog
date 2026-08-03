import { create } from 'zustand';
import { mmkvStorage } from './mmkv';
import { format } from 'date-fns';
import { generateId as uuid } from '../utils/generateId';
import { DEFAULT_FOOD_DATABASE } from '../utils/nutritionFoodDatabase';

export type FoodState = 'cooked' | 'raw';
export type FoodSource = 'verified' | 'custom' | 'recipe';
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface NutritionFoodItem {
  id: string;
  name: string;
  source: FoodSource;
  state: FoodState;
  servingLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  favorite?: boolean;
  createdAt: string;
}

export interface NutritionMealEntry {
  id: string;
  date: string;
  mealType: MealType;
  foodName: string;
  source: FoodSource;
  state: FoodState;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  loggedAt: string;
}

export interface NutritionGoal {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  waterL: number;
}

// ─── Water Tracking ──────────────────────────────────────────────────────────
export interface WaterEntry {
  id: string;
  date: string;
  ml: number;
  loggedAt: string;
}

// ─── Recipe ──────────────────────────────────────────────────────────────────
export interface RecipeIngredient {
  foodId: string;
  foodName: string;
  quantity: number; // multiplier (1 = per 100g or per serving)
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  servings: number; // how many servings this recipe makes
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  createdAt: string;
}

interface NutritionState {
  goal: NutritionGoal;
  foods: NutritionFoodItem[];
  entries: NutritionMealEntry[];
  waterEntries: WaterEntry[];
  recipes: Recipe[];

  // Foods
  addCustomFood: (payload: {
    name: string; state: FoodState; servingLabel: string;
    calories: number; protein: number; carbs: number; fats: number;
  }) => NutritionFoodItem;
  addEntryFromFood: (food: NutritionFoodItem, mealType: MealType, quantity?: number, date?: string) => void;
  removeEntry: (entryId: string) => void;
  updateEntry: (entryId: string, newQuantity: number) => void;
  toggleFavoriteFood: (foodId: string) => void;
  setGoal: (goal: Partial<NutritionGoal>) => void;

  // Water
  addWater: (ml: number, date?: string) => void;
  removeWater: (entryId: string) => void;
  getWaterToday: () => number;

  // Copy meals
  copyMealsFromDate: (fromDate: string, toDate?: string) => void;
  copyMeal: (fromDate: string, mealType: MealType, toDate?: string) => void;

  // Recipes
  addRecipe: (name: string, ingredients: RecipeIngredient[], servings?: number) => Recipe;
  deleteRecipe: (recipeId: string) => void;
  logRecipe: (recipe: Recipe, mealType: MealType, servings?: number, date?: string) => void;

  load: () => void;
  _save: () => void;
}

const INITIAL_GOAL: NutritionGoal = {
  calories: 2200, protein: 160, carbs: 250, fats: 70, fiber: 30, waterL: 3,
};

function todayDate() { return format(new Date(), 'yyyy-MM-dd'); }

function normalizeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeFood(raw: any): NutritionFoodItem {
  return {
    id: typeof raw?.id === 'string' && raw.id ? raw.id : uuid(),
    name: typeof raw?.name === 'string' ? raw.name : 'Untitled Food',
    source: ['custom', 'verified', 'recipe'].includes(raw?.source) ? raw.source : 'verified',
    state: raw?.state === 'raw' ? 'raw' : 'cooked',
    servingLabel: typeof raw?.servingLabel === 'string' && raw.servingLabel ? raw.servingLabel : '100 g',
    calories: normalizeNumber(raw?.calories),
    protein: normalizeNumber(raw?.protein),
    carbs: normalizeNumber(raw?.carbs),
    fats: normalizeNumber(raw?.fats),
    favorite: Boolean(raw?.favorite),
    createdAt: typeof raw?.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
  };
}

function normalizeEntry(raw: any): NutritionMealEntry {
  return {
    id: typeof raw?.id === 'string' && raw.id ? raw.id : uuid(),
    date: typeof raw?.date === 'string' && raw.date ? raw.date : todayDate(),
    mealType: ['Breakfast', 'Lunch', 'Dinner', 'Snack'].includes(raw?.mealType) ? raw.mealType : 'Snack',
    foodName: typeof raw?.foodName === 'string' ? raw.foodName : 'Food',
    source: ['custom', 'verified', 'recipe'].includes(raw?.source) ? raw.source : 'verified',
    state: raw?.state === 'raw' ? 'raw' : 'cooked',
    quantity: normalizeNumber(raw?.quantity) || 1,
    calories: normalizeNumber(raw?.calories),
    protein: normalizeNumber(raw?.protein),
    carbs: normalizeNumber(raw?.carbs),
    fats: normalizeNumber(raw?.fats),
    loggedAt: typeof raw?.loggedAt === 'string' ? raw.loggedAt : new Date().toISOString(),
  };
}

function normalizeWaterEntry(raw: any): WaterEntry {
  return {
    id: typeof raw?.id === 'string' && raw.id ? raw.id : uuid(),
    date: typeof raw?.date === 'string' && raw.date ? raw.date : todayDate(),
    ml: normalizeNumber(raw?.ml) || 250,
    loggedAt: typeof raw?.loggedAt === 'string' ? raw.loggedAt : new Date().toISOString(),
  };
}

function normalizeRecipe(raw: any): Recipe {
  const ingredients: RecipeIngredient[] = Array.isArray(raw?.ingredients)
    ? raw.ingredients.map((ing: any) => ({
        foodId: String(ing?.foodId ?? ''),
        foodName: String(ing?.foodName ?? 'Unknown'),
        quantity: normalizeNumber(ing?.quantity) || 1,
        calories: normalizeNumber(ing?.calories),
        protein: normalizeNumber(ing?.protein),
        carbs: normalizeNumber(ing?.carbs),
        fats: normalizeNumber(ing?.fats),
      }))
    : [];
  return {
    id: typeof raw?.id === 'string' && raw.id ? raw.id : uuid(),
    name: typeof raw?.name === 'string' ? raw.name : 'Untitled Recipe',
    ingredients,
    servings: normalizeNumber(raw?.servings) || 1,
    totalCalories: normalizeNumber(raw?.totalCalories),
    totalProtein: normalizeNumber(raw?.totalProtein),
    totalCarbs: normalizeNumber(raw?.totalCarbs),
    totalFats: normalizeNumber(raw?.totalFats),
    createdAt: typeof raw?.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
  };
}

function mergeFoods(savedFoods: NutritionFoodItem[]): NutritionFoodItem[] {
  const byId = new Map<string, NutritionFoodItem>();
  DEFAULT_FOOD_DATABASE.forEach((food) => byId.set(food.id, food));
  savedFoods.forEach((food) => byId.set(food.id, food));
  return Array.from(byId.values());
}
function normalizeGoal(raw: any): NutritionGoal {
  return {
    calories: normalizeNumber(raw?.calories) || INITIAL_GOAL.calories,
    protein: normalizeNumber(raw?.protein) || INITIAL_GOAL.protein,
    carbs: normalizeNumber(raw?.carbs) || INITIAL_GOAL.carbs,
    fats: normalizeNumber(raw?.fats) || INITIAL_GOAL.fats,
    fiber: normalizeNumber(raw?.fiber) || INITIAL_GOAL.fiber,
    waterL: normalizeNumber(raw?.waterL) || INITIAL_GOAL.waterL,
  };
}

export const useNutritionStore = create<NutritionState>((set, get) => ({
  goal: INITIAL_GOAL,
  foods: DEFAULT_FOOD_DATABASE,
  entries: [],
  waterEntries: [],
  recipes: [],

  addCustomFood: (payload) => {
    const item: NutritionFoodItem = {
      id: uuid(),
      name: payload.name.trim(),
      source: 'custom',
      state: payload.state,
      servingLabel: payload.servingLabel.trim(),
      calories: payload.calories,
      protein: payload.protein,
      carbs: payload.carbs,
      fats: payload.fats,
      favorite: false,
      createdAt: new Date().toISOString(),
    };
    set(s => ({ foods: [item, ...s.foods] }));
    get()._save();
    return item;
  },

  addEntryFromFood: (food, mealType, quantity = 1, date = todayDate()) => {
    const safeQty = Math.max(0.1, quantity);
    const entry: NutritionMealEntry = {
      id: uuid(), date, mealType,
      foodName: food.name,
      source: food.source,
      state: food.state,
      quantity: safeQty,
      calories: Number((food.calories * safeQty).toFixed(1)),
      protein: Number((food.protein * safeQty).toFixed(1)),
      carbs: Number((food.carbs * safeQty).toFixed(1)),
      fats: Number((food.fats * safeQty).toFixed(1)),
      loggedAt: new Date().toISOString(),
    };
    set(s => ({ entries: [entry, ...s.entries] }));
    get()._save();
  },

  removeEntry: (entryId) => {
    set(s => ({ entries: s.entries.filter(e => e.id !== entryId) }));
    get()._save();
  },

  updateEntry: (entryId, newQuantity) => {
    const safeQuantity = Math.max(0.1, newQuantity);
    set(s => ({
      entries: s.entries.map(e => {
        if (e.id !== entryId) return e;
        const ratio = safeQuantity / (e.quantity || 1);
        return {
          ...e,
          quantity: safeQuantity,
          calories: Number((e.calories * ratio).toFixed(1)),
          protein: Number((e.protein * ratio).toFixed(1)),
          carbs: Number((e.carbs * ratio).toFixed(1)),
          fats: Number((e.fats * ratio).toFixed(1)),
        };
      }),
    }));
    get()._save();
  },

  toggleFavoriteFood: (foodId) => {
    set(s => ({ foods: s.foods.map(f => f.id === foodId ? { ...f, favorite: !f.favorite } : f) }));
    get()._save();
  },

  setGoal: (goalPatch) => {
    set(s => ({ goal: { ...s.goal, ...goalPatch } }));
    get()._save();
  },

  // ─── Water ─────────────────────────────────────────────────────────────────
  addWater: (ml, date = todayDate()) => {
    const entry: WaterEntry = {
      id: uuid(),
      date,
      ml: Math.max(1, ml),
      loggedAt: new Date().toISOString(),
    };
    set(s => ({ waterEntries: [entry, ...s.waterEntries] }));
    get()._save();
  },

  removeWater: (entryId) => {
    set(s => ({ waterEntries: s.waterEntries.filter(w => w.id !== entryId) }));
    get()._save();
  },

  getWaterToday: () => {
    const today = todayDate();
    return get().waterEntries
      .filter(w => w.date === today)
      .reduce((sum, w) => sum + w.ml, 0);
  },

  // ─── Copy Meals ────────────────────────────────────────────────────────────
  copyMealsFromDate: (fromDate, toDate = todayDate()) => {
    const toCopy = get().entries
      .filter(e => e.date === fromDate)
      .map(e => ({ ...e, id: uuid(), date: toDate, loggedAt: new Date().toISOString() }));
    if (!toCopy.length) return;
    set(s => ({ entries: [...toCopy, ...s.entries] }));
    get()._save();
  },

  copyMeal: (fromDate, mealType, toDate = todayDate()) => {
    const toCopy = get().entries
      .filter(e => e.date === fromDate && e.mealType === mealType)
      .map(e => ({ ...e, id: uuid(), date: toDate, loggedAt: new Date().toISOString() }));
    if (!toCopy.length) return;
    set(s => ({ entries: [...toCopy, ...s.entries] }));
    get()._save();
  },

  // ─── Recipes ───────────────────────────────────────────────────────────────
  addRecipe: (name, ingredients, servings = 1) => {
    const totalCalories = ingredients.reduce((s, i) => s + i.calories * i.quantity, 0);
    const totalProtein = ingredients.reduce((s, i) => s + i.protein * i.quantity, 0);
    const totalCarbs = ingredients.reduce((s, i) => s + i.carbs * i.quantity, 0);
    const totalFats = ingredients.reduce((s, i) => s + i.fats * i.quantity, 0);
    const recipe: Recipe = {
      id: uuid(),
      name: name.trim(),
      ingredients,
      servings,
      totalCalories: Number(totalCalories.toFixed(1)),
      totalProtein: Number(totalProtein.toFixed(1)),
      totalCarbs: Number(totalCarbs.toFixed(1)),
      totalFats: Number(totalFats.toFixed(1)),
      createdAt: new Date().toISOString(),
    };
    set(s => ({ recipes: [recipe, ...s.recipes] }));
    get()._save();
    return recipe;
  },

  deleteRecipe: (recipeId) => {
    set(s => ({ recipes: s.recipes.filter(r => r.id !== recipeId) }));
    get()._save();
  },

  logRecipe: (recipe, mealType, servings = 1, date = todayDate()) => {
    const ratio = servings / (recipe.servings || 1);
    const entry: NutritionMealEntry = {
      id: uuid(), date, mealType,
      foodName: recipe.name,
      source: 'recipe',
      state: 'cooked',
      quantity: servings,
      calories: Number((recipe.totalCalories * ratio).toFixed(1)),
      protein: Number((recipe.totalProtein * ratio).toFixed(1)),
      carbs: Number((recipe.totalCarbs * ratio).toFixed(1)),
      fats: Number((recipe.totalFats * ratio).toFixed(1)),
      loggedAt: new Date().toISOString(),
    };
    set(s => ({ entries: [entry, ...s.entries] }));
    get()._save();
  },

  load: () => {
    const raw = mmkvStorage.getString('nutrition');
    if (!raw) {
      set({ foods: DEFAULT_FOOD_DATABASE });
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      set({
        goal: normalizeGoal(parsed?.goal),
        foods: mergeFoods(Array.isArray(parsed?.foods) ? parsed.foods.map(normalizeFood) : []),
        entries: Array.isArray(parsed?.entries) ? parsed.entries.map(normalizeEntry) : [],
        waterEntries: Array.isArray(parsed?.waterEntries) ? parsed.waterEntries.map(normalizeWaterEntry) : [],
        recipes: Array.isArray(parsed?.recipes) ? parsed.recipes.map(normalizeRecipe) : [],
      });
    } catch {
      set({ goal: INITIAL_GOAL, foods: DEFAULT_FOOD_DATABASE, entries: [], waterEntries: [], recipes: [] });
    }
  },

  _save: () => {
    const { goal, foods, entries, waterEntries, recipes } = get();
    mmkvStorage.set('nutrition', JSON.stringify({ goal, foods, entries, waterEntries, recipes }));
  },
}));
