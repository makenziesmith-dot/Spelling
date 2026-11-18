import { BadgeDefinition, RankInfo, SavedWordList, UserProgress } from '../types';

export const DEFAULT_WORDS: string[] = [
  'adventure',
  'bicycle',
  'calendar',
  'dinosaur',
  'enormous',
  'favorite',
  'library',
  'mountain',
  'neighbor',
  'treasure',
];

export const PRESET_LISTS: { id: string; name: string; words: string[] }[] = [
  {
    id: 'preset-starter',
    name: 'Starter 3rd/4th Grade List',
    words: DEFAULT_WORDS,
  },
  {
    id: 'preset-nature',
    name: 'Nature & Science',
    words: [
      'butterfly',
      'caterpillar',
      'ecosystem',
      'glacier',
      'hurricane',
      'lightning',
      'meadow',
      'tornado',
      'volcano',
      'waterfall',
    ],
  },
  {
    id: 'preset-space',
    name: 'Space Explorers',
    words: [
      'astronaut',
      'comet',
      'constellation',
      'eclipse',
      'galaxy',
      'gravity',
      'meteor',
      'nebula',
      'planet',
      'telescope',
    ],
  },
];

export const RANKS: RankInfo[] = [
  {
    id: 'rookie',
    title: 'Word Rookie',
    emoji: '🌱',
    minStars: 0,
    nextRankStars: 100,
    nextRankTitle: 'Spelling Explorer',
  },
  {
    id: 'explorer',
    title: 'Spelling Explorer',
    emoji: '🧭',
    minStars: 100,
    nextRankStars: 250,
    nextRankTitle: 'Word Wizard',
  },
  {
    id: 'wizard',
    title: 'Word Wizard',
    emoji: '🪄',
    minStars: 250,
    nextRankStars: 500,
    nextRankTitle: 'Super Speller',
  },
  {
    id: 'super',
    title: 'Super Speller',
    emoji: '⚡',
    minStars: 500,
    nextRankStars: 900,
    nextRankTitle: 'Grand Champion',
  },
  {
    id: 'champion',
    title: 'Grand Champion',
    emoji: '🏆',
    minStars: 900,
    nextRankStars: null,
    nextRankTitle: null,
  },
];

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first_round',
    title: 'First Adventure',
    description: 'Finish your first spelling game round',
    emoji: '🌟',
  },
  {
    id: 'streak_5',
    title: 'Hot Streak',
    description: 'Spell 5 words in a row correctly',
    emoji: '🔥',
  },
  {
    id: 'streak_10',
    title: 'Unstoppable',
    description: 'Spell 10 words in a row correctly',
    emoji: '🚀',
  },
  {
    id: 'turbo_podium',
    title: 'Track Star',
    description: 'Win 1st place in Turbo Spelling Race',
    emoji: '🏁',
  },
  {
    id: 'perfect_round',
    title: 'Sharp Speller',
    description: 'Complete a full round with 100% accuracy',
    emoji: '🎯',
  },
  {
    id: 'star_collector',
    title: 'Star Collector',
    description: 'Earn 250 total Star Points',
    emoji: '👑',
  },
];

const WORDS_STORAGE_KEY = 'spellspark_active_words_v1';
const PROGRESS_STORAGE_KEY = 'spellspark_user_progress_v1';
const SAVED_LISTS_STORAGE_KEY = 'spellspark_saved_lists_v1';

const DEFAULT_PROGRESS: UserProgress = {
  starPoints: 0,
  currentStreak: 0,
  bestStreak: 0,
  soundEnabled: true,
  unlockedBadges: [],
  gamesPlayed: 0,
};

/**
 * Cleans pasted spelling lists from newsletters, docs, or comma-separated text.
 * Strips numbering like "1.", "2)", "(3)", bullets, punctuation, and normalizes case.
 */
export function cleanAndParseWords(rawInput: string): string[] {
  if (!rawInput.trim()) return [];

  // Split on commas, semicolons, newlines, or whitespace
  const rawTokens = rawInput
    .replace(/\r\n/g, '\n')
    // Remove leading numbering patterns like "1.", "12)", "(4)" before words
    .replace(/(?:^|[\s\n])\(?\d+[.)]\s*/g, ' ')
    .split(/[\s,;|\n]+/);

  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const token of rawTokens) {
    // Strip any non-alphabetic characters (punctuation, numbers, bullets)
    const lettersOnly = token.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (lettersOnly.length >= 2 && !seen.has(lettersOnly)) {
      seen.add(lettersOnly);
      cleaned.push(lettersOnly);
    }
  }

  return cleaned;
}

export function loadActiveWords(): string[] {
  try {
    const raw = localStorage.getItem(WORDS_STORAGE_KEY);
    if (!raw) return [...DEFAULT_WORDS];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((w): w is string => typeof w === 'string' && w.trim().length > 0);
    }
    return [...DEFAULT_WORDS];
  } catch {
    return [...DEFAULT_WORDS];
  }
}

export function saveActiveWords(words: string[]): void {
  try {
    localStorage.setItem(WORDS_STORAGE_KEY, JSON.stringify(words));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadSavedWordLists(): SavedWordList[] {
  try {
    const raw = localStorage.getItem(SAVED_LISTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

export function saveSavedWordLists(lists: SavedWordList[]): void {
  try {
    localStorage.setItem(SAVED_LISTS_STORAGE_KEY, JSON.stringify(lists));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadUserProgress(): UserProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw);
    return {
      starPoints: typeof parsed.starPoints === 'number' ? parsed.starPoints : 0,
      currentStreak: typeof parsed.currentStreak === 'number' ? parsed.currentStreak : 0,
      bestStreak: typeof parsed.bestStreak === 'number' ? parsed.bestStreak : 0,
      soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
      unlockedBadges: Array.isArray(parsed.unlockedBadges) ? parsed.unlockedBadges : [],
      gamesPlayed: typeof parsed.gamesPlayed === 'number' ? parsed.gamesPlayed : 0,
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveUserProgress(progress: UserProgress): void {
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function getRankForStars(stars: number): RankInfo {
  let current = RANKS[0];
  for (const rank of RANKS) {
    if (stars >= rank.minStars) {
      current = rank;
    }
  }
  return current;
}

export function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
