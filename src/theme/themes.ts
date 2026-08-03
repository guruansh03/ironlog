// ─── IronLog Theme System ────────────────────────────────────────────────────
// 9 themes mapped from gym_themes_v3.html CSS variables
// Each theme provides full token coverage for all UI components.

import { Platform } from 'react-native';

/* ══════════════════════════════════════════
   THEME INTERFACE
   ══════════════════════════════════════════ */

export interface Theme {
  id: string;
  name: string;
  mode: 'light' | 'dark';

  // Backgrounds
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;

  // Text / ink
  ink: string;
  ink2: string;
  ink3: string;
  ink4: string;

  // Borders & accents
  border: string;
  accent: string;
  accentBtn: string;

  // Hero card
  heroRing: string;
  heroBg: [string, string]; // LinearGradient [from, to]

  // Tile gradients (4 tiles on home)
  tile1Bg: [string, string];
  tile2Bg: [string, string];
  tile3Bg: [string, string];
  tile4Bg: [string, string];

  // Tile foreground colors
  tile1Fg: string;
  tile1Fg2: string;
  tile2Fg: string;
  tile2Fg2: string;
  tile3Fg: string;
  tile3Fg2: string;
  tile4Fg: string;
  tile4Fg2: string;

  // Tab bar, chips, progress indicators
  tabActiveBg: string;
  weekFill: string;
  habitDotDone: string;
  habitDotUndone: string;
  chipActiveBg: string;
  sparklineColor: string;

  // Shadows (platform-specific)
  shadowTile: object;
  shadowPopup: object;

  // Radii (constant but included for easy access)
  radiusTile: 20;
  radiusSheet: 28;
  radiusSm: 12;

  // Optional per-screen overrides used by adaptive themes.
  screenPalettes?: Record<string, Partial<Theme>>;
}

/* ══════════════════════════════════════════
   SHADOW HELPERS
   ══════════════════════════════════════════ */

function lightShadowTile() {
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  };
}

function lightShadowPopup() {
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  };
}

function darkShadowTile() {
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 3,
  };
}

function darkShadowPopup() {
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  };
}

/* ══════════════════════════════════════════
   THEME DEFINITIONS
   ══════════════════════════════════════════ */

const BASE_RADII = { radiusTile: 20 as const, radiusSheet: 28 as const, radiusSm: 12 as const };

// ── 1. Coral Sunrise (light, warm) ─────────────────────
const coral: Theme = {
  id: 'coral',
  name: 'Coral Sunrise',
  mode: 'light',
  bg: '#FFF5F0',
  surface: '#FFFFFF',
  surface2: '#FFF0EA',
  surface3: '#FFE4D8',
  ink: '#1A0D08',
  ink2: '#5C3D30',
  ink3: '#A07060',
  ink4: '#C8A090',
  border: 'rgba(200,100,60,0.1)',
  accent: '#FF5733',
  accentBtn: '#FF5733',
  heroRing: 'rgba(255,87,51,0.2)',
  heroBg: ['#FF5733', '#C0392B'],
  tile1Bg: ['#FF6B35', '#FF4500'],
  tile2Bg: ['#FF9F80', '#FF7755'],
  tile3Bg: ['#FFD4C4', '#FFBAA0'],
  tile4Bg: ['#1A0D08', '#2E1808'],
  tile1Fg: '#FFFFFF', tile1Fg2: 'rgba(255,255,255,0.65)',
  tile2Fg: '#FFFFFF', tile2Fg2: 'rgba(255,255,255,0.65)',
  tile3Fg: '#7A2800', tile3Fg2: 'rgba(122,40,0,0.55)',
  tile4Fg: '#FFFFFF', tile4Fg2: 'rgba(255,255,255,0.4)',
  tabActiveBg: '#FF5733',
  weekFill: '#FF5733',
  habitDotDone: '#FF5733',
  habitDotUndone: '#FFD4C4',
  chipActiveBg: '#FF5733',
  sparklineColor: 'rgba(255,255,255,0.5)',
  shadowTile: lightShadowTile(),
  shadowPopup: lightShadowPopup(),
  ...BASE_RADII,
};

// ── 2. Ocean Depth (dark, blue-teal) ────────────────────
const ocean: Theme = {
  id: 'ocean',
  name: 'Ocean Depth',
  mode: 'dark',
  bg: '#0A1628',
  surface: '#0F1E38',
  surface2: '#152340',
  surface3: '#1C2E50',
  ink: '#E8F4FF',
  ink2: '#A8C4E0',
  ink3: '#6890B8',
  ink4: '#3D6090',
  border: 'rgba(80,150,220,0.12)',
  accent: '#38BDF8',
  accentBtn: '#38BDF8',
  heroRing: 'rgba(14,165,233,0.2)',
  heroBg: ['#0EA5E9', '#0369A1'],
  tile1Bg: ['#0EA5E9', '#0284C7'],
  tile2Bg: ['#06B6D4', '#0891B2'],
  tile3Bg: ['#1E3A5F', '#152B4A'],
  tile4Bg: ['#67E8F9', '#38BDF8'],
  tile1Fg: '#FFFFFF', tile1Fg2: 'rgba(255,255,255,0.6)',
  tile2Fg: '#FFFFFF', tile2Fg2: 'rgba(255,255,255,0.6)',
  tile3Fg: '#E8F4FF', tile3Fg2: 'rgba(168,196,224,0.7)',
  tile4Fg: '#0A1628', tile4Fg2: 'rgba(10,22,40,0.55)',
  tabActiveBg: '#38BDF8',
  weekFill: '#38BDF8',
  habitDotDone: '#38BDF8',
  habitDotUndone: '#1C2E50',
  chipActiveBg: '#38BDF8',
  sparklineColor: 'rgba(255,255,255,0.45)',
  shadowTile: darkShadowTile(),
  shadowPopup: darkShadowPopup(),
  ...BASE_RADII,
};

// ── 3. Forest Vitality (dark, green) ────────────────────
const forest: Theme = {
  id: 'forest',
  name: 'Forest Vitality',
  mode: 'dark',
  bg: '#0C1A0E',
  surface: '#121F14',
  surface2: '#182B1B',
  surface3: '#1E3522',
  ink: '#ECFDF0',
  ink2: '#9DC4A4',
  ink3: '#5C8B64',
  ink4: '#355C3C',
  border: 'rgba(50,180,80,0.12)',
  accent: '#4ADE80',
  accentBtn: '#4ADE80',
  heroRing: 'rgba(22,163,74,0.2)',
  heroBg: ['#16A34A', '#052E0F'],
  tile1Bg: ['#16A34A', '#15803D'],
  tile2Bg: ['#4ADE80', '#22C55E'],
  tile3Bg: ['#86EFAC', '#4ADE80'],
  tile4Bg: ['#1E3522', '#0C1A0E'],
  tile1Fg: '#FFFFFF', tile1Fg2: 'rgba(255,255,255,0.6)',
  tile2Fg: '#052E0F', tile2Fg2: 'rgba(5,46,15,0.5)',
  tile3Fg: '#052E0F', tile3Fg2: 'rgba(5,46,15,0.5)',
  tile4Fg: '#ECFDF0', tile4Fg2: 'rgba(236,253,240,0.4)',
  tabActiveBg: '#4ADE80',
  weekFill: '#4ADE80',
  habitDotDone: '#4ADE80',
  habitDotUndone: '#1E3522',
  chipActiveBg: '#4ADE80',
  sparklineColor: 'rgba(255,255,255,0.45)',
  shadowTile: darkShadowTile(),
  shadowPopup: darkShadowPopup(),
  ...BASE_RADII,
};

// ── 4. Electric Violet (dark, purple) ───────────────────
const violet: Theme = {
  id: 'violet',
  name: 'Electric Violet',
  mode: 'dark',
  bg: '#100820',
  surface: '#170D2E',
  surface2: '#1E1238',
  surface3: '#271642',
  ink: '#F0E8FF',
  ink2: '#B8A0E0',
  ink3: '#7C60B0',
  ink4: '#4E3880',
  border: 'rgba(150,80,255,0.13)',
  accent: '#A855F7',
  accentBtn: '#A855F7',
  heroRing: 'rgba(124,58,237,0.25)',
  heroBg: ['#7C3AED', '#100820'],
  tile1Bg: ['#9333EA', '#7C3AED'],
  tile2Bg: ['#C084FC', '#A855F7'],
  tile3Bg: ['#E879F9', '#D946EF'],
  tile4Bg: ['#271642', '#100820'],
  tile1Fg: '#FFFFFF', tile1Fg2: 'rgba(255,255,255,0.6)',
  tile2Fg: '#100820', tile2Fg2: 'rgba(16,8,32,0.5)',
  tile3Fg: '#FFFFFF', tile3Fg2: 'rgba(255,255,255,0.6)',
  tile4Fg: '#F0E8FF', tile4Fg2: 'rgba(240,232,255,0.4)',
  tabActiveBg: '#A855F7',
  weekFill: '#A855F7',
  habitDotDone: '#A855F7',
  habitDotUndone: '#271642',
  chipActiveBg: '#A855F7',
  sparklineColor: 'rgba(255,255,255,0.45)',
  shadowTile: darkShadowTile(),
  shadowPopup: darkShadowPopup(),
  ...BASE_RADII,
};

// ── 5. Cotton Candy / Pastel (light, purple-pink) ───────
const pastel: Theme = {
  id: 'pastel',
  name: 'Cotton Candy',
  mode: 'light',
  bg: '#FAF5FF',
  surface: '#FFFFFF',
  surface2: '#F3E8FF',
  surface3: '#E9D5FF',
  ink: '#1A0C2E',
  ink2: '#5C3D80',
  ink3: '#9070B0',
  ink4: '#BBA5D5',
  border: 'rgba(192,132,252,0.1)',
  accent: '#C084FC',
  accentBtn: '#F472B6',
  heroRing: 'rgba(192,132,252,0.2)',
  heroBg: ['#C084FC', '#A855F7'],
  tile1Bg: ['#C084FC', '#A855F7'],
  tile2Bg: ['#F472B6', '#EC4899'],
  tile3Bg: ['#E9D5FF', '#D8B4FE'],
  tile4Bg: ['#2E1065', '#1E0A45'],
  tile1Fg: '#FFFFFF', tile1Fg2: 'rgba(255,255,255,0.65)',
  tile2Fg: '#FFFFFF', tile2Fg2: 'rgba(255,255,255,0.65)',
  tile3Fg: '#4C1D95', tile3Fg2: 'rgba(76,29,149,0.5)',
  tile4Fg: '#F0E8FF', tile4Fg2: 'rgba(240,232,255,0.4)',
  tabActiveBg: '#C084FC',
  weekFill: '#C084FC',
  habitDotDone: '#C084FC',
  habitDotUndone: '#E9D5FF',
  chipActiveBg: '#F472B6',
  sparklineColor: 'rgba(255,255,255,0.5)',
  shadowTile: lightShadowTile(),
  shadowPopup: lightShadowPopup(),
  ...BASE_RADII,
};

// ── 6. Pastel Pop (light, pink) ─────────────────────────
const pastelpop: Theme = {
  id: 'pastelpop',
  name: 'Pastel Pop',
  mode: 'light',
  bg: '#FFF5F8',
  surface: '#FFFFFF',
  surface2: '#FFE8F0',
  surface3: '#FFD5E5',
  ink: '#2A0A18',
  ink2: '#6B2545',
  ink3: '#A85878',
  ink4: '#D090A8',
  border: 'rgba(255,154,193,0.1)',
  accent: '#FF9AC1',
  accentBtn: '#FF9AC1',
  heroRing: 'rgba(255,154,193,0.2)',
  heroBg: ['#FF9AC1', '#F472B6'],
  tile1Bg: ['#FF9AC1', '#F472B6'],
  tile2Bg: ['#FFC2D9', '#FFAAC8'],
  tile3Bg: ['#FFE0EB', '#FFCCE0'],
  tile4Bg: ['#2A0A18', '#1A0510'],
  tile1Fg: '#FFFFFF', tile1Fg2: 'rgba(255,255,255,0.65)',
  tile2Fg: '#FFFFFF', tile2Fg2: 'rgba(255,255,255,0.65)',
  tile3Fg: '#6B2545', tile3Fg2: 'rgba(107,37,69,0.5)',
  tile4Fg: '#FFF5F8', tile4Fg2: 'rgba(255,245,248,0.4)',
  tabActiveBg: '#FF9AC1',
  weekFill: '#FF9AC1',
  habitDotDone: '#FF9AC1',
  habitDotUndone: '#FFD5E5',
  chipActiveBg: '#FF9AC1',
  sparklineColor: 'rgba(255,255,255,0.5)',
  shadowTile: lightShadowTile(),
  shadowPopup: lightShadowPopup(),
  ...BASE_RADII,
};

// ── 7. Soft Mist (light, warm neutral) ──────────────────
const soft: Theme = {
  id: 'soft',
  name: 'Soft Mist',
  mode: 'light',
  bg: '#F5F0EE',
  surface: '#FFFFFF',
  surface2: '#EDE6E3',
  surface3: '#DDD5D0',
  ink: '#2A2220',
  ink2: '#5C4F4B',
  ink3: '#8A7E78',
  ink4: '#B0A8A2',
  border: 'rgba(160,120,100,0.08)',
  accent: '#8B7068',
  accentBtn: '#C4908A',
  heroRing: 'rgba(196,144,138,0.2)',
  heroBg: ['#C4908A', '#A07068'],
  tile1Bg: ['#C4908A', '#A87870'],
  tile2Bg: ['#D4A8A0', '#C49890'],
  tile3Bg: ['#EDE6E3', '#DDD5D0'],
  tile4Bg: ['#2A2220', '#1A1210'],
  tile1Fg: '#FFFFFF', tile1Fg2: 'rgba(255,255,255,0.65)',
  tile2Fg: '#FFFFFF', tile2Fg2: 'rgba(255,255,255,0.65)',
  tile3Fg: '#5C4F4B', tile3Fg2: 'rgba(92,79,75,0.55)',
  tile4Fg: '#F5F0EE', tile4Fg2: 'rgba(245,240,238,0.4)',
  tabActiveBg: '#C4908A',
  weekFill: '#C4908A',
  habitDotDone: '#C4908A',
  habitDotUndone: '#DDD5D0',
  chipActiveBg: '#C4908A',
  sparklineColor: 'rgba(255,255,255,0.5)',
  shadowTile: lightShadowTile(),
  shadowPopup: lightShadowPopup(),
  ...BASE_RADII,
};

// ── 8. Monochrome Black (dark) ──────────────────────────
const monoDark: Theme = {
  id: 'mono-dark',
  name: 'Monochrome Black',
  mode: 'dark',
  bg: '#0A0A0A',
  surface: '#141414',
  surface2: '#1E1E1E',
  surface3: '#282828',
  ink: '#FFFFFF',
  ink2: '#B0B0B0',
  ink3: '#707070',
  ink4: '#404040',
  border: 'rgba(255,255,255,0.08)',
  accent: '#FFFFFF',
  accentBtn: '#FFFFFF',
  heroRing: 'rgba(255,255,255,0.08)',
  heroBg: ['#333333', '#1A1A1A'],
  tile1Bg: ['#1F1F1F', '#191919'],
  tile2Bg: ['#1F1F1F', '#191919'],
  tile3Bg: ['#1F1F1F', '#191919'],
  tile4Bg: ['#1F1F1F', '#191919'],
  tile1Fg: '#FFFFFF', tile1Fg2: 'rgba(255,255,255,0.5)',
  tile2Fg: '#FFFFFF', tile2Fg2: 'rgba(255,255,255,0.5)',
  tile3Fg: '#FFFFFF', tile3Fg2: 'rgba(255,255,255,0.5)',
  tile4Fg: '#FFFFFF', tile4Fg2: 'rgba(255,255,255,0.35)',
  tabActiveBg: '#FFFFFF',
  weekFill: '#FFFFFF',
  habitDotDone: '#FFFFFF',
  habitDotUndone: '#282828',
  chipActiveBg: '#FFFFFF',
  sparklineColor: 'rgba(255,255,255,0.3)',
  shadowTile: darkShadowTile(),
  shadowPopup: darkShadowPopup(),
  ...BASE_RADII,
};

// ── 9. Monochrome White (light) ─────────────────────────
const monoLight: Theme = {
  id: 'mono-light',
  name: 'Monochrome White',
  mode: 'light',
  bg: '#F5F5F5',
  surface: '#FFFFFF',
  surface2: '#EFEFEF',
  surface3: '#E0E0E0',
  ink: '#111111',
  ink2: '#444444',
  ink3: '#888888',
  ink4: '#BBBBBB',
  border: 'rgba(0,0,0,0.06)',
  accent: '#111111',
  accentBtn: '#111111',
  heroRing: 'rgba(0,0,0,0.06)',
  heroBg: ['#333333', '#111111'],
  tile1Bg: ['#FFFFFF', '#F8F8F8'],
  tile2Bg: ['#FFFFFF', '#F8F8F8'],
  tile3Bg: ['#FFFFFF', '#F8F8F8'],
  tile4Bg: ['#FFFFFF', '#F8F8F8'],
  tile1Fg: '#111111', tile1Fg2: 'rgba(17,17,17,0.55)',
  tile2Fg: '#111111', tile2Fg2: 'rgba(17,17,17,0.55)',
  tile3Fg: '#111111', tile3Fg2: 'rgba(17,17,17,0.55)',
  tile4Fg: '#111111', tile4Fg2: 'rgba(17,17,17,0.55)',
  tabActiveBg: '#111111',
  weekFill: '#111111',
  habitDotDone: '#111111',
  habitDotUndone: '#E0E0E0',
  chipActiveBg: '#111111',
  sparklineColor: 'rgba(255,255,255,0.4)',
  shadowTile: lightShadowTile(),
  shadowPopup: lightShadowPopup(),
  ...BASE_RADII,
};

// ── 10. Midnight Blue (dark) ────────────────────────────
const midnight: Theme = {
  id: 'midnight',
  name: 'Midnight Blue',
  mode: 'dark',
  bg: '#080C14',
  surface: '#0D1320',
  surface2: '#121A2C',
  surface3: '#1A2540',
  ink: '#E8EEFF',
  ink2: '#98AACC',
  ink3: '#5870A0',
  ink4: '#334068',
  border: 'rgba(100,140,255,0.1)',
  accent: '#4F8EFF',
  accentBtn: '#4F8EFF',
  heroRing: 'rgba(79,142,255,0.2)',
  heroBg: ['#4F8EFF', '#1A3E9A'],
  tile1Bg: ['#1A2E60', '#0D1838'],
  tile2Bg: ['#0D2050', '#081428'],
  tile3Bg: ['#142860', '#0A1838'],
  tile4Bg: ['#1A1E3C', '#0E1228'],
  tile1Fg: '#8ABAFF', tile1Fg2: 'rgba(138,186,255,0.5)',
  tile2Fg: '#6090EE', tile2Fg2: 'rgba(96,144,238,0.5)',
  tile3Fg: '#98C4FF', tile3Fg2: 'rgba(152,196,255,0.45)',
  tile4Fg: '#7090CC', tile4Fg2: 'rgba(112,144,204,0.4)',
  tabActiveBg: '#4F8EFF',
  weekFill: '#4F8EFF',
  habitDotDone: '#4F8EFF',
  habitDotUndone: '#1A2540',
  chipActiveBg: '#4F8EFF',
  sparklineColor: 'rgba(79,142,255,0.5)',
  shadowTile: darkShadowTile(),
  shadowPopup: darkShadowPopup(),
  ...BASE_RADII,
};

// ── 11. Ember (dark, red-orange) ────────────────────────
const ember: Theme = {
  id: 'ember',
  name: 'Ember',
  mode: 'dark',
  bg: '#100804',
  surface: '#1C1008',
  surface2: '#261610',
  surface3: '#342018',
  ink: '#FFE8D8',
  ink2: '#CC9070',
  ink3: '#885040',
  ink4: '#4A2818',
  border: 'rgba(255,100,40,0.1)',
  accent: '#FF5520',
  accentBtn: '#FF5520',
  heroRing: 'rgba(255,85,32,0.2)',
  heroBg: ['#FF5520', '#8B1A00'],
  tile1Bg: ['#3A1408', '#200A04'],
  tile2Bg: ['#2E1008', '#1A0804'],
  tile3Bg: ['#3C1A0C', '#221008'],
  tile4Bg: ['#1E1008', '#120804'],
  tile1Fg: '#FF8060', tile1Fg2: 'rgba(255,128,96,0.5)',
  tile2Fg: '#FF6040', tile2Fg2: 'rgba(255,96,64,0.5)',
  tile3Fg: '#FF9070', tile3Fg2: 'rgba(255,144,112,0.45)',
  tile4Fg: '#CC6040', tile4Fg2: 'rgba(204,96,64,0.4)',
  tabActiveBg: '#FF5520',
  weekFill: '#FF5520',
  habitDotDone: '#FF5520',
  habitDotUndone: '#342018',
  chipActiveBg: '#FF5520',
  sparklineColor: 'rgba(255,85,32,0.5)',
  shadowTile: darkShadowTile(),
  shadowPopup: darkShadowPopup(),
  ...BASE_RADII,
};

// ── 12. Mint (light, green-teal) ────────────────────────
const mint: Theme = {
  id: 'mint',
  name: 'Mint',
  mode: 'light',
  bg: '#F0FBF6',
  surface: '#FFFFFF',
  surface2: '#E6F7EE',
  surface3: '#CCF0DC',
  ink: '#0A2018',
  ink2: '#285C40',
  ink3: '#5A9070',
  ink4: '#90BEA0',
  border: 'rgba(30,160,80,0.1)',
  accent: '#00A854',
  accentBtn: '#00A854',
  heroRing: 'rgba(0,168,84,0.2)',
  heroBg: ['#00A854', '#005C2C'],
  tile1Bg: ['#00C464', '#008040'],
  tile2Bg: ['#80DEB0', '#50B880'],
  tile3Bg: ['#C8F0DC', '#A0D8BC'],
  tile4Bg: ['#0A2018', '#05140E'],
  tile1Fg: '#FFFFFF', tile1Fg2: 'rgba(255,255,255,0.65)',
  tile2Fg: '#004020', tile2Fg2: 'rgba(0,64,32,0.55)',
  tile3Fg: '#005C30', tile3Fg2: 'rgba(0,92,48,0.55)',
  tile4Fg: '#FFFFFF', tile4Fg2: 'rgba(255,255,255,0.4)',
  tabActiveBg: '#00A854',
  weekFill: '#00A854',
  habitDotDone: '#00A854',
  habitDotUndone: '#CCF0DC',
  chipActiveBg: '#00A854',
  sparklineColor: 'rgba(0,168,84,0.5)',
  shadowTile: lightShadowTile(),
  shadowPopup: lightShadowPopup(),
  ...BASE_RADII,
};

// ── 13. Rose Gold (light, pink-gold) ───────────────────
const roseGold: Theme = {
  id: 'rose-gold',
  name: 'Rose Gold',
  mode: 'light',
  bg: '#FFF8F6',
  surface: '#FFFFFF',
  surface2: '#FFF0EC',
  surface3: '#FFE0D8',
  ink: '#2A1018',
  ink2: '#7A4050',
  ink3: '#B07880',
  ink4: '#D8A8B0',
  border: 'rgba(200,80,100,0.1)',
  accent: '#C8506A',
  accentBtn: '#C8506A',
  heroRing: 'rgba(200,80,106,0.2)',
  heroBg: ['#C8506A', '#8B2040'],
  tile1Bg: ['#E8607A', '#C04060'],
  tile2Bg: ['#F0A0AA', '#D87888'],
  tile3Bg: ['#FFD8DC', '#F8C0C8'],
  tile4Bg: ['#2A1018', '#1A0810'],
  tile1Fg: '#FFFFFF', tile1Fg2: 'rgba(255,255,255,0.65)',
  tile2Fg: '#6A1828', tile2Fg2: 'rgba(106,24,40,0.55)',
  tile3Fg: '#8B2038', tile3Fg2: 'rgba(139,32,56,0.5)',
  tile4Fg: '#FFFFFF', tile4Fg2: 'rgba(255,255,255,0.4)',
  tabActiveBg: '#C8506A',
  weekFill: '#C8506A',
  habitDotDone: '#C8506A',
  habitDotUndone: '#FFE0D8',
  chipActiveBg: '#C8506A',
  sparklineColor: 'rgba(200,80,106,0.5)',
  shadowTile: lightShadowTile(),
  shadowPopup: lightShadowPopup(),
  ...BASE_RADII,
};

// ── 14. Cotton Candy (light, multi-accent: pink/mint/purple/yellow) ──────────
const cottonCandy: Theme = {
  id: 'cotton-candy',
  name: 'Cotton Candy',
  mode: 'light',
  bg: '#FDF6FF',
  surface: '#FFFFFF',
  surface2: '#F8EEFF',
  surface3: '#F0DCFF',
  ink: '#2A1040',
  ink2: '#6A3080',
  ink3: '#A070B8',
  ink4: '#D0A8E8',
  border: 'rgba(180,80,240,0.1)',
  accent: '#E040FB',        // hot pink/purple — primary accent
  accentBtn: '#E040FB',
  heroRing: 'rgba(224,64,251,0.2)',
  heroBg: ['#E040FB', '#7C4DFF'],          // pink → purple
  tile1Bg: ['#FF80AB', '#F50057'],         // pink — gym
  tile2Bg: ['#69F0AE', '#00BFA5'],         // mint — nutrition
  tile3Bg: ['#B388FF', '#7C4DFF'],         // purple — habits
  tile4Bg: ['#FFD740', '#FFAB00'],         // yellow — notes/home
  tile1Fg: '#FFFFFF', tile1Fg2: 'rgba(255,255,255,0.6)',
  tile2Fg: '#003D2E', tile2Fg2: 'rgba(0,61,46,0.5)',
  tile3Fg: '#FFFFFF', tile3Fg2: 'rgba(255,255,255,0.55)',
  tile4Fg: '#3D2800', tile4Fg2: 'rgba(61,40,0,0.5)',
  tabActiveBg: '#E040FB',
  weekFill: '#E040FB',
  habitDotDone: '#7C4DFF',
  habitDotUndone: '#F0DCFF',
  chipActiveBg: '#E040FB',
  sparklineColor: 'rgba(224,64,251,0.5)',
  shadowTile: lightShadowTile(),
  shadowPopup: lightShadowPopup(),
  ...BASE_RADII,
};

// ── 15. Sunset (dark, multi-accent: orange/pink/red/gold) ────────────────────
const sunset: Theme = {
  id: 'sunset',
  name: 'Sunset',
  mode: 'dark',
  bg: '#0E0806',
  surface: '#1C1208',
  surface2: '#261A0C',
  surface3: '#342414',
  ink: '#FFF0E0',
  ink2: '#D4956A',
  ink3: '#A06040',
  ink4: '#5A3020',
  border: 'rgba(255,140,0,0.12)',
  accent: '#FF6D00',        // deep orange — primary
  accentBtn: '#FF6D00',
  heroRing: 'rgba(255,109,0,0.2)',
  heroBg: ['#FF6D00', '#BF360C'],          // orange → deep red
  tile1Bg: ['#FF6D00', '#E64A19'],         // orange — gym
  tile2Bg: ['#FF1744', '#B71C1C'],         // red — nutrition
  tile3Bg: ['#FFD600', '#F9A825'],         // gold — habits
  tile4Bg: ['#FF4081', '#C51162'],         // pink — notes
  tile1Fg: '#FFFFFF', tile1Fg2: 'rgba(255,255,255,0.6)',
  tile2Fg: '#FFFFFF', tile2Fg2: 'rgba(255,255,255,0.55)',
  tile3Fg: '#2D2000', tile3Fg2: 'rgba(45,32,0,0.5)',
  tile4Fg: '#FFFFFF', tile4Fg2: 'rgba(255,255,255,0.55)',
  tabActiveBg: '#FF6D00',
  weekFill: '#FF6D00',
  habitDotDone: '#FFD600',
  habitDotUndone: '#342414',
  chipActiveBg: '#FF6D00',
  sparklineColor: 'rgba(255,109,0,0.55)',
  shadowTile: darkShadowTile(),
  shadowPopup: darkShadowPopup(),
  ...BASE_RADII,
};

// ── 16. Aurora (dark, multi-accent: teal/green/blue/violet) ──────────────────
const aurora: Theme = {
  id: 'aurora',
  name: 'Aurora',
  mode: 'dark',
  bg: '#04080F',
  surface: '#080E1A',
  surface2: '#0C1424',
  surface3: '#101C30',
  ink: '#D8F0FF',
  ink2: '#70A8CC',
  ink3: '#3A6888',
  ink4: '#1A3850',
  border: 'rgba(0,200,180,0.1)',
  accent: '#00BCD4',        // cyan/teal — primary
  accentBtn: '#00BCD4',
  heroRing: 'rgba(0,188,212,0.2)',
  heroBg: ['#00BCD4', '#006064'],          // cyan → dark teal
  tile1Bg: ['#00BCD4', '#00838F'],         // teal — gym
  tile2Bg: ['#00E676', '#00796B'],         // green — nutrition
  tile3Bg: ['#2979FF', '#1565C0'],         // blue — habits
  tile4Bg: ['#7C4DFF', '#4527A0'],         // violet — notes
  tile1Fg: '#001A1F', tile1Fg2: 'rgba(0,26,31,0.5)',
  tile2Fg: '#001A10', tile2Fg2: 'rgba(0,26,16,0.5)',
  tile3Fg: '#FFFFFF', tile3Fg2: 'rgba(255,255,255,0.55)',
  tile4Fg: '#FFFFFF', tile4Fg2: 'rgba(255,255,255,0.55)',
  tabActiveBg: '#00BCD4',
  weekFill: '#00BCD4',
  habitDotDone: '#00E676',
  habitDotUndone: '#101C30',
  chipActiveBg: '#00BCD4',
  sparklineColor: 'rgba(0,188,212,0.55)',
  shadowTile: darkShadowTile(),
  shadowPopup: darkShadowPopup(),
  ...BASE_RADII,
};

/* ══════════════════════════════════════════
   EXPORTS
   ══════════════════════════════════════════ */

export const ALL_THEMES: Record<string, Theme> = {
  coral,
  ocean,
  forest,
  violet,
  pastel,
  pastelpop,
  soft,
  'mono-dark': monoDark,
  'mono-light': monoLight,
  midnight,
  ember,
  mint,
  'rose-gold': roseGold,
  'cotton-candy': cottonCandy,
  sunset,
  aurora,
};

export const THEME_LIST = [
  coral,
  ocean,
  forest,
  violet,
  pastel,
  pastelpop,
  soft,
  monoDark,
  monoLight,
  midnight,
  ember,
  mint,
  roseGold,
  cottonCandy,
  sunset,
  aurora,
];

export type ThemeId = keyof typeof ALL_THEMES;

export const DEFAULT_THEME_ID: ThemeId = 'mono-light';

export function getTheme(id: string): Theme {
  return ALL_THEMES[id] ?? monoLight;
}
