import React from 'react';
import { ArrowLeft, BookOpen, Flame, Star, Volume2, VolumeX } from 'lucide-react';
import { UserProgress } from '../types';
import { getRankForStars } from '../utils/storageUtils';

interface HeaderBarProps {
  progress: UserProgress;
  wordCount: number;
  inGame: boolean;
  onBackHome: () => void;
  onOpenWordManager: () => void;
  onToggleSound: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  progress,
  wordCount,
  inGame,
  onBackHome,
  onOpenWordManager,
  onToggleSound,
}) => {
  const rank = getRankForStars(progress.starPoints);
  const rankSpan = rank.nextRankStars ? rank.nextRankStars - rank.minStars : 1;
  const rankProgressPct = rank.nextRankStars
    ? Math.min(100, Math.max(0, Math.round(((progress.starPoints - rank.minStars) / rankSpan) * 100)))
    : 100;

  // Scale flame size slightly with streak
  const streakActive = progress.currentStreak > 0;
  const flameScale =
    progress.currentStreak >= 10
      ? 'scale-125 text-orange-500'
      : progress.currentStreak >= 5
      ? 'scale-110 text-orange-500'
      : streakActive
      ? 'text-amber-500'
      : 'text-slate-400';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b-2 border-sky-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Brand or Back to Games */}
        <div className="flex items-center gap-3 shrink-0">
          {inGame ? (
            <button
              type="button"
              onClick={onBackHome}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm border-b-4 border-slate-300 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Games</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onBackHome}
              className="flex items-center gap-2.5 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 rounded-xl"
            >
              <span className="w-10 h-10 rounded-xl bg-amber-400 border-b-4 border-amber-500 flex items-center justify-center text-slate-900 shadow-xs">
                <Star className="w-5 h-5 fill-white text-white" />
              </span>
              <span className="font-display text-2xl font-bold tracking-tight text-slate-900 whitespace-nowrap">
                SpellSpark
              </span>
            </button>
          )}
        </div>

        {/* Center: Gamification Rewards Bar (Stars, Streak, Rank Progress) */}
        <div className="flex items-center flex-wrap gap-3 sm:gap-5">
          {/* Star Points */}
          <div
            className="flex items-center gap-2 bg-amber-50 border-2 border-amber-200 rounded-xl px-3 py-1.5"
            title="Total Star Points earned"
          >
            <Star className="w-5 h-5 text-amber-500 fill-amber-400 shrink-0" />
            <div className="leading-tight">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-amber-800">
                Stars
              </span>
              <span className="font-display text-base sm:text-lg font-bold text-slate-900 tabular-nums">
                {progress.starPoints}
              </span>
            </div>
          </div>

          {/* Streak Counter */}
          <div
            className="flex items-center gap-2 bg-orange-50 border-2 border-orange-200 rounded-xl px-3 py-1.5"
            title={`Best streak: ${progress.bestStreak} words`}
          >
            <Flame
              className={`w-5 h-5 shrink-0 transition-transform duration-200 ${flameScale} ${
                streakActive ? 'fill-orange-400' : ''
              }`}
            />
            <div className="leading-tight">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-orange-800">
                Streak
              </span>
              <span className="font-display text-base sm:text-lg font-bold text-slate-900 tabular-nums">
                {progress.currentStreak}
              </span>
            </div>
          </div>

          {/* Rank Progress */}
          <div className="hidden md:flex items-center gap-2.5 bg-sky-50 border-2 border-sky-200 rounded-xl px-3.5 py-1.5 min-w-[210px]">
            <span className="text-xl leading-none" aria-hidden="true">
              {rank.emoji}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-800">
                <span className="truncate">{rank.title}</span>
                <span className="text-sky-700 tabular-nums shrink-0">
                  {rank.nextRankStars ? `${progress.starPoints}/${rank.nextRankStars}` : 'Max Rank'}
                </span>
              </div>
              <div className="mt-1 h-2 w-full bg-sky-200/80 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all duration-300"
                  style={{ width: `${rankProgressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Sound Toggle & My Word List */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onToggleSound}
            aria-label={progress.soundEnabled ? 'Turn sound effects off' : 'Turn sound effects on'}
            title={progress.soundEnabled ? 'Sound On' : 'Sound Off'}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-sm border-b-4 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
              progress.soundEnabled
                ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-emerald-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300'
            }`}
          >
            {progress.soundEnabled ? (
              <Volume2 className="w-4 h-4 shrink-0" />
            ) : (
              <VolumeX className="w-4 h-4 shrink-0" />
            )}
            <span className="hidden sm:inline">{progress.soundEnabled ? 'Sound On' : 'Sound Off'}</span>
          </button>

          {!inGame && (
            <button
              type="button"
              onClick={onOpenWordManager}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm border-b-4 border-orange-700 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>My Word List ({wordCount})</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
