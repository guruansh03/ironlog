// ─── PopupSheet ──────────────────────────────────────────────────────────────
// Modal bottom sheet with blur+dark backdrop, surface bg, 28px top radius,
// handle 32×4 surface3.

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Animated as RNAnimated,
  ScrollView,
  Platform,
} from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: number | string;
}

export default function PopupSheet({ visible, onClose, children, maxHeight }: Props) {
  const { theme: t, isDark } = useAppTheme();
  const translateY = useRef(new RNAnimated.Value(500)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const [renderSheet, setRenderSheet] = useState(false);

  useEffect(() => {
    if (visible) {
      setRenderSheet(true);
      RNAnimated.parallel([
        RNAnimated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 170,
          friction: 20,
        }),
        RNAnimated.timing(opacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      RNAnimated.parallel([
        RNAnimated.timing(translateY, {
          toValue: 500,
          duration: 160,
          useNativeDriver: true,
        }),
        RNAnimated.timing(opacity, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start(() => setRenderSheet(false));
    }
  }, [visible]);

  if (!renderSheet) return null;

  return (
    <Modal visible={renderSheet} transparent animationType="none">
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <RNAnimated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity,
              backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.2)',
            },
          ]}
        />
      </Pressable>
      <RNAnimated.View
        style={[
          styles.sheet,
          {
            backgroundColor: t.surface,
            maxHeight: maxHeight ?? '88%',
            transform: [{ translateY }],
          },
          t.shadowPopup as any,
        ]}
      >
        <View style={styles.sheetContent}>
          <View style={[styles.handle, { backgroundColor: t.surface3 }]} />
          <ScrollView
            style={styles.scroller}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            bounces
            nestedScrollEnabled={Platform.OS === 'android'}
            contentContainerStyle={styles.content}
          >
            {children}
          </ScrollView>
        </View>
      </RNAnimated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  sheetContent: {
    minHeight: 0,
    flexShrink: 1,
  },
  scroller: {
    flexGrow: 0,
    flexShrink: 1,
  },
  handle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 18,
  },
  content: {
    paddingBottom: 16,
  },
});


