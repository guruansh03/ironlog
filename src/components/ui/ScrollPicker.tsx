import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, NativeScrollEvent, NativeSyntheticEvent, Pressable, TextInput, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { F } from '../../theme/fonts';

interface Props {
  values: number[];
  selectedValue: number;
  onValueChange: (v: number) => void;
  width?: number;
  itemHeight?: number;
}

const VISIBLE_ITEMS = 5;

function findNearestIndex(values: number[], target: number) {
  if (!values.length) return 0;
  let nearestIndex = 0;
  let nearestDiff = Math.abs(values[0] - target);
  for (let index = 1; index < values.length; index += 1) {
    const diff = Math.abs(values[index] - target);
    if (diff < nearestDiff) {
      nearestDiff = diff;
      nearestIndex = index;
    }
  }
  return nearestIndex;
}

export default function ScrollPicker({
  values,
  selectedValue,
  onValueChange,
  width = 100,
  itemHeight = 44,
}: Props) {
  const { theme: t } = useAppTheme();
  const listRef = useRef<FlatList>(null);
  const safeValues = values.length ? values : [selectedValue || 0];
  const containerHeight = itemHeight * VISIBLE_ITEMS;
  const padding = itemHeight * Math.floor(VISIBLE_ITEMS / 2);
  const selectedIndex = findNearestIndex(safeValues, selectedValue);
  const initialIndex = selectedIndex;
  const [centerIndex, setCenterIndex] = useState(initialIndex);
  const [isEditing, setIsEditing] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const lastIndexRef = useRef(initialIndex);
  const currentOffsetRef = useRef(initialIndex * itemHeight);

  const onChangeRef = useRef(onValueChange);
  onChangeRef.current = onValueChange;

  useEffect(() => {
    const nextIndex = findNearestIndex(safeValues, selectedValue);
    lastIndexRef.current = nextIndex;
    setCenterIndex(nextIndex);
    const nextOffset = nextIndex * itemHeight;
    const shouldReposition = Math.abs(currentOffsetRef.current - nextOffset) > itemHeight / 2;
    requestAnimationFrame(() => {
      if (shouldReposition) {
        listRef.current?.scrollToOffset({ offset: nextOffset, animated: false });
        currentOffsetRef.current = nextOffset;
      }
    });
  }, [itemHeight, safeValues, selectedValue]);

  // Force correct position on mount (web FlatList initialScrollIndex is unreliable)
  useEffect(() => {
    const offset = initialIndex * itemHeight;
    const timer = setTimeout(() => {
      listRef.current?.scrollToOffset({ offset, animated: false });
      currentOffsetRef.current = offset;
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const commitCenteredValue = (event: NativeSyntheticEvent<NativeScrollEvent>, snapToCenter = false) => {
    const contentOffset = event.nativeEvent.contentOffset.y;
    currentOffsetRef.current = contentOffset;
    const idx = Math.max(0, Math.min(safeValues.length - 1, Math.round(contentOffset / itemHeight)));
    if (idx >= 0 && idx < safeValues.length && safeValues[idx] !== undefined) {
      if (lastIndexRef.current !== idx) {
        lastIndexRef.current = idx;
        setCenterIndex(idx);
        onChangeRef.current(safeValues[idx]);
      } else {
        setCenterIndex(idx);
      }
      if (snapToCenter) {
        const offset = idx * itemHeight;
        currentOffsetRef.current = offset;
        listRef.current?.scrollToOffset({ offset, animated: true });
      }
    }
  };

  const onScrollUpdate = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffset = event.nativeEvent.contentOffset.y;
    currentOffsetRef.current = contentOffset;
    const idx = Math.max(0, Math.min(safeValues.length - 1, Math.round(contentOffset / itemHeight)));
    if (idx !== lastIndexRef.current) {
      lastIndexRef.current = idx;
      setCenterIndex(idx);
      onChangeRef.current(safeValues[idx]);
    }
  };

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const openManualInput = () => {
    const currentValue = safeValues[Math.max(0, Math.min(safeValues.length - 1, centerIndex))] ?? selectedValue;
    setManualInput(Number.isInteger(currentValue) ? String(currentValue) : String(currentValue));
    setIsEditing(true);
  };

  const confirmManualInput = () => {
    const parsed = Number(manualInput);
    if (!Number.isFinite(parsed)) {
      setIsEditing(false);
      return;
    }
    const nextIndex = findNearestIndex(safeValues, parsed);
    const nextValue = safeValues[nextIndex];
    if (nextValue !== undefined) {
      lastIndexRef.current = nextIndex;
      setCenterIndex(nextIndex);
      onChangeRef.current(nextValue);
      const offset = nextIndex * itemHeight;
      currentOffsetRef.current = offset;
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset, animated: true });
      });
    }
    setIsEditing(false);
  };

  return (
    <View style={[styles.container, { width, height: containerHeight }]}>
      {/* Center selection line indicator */}
      <View
        style={[
          styles.highlight,
          {
            top: padding,
            height: itemHeight,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: `${t.ink4}66`,
          },
        ]}
        pointerEvents="none"
      />

      <Pressable
        onPress={openManualInput}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Type value"
        style={[
          styles.highlightTap,
          {
            top: padding,
            height: itemHeight,
          },
        ]}
      />

      <FlatList
        ref={listRef}
        data={safeValues}
        keyExtractor={(item) => String(item)}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        snapToInterval={itemHeight}
        decelerationRate="fast"
        initialScrollIndex={initialIndex}
        onScrollToIndexFailed={() => {
          requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({ offset: initialIndex * itemHeight, animated: false });
          });
        }}
        getItemLayout={(_, index) => ({ length: itemHeight, offset: itemHeight * index, index })}
        onMomentumScrollEnd={(event) => commitCenteredValue(event, true)}
        onScrollEndDrag={(event) => commitCenteredValue(event, true)}
        onScroll={onScrollUpdate}
        viewabilityConfig={viewabilityConfig}
        contentContainerStyle={{ paddingVertical: padding }}
        scrollEventThrottle={16}
        windowSize={5}
        maxToRenderPerBatch={10}
        removeClippedSubviews
        renderItem={({ item, index }) => (
          <View style={[styles.item, { height: itemHeight, width }]}>
            <Text
              style={[
                styles.itemText,
                { lineHeight: itemHeight },
                { color: index === centerIndex ? t.ink : `${t.ink3}80` },
                index === centerIndex && styles.itemTextSelected,
              ]}
            >
              {item % 1 === 0 ? String(item) : item.toFixed(1)}
            </Text>
          </View>
        )}
      />

      {isEditing ? (
        <View style={[styles.editOverlay, { backgroundColor: `${t.bg}f5`, borderColor: t.border }]}> 
          <TextInput
            style={[styles.editInput, { color: t.ink, borderColor: t.border, backgroundColor: t.surface }]}
            value={manualInput}
            onChangeText={setManualInput}
            keyboardType="decimal-pad"
            autoFocus
            selectTextOnFocus
            onSubmitEditing={confirmManualInput}
          />
          <View style={styles.editButtonsRow}>
            <TouchableOpacity onPress={() => setIsEditing(false)} style={[styles.editBtn, { backgroundColor: t.surface2 }]}> 
              <Text style={[styles.editBtnTxt, { color: t.ink3 }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={confirmManualInput} style={[styles.editBtn, { backgroundColor: t.accentBtn }]}> 
              <Text style={[styles.editBtnTxt, { color: '#fff' }]}>Set</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', position: 'relative' },
  highlight: { position: 'absolute', left: 4, right: 4, zIndex: 1 },
  highlightTap: { position: 'absolute', right: 0, width: 42, zIndex: 2 },
  item: { alignItems: 'center', justifyContent: 'center' },
  itemText: { fontFamily: F.mono, fontSize: 18, fontWeight: '400' },
  itemTextSelected: { fontFamily: F.monoMedium, fontSize: 24, fontWeight: '700' },
  editOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    gap: 8,
  },
  editInput: {
    width: '92%',
    borderWidth: 1,
    borderRadius: 8,
    height: 38,
    textAlign: 'center',
    fontFamily: F.bold,
    fontSize: 16,
    paddingHorizontal: 8,
  },
  editButtonsRow: { flexDirection: 'row', gap: 6 },
  editBtn: {
    minWidth: 62,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  editBtnTxt: { fontFamily: F.semibold, fontSize: 12 },
});

