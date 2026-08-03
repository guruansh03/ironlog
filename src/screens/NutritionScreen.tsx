import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Animated,
  TouchableOpacity,
  Pressable,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { format, subDays } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme/ThemeContext';
import { F } from '../theme/fonts';
import AnimatedPressable from '../components/animations/AnimatedPressable';
import PopupSheet from '../components/shared/PopupSheet';
import MiniLineChart from '../components/ui/MiniLineChart';
import { MealType, NutritionFoodItem, useNutritionStore } from '../store/nutritionStore';
import { getReadableTextColor } from '../theme/contrast';
import { lookupFoodByBarcode, searchNutritionProviders } from '../utils/nutritionProviders';
import { defaultQuantityForServing, quantityMultiplierForServing, QuantityMode } from '../utils/nutritionServing';
import { Camera, CameraView } from 'expo-camera';
import { FoodSearchSheet, NutritionDayView, QtySheetContent } from './nutrition/NutritionSupport';

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

type FoodFilter = 'All' | 'Recent' | 'Favorites' | 'Verified DB' | 'My Foods';
type TrendRange = '1W' | '1M' | '3M' | '6M' | '1Y';
type BuilderType = 'single' | 'recipe';
type QtyMode = QuantityMode;

function defaultQtyInputForFood(food: NutritionFoodItem) {
  return defaultQuantityForServing(food.servingLabel);
}

export default function NutritionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { theme: t } = useAppTheme();
  const onAccent = getReadableTextColor(t.accentBtn);

  const {
    goal, foods, entries, addEntryFromFood, addCustomFood, removeEntry,
    waterEntries, addWater, removeWater, getWaterToday,
    copyMealsFromDate,
  } = useNutritionStore();

  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showCaloriesTrend, setShowCaloriesTrend] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FoodFilter>('All');
  const [selectedMealType, setSelectedMealType] = useState<MealType>('Lunch');
  const [trendRange, setTrendRange] = useState<TrendRange>('1W');
  const [builderType, setBuilderType] = useState<BuilderType>('single');
  const [customState, setCustomState] = useState<'cooked' | 'raw'>('raw');
  const [recipeServings, setRecipeServings] = useState('2');
  const [recipeCaloriesOverride, setRecipeCaloriesOverride] = useState('');
  const [recipeIngredients, setRecipeIngredients] = useState<Array<{ foodId: string; quantity: number }>>([]);
  const [barcode, setBarcode] = useState('');
  const [providerFoods, setProviderFoods] = useState<NutritionFoodItem[]>([]);
  const [providerLoading, setProviderLoading] = useState(false);
  const [qtySheet, setQtySheet] = useState<{ food: NutritionFoodItem } | null>(null);
  const [qtyInput, setQtyInput] = useState('100');
  const [qtyMode, setQtyMode] = useState<QtyMode>('grams');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const STICKY_THRESHOLD = 120;

  const stickyBarOpacity = scrollY.interpolate({
    inputRange: [STICKY_THRESHOLD - 20, STICKY_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const stickyBarTranslate = scrollY.interpolate({
    inputRange: [STICKY_THRESHOLD - 20, STICKY_THRESHOLD],
    outputRange: [-12, 0],
    extrapolate: 'clamp',
  });

  const [customName, setCustomName] = useState('');
  const [customServing, setCustomServing] = useState('1 serving');
  const [customCalories, setCustomCalories] = useState('120');
  const [customProtein, setCustomProtein] = useState('24');
  const [customCarbs, setCustomCarbs] = useState('4');
  const [customFats, setCustomFats] = useState('2');

  const today = format(new Date(), 'yyyy-MM-dd');

  const todayEntries = useMemo(
    () => entries.filter((entry) => entry.date === today),
    [entries, today]
  );

  const totals = useMemo(() => {
    return todayEntries.reduce(
      (acc, entry) => ({
        calories: acc.calories + entry.calories,
        protein: acc.protein + entry.protein,
        carbs: acc.carbs + entry.carbs,
        fats: acc.fats + entry.fats,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  }, [todayEntries]);

  const goalProgress = useMemo(() => {
    const pct = goal.calories > 0 ? Math.min(100, Math.round((totals.calories / goal.calories) * 100)) : 0;
    return pct;
  }, [goal.calories, totals.calories]);

  const estimatedFiber = useMemo(() => Math.max(0, Math.round(totals.carbs * 0.12)), [totals.carbs]);
  const waterToday = useMemo(() => {
    return waterEntries
      .filter(w => w.date === today)
      .reduce((sum, w) => sum + w.ml, 0);
  }, [waterEntries, today]);
  const waterLiters = waterToday / 1000;
  const waterProgress = Math.min(1, waterLiters / (goal.waterL || 3));

  const yesterdayStr = useMemo(() => format(subDays(new Date(), 1), 'yyyy-MM-dd'), []);
  const yesterdayHasMeals = useMemo(() => entries.some(e => e.date === yesterdayStr), [entries, yesterdayStr]);

  const filteredFoods = useMemo(() => {
    let list = foods;

    if (filter === 'Favorites') {
      list = list.filter((food) => food.favorite);
    } else if (filter === 'Verified DB') {
      list = list.filter((food) => food.source === 'verified');
    } else if (filter === 'My Foods') {
      list = list.filter((food) => food.source === 'custom');
    } else if (filter === 'Recent') {
      const recentNames = new Set(todayEntries.map((entry) => entry.foodName));
      list = list.filter((food) => recentNames.has(food.name));
    }

    if (search.trim()) {
      const query = search.trim().toLowerCase();
      list = list.filter((food) => food.name.toLowerCase().includes(query));
    }

    return list;
  }, [filter, foods, search, todayEntries]);

  const displayFoods = useMemo(() => {
    if (!search.trim()) return filteredFoods;
    if (filter === 'Recent' || filter === 'Favorites' || filter === 'My Foods') return filteredFoods;
    // While loading, show local filtered results as a placeholder.
    // Once provider results arrive, switch to the provider list (which already includes local matches).
    if (providerLoading) return filteredFoods;
    return providerFoods.length ? providerFoods : filteredFoods;
  }, [filteredFoods, filter, providerFoods, providerLoading, search]);

  const mealRows = useMemo(() => {
    return [...todayEntries].sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime());
  }, [todayEntries]);

  const dailyCaloriesMap = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((entry) => {
      map.set(entry.date, (map.get(entry.date) ?? 0) + entry.calories);
    });
    return map;
  }, [entries]);

  const trendData = useMemo(() => {
    const todayDateValue = new Date();
    const days = trendRange === '1W' ? 7 : trendRange === '1M' ? 30 : trendRange === '3M' ? 90 : trendRange === '6M' ? 180 : 365;
    const values = Array.from({ length: days }, (_, index) => {
      const date = format(subDays(todayDateValue, days - index - 1), 'yyyy-MM-dd');
      return Math.round(dailyCaloriesMap.get(date) ?? 0);
    });

    let displayValues = values;
    if (trendRange === '3M') {
      displayValues = chunkAverage(values, 7);
    } else if (trendRange === '6M') {
      displayValues = chunkAverage(values, 7);
    } else if (trendRange === '1Y') {
      displayValues = chunkAverage(values, 30);
    }

    const average = displayValues.length
      ? Math.round(displayValues.reduce((sum, value) => sum + value, 0) / displayValues.length)
      : 0;
    const max = displayValues.length ? Math.max(...displayValues) : 0;
    const min = displayValues.length ? Math.min(...displayValues) : 0;

    return {
      values: displayValues,
      average,
      max,
      min,
      total: displayValues.reduce((sum, value) => sum + value, 0),
      days,
    };
  }, [dailyCaloriesMap, trendRange]);

  const periodEntries = useMemo(() => {
    const start = subDays(new Date(), trendData.days - 1).getTime();
    return entries.filter((entry) => new Date(`${entry.date}T00:00:00`).getTime() >= start);
  }, [entries, trendData.days]);

  const adherencePct = useMemo(() => {
    const byDate = new Map<string, number>();
    periodEntries.forEach((entry) => {
      byDate.set(entry.date, (byDate.get(entry.date) ?? 0) + entry.calories);
    });
    if (!byDate.size || goal.calories <= 0) return 0;
    const hitDays = [...byDate.values()].filter((kcal) => Math.abs(kcal - goal.calories) <= goal.calories * 0.1).length;
    return Math.round((hitDays / byDate.size) * 100);
  }, [goal.calories, periodEntries]);

  const consistencySignals = useMemo(() => {
    const proteinByDate = new Map<string, number>();
    const lateNightDates = new Set<string>();

    periodEntries.forEach((entry) => {
      proteinByDate.set(entry.date, (proteinByDate.get(entry.date) ?? 0) + entry.protein);
      const hour = new Date(entry.loggedAt).getHours();
      if (hour >= 22) lateNightDates.add(entry.date);
    });

    const proteinTargetHit = [...proteinByDate.values()].filter((p) => p >= goal.protein).length;
    return {
      proteinTargetHit,
      trackedDays: proteinByDate.size,
      mealsLogged: periodEntries.length,
      lateNightDays: lateNightDates.size,
    };
  }, [goal.protein, periodEntries]);

  const topFoods = useMemo(() => {
    const map = new Map<string, { count: number; calories: number; source: 'custom' | 'verified' | 'recipe' }>();
    periodEntries.forEach((entry) => {
      const current = map.get(entry.foodName);
      if (current) {
        current.count += 1;
        current.calories += entry.calories;
      } else {
        map.set(entry.foodName, { count: 1, calories: entry.calories, source: entry.source });
      }
    });
    return [...map.entries()]
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [periodEntries]);

  const recipeTotals = useMemo(() => {
    const foodMap = new Map(foods.map((food) => [food.id, food]));
    return recipeIngredients.reduce(
      (acc, ingredient) => {
        const item = foodMap.get(ingredient.foodId);
        if (!item) return acc;
        return {
          calories: acc.calories + item.calories * ingredient.quantity,
          protein: acc.protein + item.protein * ingredient.quantity,
          carbs: acc.carbs + item.carbs * ingredient.quantity,
          fats: acc.fats + item.fats * ingredient.quantity,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  }, [foods, recipeIngredients]);

  const recipeItems = useMemo(() => {
    const foodMap = new Map(foods.map((food) => [food.id, food]));
    return recipeIngredients
      .map((ingredient) => {
        const food = foodMap.get(ingredient.foodId);
        if (!food) return null;
        return {
          id: food.id,
          name: food.name,
          quantity: ingredient.quantity,
          servingLabel: food.servingLabel,
          calories: Math.round(food.calories * ingredient.quantity),
        };
      })
      .filter(Boolean) as Array<{ id: string; name: string; quantity: number; servingLabel: string; calories: number }>;
  }, [foods, recipeIngredients]);

  async function onAddFood(food: NutritionFoodItem) {
    const nextQty = defaultQtyInputForFood(food);
    setQtyInput(nextQty.input);
    setQtyMode(nextQty.mode);
    setQtySheet({ food });
  }

  async function confirmAddFood() {
    if (!qtySheet) return;
    const value = parseFloat(qtyInput) || (qtyMode === 'grams' ? 100 : 1);
    const quantity = quantityMultiplierForServing(qtySheet.food.servingLabel, value, qtyMode);
    await addEntryFromFood(qtySheet.food, selectedMealType, quantity, today);
    setQtySheet(null);
    setShowAddSheet(false);
  }
  async function onUseParsedBarcode(scannedCode?: string) {
    const code = (scannedCode ?? barcode).trim();
    if (!code) {
      Alert.alert('Barcode needed', 'Enter a barcode first.');
      return;
    }

    const found = await lookupFoodByBarcode(code);
    if (!found) {
      Alert.alert('Not found', 'No product found for this barcode.');
      return;
    }

    await addEntryFromFood(found, selectedMealType, 1, today);
    setBarcode(code);
    setShowAddSheet(false);
  }

  async function onScanBarcodePress() {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera permission required', 'Allow camera access to scan barcodes.');
      return;
    }
    setShowBarcodeScanner(true);
  }

  function onAddIngredient(food: NutritionFoodItem) {
    setRecipeIngredients((prev) => {
      const found = prev.find((item) => item.foodId === food.id);
      if (!found) return [...prev, { foodId: food.id, quantity: 1 }];
      return prev.map((item) => (item.foodId === food.id ? { ...item, quantity: item.quantity + 1 } : item));
    });
  }

  function onRemoveIngredient(foodId: string) {
    setRecipeIngredients((prev) => prev.filter((item) => item.foodId !== foodId));
  }

  function resetBuilder() {
    setCustomName('');
    setCustomServing('1 serving');
    setCustomCalories('120');
    setCustomProtein('24');
    setCustomCarbs('4');
    setCustomFats('2');
    setRecipeServings('2');
    setRecipeCaloriesOverride('');
    setRecipeIngredients([]);
  }

  async function buildCustomFood() {
    if (!customName.trim() || !customServing.trim()) return null;

    if (builderType === 'single') {
      const calories = Number(customCalories);
      const protein = Number(customProtein);
      const carbs = Number(customCarbs);
      const fats = Number(customFats);
      if (![calories, protein, carbs, fats].every((value) => Number.isFinite(value) && value >= 0)) return null;

      return addCustomFood({
        name: customName.trim(),
        state: customState,
        servingLabel: customServing.trim(),
        calories,
        protein,
        carbs,
        fats,
      });
    }

    const parsedServings = Number(recipeServings);
    if (!Number.isFinite(parsedServings) || parsedServings <= 0 || recipeIngredients.length === 0) return null;
    const servings = Math.max(0.5, parsedServings);

    const overrideCalories = Number(recipeCaloriesOverride);
    const finalCalories = Number.isFinite(overrideCalories) && overrideCalories > 0 ? overrideCalories : recipeTotals.calories;

    return addCustomFood({
      name: customName.trim(),
      state: customState,
      servingLabel: customServing.trim(),
      calories: Number((finalCalories / servings).toFixed(1)),
      protein: Number((recipeTotals.protein / servings).toFixed(1)),
      carbs: Number((recipeTotals.carbs / servings).toFixed(1)),
      fats: Number((recipeTotals.fats / servings).toFixed(1)),
    });
  }

  async function onSaveCustomFoodOnly() {
    const item = await buildCustomFood();
    if (!item) return;
    resetBuilder();
  }

  async function onSaveAndAddCustomFood() {
    const item = await buildCustomFood();
    if (!item) return;
    await addEntryFromFood(item, selectedMealType, 1, today);
    resetBuilder();
    setShowAddSheet(false);
  }

  function macroRatio(value: number, target: number) {
    if (target <= 0) return 0;
    return Math.min(1, value / target);
  }

  // Debounced provider search with AbortController.
  // Fires 400ms after the user stops typing; cancels any in-flight request.
  useEffect(() => {
    let active = true;
    const query = search.trim();
    const shouldUseProviders = query.length >= 2 && (filter === 'All' || filter === 'Verified DB');

    if (!shouldUseProviders) {
      setProviderFoods([]);
      setProviderLoading(false);
      return;
    }

    setProviderLoading(true);
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      const results = await searchNutritionProviders({
        query,
        localFoods: foods,
        limit: 20,
        usdaApiKey: process.env.EXPO_PUBLIC_USDA_API_KEY,
        signal: controller.signal,
      }).catch(() => []);

      if (active) {
        setProviderFoods(results);
        setProviderLoading(false);
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [filter, foods, search]);

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <Animated.View
        style={[
          styles.stickyBar,
          {
            backgroundColor: t.surface,
            borderBottomColor: t.border,
            paddingTop: insets.top,
            opacity: stickyBarOpacity,
            transform: [{ translateY: stickyBarTranslate }],
          },
        ]}
        pointerEvents="none"
      >
        {(['Protein', 'Carbs', 'Fats'] as const).map((label) => {
          const val = label === 'Protein' ? totals.protein : label === 'Carbs' ? totals.carbs : totals.fats;
          const tgt = label === 'Protein' ? goal.protein : label === 'Carbs' ? goal.carbs : goal.fats;
          return (
            <View key={label} style={styles.stickyMacro}>
              <Text style={[styles.stickyMacroVal, { color: t.ink }]}>{Math.round(val)}</Text>
              <Text style={[styles.stickyMacroLabel, { color: t.ink4 }]}>{label[0]}</Text>
            </View>
          );
        })}
        <View style={styles.stickyDivider} />
        <View style={styles.stickyMacro}>
          <Text style={[styles.stickyMacroVal, { color: t.ink }]}>{Math.round(totals.calories)}</Text>
          <Text style={[styles.stickyMacroLabel, { color: t.ink4 }]}>kcal</Text>
        </View>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 15,
        }}
        showsVerticalScrollIndicator
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.nav}> 
          <View>
            <Text style={[styles.navTitle, { color: t.ink }]}>Nutrition</Text>
            <Text style={[styles.navSub, { color: t.ink3 }]}>{format(new Date(), 'EEEE, MMM d')}</Text>
          </View>
          <AnimatedPressable
            style={[styles.topAction, { backgroundColor: t.surface, borderColor: t.border }]}
            onPress={() => navigation.navigate('MealCameraScreen')}
          >
            <Ionicons name="camera-outline" size={17} color={t.ink3} />
          </AnimatedPressable>
          <AnimatedPressable
            style={[styles.topAction, { backgroundColor: t.accentBtn }]}
            onPress={() => setShowCaloriesTrend(true)}
          > 
            <Ionicons name="nutrition-outline" size={17} color={onAccent} />
          </AnimatedPressable>
        </View>

        <View style={[styles.hero, { borderColor: t.border }]}> 
          <View style={styles.heroTop}>
            <Text style={[styles.heroTag, { color: t.ink2 }]}>Daily Intake</Text>
            <View style={[styles.goalChip, { backgroundColor: t.surface2 }]}>
              <Text style={[styles.goalChipText, { color: t.ink3 }]}>
                Target {goal.calories.toLocaleString()} kcal
              </Text>
            </View>
          </View>

          <View style={styles.heroMain}>
            <View style={[styles.progressRing, { borderColor: t.surface3 }]}>
              <View
                style={[
                  styles.progressArc,
                  { borderColor: t.accentBtn, transform: [{ rotate: `${(goalProgress / 100) * 360}deg` }] },
                ]}
              />
              <Text style={[styles.progressText, { color: t.ink }]}>{goalProgress}%</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.kcalValue, { color: t.ink }]}>{Math.round(totals.calories).toLocaleString()}</Text>
              <Text style={[styles.kcalSub, { color: t.ink3 }]}>kcal consumed · {Math.max(0, Math.round(goal.calories - totals.calories))} left</Text>
            </View>
          </View>
        </View>

        <AnimatedPressable
          style={[styles.caloriesTile, { backgroundColor: t.surface, borderColor: t.border }]}
          onPress={() => setShowCaloriesTrend(true)}
        >
          <View style={styles.caloriesTileTop}>
            <Text style={[styles.caloriesTileLabel, { color: t.ink3 }]}>Calories Trend</Text>
            <Text style={[styles.caloriesTileRange, { color: t.ink4 }]}>Tap to expand</Text>
          </View>
          <View style={styles.caloriesTileRow}>
            <Text style={[styles.caloriesTileValue, { color: t.ink }]}>
              {Math.round(totals.calories).toLocaleString()} kcal
            </Text>
            <MiniLineChart data={trendData.values.slice(-14)} width={120} height={44} color={t.accentBtn} area />
          </View>
        </AnimatedPressable>

        <Text style={[styles.sectionHd, { color: t.ink4 }]}>Macros</Text>
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}> 
          <MacroRow
            label="Protein"
            value={totals.protein}
            target={goal.protein}
            ratio={macroRatio(totals.protein, goal.protein)}
            color={t.accentBtn}
            theme={t}
          />
          <MacroRow
            label="Carbs"
            value={totals.carbs}
            target={goal.carbs}
            ratio={macroRatio(totals.carbs, goal.carbs)}
            color={t.accent}
            theme={t}
          />
          <MacroRow
            label="Fats"
            value={totals.fats}
            target={goal.fats}
            ratio={macroRatio(totals.fats, goal.fats)}
            color={t.tabActiveBg}
            theme={t}
            noDivider
          />
        </View>

        <Text style={[styles.sectionHd, { color: t.ink4 }]}>Macro Rings</Text>
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 }}>
            {[
              { label: 'Protein', value: totals.protein, target: goal.protein, color: t.accentBtn },
              { label: 'Carbs', value: totals.carbs, target: goal.carbs, color: t.accent },
              { label: 'Fats', value: totals.fats, target: goal.fats, color: t.tabActiveBg },
            ].map(m => {
              const pct = m.target > 0 ? Math.min(100, Math.round((m.value / m.target) * 100)) : 0;
              const isOver = m.value > m.target && m.target > 0;
              return (
                <View key={m.label} style={{ alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 54, height: 54, borderRadius: 27, borderWidth: 4, borderColor: t.surface3, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={[{
                      position: 'absolute', width: 54, height: 54, borderRadius: 27,
                      borderWidth: 4, borderColor: isOver ? '#ef4444' : m.color,
                      borderTopColor: pct >= 25 ? (isOver ? '#ef4444' : m.color) : 'transparent',
                      borderRightColor: pct >= 50 ? (isOver ? '#ef4444' : m.color) : 'transparent',
                      borderBottomColor: pct >= 75 ? (isOver ? '#ef4444' : m.color) : 'transparent',
                      borderLeftColor: pct >= 100 ? (isOver ? '#ef4444' : m.color) : 'transparent',
                      transform: [{ rotate: '-45deg' }],
                    }]} />
                    <Text style={{ fontFamily: F.bold, fontSize: 12, color: t.ink }}>{pct}%</Text>
                  </View>
                  <Text style={{ fontFamily: F.semibold, fontSize: 11, color: t.ink3 }}>{m.label}</Text>
                  <Text style={{ fontFamily: F.regular, fontSize: 10, color: t.ink4 }}>
                    {Math.round(m.value)}/{m.target}g
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <Text style={[styles.sectionHd, { color: t.ink4 }]}>Quick Stats</Text>
        <View style={styles.statsRow}>
          <View style={[styles.statTile, { backgroundColor: t.surface, borderColor: t.border }]}> 
            <Text style={[styles.statLabel, { color: t.ink3 }]}>Fiber</Text>
            <Text style={[styles.statValue, { color: t.ink }]}>{estimatedFiber}g</Text>
            <Text style={[styles.statSub, { color: t.ink4 }]}>goal {goal.fiber}g</Text>
          </View>
          <View style={[styles.statTile, { backgroundColor: t.surface, borderColor: t.border }]}> 
            <Text style={[styles.statLabel, { color: t.ink3 }]}>Water</Text>
            <Text style={[styles.statValue, { color: t.ink }]}>{waterLiters.toFixed(1)}L</Text>
            <Text style={[styles.statSub, { color: t.ink4 }]}>goal {goal.waterL.toFixed(1)}L</Text>
          </View>
        </View>

        <Text style={[styles.sectionHd, { color: t.ink4 }]}>Log Water</Text>
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: t.surface3, overflow: 'hidden' }}>
              <View style={{ width: `${waterProgress * 100}%`, height: '100%', borderRadius: 4, backgroundColor: '#3b82f6' }} />
            </View>
            <Text style={{ fontFamily: F.semibold, fontSize: 12, color: t.ink3 }}>
              {waterLiters.toFixed(1)} / {goal.waterL.toFixed(1)}L
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            {[150, 250, 500].map(ml => (
              <TouchableOpacity
                key={ml}
                onPress={() => addWater(ml)}
                activeOpacity={0.7}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 10,
                  backgroundColor: t.surface2, alignItems: 'center',
                }}
              >
                <Text style={{ fontFamily: F.bold, fontSize: 13, color: '#3b82f6' }}>+{ml}ml</Text>
                <Text style={{ fontFamily: F.regular, fontSize: 10, color: t.ink4 }}>
                  {ml === 150 ? 'Cup' : ml === 250 ? 'Glass' : 'Bottle'}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => addWater(1000)}
              activeOpacity={0.7}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 10,
                backgroundColor: t.surface2, alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: F.bold, fontSize: 13, color: '#3b82f6' }}>+1L</Text>
              <Text style={{ fontFamily: F.regular, fontSize: 10, color: t.ink4 }}>Liter</Text>
            </TouchableOpacity>
          </View>
        </View>

        {topFoods.length > 0 && (
          <>
            <Text style={[styles.sectionHd, { color: t.ink4 }]}>Quick Add</Text>
            <View style={styles.quickAddRow}>
              {topFoods.map((food) => (
                <AnimatedPressable
                  key={food.name}
                  style={[styles.quickAddChip, { backgroundColor: t.surface, borderColor: t.border }]}
                  onPress={async () => {
                    const match = foods.find(f => f.name === food.name);
                    if (match) await addEntryFromFood(match, selectedMealType, 1, today);
                  }}
                >
                  <Text style={[styles.quickAddName, { color: t.ink }]} numberOfLines={1}>{food.name}</Text>
                  <Text style={[styles.quickAddKcal, { color: t.ink3 }]}>{Math.round(food.calories / food.count)} kcal</Text>
                </AnimatedPressable>
              ))}
            </View>
          </>
        )}
        {yesterdayHasMeals && (
          <AnimatedPressable
            style={[styles.copyMealBtn, { backgroundColor: t.surface, borderColor: t.border }]}
            onPress={() => {
              copyMealsFromDate(yesterdayStr);
              Alert.alert('Done', 'Meals copied from yesterday!');
            }}
          >
            <Ionicons name="copy-outline" size={15} color={t.ink3} />
            <Text style={{ fontFamily: F.semibold, fontSize: 13, color: t.ink3 }}>Copy yesterday's meals</Text>
          </AnimatedPressable>
        )}

        <NutritionDayView
          mealRows={mealRows}
          t={t}
          onRemoveEntry={removeEntry}
          onAddPress={() => setShowAddSheet(true)}
          onAccent={onAccent}
        />
      </Animated.ScrollView>

      {showAddSheet ? (
      <FoodSearchSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        title="Add Meal"
        subtitle={`${selectedMealType} · ${recipeIngredients.length} ingredient selected`}
        t={t}
      >

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mealTypeRow}> 
          {MEAL_TYPES.map((mealType) => {
            const active = selectedMealType === mealType;
            return (
              <AnimatedPressable
                key={mealType}
                onPress={() => setSelectedMealType(mealType)}
                style={[styles.mealTypeChip, { backgroundColor: active ? t.accentBtn : t.surface2 }]}
              >
                <Text style={[styles.mealTypeChipText, { color: active ? onAccent : t.ink3 }]}>{mealType}</Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>

        <View style={[styles.searchWrap, { backgroundColor: t.surface2, borderColor: t.border }]}> 
          <Ionicons name="search-outline" size={15} color={t.ink4} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search food or brand"
            placeholderTextColor={t.ink4}
            style={[styles.searchInput, { color: t.ink }]}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}> 
          {(['All', 'Recent', 'Favorites', 'Verified DB', 'My Foods'] as FoodFilter[]).map((chip) => {
            const active = filter === chip;
            return (
              <AnimatedPressable
                key={chip}
                onPress={() => setFilter(chip)}
                style={[styles.filterChip, { backgroundColor: active ? t.accentBtn : t.surface2, borderColor: t.border }]}
              >
                <Text style={[styles.filterChipText, { color: active ? onAccent : t.ink3 }]}>{chip}</Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>

        {providerLoading ? (
          <Text style={[styles.loadingText, { color: t.ink3 }]}>Searching providers…</Text>
        ) : null}

        {displayFoods.map((food) => (
          <View key={food.id} style={[styles.foodCard, { backgroundColor: t.surface, borderColor: t.border }]}> 
            <View style={{ flex: 1 }}>
              <Text style={[styles.foodName, { color: t.ink }]}>{food.name}</Text>
              <Text style={[styles.foodMeta, { color: t.ink3 }]}>
                {food.servingLabel} · {food.protein}P · {food.carbs}C · {food.fats}F · {food.state}
              </Text>
              <View style={styles.badgesRow}> 
                <View style={[styles.badge, { borderColor: t.border }]}>
                  <Text style={[styles.badgeText, { color: food.source === 'custom' ? t.accentBtn : t.ink3 }]}>
                    {food.source}
                  </Text>
                </View>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              <Text style={[styles.foodKcal, { color: t.ink2 }]}>{food.calories} kcal</Text>
              <View style={styles.foodActionsCol}>
                <AnimatedPressable style={[styles.pickBtn, { backgroundColor: t.accentBtn }]} onPress={() => onAddFood(food)}>
                  <Text style={[styles.pickBtnText, { color: onAccent }]}>Add</Text>
                </AnimatedPressable>
                {builderType === 'recipe' ? (
                  <AnimatedPressable style={[styles.pickBtn, { backgroundColor: t.surface2, borderColor: t.border, borderWidth: 1 }]} onPress={() => onAddIngredient(food)}>
                    <Text style={[styles.pickBtnText, { color: t.ink3 }]}>Ingredient</Text>
                  </AnimatedPressable>
                ) : null}
              </View>
            </View>
          </View>
        ))}

        {!providerLoading && !displayFoods.length ? (
          <Text style={[styles.emptyText, { color: t.ink3 }]}>No foods found. Try another keyword.</Text>
        ) : null}

        <Text style={[styles.sectionHd, { color: t.ink4, marginTop: 14 }]}>Create Food</Text>

        <Text style={[styles.formLabel, { color: t.ink3 }]}>Food Type</Text>
        <View style={styles.toggleRow}>
          <AnimatedPressable
            style={[styles.togglePill, { borderColor: t.border, backgroundColor: builderType === 'single' ? t.accentBtn : t.surface }]}
            onPress={() => setBuilderType('single')}
          >
            <Text style={[styles.togglePillText, { color: builderType === 'single' ? onAccent : t.ink3 }]}>Single Item</Text>
          </AnimatedPressable>
          <AnimatedPressable
            style={[styles.togglePill, { borderColor: t.border, backgroundColor: builderType === 'recipe' ? t.accentBtn : t.surface }]}
            onPress={() => setBuilderType('recipe')}
          >
            <Text style={[styles.togglePillText, { color: builderType === 'recipe' ? onAccent : t.ink3 }]}>Whole Meal / Recipe</Text>
          </AnimatedPressable>
        </View>

        <Text style={[styles.formLabel, { color: t.ink3 }]}>State</Text>
        <View style={styles.toggleRow}>
          <AnimatedPressable
            style={[styles.togglePill, { borderColor: t.border, backgroundColor: customState === 'cooked' ? t.accentBtn : t.surface }]}
            onPress={() => setCustomState('cooked')}
          >
            <Text style={[styles.togglePillText, { color: customState === 'cooked' ? onAccent : t.ink3 }]}>Cooked</Text>
          </AnimatedPressable>
          <AnimatedPressable
            style={[styles.togglePill, { borderColor: t.border, backgroundColor: customState === 'raw' ? t.accentBtn : t.surface }]}
            onPress={() => setCustomState('raw')}
          >
            <Text style={[styles.togglePillText, { color: customState === 'raw' ? onAccent : t.ink3 }]}>Uncooked / Raw</Text>
          </AnimatedPressable>
        </View>

        <View style={[styles.customWrap, { backgroundColor: t.surface, borderColor: t.border }]}> 
          <TextInput
            value={customName}
            onChangeText={setCustomName}
            placeholder="Food name"
            placeholderTextColor={t.ink4}
            style={[styles.input, { color: t.ink, borderColor: t.border, backgroundColor: t.surface2 }]}
          />
          <TextInput
            value={customServing}
            onChangeText={setCustomServing}
            placeholder="Reference serving (e.g. 100g, 1 bowl)"
            placeholderTextColor={t.ink4}
            style={[styles.input, { color: t.ink, borderColor: t.border, backgroundColor: t.surface2 }]}
          />
          {builderType === 'single' ? (
            <>
              <TextInput
                value={customCalories}
                onChangeText={setCustomCalories}
                keyboardType="decimal-pad"
                placeholder="Calories (kcal) per serving"
                placeholderTextColor={t.ink4}
                style={[styles.input, { color: t.ink, borderColor: t.border, backgroundColor: t.surface2 }]}
              />

              <View style={styles.macroGrid}> 
                <TextInput
                  value={customProtein}
                  onChangeText={setCustomProtein}
                  keyboardType="decimal-pad"
                  placeholder="Protein"
                  placeholderTextColor={t.ink4}
                  style={[styles.input, styles.macroInput, { color: t.ink, borderColor: t.border, backgroundColor: t.surface2 }]}
                />
                <TextInput
                  value={customCarbs}
                  onChangeText={setCustomCarbs}
                  keyboardType="decimal-pad"
                  placeholder="Carbs"
                  placeholderTextColor={t.ink4}
                  style={[styles.input, styles.macroInput, { color: t.ink, borderColor: t.border, backgroundColor: t.surface2 }]}
                />
                <TextInput
                  value={customFats}
                  onChangeText={setCustomFats}
                  keyboardType="decimal-pad"
                  placeholder="Fats"
                  placeholderTextColor={t.ink4}
                  style={[styles.input, styles.macroInput, { color: t.ink, borderColor: t.border, backgroundColor: t.surface2 }]}
                />
              </View>
            </>
          ) : (
            <>
              {recipeItems.length ? (
                <>
                  <Text style={[styles.formLabel, { color: t.ink3, marginTop: 2 }]}>Recipe Ingredients</Text>
                  {recipeItems.map((ingredient) => (
                    <View key={ingredient.id} style={[styles.ingredientRow, { borderColor: t.border, backgroundColor: t.surface2 }]}> 
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.ingredientName, { color: t.ink }]}>{ingredient.name}</Text>
                        <Text style={[styles.ingredientSub, { color: t.ink3 }]}>
                          {ingredient.quantity}x · {ingredient.servingLabel}
                        </Text>
                      </View>
                      <Text style={[styles.ingredientKcal, { color: t.ink2 }]}>{ingredient.calories} kcal</Text>
                      <AnimatedPressable style={styles.deleteBtn} onPress={() => onRemoveIngredient(ingredient.id)}>
                        <Ionicons name="close-circle-outline" size={16} color={t.ink4} />
                      </AnimatedPressable>
                    </View>
                  ))}
                </>
              ) : (
                <Text style={[styles.emptyBuilderText, { color: t.ink3 }]}>Add ingredients from the food list above.</Text>
              )}

              <TextInput
                value={recipeServings}
                onChangeText={setRecipeServings}
                keyboardType="decimal-pad"
                placeholder="Servings (e.g. 3 bowls)"
                placeholderTextColor={t.ink4}
                style={[styles.input, { color: t.ink, borderColor: t.border, backgroundColor: t.surface2 }]}
              />
              <TextInput
                value={recipeCaloriesOverride}
                onChangeText={setRecipeCaloriesOverride}
                keyboardType="decimal-pad"
                placeholder={`Recipe calories override (auto ${Math.round(recipeTotals.calories)} kcal)`}
                placeholderTextColor={t.ink4}
                style={[styles.input, { color: t.ink, borderColor: t.border, backgroundColor: t.surface2 }]}
              />
            </>
          )}

          <View style={styles.builderActionsRow}>
            <AnimatedPressable style={[styles.customGhostBtn, { borderColor: t.border, backgroundColor: t.surface2 }]} onPress={onSaveCustomFoodOnly}>
              <Text style={[styles.customGhostText, { color: t.ink2 }]}>Save to My Foods</Text>
            </AnimatedPressable>
            <AnimatedPressable style={[styles.customSaveBtn, { backgroundColor: t.accentBtn }]} onPress={onSaveAndAddCustomFood}>
              <Text style={[styles.customSaveText, { color: onAccent }]}>Add to {selectedMealType}</Text>
            </AnimatedPressable>
          </View>
        </View>

        <View style={[styles.scanCard, { borderColor: t.border, backgroundColor: t.surface2 }]}> 
          <Text style={[styles.scanTitle, { color: t.ink }]}>Barcode Assist (Optional)</Text>
          <Text style={[styles.scanSub, { color: t.ink3 }]}>Scan packaged food → parse nutrition panel → prefill fields → review before saving.</Text>
          <TextInput
            value={barcode}
            onChangeText={setBarcode}
            placeholder="Enter barcode"
            placeholderTextColor={t.ink4}
            keyboardType="number-pad"
            style={[styles.input, { color: t.ink, borderColor: t.border, backgroundColor: t.surface, marginTop: 10, marginBottom: 0 }]}
          />
          <View style={styles.scanActionsRow}>
            <AnimatedPressable style={[styles.customGhostBtn, { borderColor: t.border, backgroundColor: t.surface }]} onPress={onScanBarcodePress}>
              <Text style={[styles.customGhostText, { color: t.ink2 }]}>Scan Barcode</Text>
            </AnimatedPressable>
            <AnimatedPressable style={[styles.customSaveBtn, { backgroundColor: t.accentBtn }]} onPress={() => onUseParsedBarcode()}>
              <Text style={[styles.customSaveText, { color: onAccent }]}>Use Parsed Data</Text>
            </AnimatedPressable>
          </View>
        </View>
      </FoodSearchSheet>
      ) : null}

      {showCaloriesTrend ? (
      <PopupSheet visible={showCaloriesTrend} onClose={() => setShowCaloriesTrend(false)} maxHeight={'78%'}>
        <Text style={[styles.sheetTitle, { color: t.ink }]}>Calories Trend</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}> 
          {(['1W', '1M', '3M', '6M', '1Y'] as TrendRange[]).map((range) => {
            const active = trendRange === range;
            return (
              <AnimatedPressable
                key={range}
                onPress={() => setTrendRange(range)}
                style={[styles.filterChip, { backgroundColor: active ? t.accentBtn : t.surface2, borderColor: t.border }]}
              >
                <Text style={[styles.filterChipText, { color: active ? onAccent : t.ink3 }]}>{range}</Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>

        <View style={[styles.trendCard, { backgroundColor: t.surface, borderColor: t.border }]}> 
          <View style={styles.trendHead}> 
            <Text style={[styles.trendTitle, { color: t.ink }]}>Calorie Adherence Trend</Text>
            <Text style={[styles.trendMeta, { color: t.ink3 }]}>{adherencePct}%</Text>
          </View>
          <MiniLineChart data={trendData.values} width={300} height={140} color={t.accentBtn} area />
          <View style={styles.pillRow}> 
            <View style={[styles.pillCol, { borderColor: t.border, backgroundColor: t.surface2 }]}>
              <Text style={[styles.pillLabel, { color: t.ink4 }]}>Avg Intake</Text>
              <Text style={[styles.pillValue, { color: t.ink }]}>{trendData.average}</Text>
            </View>
            <View style={[styles.pillCol, { borderColor: t.border, backgroundColor: t.surface2 }]}>
              <Text style={[styles.pillLabel, { color: t.ink4 }]}>Goal</Text>
              <Text style={[styles.pillValue, { color: t.ink }]}>{goal.calories}</Text>
            </View>
            <View style={[styles.pillCol, { borderColor: t.border, backgroundColor: t.surface2 }]}>
              <Text style={[styles.pillLabel, { color: t.ink4 }]}>Variance</Text>
              <Text style={[styles.pillValue, { color: t.ink }]}>{trendData.average - goal.calories}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.insightCard, { backgroundColor: t.surface, borderColor: t.border }]}> 
          <Text style={[styles.sectionHd, { color: t.ink4, marginTop: 0, marginBottom: 8 }]}>Consistency Signals</Text>
          <View style={[styles.insightRow, { borderBottomColor: t.surface2 }]}> 
            <Text style={[styles.insightLeft, { color: t.ink2 }]}>Protein Target Hit</Text>
            <Text style={[styles.insightRight, { color: t.ink }]}>{consistencySignals.proteinTargetHit} / {consistencySignals.trackedDays || trendData.days} days</Text>
          </View>
          <View style={[styles.insightRow, { borderBottomColor: t.surface2 }]}> 
            <Text style={[styles.insightLeft, { color: t.ink2 }]}>Meals Logged</Text>
            <Text style={[styles.insightRight, { color: t.ink }]}>{consistencySignals.mealsLogged} entries</Text>
          </View>
          <View style={styles.insightRow}> 
            <Text style={[styles.insightLeft, { color: t.ink2 }]}>Late-night Eating</Text>
            <Text style={[styles.insightRight, { color: t.ink }]}>{consistencySignals.lateNightDays} days</Text>
          </View>
        </View>

        <Text style={[styles.sectionHd, { color: t.ink4, marginTop: 12 }]}>Top Foods (by frequency)</Text>
        <View style={[styles.topFoodsCard, { backgroundColor: t.surface, borderColor: t.border }]}> 
          {topFoods.length ? (
            topFoods.map((food, index) => (
              <View key={food.name} style={[styles.topFoodRow, index > 0 && { borderTopColor: t.surface2, borderTopWidth: 1 }]}> 
                <View style={{ flex: 1 }}>
                  <Text style={[styles.topFoodMain, { color: t.ink }]}>{food.name}</Text>
                  <Text style={[styles.topFoodSub, { color: t.ink3 }]}> 
                    {food.source === 'custom' ? 'Custom item' : 'Verified DB'} · {food.count} meals
                  </Text>
                </View>
                <Text style={[styles.topFoodValue, { color: t.ink2 }]}>{Math.round(food.calories)} kcal</Text>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: t.ink3 }]}>No data in this range yet.</Text>
          )}
        </View>
      </PopupSheet>
      ) : null}

      {/* Quantity Picker Sheet */}
      {qtySheet ? (
      <PopupSheet visible={!!qtySheet} onClose={() => setQtySheet(null)} maxHeight={340}>
        <QtySheetContent
          food={qtySheet?.food ?? null}
          qtyInput={qtyInput}
          setQtyInput={setQtyInput}
          qtyMode={qtyMode}
          setQtyMode={setQtyMode}
          onConfirm={confirmAddFood}
          t={t}
        />
      </PopupSheet>
      ) : null}

      {showBarcodeScanner ? (
      <Modal visible={showBarcodeScanner} animationType="slide" onRequestClose={() => setShowBarcodeScanner(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] }}
            onBarcodeScanned={async ({ data }) => {
              setShowBarcodeScanner(false);
              setBarcode(data);
              await onUseParsedBarcode(data);
            }}
          />
          <Pressable
            onPress={() => setShowBarcodeScanner(false)}
            style={{
              position: 'absolute',
              top: insets.top + 16,
              right: 16,
              backgroundColor: 'rgba(0,0,0,0.45)',
              borderRadius: 22,
              padding: 10,
            }}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
        </View>
      </Modal>
      ) : null}
    </View>
  );
}

function chunkAverage(values: number[], chunkSize: number): number[] {
  if (chunkSize <= 1) return values;
  const output: number[] = [];
  for (let index = 0; index < values.length; index += chunkSize) {
    const chunk = values.slice(index, index + chunkSize);
    if (!chunk.length) continue;
    output.push(Math.round(chunk.reduce((sum, item) => sum + item, 0) / chunk.length));
  }
  return output;
}

function MacroRow({
  label,
  value,
  target,
  ratio,
  color,
  theme,
  noDivider,
}: {
  label: string;
  value: number;
  target: number;
  ratio: number;
  color: string;
  theme: any;
  noDivider?: boolean;
}) {
  return (
    <View style={[styles.macroRow, !noDivider && { borderBottomColor: theme.surface2, borderBottomWidth: 1 }]}> 
      <View style={{ flex: 1 }}>
        <View style={styles.macroHead}> 
          <Text style={[styles.macroLabel, { color: theme.ink }]}>{label}</Text>
          <Text style={[styles.macroValue, { color: theme.ink2 }]}>
            {Math.round(value)} / {target}g
          </Text>
        </View>
        <View style={[styles.track, { backgroundColor: theme.surface3 }]}> 
          <View style={[styles.fill, { width: `${Math.max(4, ratio * 100)}%`, backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  stickyBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 99,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingBottom: 10, paddingHorizontal: 20, gap: 16,
    borderBottomWidth: 0.5,
  },
  stickyMacro: { alignItems: 'center', gap: 1 },
  stickyMacroVal: { fontFamily: F.mono, fontSize: 15, letterSpacing: -0.3 },
  stickyMacroLabel: { fontFamily: F.medium, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  stickyDivider: { width: 1, height: 24, backgroundColor: 'rgba(128,128,128,0.2)', marginHorizontal: 4 },
  quickAddRow: { flexDirection: 'row', gap: 8, marginBottom: 2 },
  quickAddChip: {
    flex: 1, borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 9, alignItems: 'center',
  },
  quickAddName: { fontFamily: F.semibold, fontSize: 11.5, marginBottom: 2, textAlign: 'center' },
  quickAddKcal: { fontFamily: F.mono, fontSize: 10.5 },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  navTitle: { fontFamily: F.bold, fontSize: 30, letterSpacing: -0.7 },
  navSub: { fontFamily: F.regular, fontSize: 13, marginTop: 2 },
  topAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTag: { fontFamily: F.semibold, fontSize: 10.5, letterSpacing: 1, textTransform: 'uppercase' },
  goalChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  goalChipText: { fontFamily: F.medium, fontSize: 11 },
  heroMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  progressArc: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 6,
    borderColor: 'transparent',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  progressText: { fontFamily: F.mono, fontSize: 14 },
  kcalValue: { fontFamily: F.mono, fontSize: 30, letterSpacing: -0.7 },
  kcalSub: { fontFamily: F.regular, fontSize: 12, marginTop: 4 },
  caloriesTile: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  caloriesTileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  caloriesTileLabel: { fontFamily: F.semibold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.7 },
  caloriesTileRange: { fontFamily: F.regular, fontSize: 10.5 },
  caloriesTileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  caloriesTileValue: { fontFamily: F.mono, fontSize: 18 },
  sectionHd: {
    marginTop: 14,
    marginBottom: 10,
    marginHorizontal: 2,
    fontFamily: F.semibold,
    fontSize: 10.5,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  macroRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  macroHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  macroLabel: { fontFamily: F.semibold, fontSize: 13 },
  macroValue: { fontFamily: F.mono, fontSize: 12.5 },
  track: { height: 6, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statTile: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
  },
  statLabel: { fontFamily: F.regular, fontSize: 11, marginBottom: 4 },
  statValue: { fontFamily: F.mono, fontSize: 21 },
  statSub: { fontFamily: F.regular, fontSize: 11, marginTop: 3 },
  emptyText: {
    padding: 14,
    fontFamily: F.regular,
    fontSize: 13,
  },
  nutritionEmptyWrap: {
    margin: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'flex-start',
  },
  nutritionEmptyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  nutritionEmptyTitle: {
    fontFamily: F.bold,
    fontSize: 14,
    marginBottom: 4,
  },
  nutritionEmptySub: {
    fontFamily: F.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  nutritionEmptyBtn: {
    marginTop: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  nutritionEmptyBtnText: {
    fontFamily: F.semibold,
    fontSize: 12,
  },
  mealLogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  mealTime: { width: 45, fontFamily: F.mono, fontSize: 11.5 },
  mealName: { fontFamily: F.semibold, fontSize: 13.5 },
  mealMeta: { fontFamily: F.regular, fontSize: 11.5, marginTop: 2 },
  mealCalories: { fontFamily: F.mono, fontSize: 12.5 },
  deleteBtn: { padding: 2 },
  addBtn: {
    marginTop: 14,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { fontFamily: F.bold, fontSize: 14 },

  sheetTitle: {
    fontFamily: F.bold,
    fontSize: 22,
    marginBottom: 2,
    letterSpacing: -0.4,
  },
  sheetSub: { fontFamily: F.regular, fontSize: 12.5, marginBottom: 8 },
  grabber: {
    alignSelf: 'center',
    width: 46,
    height: 4,
    borderRadius: 999,
    marginBottom: 10,
  },
  mealTypeRow: { gap: 8, paddingBottom: 6 },
  mealTypeChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealTypeChipText: { fontFamily: F.semibold, fontSize: 12 },
  searchWrap: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    height: 42,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { flex: 1, fontFamily: F.regular, fontSize: 14 },
  filterRow: { gap: 8, paddingTop: 10, paddingBottom: 10 },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 30,
    justifyContent: 'center',
  },
  filterChipText: { fontFamily: F.medium, fontSize: 11 },
  foodCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  foodName: { fontFamily: F.semibold, fontSize: 13.5 },
  foodMeta: { fontFamily: F.regular, fontSize: 11.5, marginTop: 2 },
  badgesRow: { marginTop: 6, flexDirection: 'row', gap: 6 },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: { fontFamily: F.medium, fontSize: 10.5 },
  foodKcal: { fontFamily: F.mono, fontSize: 12.5 },
  foodActionsCol: { alignItems: 'flex-end', gap: 6 },
  pickBtn: {
    borderRadius: 10,
    height: 28,
    minWidth: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  pickBtnText: { fontFamily: F.bold, fontSize: 12 },
  formLabel: {
    fontFamily: F.medium,
    fontSize: 11,
    marginTop: 4,
    marginBottom: 6,
    marginHorizontal: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  togglePill: {
    flex: 1,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  togglePillText: { fontFamily: F.semibold, fontSize: 11 },

  customWrap: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
  },
  input: {
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontFamily: F.regular,
    fontSize: 13,
    marginBottom: 8,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  macroInput: {
    flex: 1,
  },
  ingredientRow: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ingredientName: { fontFamily: F.semibold, fontSize: 12.5 },
  ingredientSub: { fontFamily: F.regular, fontSize: 11, marginTop: 2 },
  ingredientKcal: { fontFamily: F.mono, fontSize: 11.5 },
  emptyBuilderText: {
    fontFamily: F.regular,
    fontSize: 12,
    marginBottom: 8,
    marginTop: 2,
  },
  builderActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  customGhostBtn: {
    flex: 1,
    height: 40,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  customGhostText: { fontFamily: F.semibold, fontSize: 12 },
  customSaveBtn: {
    flex: 1.2,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customSaveText: { fontFamily: F.bold, fontSize: 13 },
  scanCard: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  scanTitle: { fontFamily: F.semibold, fontSize: 12.5, marginBottom: 4 },
  scanSub: { fontFamily: F.regular, fontSize: 11.5 },
  scanActionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  loadingText: {
    fontFamily: F.regular,
    fontSize: 12,
    marginBottom: 8,
    marginHorizontal: 2,
  },
  trendCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    marginTop: 2,
    marginBottom: 8,
    alignItems: 'center',
  },
  trendHead: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  trendTitle: { fontFamily: F.semibold, fontSize: 13 },
  trendMeta: { fontFamily: F.mono, fontSize: 11.5 },
  pillRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  pillCol: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
    alignItems: 'center',
  },
  pillLabel: { fontFamily: F.medium, fontSize: 10.5, marginBottom: 2 },
  pillValue: { fontFamily: F.mono, fontSize: 14 },
  insightCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginTop: 12,
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  insightLeft: { fontFamily: F.regular, fontSize: 12.5 },
  insightRight: { fontFamily: F.mono, fontSize: 12 },
  topFoodsCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 8,
  },
  topFoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  topFoodMain: { fontFamily: F.semibold, fontSize: 13 },
  topFoodSub: { fontFamily: F.regular, fontSize: 11.5, marginTop: 2 },
  topFoodValue: { fontFamily: F.mono, fontSize: 12.5 },
  copyMealBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
    marginTop: 4, marginBottom: 4,
  },
});



