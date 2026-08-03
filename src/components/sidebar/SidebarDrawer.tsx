import React, { useEffect, useRef } from 'react';
import {
  View, StyleSheet, Animated, Pressable, Dimensions,
  Modal, Platform,
} from 'react-native';
import SidebarContent from './SidebarContent';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = Math.min(300, SCREEN_WIDTH * 0.8);

interface Props {
  visible: boolean;
  onClose: () => void;
  onNavigate: (tab: string, screen?: string) => void;
}

export default function SidebarDrawer({ visible, onClose, onNavigate }: Props) {
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Overlay */}
      <Pressable onPress={onClose} style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} />
      </Pressable>

      {/* Drawer panel */}
      <Animated.View
        style={[
          styles.drawer,
          { width: DRAWER_WIDTH, transform: [{ translateX: slideAnim }] },
        ]}
      >
        <SidebarContent onNavigate={onNavigate} onClose={onClose} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: undefined,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
    zIndex: 100,
  },
});
