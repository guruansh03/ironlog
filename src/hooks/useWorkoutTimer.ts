import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export function useWorkoutTimer(active: boolean, startedAt?: string | null) {
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Tracks total milliseconds spent in background so we don't count background time
  const pausedDurationRef = useRef<number>(0);
  const backgroundedAtRef = useRef<number | null>(null);

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const tick = () => {
      if (startTimeRef.current === null) return;
      const raw = Date.now() - startTimeRef.current - pausedDurationRef.current;
      setElapsed(Math.max(0, Math.floor(raw / 1000)));
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);
  }, []);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Main timer lifecycle
  useEffect(() => {
    if (active) {
      const parsedStart = startedAt ? new Date(startedAt).getTime() : NaN;
      startTimeRef.current = Number.isFinite(parsedStart) ? parsedStart : Date.now();
      pausedDurationRef.current = 0;
      startInterval();
    } else {
      stopInterval();
    }
    return () => stopInterval();
  }, [active, startedAt, startInterval, stopInterval]);

  // AppState listener — pause interval in background, resume on foreground
  useEffect(() => {
    if (!active) return;
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundedAtRef.current = Date.now();
        stopInterval();
      } else if (nextState === 'active') {
        if (backgroundedAtRef.current !== null) {
          pausedDurationRef.current += Date.now() - backgroundedAtRef.current;
          backgroundedAtRef.current = null;
        }
        startInterval();
      }
    });
    return () => sub.remove();
  }, [active, startInterval, stopInterval]);

  const reset = useCallback(() => {
    startTimeRef.current = null;
    pausedDurationRef.current = 0;
    backgroundedAtRef.current = null;
    setElapsed(0);
    stopInterval();
  }, [stopInterval]);

  function formatted() {
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return { elapsed, formatted, reset };
}
