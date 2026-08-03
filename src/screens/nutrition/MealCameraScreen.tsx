import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/themes';
import { F } from '../../theme/fonts';
import AnimatedPressable from '../../components/animations/AnimatedPressable';
import { GeminiNutritionResult } from '../../services/geminiVision';
import { NutritionFoodItem, useNutritionStore } from '../../store/nutritionStore';

export default function MealCameraScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const { theme: t } = useAppTheme();
  const { addCustomFood, addEntryFromFood } = useNutritionStore();

  const [permission, requestPermission] = useCameraPermissions();
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<GeminiNutritionResult | null>(null);
  const [error, setError] = useState('');

  async function runDemoAnalysis() {
    setAnalyzing(true);
    setError('');
    try {
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
      if (!apiKey) {
        await new Promise((r) => setTimeout(r, 1200));
        setResult({
          foodName: 'Grilled Chicken Salad',
          confidence: 0.92,
          nutritionPerServing: { calories: 420, protein_g: 45, carbs_g: 18, fats_g: 14 },
          servingEstimate: '1 large bowl (~350g)',
        });
        setAnalyzing(false);
        return;
      }
      setAnalyzing(false);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Analysis failed';
      setError(message);
      setAnalyzing(false);
    }
  }

  const onCapture = useCallback(async () => {
    Alert.alert(
      'Capture',
      'Use demo analysis for now (live capture requires camera ref wiring).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Demo Analyze',
          onPress: () => {
            runDemoAnalysis();
          },
        },
      ]
    );
  }, []);

  function handleAccept() {
    if (!result) return;
    const food: NutritionFoodItem = {
      id: `ai_${Date.now()}`,
      name: result.foodName,
      source: 'custom',
      state: 'cooked',
      servingLabel: result.servingEstimate,
      calories: result.nutritionPerServing.calories,
      protein: result.nutritionPerServing.protein_g,
      carbs: result.nutritionPerServing.carbs_g,
      fats: result.nutritionPerServing.fats_g,
      favorite: false,
      createdAt: new Date().toISOString(),
    };
    addCustomFood(food);
    addEntryFromFood(food, 'Lunch', 1);
    navigation.goBack();
  }

  if (!permission?.granted) {
    return (
      <View style={[styles.container, { backgroundColor: '#000', paddingTop: insets.top }]}>
        <Text style={{ color: '#fff', textAlign: 'center', marginTop: 40 }}>Camera permission required</Text>
        <Pressable onPress={requestPermission} style={{ marginTop: 20, alignSelf: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8 }}>
          <Text>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" />

      {/* Overlay UI */}
      <View style={[styles.overlay, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.header}>
          <AnimatedPressable onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#fff" />
          </AnimatedPressable>
          <Text style={styles.headerTitle}>Scan Meal</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.reticle}>
          <View style={[styles.reticleCorner, { borderTopWidth: 2, borderLeftWidth: 2, top: 0, left: 0 }]} />
          <View style={[styles.reticleCorner, { borderTopWidth: 2, borderRightWidth: 2, top: 0, right: 0 }]} />
          <View style={[styles.reticleCorner, { borderBottomWidth: 2, borderLeftWidth: 2, bottom: 0, left: 0 }]} />
          <View style={[styles.reticleCorner, { borderBottomWidth: 2, borderRightWidth: 2, bottom: 0, right: 0 }]} />
        </View>

        {analyzing ? (
          <View style={styles.analyzingBox}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.analyzingText}>Analyzing with AI…</Text>
          </View>
        ) : result ? (
          <View style={[styles.resultBox, { backgroundColor: t.surface }]}>
            <Text style={[styles.resultTitle, { color: t.ink }]}>{result.foodName}</Text>
            <Text style={[styles.resultMeta, { color: t.ink3 }]}>
              Confidence {Math.round(result.confidence * 100)}% · {result.servingEstimate}
            </Text>
            <View style={styles.macroRow}>
              <MacroPill label="Calories" value={`${Math.round(result.nutritionPerServing.calories)}`} theme={t} />
              <MacroPill label="Protein" value={`${Math.round(result.nutritionPerServing.protein_g)}g`} theme={t} />
              <MacroPill label="Carbs" value={`${Math.round(result.nutritionPerServing.carbs_g)}g`} theme={t} />
              <MacroPill label="Fats" value={`${Math.round(result.nutritionPerServing.fats_g)}g`} theme={t} />
            </View>
            {error ? <Text style={{ color: '#ef4444', marginTop: 8 }}>{error}</Text> : null}
            <View style={styles.actionRow}>
              <AnimatedPressable style={[styles.ghostBtn, { borderColor: t.border }]} onPress={() => setResult(null)}>
                <Text style={{ color: t.ink2, fontFamily: F.semibold }}>Retake</Text>
              </AnimatedPressable>
              <AnimatedPressable style={[styles.primaryBtn, { backgroundColor: t.accentBtn }]} onPress={handleAccept}>
                <Text style={{ color: '#fff', fontFamily: F.bold }}>Accept & Add</Text>
              </AnimatedPressable>
            </View>
          </View>
        ) : (
          <View style={styles.bottomControls}>
            <AnimatedPressable style={styles.shutterBtn} onPress={onCapture}>
              <View style={styles.shutterInner} />
            </AnimatedPressable>
            <Text style={styles.hint}>Center your meal in the frame</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function MacroPill({ label, value, theme }: { label: string; value: string; theme: Theme }) {
  return (
    <View style={[styles.pill, { backgroundColor: theme.surface2 }]}>
      <Text style={{ fontFamily: F.bold, fontSize: 13, color: theme.ink }}>{value}</Text>
      <Text style={{ fontFamily: F.medium, fontSize: 9, color: theme.ink3, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: '#fff', fontFamily: F.semibold, fontSize: 16 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  reticle: { width: 260, height: 260, position: 'absolute', top: '30%' },
  reticleCorner: { width: 30, height: 30, position: 'absolute', borderColor: '#fff' },
  bottomControls: { alignItems: 'center', gap: 16 },
  shutterBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  hint: { color: 'rgba(255,255,255,0.8)', fontFamily: F.regular, fontSize: 13 },
  analyzingBox: { alignItems: 'center', gap: 12, marginBottom: 40 },
  analyzingText: { color: '#fff', fontFamily: F.medium, fontSize: 15 },
  resultBox: {
    width: '100%',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    gap: 10,
  },
  resultTitle: { fontFamily: F.bold, fontSize: 18 },
  resultMeta: { fontFamily: F.regular, fontSize: 12 },
  macroRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  pill: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  ghostBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  primaryBtn: { flex: 2, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
});
