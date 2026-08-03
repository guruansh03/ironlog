import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { F } from '../../theme/fonts';
import { getReadableTextColor } from '../../theme/contrast';
import PopupSheet from '../../components/shared/PopupSheet';
import AnimatedPressable from '../../components/animations/AnimatedPressable';
import type { NutritionFoodItem } from '../../store/nutritionStore';
import { quantityMultiplierForServing, servingMeasureUnit, QuantityMode } from '../../utils/nutritionServing';

type QtyMode = QuantityMode;

export function QtySheetContent({ food, qtyInput, setQtyInput, qtyMode, setQtyMode, onConfirm, t }: {
  food: NutritionFoodItem | null;
  qtyInput: string;
  setQtyInput: (v: string) => void;
  qtyMode: QtyMode;
  setQtyMode: (v: QtyMode) => void;
  onConfirm: () => void;
  t: any;
}) {
  if (!food) return null;
  const amount = parseFloat(qtyInput) || 0;
  const ratio = quantityMultiplierForServing(food.servingLabel, amount, qtyMode);
  const measureUnit = servingMeasureUnit(food.servingLabel);
  const kcal = Math.round(food.calories * ratio);
  const protein = Math.round(food.protein * ratio * 10) / 10;
  const carbs = Math.round(food.carbs * ratio * 10) / 10;
  const fats = Math.round(food.fats * ratio * 10) / 10;

  return (
    <View style={{ gap: 14 }}>
      <View>
        <Text style={{ fontFamily: F.bold, fontSize: 16, color: t.ink }}>{food.name}</Text>
        <Text style={{ fontFamily: F.regular, fontSize: 12, color: t.ink3, marginTop: 2 }}>
          Reference: {food.servingLabel} · {Math.round(food.calories)} kcal
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TextInput
          style={{
            flex: 1, fontFamily: F.bold, fontSize: 28, color: t.ink,
            backgroundColor: t.surface2, borderRadius: 12, borderWidth: 0.5,
            borderColor: t.border, padding: 12, textAlign: 'center',
          }}
          value={qtyInput}
          onChangeText={setQtyInput}
          keyboardType="decimal-pad"
          selectTextOnFocus
        />
        <Text style={{ fontFamily: F.semibold, fontSize: 16, color: t.ink3 }}>
          {qtyMode === 'grams' ? measureUnit : 'x'}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['grams', 'serving'] as QtyMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            onPress={() => setQtyMode(mode)}
            activeOpacity={0.8}
            style={{
              flex: 1,
              backgroundColor: qtyMode === mode ? t.accentBtn : t.surface2,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: F.semibold,
                fontSize: 12,
                color: qtyMode === mode ? getReadableTextColor(t.accentBtn) : t.ink3,
              }}
            >
              {mode === 'grams' ? (measureUnit === 'ml' ? 'Milliliters' : 'Grams') : 'Servings'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: t.surface2, borderRadius: 12, padding: 12 }}>
        {[
          { label: 'Calories', val: `${kcal}` },
          { label: 'Protein', val: `${protein}g` },
          { label: 'Carbs', val: `${carbs}g` },
          { label: 'Fat', val: `${fats}g` },
        ].map((item) => (
          <View key={item.label} style={{ alignItems: 'center', gap: 2 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 15, color: t.ink }}>{item.val}</Text>
            <Text style={{ fontFamily: F.regular, fontSize: 10, color: t.ink3 }}>{item.label}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity
        onPress={onConfirm}
        activeOpacity={0.8}
        style={{ backgroundColor: t.accentBtn, borderRadius: 14, padding: 14, alignItems: 'center' }}
      >
        <Text style={{ fontFamily: F.bold, fontSize: 15, color: getReadableTextColor(t.accentBtn) }}>
          Add {amount > 0 ? `${amount}${qtyMode === 'grams' ? 'g' : 'x'}` : ''}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export function FoodSearchSheet({
  visible,
  onClose,
  title,
  subtitle,
  t,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  t: any;
  children: React.ReactNode;
}) {
  return (
    <PopupSheet visible={visible} onClose={onClose} maxHeight={'86%'}>
      <Text style={{ fontFamily: F.bold, fontSize: 22, marginBottom: 2, letterSpacing: -0.4, color: t.ink }}>
        {title}
      </Text>
      <Text style={{ fontFamily: F.regular, fontSize: 12.5, marginBottom: 8, color: t.ink3 }}>
        {subtitle}
      </Text>
      <View
        style={{
          alignSelf: 'center',
          width: 46,
          height: 4,
          borderRadius: 999,
          marginBottom: 10,
          backgroundColor: t.surface3,
        }}
      />
      {children}
    </PopupSheet>
  );
}

function NutritionEmptyState({ t, onAddFirstMeal }: { t: any; onAddFirstMeal: () => void }) {
  return (
    <View style={{ margin: 12, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: 'flex-start', backgroundColor: t.surface2, borderColor: t.border }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 10, backgroundColor: t.surface3 }}>
        <Ionicons name="restaurant-outline" size={18} color={t.ink3} />
      </View>
      <Text style={{ fontFamily: F.bold, fontSize: 14, marginBottom: 4, color: t.ink }}>No meals logged yet</Text>
      <Text style={{ fontFamily: F.regular, fontSize: 12, lineHeight: 17, color: t.ink3 }}>
        Start today with your first meal to unlock intake and macro trends.
      </Text>
      <AnimatedPressable
        style={{ marginTop: 12, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: t.accentBtn }}
        onPress={onAddFirstMeal}
      >
        <Text style={{ fontFamily: F.semibold, fontSize: 12, color: getReadableTextColor(t.accentBtn) }}>
          Add first meal
        </Text>
      </AnimatedPressable>
    </View>
  );
}

export function NutritionDayView({
  mealRows,
  t,
  onRemoveEntry,
  onAddPress,
  onAccent,
}: {
  mealRows: Array<any>;
  t: any;
  onRemoveEntry: (id: string) => void;
  onAddPress: () => void;
  onAccent: string;
}) {
  return (
    <>
      <Text style={{ marginTop: 14, marginBottom: 10, marginHorizontal: 2, fontFamily: F.semibold, fontSize: 10.5, letterSpacing: 1.1, textTransform: 'uppercase', color: t.ink4 }}>
        Meal Log
      </Text>
      <View style={{ borderRadius: 20, borderWidth: 1, overflow: 'hidden', backgroundColor: t.surface, borderColor: t.border }}>
        {mealRows.length === 0 ? (
          <NutritionEmptyState t={t} onAddFirstMeal={onAddPress} />
        ) : (
          mealRows.map((item, index) => (
            <View
              key={item.id}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10, borderTopColor: index > 0 ? t.surface2 : 'transparent', borderTopWidth: index > 0 ? 1 : 0 }}
            >
              <Text style={{ width: 45, fontFamily: F.mono, fontSize: 11.5, color: t.ink3 }}>
                {item.loggedAt ? new Date(item.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.semibold, fontSize: 13.5, color: t.ink }}>
                  {item.mealType} · {item.foodName}
                </Text>
                <Text style={{ fontFamily: F.regular, fontSize: 11.5, marginTop: 2, color: t.ink3 }}>
                  {Math.round(item.carbs)}C · {Math.round(item.protein)}P · {Math.round(item.fats)}F
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: F.mono, fontSize: 12.5, color: t.ink2 }}>{Math.round(item.calories)}</Text>
                <AnimatedPressable style={{ padding: 2 }} onPress={() => onRemoveEntry(item.id)}>
                  <Ionicons name="trash-outline" size={13} color={t.ink4} />
                </AnimatedPressable>
              </View>
            </View>
          ))
        )}
      </View>

      <AnimatedPressable
        style={{ marginTop: 14, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: t.accentBtn }}
        onPress={onAddPress}
      >
        <Text style={{ fontFamily: F.bold, fontSize: 14, color: onAccent }}>+ Add Meal / Food</Text>
      </AnimatedPressable>
    </>
  );
}


