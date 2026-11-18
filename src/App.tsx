import React, { useCallback, useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  Flag,
  Headphones,
  Play,
  Search,
  Shuffle,
  Sparkles,
  Volume2,
} from 'lucide-react';
import {
  BadgeDefinition,
  GameId,
  RoundSummaryData,
  SavedWordList,
  UserProgress,
} from './types';
import {
  BADGE_DEFINITIONS,
  getRankForStars,
  loadActiveWords,
  loadSavedWordLists,
  loadUserProgress,
  saveActiveWords,
  saveSavedWordLists,
  saveUserProgress,
} from './utils/storageUtils';
import { speakWord, stopSpeech } from './utils/speechUtils';
import { HeaderBar } from './components/HeaderBar';
import { WordManagerModal } from './components/WordManagerModal';
import { GameSpellingRace } from './components/GameSpellingRace';
import { GameListenSpell } from './components/GameListenSpell';
import { GameScramble } from './components/GameScramble';
import { GameMissingLetters } from './components/GameMissingLetters';
import { RoundSummary } from './components/RoundSummary';

interface GameCardConfig {
  id: GameId;
  title: string;
  subtitle: string;
  rewardText: string;
  icon: React.ReactNode;
  cardBg: string;
  iconBg: string;
  buttonBg: string;
}

const GAME_CARDS: GameCardConfig[] = [
  {
    id: 'race',
    title: 'Turbo Spelling Race',
    subtitle: 'Pick a racer, spell each word aloud, and fire your Turbo Boost past the bots!',
    rewardText: '+15 Stars per word · +10 Podium Bonus',
    icon: <Flag className="w-7 h-7 text-rose-600" />,
    cardBg: 'bg-white border-rose-200 hover:border-rose-400',
    iconBg: 'bg-rose-100 border-rose-200',
    buttonBg: 'bg-orange-500 hover:bg-orange-400 border-orange-700 text-white',
  },
  {
    id: 'listen',
    title: 'Listen & Spell',
    subtitle: 'Hear the word clearly, type into letter slots, and get green & amber letter hints.',
    rewardText: '+15 Stars on 1st try · 2-try hints',
    icon: <Headphones className="w-7 h-7 text-sky-600" />,
    cardBg: 'bg-white border-sky-200 hover:border-sky-400',
    iconBg: 'bg-sky-100 border-sky-200',
    buttonBg: 'bg-sky-500 hover:bg-sky-400 border-sky-700 text-white',
  },
  {
    id: 'scramble',
    title: 'Letter Scramble',
    subtitle: 'Tap colorful letter tiles or type on your keyboard to build the word fast!',
    rewardText: '+10 Stars + up to +5 Speed Bonus',
    icon: <Shuffle className="w-7 h-7 text-amber-600" />,
    cardBg: 'bg-white border-amber-200 hover:border-amber-400',
    iconBg: 'bg-amber-100 border-amber-200',
    buttonBg: 'bg-amber-400 hover:bg-amber-300 border-amber-600 text-slate-900',
  },
  {
    id: 'missing',
    title: 'Missing Letters',
    subtitle: 'Become a word detective! Spot the missing blanks and complete the mystery word.',
    rewardText: '+15 Stars per mystery solved',
    icon: <Search className="w-7 h-7 text-indigo-600" />,
    cardBg: 'bg-white border-indigo-200 hover:border-indigo-400',
    iconBg: 'bg-indigo-100 border-indigo-200',
    buttonBg: 'bg-indigo-500 hover:bg-indigo-400 border-indigo-700 text-white',
  },
];

export default function App() {
  const [words, setWords] = useState<string[]>(() => loadActiveWords());
  const [savedLists, setSavedLists] = useState<SavedWordList[]>(() => loadSavedWordLists());
  const [progress, setProgress] = useState<UserProgress>(() => loadUserProgress());

  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [roundWordsOverride, setRoundWordsOverride] = useState<string[] | null>(null);
  const [roundKey, setRoundKey] = useState(0);
  const [roundSummary, setRoundSummary] = useState<RoundSummaryData | null>(null);
  const [wordModalOpen, setWordModalOpen] = useState(false);

  // Persist words and progress
  useEffect(() => {
    saveActiveWords(words);
  }, [words]);

  useEffect(() => {
    saveSavedWordLists(savedLists);
  }, [savedLists]);

  useEffect(() => {
    saveUserProgress(progress);
  }, [progress]);

  // Warm up speech voices on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  const handleToggleSound = useCallback(() => {
    setProgress((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  }, []);

  const handleWordCorrect = useCallback((points: number) => {
    setProgress((prev) => {
      const nextStreak = prev.currentStreak + 1;
      const nextBest = Math.max(prev.bestStreak, nextStreak);
      const nextStars = prev.starPoints + points;

      const unlocked = new Set(prev.unlockedBadges);
      if (nextStreak >= 5) unlocked.add('streak_5');
      if (nextStreak >= 10) unlocked.add('streak_10');
      if (nextStars >= 250) unlocked.add('star_collector');

      return {
        ...prev,
        starPoints: nextStars,
        currentStreak: nextStreak,
        bestStreak: nextBest,
        unlockedBadges: Array.from(unlocked),
      };
    });
  }, []);

  const handleWordWrong = useCallback(() => {
    setProgress((prev) => ({
      ...prev,
      currentStreak: 0,
    }));
  }, []);

  const handleRoundComplete = useCallback(
    (summaryBase: Omit<RoundSummaryData, 'newlyUnlockedBadges'>) => {
      const newlyUnlocked: BadgeDefinition[] = [];

      setProgress((prev) => {
        const currentSet = new Set(prev.unlockedBadges);
        const candidates: string[] = ['first_round'];

        if (summaryBase.podiumWon) {
          candidates.push('turbo_podium');
        }
        const allCorrect =
          summaryBase.results.length > 0 && summaryBase.results.every((r) => r.correct);
        if (allCorrect) {
          candidates.push('perfect_round');
        }
        if (prev.starPoints >= 250) {
          candidates.push('star_collector');
        }
        if (prev.bestStreak >= 5) {
          candidates.push('streak_5');
        }
        if (prev.bestStreak >= 10) {
          candidates.push('streak_10');
        }

        for (const id of candidates) {
          if (!currentSet.has(id)) {
            currentSet.add(id);
            const def = BADGE_DEFINITIONS.find((b) => b.id === id);
            if (def) newlyUnlocked.push(def);
          }
        }

        return {
          ...prev,
          gamesPlayed: prev.gamesPlayed + 1,
          unlockedBadges: Array.from(currentSet),
        };
      });

      setRoundSummary({
        ...summaryBase,
        newlyUnlockedBadges: newlyUnlocked,
      });
    },
    []
  );

  const handleStartGame = (gameId: GameId, customWords?: string[]) => {
    const sourceWords = customWords && customWords.length > 0 ? customWords : words;
    if (sourceWords.length === 0) return;

    stopSpeech();
    setRoundWordsOverride(customWords && customWords.length > 0 ? customWords : null);
    setRoundSummary(null);
    setActiveGame(gameId);
    setRoundKey((k) => k + 1);
  };

  const handleBackHome = () => {
    stopSpeech();
    setActiveGame(null);
    setRoundSummary(null);
    setRoundWordsOverride(null);
  };

  const handleSaveNamedList = (name: string, listWords: string[]) => {
    const newEntry: SavedWordList = {
      id: `list-${Date.now()}`,
      name,
      words: [...listWords],
      createdAt: Date.now(),
    };
    setSavedLists((prev) => [newEntry, ...prev]);
  };

  const handleDeleteSavedList = (id: string) => {
    setSavedLists((prev) => prev.filter((l) => l.id !== id));
  };

  const activeRoundWords = roundWordsOverride ?? words;
  const rank = getRankForStars(progress.starPoints);
  const isEmptyList = words.length === 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F9FF] text-slate-900">
      <HeaderBar
        progress={progress}
        wordCount={words.length}
        inGame={activeGame !== null}
        onBackHome={handleBackHome}
        onOpenWordManager={() => setWordModalOpen(true)}
        onToggleSound={handleToggleSound}
      />

      <main className="flex-1">
        {/* Round Complete Summary */}
        {activeGame !== null && roundSummary !== null && (
          <RoundSummary
            summary={roundSummary}
            soundEnabled={progress.soundEnabled}
            onPlayAgain={() => handleStartGame(activeGame, roundWordsOverride ?? undefined)}
            onRetryTrickyWords={(tricky) => handleStartGame(activeGame, tricky)}
            onBackHome={handleBackHome}
          />
        )}

        {/* Active Game Stage */}
        {activeGame !== null && roundSummary === null && (
          <>
            {activeGame === 'race' && (
              <GameSpellingRace
                key={roundKey}
                words={activeRoundWords}
                soundEnabled={progress.soundEnabled}
                onWordCorrect={handleWordCorrect}
                onWordWrong={handleWordWrong}
                onRoundComplete={handleRoundComplete}
              />
            )}
            {activeGame === 'listen' && (
              <GameListenSpell
                key={roundKey}
                words={activeRoundWords}
                soundEnabled={progress.soundEnabled}
                onWordCorrect={handleWordCorrect}
                onWordWrong={handleWordWrong}
                onRoundComplete={handleRoundComplete}
              />
            )}
            {activeGame === 'scramble' && (
              <GameScramble
                key={roundKey}
                words={activeRoundWords}
                soundEnabled={progress.soundEnabled}
                onWordCorrect={handleWordCorrect}
                onWordWrong={handleWordWrong}
                onRoundComplete={handleRoundComplete}
              />
            )}
            {activeGame === 'missing' && (
              <GameMissingLetters
                key={roundKey}
                words={activeRoundWords}
                soundEnabled={progress.soundEnabled}
                onWordCorrect={handleWordCorrect}
                onWordWrong={handleWordWrong}
                onRoundComplete={handleRoundComplete}
              />
            )}
          </>
        )}

        {/* Home Dashboard */}
        {activeGame === null && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-7">
            {/* Hero & Active Spelling List Preview */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Left Welcome / Rank Overview */}
              <div className="lg:col-span-5 bg-white rounded-3xl border-2 border-sky-200 p-6 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-sky-700 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Grade 3 &amp; 4 Spelling Arcade</span>
                  </div>
                  <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 leading-tight text-balance">
                    Ready to power up your spelling?
                  </h1>
                  <p className="mt-2.5 text-base font-semibold text-slate-600">
                    Pick a game below to practice your weekly words, grow your streak, and climb from{' '}
                    <span className="text-slate-900 font-bold">Word Rookie</span> to{' '}
                    <span className="text-slate-900 font-bold">Grand Champion</span>!
                  </p>
                </div>

                {/* Mobile/Tablet Rank Bar + Best Streak */}
                <div className="mt-5 pt-4 border-t-2 border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl" aria-hidden="true">
                      {rank.emoji}
                    </span>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Current Rank
                      </div>
                      <div className="font-display text-lg font-bold text-slate-900">
                        {rank.title}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Best Streak
                    </div>
                    <div className="font-display text-lg font-bold text-orange-600 tabular-nums">
                      {progress.bestStreak} words
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Active Spelling List Preview */}
              <div className="lg:col-span-7 bg-white rounded-3xl border-2 border-sky-200 p-6 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div>
                      <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
                        This Week&apos;s Words ({words.length})
                      </h2>
                      <p className="text-sm font-semibold text-slate-600">
                        Tap any word to hear it, or edit your list anytime.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWordModalOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm border-b-4 border-orange-700 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>My Word List</span>
                    </button>
                  </div>

                  {isEmptyList ? (
                    <div className="p-6 rounded-2xl bg-amber-50 border-2 border-amber-300 text-center">
                      <p className="font-display text-lg font-bold text-amber-950">
                        Add at least 1 word to start playing!
                      </p>
                      <p className="mt-1 text-sm font-semibold text-amber-800">
                        Click &ldquo;My Word List&rdquo; to type words, paste a list, or load sample words.
                      </p>
                      <button
                        type="button"
                        onClick={() => setWordModalOpen(true)}
                        className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm border-b-4 border-orange-700 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>Add Spelling Words</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {words.map((word) => (
                        <button
                          key={word}
                          type="button"
                          onClick={() => speakWord(word)}
                          title={`Hear "${word}"`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 border-2 border-sky-200 text-slate-900 font-bold text-sm sm:text-base tracking-wide cursor-pointer transition-colors"
                        >
                          <Volume2 className="w-4 h-4 text-sky-600 shrink-0" />
                          <span>{word}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {!isEmptyList && (
                  <p className="mt-4 text-xs font-bold text-slate-500">
                    All 4 games shuffle your {words.length}{' '}
                    {words.length === 1 ? 'word' : 'words'} into a fresh round every time!
                  </p>
                )}
              </div>
            </section>

            {/* 4 Large Game Mode Cards */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
                  Choose Your Spelling Game
                </h2>
                {isEmptyList && (
                  <span className="text-sm font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-xl border border-amber-300">
                    Add at least 1 word to unlock games
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {GAME_CARDS.map((card) => (
                  <div
                    key={card.id}
                    className={`rounded-3xl border-2 p-5 flex flex-col justify-between transition-all shadow-xs ${
                      isEmptyList ? 'opacity-60 bg-slate-50 border-slate-200' : card.cardBg
                    }`}
                  >
                    <div>
                      <div
                        className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center mb-4 ${card.iconBg}`}
                      >
                        {card.icon}
                      </div>
                      <h3 className="font-display text-xl font-bold text-slate-900">
                        {card.title}
                      </h3>
                      <p className="mt-2 text-sm font-semibold text-slate-600 leading-relaxed">
                        {card.subtitle}
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                      <p className="text-xs font-bold text-slate-500">{card.rewardText}</p>
                      <button
                        type="button"
                        disabled={isEmptyList}
                        onClick={() => handleStartGame(card.id)}
                        className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-display font-bold text-base border-b-4 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${card.buttonBg}`}
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>{isEmptyList ? 'Add Words First' : 'Play Now'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Unlocked Badges Shelf */}
            <section className="bg-white rounded-3xl border-2 border-sky-200 p-5 sm:p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h2 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <span>
                    Trophy Shelf ({progress.unlockedBadges.length}/{BADGE_DEFINITIONS.length} Unlocked)
                  </span>
                </h2>
                <span className="text-xs sm:text-sm font-bold text-slate-500 tabular-nums">
                  {progress.gamesPlayed} {progress.gamesPlayed === 1 ? 'round' : 'rounds'} completed
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {BADGE_DEFINITIONS.map((badge) => {
                  const unlocked = progress.unlockedBadges.includes(badge.id);
                  return (
                    <div
                      key={badge.id}
                      className={`p-3 rounded-2xl border-2 text-center transition-colors ${
                        unlocked
                          ? 'bg-amber-50 border-amber-300 text-slate-900'
                          : 'bg-slate-50 border-slate-200 text-slate-400 opacity-75'
                      }`}
                    >
                      <div className={`text-3xl mb-1 ${unlocked ? '' : 'grayscale opacity-50'}`}>
                        {badge.emoji}
                      </div>
                      <div className="font-display font-bold text-sm leading-tight">
                        {badge.title}
                      </div>
                      <div className="mt-1 text-[11px] font-semibold leading-snug">
                        {badge.description}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </main>

      <WordManagerModal
        isOpen={wordModalOpen}
        words={words}
        savedLists={savedLists}
        onClose={() => setWordModalOpen(false)}
        onUpdateWords={setWords}
        onSaveNamedList={handleSaveNamedList}
        onDeleteSavedList={handleDeleteSavedList}
      />
    </div>
  );
}
