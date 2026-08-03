/**
 * Simple unique ID generator for React Native.
 * Uses Math.random + timestamp instead of the `uuid` package
 * which requires the `crypto` module unavailable in RN.
 */
export function generateId(): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).substring(2, 10);
  return `${t}-${r}`;
}
