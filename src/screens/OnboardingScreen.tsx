import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';

import { useAppTheme } from '../theme/ThemeContext';
import { F } from '../theme/fonts';
import { getReadableTextColor } from '../theme/contrast';
import {
  FitnessGoal,
  setOnboardingComplete,
  setFitnessGoal,
  getCalorieTargetForGoal,
  getProteinTargetForGoal,
  STARTER_HABITS,
} from '../store/onboardingStore';
import { useNutritionStore } from '../store/nutritionStore';
import { useHabitStore } from '../store/habitStore';

type Step = 'goal' | 'habits' | 'done';

const GOALS: Array<{ key: FitnessGoal; emoji: string; title: string; sub: string }> = [
  { key: 'build_muscle', emoji: '💪', title: 'Build Muscle', sub: 'Higher calories, more protein' },
  { key: 'lose_fat', emoji: '🔥', title: 'Lose Fat', sub: 'Caloric deficit, high protein' },
  { key: 'stay_healthy', emoji: '💚', title: 'Stay Healthy', sub: 'Balanced macros, maintenance' },
];

export default function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const insets = useSafeAreaInsets();
  const { theme: t } = useAppTheme();
  const onAccent = getReadableTextColor(t.accentBtn);
  const { setGoal } = useNutritionStore();
  const { addHabit } = useHabitStore();

  const [step, setStep] = useState<Step>('goal');
  const [selectedGoal, setSelectedGoal] = useState<FitnessGoal | null>(null);
  const [selectedHabits, setSelectedHabits] = useState<Set<number>>(new Set([0, 1, 2]));

  function handleGoalNext() {
    if (!selectedGoal) return;
    setFitnessGoal(selectedGoal);
    setGoal({
      calories: getCalorieTargetForGoal(selectedGoal),
      protein: getProteinTargetForGoal(selectedGoal),
    });
    setStep('habits');
  }

  function handleHabitsNext() {
    selectedHabits.forEach(idx => {
      const h = STARTER_HABITS[idx];
      addHabit(h.name, h.icon, h.type, h.target, h.unit, h.category);
    });
    setStep('done');
  }

  function handleFinish() {
    setOnboardingComplete();
    onComplete();
  }

  function toggleHabit(idx: number) {
    setSelectedHabits(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  return (
    <View style={[ss.container, { backgroundColor: t.bg, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      {step === 'goal' && (
        <Animated.View entering={FadeIn} style={ss.stepWrap}>
          <Text style={[ss.emoji]}>🎯</Text>
          <Text style={[ss.title, { color: t.ink }]}>What's your goal?</Text>
          <Text style={[ss.sub, { color: t.ink3 }]}>We'll set up your calorie targets</Text>
          <View style={ss.optionsWrap}>
            {GOALS.map(g => (
              <TouchableOpacity
                key={g.key}
                onPress={() => setSelectedGoal(g.key)}
                activeOpacity={0.7}
                style={[
                  ss.optionCard,
                  { backgroundColor: t.surface, borderColor: selectedGoal === g.key ? t.accentBtn : t.border },
                  selectedGoal === g.key && { borderWidth: 2 },
                ]}
              >
                <Text style={ss.optionEmoji}>{g.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[ss.optionTitle, { color: t.ink }]}>{g.title}</Text>
                  <Text style={[ss.optionSub, { color: t.ink3 }]}>{g.sub}</Text>
                </View>
                {selectedGoal === g.key && <Ionicons name="checkmark-circle" size={22} color={t.accentBtn} />}
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            onPress={handleGoalNext}
            activeOpacity={0.8}
            disabled={!selectedGoal}
            style={[ss.nextBtn, { backgroundColor: selectedGoal ? t.accentBtn : t.surface2 }]}
          >
            <Text style={[ss.nextText, { color: selectedGoal ? onAccent : t.ink4 }]}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {step === 'habits' && (
        <Animated.View entering={SlideInRight} style={ss.stepWrap}>
          <Text style={[ss.emoji]}>✅</Text>
          <Text style={[ss.title, { color: t.ink }]}>Pick starter habits</Text>
          <Text style={[ss.sub, { color: t.ink3 }]}>You can always add more later</Text>
          <ScrollView style={ss.habitsList} showsVerticalScrollIndicator>
            {STARTER_HABITS.map((h, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => toggleHabit(idx)}
                activeOpacity={0.7}
                style={[
                  ss.habitChip,
                  { backgroundColor: t.surface, borderColor: selectedHabits.has(idx) ? t.accentBtn : t.border },
                  selectedHabits.has(idx) && { borderWidth: 2 },
                ]}
              >
                <Text style={{ fontSize: 18 }}>{h.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[ss.optionTitle, { color: t.ink }]}>{h.name}</Text>
                  <Text style={[ss.optionSub, { color: t.ink4 }]}>{h.category}</Text>
                </View>
                {selectedHabits.has(idx) && <Ionicons name="checkmark-circle" size={20} color={t.accentBtn} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity onPress={handleHabitsNext} activeOpacity={0.8} style={[ss.nextBtn, { backgroundColor: t.accentBtn }]}>
            <Text style={[ss.nextText, { color: onAccent }]}>Add {selectedHabits.size} habits</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {step === 'done' && (
        <Animated.View entering={FadeIn} style={[ss.stepWrap, { justifyContent: 'center' }]}>
          <Text style={{ fontSize: 48 }}>🚀</Text>
          <Text style={[ss.title, { color: t.ink }]}>You're all set!</Text>
          <Text style={[ss.sub, { color: t.ink3 }]}>Start tracking your fitness journey</Text>
          <TouchableOpacity onPress={handleFinish} activeOpacity={0.8} style={[ss.nextBtn, { backgroundColor: t.accentBtn, marginTop: 32 }]}>
            <Text style={[ss.nextText, { color: onAccent }]}>Let's Go</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const ss = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  stepWrap: { flex: 1, gap: 8 },
  emoji: { fontSize: 40, marginBottom: 8 },
  title: { fontFamily: F.bold, fontSize: 28, letterSpacing: -0.5 },
  sub: { fontFamily: F.regular, fontSize: 15, marginBottom: 16 },
  optionsWrap: { gap: 10 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 16, borderWidth: 1,
  },
  optionEmoji: { fontSize: 24 },
  optionTitle: { fontFamily: F.semibold, fontSize: 15 },
  optionSub: { fontFamily: F.regular, fontSize: 12, marginTop: 2 },
  habitsList: { flex: 1, marginBottom: 8 },
  habitChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8,
  },
  nextBtn: {
    paddingVertical: 16, borderRadius: 16, alignItems: 'center',
    marginTop: 'auto',
  },
  nextText: { fontFamily: F.bold, fontSize: 16 },
});

