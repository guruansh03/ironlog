import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/fonts';

interface MetricTileProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  unit: string;
  chart: React.ReactNode;
  style?: any;
}

function MetricTile({ icon, label, value, unit, chart, style }: MetricTileProps) {
  const { colors: c } = useTheme();

  return (
    <View style={[styles.tile, { backgroundColor: c.card }, style]}>
      <View style={styles.topRow}>
        <Ionicons name={icon} size={18} color={c.textMuted} />
        <Text style={[typography.tileLabel, { color: c.textMuted }]}>{label}</Text>
      </View>

      <View style={styles.bottomRow}>
        <View>
          <Text style={[typography.tileValue, { color: c.text }]} numberOfLines={1}>{value}</Text>
          <Text style={[typography.tileUnit, { color: c.textMuted }]}>{unit}</Text>
        </View>
        <View style={styles.chartWrap}>{chart}</View>
      </View>
    </View>
  );
}

export default memo(MetricTile);

const styles = StyleSheet.create({
  tile: {
    borderRadius: 20,
    padding: 16,
    minHeight: 152,
    justifyContent: 'space-between',
    shadowColor: 'rgba(0,0,0,1)',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  chartWrap: {
    width: 70,
    height: 50,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
});
