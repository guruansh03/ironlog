import type { FoodSource, FoodState, NutritionFoodItem } from '../store/nutritionStore';

interface FoodSeed {
  name: string;
  servingLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  state?: FoodState;
  source?: FoodSource;
  favorite?: boolean;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function toFood(seed: FoodSeed): NutritionFoodItem {
  return {
    id: `food_${slugify(seed.name)}_${seed.state ?? 'raw'}`,
    name: seed.name,
    source: seed.source ?? 'verified',
    state: seed.state ?? 'raw',
    servingLabel: seed.servingLabel,
    calories: seed.calories,
    protein: seed.protein,
    carbs: seed.carbs,
    fats: seed.fats,
    favorite: seed.favorite ?? false,
    createdAt: new Date().toISOString(),
  };
}

const FOODS: FoodSeed[] = [
  // Protein - poultry / meat / seafood (cooked)
  { name: 'Chicken Breast', servingLabel: '100 g', calories: 165, protein: 31, carbs: 0, fats: 3.6, state: 'cooked', favorite: true },
  { name: 'Chicken Thigh (skinless)', servingLabel: '100 g', calories: 209, protein: 26, carbs: 0, fats: 10.9, state: 'cooked' },
  { name: 'Turkey Breast', servingLabel: '100 g', calories: 135, protein: 30, carbs: 0, fats: 1.1, state: 'cooked' },
  { name: 'Lean Beef (95%)', servingLabel: '100 g', calories: 176, protein: 26, carbs: 0, fats: 7.2, state: 'cooked' },
  { name: 'Sirloin Steak', servingLabel: '100 g', calories: 217, protein: 26, carbs: 0, fats: 12, state: 'cooked' },
  { name: 'Pork Tenderloin', servingLabel: '100 g', calories: 143, protein: 26, carbs: 0, fats: 3.5, state: 'cooked' },
  { name: 'Salmon', servingLabel: '100 g', calories: 208, protein: 22, carbs: 0, fats: 13, state: 'cooked' },
  { name: 'Tuna', servingLabel: '100 g', calories: 132, protein: 28, carbs: 0, fats: 1.3, state: 'cooked' },
  { name: 'Shrimp', servingLabel: '100 g', calories: 99, protein: 24, carbs: 0.2, fats: 0.3, state: 'cooked' },
  { name: 'Egg Whole', servingLabel: '1 large (50 g)', calories: 72, protein: 6.3, carbs: 0.4, fats: 4.8, state: 'raw' },
  { name: 'Egg White', servingLabel: '1 large (33 g)', calories: 17, protein: 3.6, carbs: 0.2, fats: 0.1, state: 'raw' },

  // Dairy / supplements
  { name: 'Greek Yogurt (non-fat)', servingLabel: '170 g', calories: 100, protein: 17, carbs: 6, fats: 0, state: 'raw' },
  { name: 'Cottage Cheese (low-fat)', servingLabel: '100 g', calories: 98, protein: 11, carbs: 3.4, fats: 4.3, state: 'raw' },
  { name: 'Milk (2%)', servingLabel: '250 ml', calories: 122, protein: 8, carbs: 12, fats: 5, state: 'raw' },
  { name: 'Paneer', servingLabel: '100 g', calories: 265, protein: 18, carbs: 3, fats: 21, state: 'raw' },
  { name: 'Whey Protein (generic)', servingLabel: '1 scoop (32 g)', calories: 120, protein: 24, carbs: 3, fats: 1.5, state: 'raw' },
  { name: 'Whey Isolate · My Brand', servingLabel: '1 scoop (32 g)', calories: 124, protein: 26, carbs: 2, fats: 1.4, state: 'raw', source: 'custom', favorite: true },

  // Carbs - grains/starches
  { name: 'Rolled Oats', servingLabel: '60 g', calories: 233, protein: 10, carbs: 39, fats: 4.5, state: 'raw', favorite: true },
  { name: 'Rice (raw)', servingLabel: '100 g', calories: 360, protein: 7, carbs: 79, fats: 0.7, state: 'raw' },
  { name: 'Steamed Rice', servingLabel: '150 g', calories: 195, protein: 3.4, carbs: 43, fats: 0.4, state: 'cooked' },
  { name: 'Brown Rice (cooked)', servingLabel: '150 g', calories: 168, protein: 3.9, carbs: 35, fats: 1.3, state: 'cooked' },
  { name: 'Quinoa (cooked)', servingLabel: '150 g', calories: 180, protein: 6.6, carbs: 32, fats: 2.9, state: 'cooked' },
  { name: 'Pasta (cooked)', servingLabel: '150 g', calories: 236, protein: 8.7, carbs: 46, fats: 1.3, state: 'cooked' },
  { name: 'Whole Wheat Bread', servingLabel: '2 slices (56 g)', calories: 148, protein: 7.8, carbs: 24, fats: 2.1, state: 'raw' },
  { name: 'Chapati', servingLabel: '1 medium (40 g)', calories: 120, protein: 3.2, carbs: 20, fats: 3.2, state: 'cooked' },
  { name: 'Potato (boiled)', servingLabel: '150 g', calories: 131, protein: 3.4, carbs: 30, fats: 0.2, state: 'cooked' },
  { name: 'Sweet Potato (baked)', servingLabel: '150 g', calories: 129, protein: 2.4, carbs: 30, fats: 0.2, state: 'cooked' },

  // Legumes & plant proteins
  { name: 'Lentils (cooked)', servingLabel: '150 g', calories: 174, protein: 13.5, carbs: 30, fats: 0.6, state: 'cooked' },
  { name: 'Chickpeas (cooked)', servingLabel: '150 g', calories: 246, protein: 13, carbs: 41, fats: 4, state: 'cooked' },
  { name: 'Kidney Beans (cooked)', servingLabel: '150 g', calories: 191, protein: 13, carbs: 34, fats: 0.8, state: 'cooked' },
  { name: 'Black Beans (cooked)', servingLabel: '150 g', calories: 198, protein: 13, carbs: 35, fats: 0.8, state: 'cooked' },
  { name: 'Tofu', servingLabel: '100 g', calories: 144, protein: 17, carbs: 3, fats: 9, state: 'raw' },
  { name: 'Tempeh', servingLabel: '100 g', calories: 193, protein: 20, carbs: 9, fats: 11, state: 'cooked' },

  // Fruits
  { name: 'Banana', servingLabel: '1 medium (118 g)', calories: 105, protein: 1.3, carbs: 27, fats: 0.3, state: 'raw' },
  { name: 'Apple', servingLabel: '1 medium (182 g)', calories: 95, protein: 0.5, carbs: 25, fats: 0.3, state: 'raw' },
  { name: 'Orange', servingLabel: '1 medium (131 g)', calories: 62, protein: 1.2, carbs: 15.4, fats: 0.2, state: 'raw' },
  { name: 'Mango', servingLabel: '165 g', calories: 99, protein: 1.4, carbs: 25, fats: 0.6, state: 'raw' },
  { name: 'Blueberries', servingLabel: '100 g', calories: 57, protein: 0.7, carbs: 14.5, fats: 0.3, state: 'raw' },
  { name: 'Strawberries', servingLabel: '100 g', calories: 32, protein: 0.7, carbs: 7.7, fats: 0.3, state: 'raw' },
  { name: 'Avocado', servingLabel: '100 g', calories: 160, protein: 2, carbs: 9, fats: 15, state: 'raw' },

  // Vegetables
  { name: 'Broccoli (cooked)', servingLabel: '100 g', calories: 35, protein: 2.4, carbs: 7.2, fats: 0.4, state: 'cooked' },
  { name: 'Spinach (cooked)', servingLabel: '100 g', calories: 23, protein: 2.9, carbs: 3.8, fats: 0.4, state: 'cooked' },
  { name: 'Carrot (raw)', servingLabel: '100 g', calories: 41, protein: 0.9, carbs: 10, fats: 0.2, state: 'raw' },
  { name: 'Cucumber', servingLabel: '100 g', calories: 15, protein: 0.7, carbs: 3.6, fats: 0.1, state: 'raw' },
  { name: 'Tomato', servingLabel: '100 g', calories: 18, protein: 0.9, carbs: 3.9, fats: 0.2, state: 'raw' },
  { name: 'Bell Pepper', servingLabel: '100 g', calories: 31, protein: 1, carbs: 6, fats: 0.3, state: 'raw' },
  { name: 'Mixed Salad Greens', servingLabel: '100 g', calories: 20, protein: 2, carbs: 3.5, fats: 0.2, state: 'raw' },

  // Fats, nuts, seeds
  { name: 'Peanut Butter', servingLabel: '1 tbsp (16 g)', calories: 94, protein: 3.6, carbs: 3.2, fats: 8, state: 'raw' },
  { name: 'Almonds', servingLabel: '28 g', calories: 164, protein: 6, carbs: 6, fats: 14, state: 'raw' },
  { name: 'Walnuts', servingLabel: '28 g', calories: 185, protein: 4.3, carbs: 3.9, fats: 18.5, state: 'raw' },
  { name: 'Chia Seeds', servingLabel: '28 g', calories: 138, protein: 4.7, carbs: 12, fats: 8.7, state: 'raw' },
  { name: 'Flax Seeds', servingLabel: '28 g', calories: 150, protein: 5.2, carbs: 8.2, fats: 12, state: 'raw' },
  { name: 'Olive Oil', servingLabel: '1 tbsp (14 g)', calories: 119, protein: 0, carbs: 0, fats: 13.5, state: 'raw' },
  { name: 'Ghee', servingLabel: '1 tbsp (14 g)', calories: 124, protein: 0, carbs: 0, fats: 14, state: 'raw' },

  // Common prepared dishes
  { name: 'Chicken Rice Bowl', servingLabel: '1 bowl (350 g)', calories: 610, protein: 48, carbs: 64, fats: 14, state: 'cooked' },
  { name: 'Paneer Curry', servingLabel: '1 bowl (250 g)', calories: 296, protein: 22, carbs: 18, fats: 16, state: 'cooked' },
  { name: 'Dal Tadka', servingLabel: '1 bowl (220 g)', calories: 235, protein: 12, carbs: 28, fats: 8, state: 'cooked' },
  { name: 'Vegetable Stir Fry', servingLabel: '1 bowl (220 g)', calories: 182, protein: 7, carbs: 21, fats: 8, state: 'cooked' },
  { name: 'Egg Fried Rice', servingLabel: '1 bowl (300 g)', calories: 420, protein: 14, carbs: 58, fats: 14, state: 'cooked' },
  { name: 'Grilled Chicken Sandwich', servingLabel: '1 sandwich (220 g)', calories: 396, protein: 32, carbs: 38, fats: 12, state: 'cooked' },
  { name: 'Protein Smoothie', servingLabel: '1 glass (350 ml)', calories: 320, protein: 31, carbs: 35, fats: 7, state: 'raw' },

  // Indian staples raw/cooked variants
  { name: 'Basmati Rice (raw)', servingLabel: '100 g', calories: 365, protein: 7.5, carbs: 80, fats: 0.6, state: 'raw' },
  { name: 'Basmati Rice (cooked)', servingLabel: '150 g', calories: 195, protein: 3.7, carbs: 43, fats: 0.5, state: 'cooked' },
  { name: 'Moong Dal (raw)', servingLabel: '100 g', calories: 347, protein: 24, carbs: 63, fats: 1.2, state: 'raw' },
  { name: 'Moong Dal (cooked)', servingLabel: '150 g', calories: 158, protein: 11, carbs: 28, fats: 0.8, state: 'cooked' },
  { name: 'Rajma (raw)', servingLabel: '100 g', calories: 333, protein: 24, carbs: 60, fats: 0.8, state: 'raw' },
  { name: 'Rajma (cooked)', servingLabel: '150 g', calories: 191, protein: 13, carbs: 34, fats: 0.8, state: 'cooked' },
  { name: 'Soya Chunks (dry)', servingLabel: '50 g', calories: 173, protein: 26, carbs: 16, fats: 0.3, state: 'raw' },
  { name: 'Soya Chunks (cooked)', servingLabel: '100 g', calories: 120, protein: 17, carbs: 10, fats: 0.2, state: 'cooked' },

  // Common snack/packaged references
  { name: 'Granola Bar', servingLabel: '1 bar (40 g)', calories: 180, protein: 4, carbs: 28, fats: 6, state: 'raw' },
  { name: 'Dark Chocolate (70%)', servingLabel: '20 g', calories: 120, protein: 1.8, carbs: 9, fats: 8.8, state: 'raw' },
  { name: 'Potato Chips', servingLabel: '28 g', calories: 152, protein: 2, carbs: 15, fats: 10, state: 'raw' },
  { name: 'Diet Soda', servingLabel: '330 ml', calories: 0, protein: 0, carbs: 0, fats: 0, state: 'raw' },
  { name: 'Orange Juice', servingLabel: '250 ml', calories: 112, protein: 1.7, carbs: 26, fats: 0.5, state: 'raw' },
  { name: 'Coconut Water', servingLabel: '250 ml', calories: 45, protein: 1.7, carbs: 9, fats: 0.4, state: 'raw' },
  { name: 'Espresso', servingLabel: '30 ml', calories: 2, protein: 0.3, carbs: 0, fats: 0, state: 'raw' },
];

export const DEFAULT_FOOD_DATABASE: NutritionFoodItem[] = FOODS.map(toFood);

