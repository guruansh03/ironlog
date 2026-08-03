import React, { memo, useEffect, useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../../theme/useTheme';

interface SparkLineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

function SparkLine({ data, width = 70, height = 50, color, fillColor }: SparkLineProps) {
  const { colors: c } = useTheme();
  const values = data.length > 1 ? data : [0, 0, 0, 0, 0, 0];
  const progress = useSharedValue(0);

  const { linePath, fillPath } = useMemo(() => {
    const pad = 3;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const usableW = width - pad * 2;
    const usableH = height - pad * 2;

    const points = values.map((value, index) => ({
      x: pad + (index / Math.max(1, values.length - 1)) * usableW,
      y: height - pad - ((value - min) / range) * usableH,
    }));

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let index = 0; index < points.length - 1; index += 1) {
      const p0 = points[index - 1] ?? points[index];
      const p1 = points[index];
      const p2 = points[index + 1];
      const p3 = points[index + 2] ?? p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const end = points[points.length - 1];
    const start = points[0];
    return {
      linePath: d,
      fillPath: `${d} L ${end.x} ${height - pad} L ${start.x} ${height - pad} Z`,
    };
  }, [height, values, width]);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 500 });
  }, [data, progress]);

  const estimatedLength = Math.max(width * 2.2, 120);
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: estimatedLength * (1 - progress.value),
  }));

  return (
    <Svg width={width} height={height}>
      <Path d={fillPath} fill={fillColor ?? c.chartFill} />
      <AnimatedPath
        d={linePath}
        stroke={color ?? c.chartStroke}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={estimatedLength}
        animatedProps={animatedProps}
      />
    </Svg>
  );
}

export default memo(SparkLine);
