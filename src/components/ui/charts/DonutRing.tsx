import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../../../theme/useTheme';

interface DonutRingProps {
  ratio: number;
  width?: number;
  height?: number;
  trackColor?: string;
  fillColor?: string;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function arcPath(cx: number, cy: number, radius: number, ratio: number) {
  const endAngle = Math.min(359.999, Math.max(0, ratio * 360));
  const start = polarToCartesian(cx, cy, radius, 0);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArcFlag = endAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

export default function DonutRing({ ratio, width = 70, height = 50, trackColor, fillColor }: DonutRingProps) {
  const { colors: c } = useTheme();
  const size = Math.min(width, height);
  const strokeWidth = 6;
  const radius = size / 2 - strokeWidth / 2;
  const clamped = Math.max(0, Math.min(1, ratio));
  const cx = width / 2;
  const cy = height / 2;

  return (
    <Svg width={width} height={height}>
      <Circle cx={cx} cy={cy} r={radius} stroke={trackColor ?? c.donutTrack} strokeWidth={strokeWidth} fill="none" />
      {clamped > 0 ? (
        <Path d={arcPath(cx, cy, radius, clamped)} stroke={fillColor ?? c.donutFill} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
      ) : null}
    </Svg>
  );
}
