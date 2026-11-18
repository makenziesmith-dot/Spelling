export type GameId = 'race' | 'listen' | 'scramble' | 'missing';

export type RacerChoice = 'car' | 'rocket' | 'cheetah';
export type RacePace = 'cruising' | 'turbo';

export interface RankInfo {
  id: string;
  title: string;
  emoji: string;
  minStars: number;
  nextRankStars: number | null;
  nextRankTitle: string | null;
}

export interface BadgeDefinition {
  id: string;
  title: string;
  description: string;
  emoji: string;
}

export interface SavedWordList {
  id: string;
  name: string;
  words: string[];
  createdAt: number;
}

export interface UserProgress {
  starPoints: number;
  currentStreak: number;
  bestStreak: number;
  soundEnabled: boolean;
  unlockedBadges: string[];
  gamesPlayed: number;
}

export interface WordResult {
  word: string;
  correct: boolean;
  attempts: number;
  starsEarned: number;
}

export interface RoundSummaryData {
  gameId: GameId;
  gameTitle: string;
  totalStarsEarned: number;
  bonusStars: number;
  results: WordResult[];
  trickyWords: string[];
  podiumWon?: boolean;
  newlyUnlockedBadges: BadgeDefinition[];
}
