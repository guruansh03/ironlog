export function toTrend(values: number[]) {
  if (values.length < 2) return 0;
  const first = values[0];
  const last = values[values.length - 1];
  if (first === 0) return last > 0 ? 100 : 0;
  return ((last - first) / Math.abs(first)) * 100;
}

export function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function arrayMax(values: number[]) {
  if (!values.length) return 0;
  return Math.max(...values);
}

export function normalize(values: number[]) {
  if (!values.length) return [];
  const hi = arrayMax(values);
  if (hi <= 0) return values.map(() => 0);
  return values.map((v) => v / hi);
}

export function byDateFill(
  records: Array<{ date: string; value: number }>,
  days: string[]
) {
  const map = new Map(records.map((record) => [record.date, record.value]));
  return days.map((day) => map.get(day) ?? 0);
}
