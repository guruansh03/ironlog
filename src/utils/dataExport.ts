import { mmkvStorage } from '../store/mmkv';
import { Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

const STORAGE_KEYS = {
  gym: 'gym',
  habits: 'habits',
  notes: 'notes',
  user: 'user',
  weight: 'weight',
  nutrition: 'nutrition',
  measurements: 'measurements',
  steps: 'steps',
  theme: 'activeTheme',
} as const;

export type ExportFormat = 'json' | 'csv';

export async function exportAllData(format: ExportFormat = 'json'): Promise<string> {
  const data: Record<string, any> = {};
  for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
    try {
      const raw = mmkvStorage.getString(storageKey);
      if (!raw) {
        data[key] = null;
      } else if (key === 'theme') {
        data[key] = raw;
      } else {
        data[key] = JSON.parse(raw);
      }
    } catch { data[key] = null; }
  }
  return format === 'json' ? JSON.stringify(data, null, 2) : exportAsCSV(data);
}

function exportAsCSV(data: Record<string, any>): string {
  const lines: string[] = [];

  lines.push('=== WORKOUT SESSIONS ===');
  lines.push('date,split,day,duration_min,total_volume_kg,exercises');
  for (const s of data.gym?.sessions ?? []) {
    const date = s.startedAt?.slice(0, 10) ?? '';
    const dur = Math.round((s.durationSeconds ?? 0) / 60);
    const exNames = (s.exercises ?? []).map((e: any) => e.name).join('; ');
    lines.push(`${date},${s.splitName},${s.dayName},${dur},${Math.round(s.totalVolume)},${exNames}`);
  }

  lines.push('');
  lines.push('=== EXERCISE SETS ===');
  lines.push('date,split,day,exercise,muscle,set_num,weight_kg,reps,rpe,completed');
  for (const s of data.gym?.sessions ?? []) {
    const date = s.startedAt?.slice(0, 10) ?? '';
    for (const ex of s.exercises ?? []) {
      for (let i = 0; i < (ex.sets ?? []).length; i++) {
        const set = ex.sets[i];
        lines.push(`${date},${s.splitName},${s.dayName},${ex.name},${ex.muscleGroup},${i + 1},${set.weight},${set.reps},${set.rpe ?? ''},${set.completed}`);
      }
    }
  }

  lines.push('');
  lines.push('=== HABITS ===');
  lines.push('name,icon,created,total_completions,completion_dates');
  for (const h of data.habits ?? []) {
    lines.push(`${h.name},${h.icon},${h.createdAt ?? ''},${h.completions?.length ?? 0},${(h.completions ?? []).join('; ')}`);
  }

  lines.push('');
  lines.push('=== NOTES ===');
  lines.push('title,body,type,created,pinned');
  for (const n of (data.notes ?? []).filter((n: any) => n.type === 'note')) {
    const body = (n.body ?? '').replace(/\n/g, ' ').replace(/,/g, ';');
    lines.push(`${n.title},${body},note,${n.createdAt ?? ''},${n.pinned ?? false}`);
  }

  lines.push('');
  lines.push('=== TODOS ===');
  lines.push('title,body,created,pinned');
  for (const n of (data.notes ?? []).filter((n: any) => n.type === 'todo')) {
    const body = (n.body ?? '').replace(/\n/g, ' ').replace(/,/g, ';');
    lines.push(`${n.title},${body},${n.createdAt ?? ''},${n.pinned ?? false}`);
  }

  return lines.join('\n');
}

export async function importAllData(jsonString: string): Promise<void> {
  const data = JSON.parse(jsonString);
  for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
    if (data[key] == null) continue;
    if (key === 'theme') {
      mmkvStorage.set(storageKey, String(data[key]));
    } else {
      mmkvStorage.set(storageKey, JSON.stringify(data[key]));
    }
  }
}

export async function shareExport(format: ExportFormat = 'json'): Promise<void> {
  const content = await exportAllData(format);
  const ext = format === 'json' ? 'json' : 'csv';
  const filename = `ironlog_backup_${new Date().toISOString().slice(0, 10)}.${ext}`;

  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  } else {
    try {
      const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
      if (!baseDir) throw new Error('No writable export directory available');
      const uri = `${baseDir}${filename}`;
      await FileSystem.writeAsStringAsync(uri, content);
      await Share.share({ url: uri, title: `IronLog Backup (${ext.toUpperCase()})` });
    } catch {
      await Share.share({ message: content, title: `IronLog Backup (${ext.toUpperCase()})` });
    }
  }
}

export async function clearAllData(): Promise<void> {
  for (const storageKey of Object.values(STORAGE_KEYS)) mmkvStorage.delete(storageKey);
  mmkvStorage.delete('theme');
}
