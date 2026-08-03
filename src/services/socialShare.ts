import { Platform, Share } from 'react-native';

export async function shareText(title: string, message: string) {
  if (Platform.OS === 'web') {
    if (navigator.share) {
      await navigator.share({ title, text: message });
    } else {
      await navigator.clipboard.writeText(message);
      window.alert('Copied to clipboard!');
    }
    return;
  }
  await Share.share({ message, title });
}

export async function shareWorkoutSummary(
  dayName: string,
  volume: number,
  durationMin: number,
  sets: number,
  prs: number
) {
  const text = `🏋️ IronLog Workout\n${dayName}\n📊 ${Math.round(volume)}kg volume · ${durationMin}min · ${sets} sets${prs > 0 ? ` · ${prs} PRs` : ''}`;
  await shareText('My IronLog Workout', text);
}

export async function inviteFriend(appUrl = 'https://ironlog.app') {
  await shareText('Join me on IronLog', `Track workouts, nutrition, and habits together. ${appUrl}`);
}
