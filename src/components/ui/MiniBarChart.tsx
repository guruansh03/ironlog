import React, { useMemo } from 'react';
import { View } from 'react-native';
import { MotiView } from 'moti';
import Svg, { Line, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../theme/useTheme';

interface Props {
  data: number[];
  color?: string;
  trackColor?: string;
  height?: number;
  barWidth?: number;
  gap?: number;
}

export default function MiniBarChart({
  data,
  color,
  trackColor,
  height = 48,
  barWidth = 5,
  gap = 3,
}: Props) {
  const { colors: c } = useTheme();
  const width = Math.max(8, data.length * (barWidth + gap));
  const pad = Math.max(2, barWidth / 2 + 1);
  const usableH = height - pad * 2;

  const normalized = useMemo(() => {
    const max = Math.max(...data, 1);
    return data.map((value) => Math.max(0, value / max));
  }, [data]);

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <MotiView
        key={data.join('|')}
        from={{ width: 0, opacity: 0.65 }}
        animate={{ width, opacity: 1 }}
        transition={{ type: 'timing', duration: 420 }}
        style={{ height }}
      >
        <Svg width={width} height={height}>
          <Defs>
            <SvgLinearGradient id="miniBarGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={color || c.text} stopOpacity={1} />
              <Stop offset="100%" stopColor={trackColor || c.textMuted} stopOpacity={0.95} />
            </SvgLinearGradient>
          </Defs>
          {normalized.map((value, index) => {
            const x = pad + index * (barWidth + gap) + barWidth / 2;
            const yBottom = height - pad;
            const yTop = yBottom - Math.max(3, usableH * value);
            return (
              <Line
                key={`bar-${index}`}
                x1={x}
                y1={yBottom}
                x2={x}
                y2={yTop}
                stroke="url(#miniBarGrad)"
                strokeWidth={barWidth}
                strokeLinecap="round"
              />
            );
          })}
        </Svg>
      </MotiView>
    </View>
  );
}
