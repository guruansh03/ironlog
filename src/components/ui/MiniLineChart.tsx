import React, { useMemo } from 'react';
import { View } from 'react-native';
import { MotiView } from 'moti';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Path as SvgPath } from 'react-native-svg';
import { useTheme } from '../../theme/useTheme';

interface Props {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  area?: boolean;
}

export default function MiniLineChart({
  data,
  width = 80,
  height = 40,
  color,
  strokeWidth = 2,
  area = false,
}: Props) {
  const { colors: c } = useTheme();
  const themeColor = color || c.text;
  const chartData = useMemo(() => (data.length >= 2 ? data : [0, 0]), [data]);

  const max = Math.max(...chartData, 1);
  const min = Math.min(...chartData, 0);
  const range = max - min || 1;
  const pad = 4;
  const usableW = width - pad * 2;
  const usableH = height - pad * 2;

  const points = useMemo(
    () =>
      chartData.map((value, index) => {
        const x = pad + (index / (chartData.length - 1)) * usableW;
        const y = height - pad - ((value - min) / range) * usableH;
        return { x, y };
      }),
    [chartData, height, min, pad, range, usableH, usableW]
  );

  const svgLineD = useMemo(() => {
    const [first, ...rest] = points;
    if (!first) return '';

    let d = `M ${first.x} ${first.y}`;
    for (let index = 0; index < rest.length; index++) {
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
    return d;
  }, [points]);

  const svgAreaD = useMemo(() => {
    if (!svgLineD) return '';
    const end = points[points.length - 1];
    const start = points[0];
    return `${svgLineD} L ${end.x} ${height - pad} L ${start.x} ${height - pad} Z`;
  }, [height, pad, points, svgLineD]);

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <MotiView
        key={chartData.join('|')}
        from={{ width: 0, opacity: 0.65 }}
        animate={{ width, opacity: 1 }}
        transition={{ type: 'timing', duration: 420 }}
        style={{ height }}
      >
        <Svg width={width} height={height}>
          <Defs>
            <SvgLinearGradient id="miniLineGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={themeColor} stopOpacity={1} />
              <Stop offset="100%" stopColor={c.textMuted} stopOpacity={0.95} />
            </SvgLinearGradient>
            <SvgLinearGradient id="miniAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={themeColor} stopOpacity={0.3} />
              <Stop offset="100%" stopColor={themeColor} stopOpacity={0} />
            </SvgLinearGradient>
          </Defs>

          {area && svgAreaD ? <SvgPath d={svgAreaD} fill="url(#miniAreaGrad)" /> : null}
          {svgLineD ? (
            <SvgPath
              d={svgLineD}
              stroke="url(#miniLineGrad)"
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>
      </MotiView>
    </View>
  );
}
