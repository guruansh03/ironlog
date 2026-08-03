# IronLog 🏋️

Production-ready gym + habit tracker. Built with Expo React Native.

## Stack
- Expo ~51
- React Native 0.74
- Reanimated 3 + Gesture Handler
- Moti (animations)
- React Navigation (drawer + tabs + stack)
- Zustand (state)
- AsyncStorage + JSON (persistence)
- Victory Native (charts)

## Setup

```bash
cd IronLog
npm install
npx expo start
```

Scan QR with Expo Go (iOS/Android) or press `i` for iOS simulator, `a` for Android.

## Android Release Signing

Release builds are configured to require a real signing key.

1. Create a keystore (once):

```bash
cd android
keytool -genkeypair -v -storetype PKCS12 -keystore ../keystores/release.jks -alias release -keyalg RSA -keysize 2048 -validity 10000
```

2. Configure signing values:

- Copy `android/keystore.properties.example` to `android/keystore.properties`, then fill values.
- Or set environment variables:
    - `ANDROID_KEYSTORE_FILE`
    - `ANDROID_KEYSTORE_PASSWORD`
    - `ANDROID_KEY_ALIAS`
    - `ANDROID_KEY_PASSWORD`

3. Build release:

```bash
cd android
./gradlew assembleRelease
```

If you intentionally need debug signing for a release variant (not for production), pass:

```bash
./gradlew assembleRelease -PallowDebugSigningInRelease=true
```

## EAS

- `eas.json` is pinned to EAS CLI `>= 18.7.0 < 19.0.0` for predictable builds.
- Use `npx eas` (recommended) instead of installing EAS CLI as a project dependency.

## Folder Structure

```
src/
├── theme/
│   ├── tokens.ts          # Colors, spacing, radius, fonts
│   └── useTheme.ts        # Dark/light hook
├── store/
│   ├── themeStore.ts      # Dark/light toggle + persist
│   ├── userStore.ts       # User profile
│   ├── gymStore.ts        # Splits, sessions, sets, volume
│   ├── habitStore.ts      # Habits, streaks, completions
│   └── notesStore.ts      # Notes + todos
├── navigation/
│   ├── RootNavigator.tsx  # Drawer wrapping tabs
│   ├── TabNavigator.tsx   # Bottom tabs (animated)
│   └── GymNavigator.tsx   # Gym stack
├── screens/
│   ├── HomeScreen.tsx     # Mosaic dashboard
│   ├── HabitsScreen.tsx   # Habit tracking + graphs
│   ├── NotesScreen.tsx    # Notes + todos
│   ├── SettingsScreen.tsx # Theme, name, accent
│   └── gym/
│       ├── GymHomeScreen.tsx        # Split picker
│       ├── WorkoutScreen.tsx        # Active workout
│       ├── CreateSplitScreen.tsx    # Custom split builder
│       ├── WorkoutHistoryScreen.tsx # Past sessions
│       └── WorkoutSummaryScreen.tsx # Session summary
├── components/
│   ├── sidebar/
│   │   └── SidebarContent.tsx   # Drawer content
│   ├── ui/
│   │   ├── InitialsAvatar.tsx   # Circular name logo
│   │   ├── ScreenHeader.tsx     # Reusable header
│   │   └── ScrollPicker.tsx     # Alarm-wheel picker
│   └── tiles/
│       ├── VolumeBarTile.tsx        # 7-day volume chart
│       ├── StepsCircleTile.tsx      # Animated ring
│       ├── WorkoutConsistencyTile.tsx # 7-day dot grid
│       └── HabitConsistencyTile.tsx   # Multi-color grid
└── hooks/
    └── useWorkoutTimer.ts  # Live workout timer
```

## Features

### Gym
- PPL + Bro Split predefined
- Custom splits (build your own days + exercises)
- Active workout: timer, sets, weight/reps scroll picker, per-exercise notes
- Add exercises on the fly during workout
- Volume tracking, history, session summary

### Habits
- Create habits with icon + auto color
- One-tap daily completion
- Streak tracking (current + best)
- Per-habit collapsible bar graph (14 days)
- Global multi-color overview grid

### Notes
- Plain notes (full-screen editor)
- Todo lists (tap to check off)
- Pin notes, type badges

### Dashboard
- Mosaic animated tile grid
- 7-day volume bar chart
- Steps circle ring (placeholder for HealthKit)
- Workout consistency 7-day dots
- Habit consistency multi-color grid

## To extend
- **Steps**: Connect `expo-sensors` or HealthKit
- **Accent color**: Add `accentStore.ts` with Zustand, patch `COLORS.accent` reactively
- **Graphs**: Switch to Skia for more complex animations
- **Images in notes**: Add `expo-image-picker` + base64 store
- **Push notifications**: `expo-notifications` for habit reminders
