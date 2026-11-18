import React, { useEffect } from 'react';
import { Award, CheckCircle2, Home, RotateCcw, Sparkles, Star, Trophy, Volume2 } from 'lucide-react';
import { RoundSummaryData } from '../types';
import { speakWord } from '../utils/speechUtils';
import { playRoundFanfare } from '../utils/soundUtils';
import { ConfettiBurst } from './ConfettiBurst';

interface RoundSummaryProps {
  summary: RoundSummaryData;
  soundEnabled: boolean;
  onPlayAgain: () => void;
  onRetryTrickyWords: (trickyWords: string[]) => void;
  onBackHome: () => void;
}

export const RoundSummary: React.FC<RoundSummaryProps> = ({
  summary,
  soundEnabled,
  onPlayAgain,
  onRetryTrickyWords,
  onBackHome,
}) => {
  useEffect(() => {
    playRoundFanfare(soundEnabled);
  }, [soundEnabled]);

  const correctCount = summary.results.filter((r) => r.correct).length;
  const totalCount = summary.results.length;
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      <div className="relative bg-white rounded-3xl border-2 border-sky-200 shadow-lg p-6 sm:p-8 text-center overflow-hidden animate-pop-in">
        <ConfettiBurst triggerKey={1} />

        {/* Trophy Hero */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-amber-100 border-2 border-amber-300 text-amber-500 mb-4">
          <Trophy className="w-11 h-11 fill-amber-400 text-amber-600" />
        </div>

        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">
          {accuracy === 100 ? 'Amazing Perfect Round!' : 'Round Complete!'}
        </h1>
        <p className="mt-1.5 text-base font-semibold text-slate-600">
          {summary.gameTitle} · {correctCount} of {totalCount} words mastered
        </p>

        {summary.podiumWon && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-100 border-2 border-emerald-300 text-emerald-900 font-bold text-sm">
            <Award className="w-5 h-5 text-emerald-600" />
            <span>1st Place Podium Winner! (+10 Bonus Stars)</span>
          </div>
        )}

        {/* Stats Row */}
        <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4 max-w-lg mx-auto">
          <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-200">
            <div className="flex items-center justify-center gap-1 text-amber-600 font-bold text-xs uppercase tracking-wider">
              <Star className="w-4 h-4 fill-amber-400" />
              <span>Earned</span>
            </div>
            <div className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
              +{summary.totalStarsEarned}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-200">
            <div className="flex items-center justify-center gap-1 text-emerald-700 font-bold text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" />
              <span>Accuracy</span>
            </div>
            <div className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
              {accuracy}%
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-sky-50 border-2 border-sky-200">
            <div className="flex items-center justify-center gap-1 text-sky-700 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Bonus</span>
            </div>
            <div className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
              +{summary.bonusStars}
            </div>
          </div>
        </div>

        {/* Newly Unlocked Badges */}
        {summary.newlyUnlockedBadges.length > 0 && (
          <div className="mt-6 p-4 rounded-2xl bg-indigo-50 border-2 border-indigo-200">
            <h2 className="font-display text-base font-bold text-indigo-950 mb-2">
              New Badge Unlocked!
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {summary.newlyUnlockedBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border-2 border-indigo-200 text-slate-900 font-bold text-sm"
                >
                  <span className="text-xl">{badge.emoji}</span>
                  <span>{badge.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tricky Words Review */}
        {summary.trickyWords.length > 0 ? (
          <div className="mt-6 text-left p-5 rounded-2xl bg-orange-50 border-2 border-orange-200">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Tricky Words to Practice ({summary.trickyWords.length})
                </h2>
                <p className="text-xs sm:text-sm font-semibold text-slate-600">
                  Tap the speaker to hear each word, or practice just these words now!
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRetryTrickyWords(summary.trickyWords)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs sm:text-sm border-b-4 border-orange-700 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Practice Tricky Words</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {summary.trickyWords.map((word) => (
                <button
                  key={word}
                  type="button"
                  onClick={() => speakWord(word)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-amber-50 border-2 border-orange-200 text-slate-900 font-bold text-base tracking-wide cursor-pointer transition-colors"
                >
                  <Volume2 className="w-4 h-4 text-orange-500" />
                  <span>{word}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-6 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-900 font-bold text-sm sm:text-base">
            Zero tricky words this round — you spelled every single word!
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={onPlayAgain}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-display font-bold text-lg border-b-4 border-emerald-700 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Play Again</span>
          </button>

          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-display font-bold text-lg border-b-4 border-sky-700 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer"
          >
            <Home className="w-5 h-5" />
            <span>Back to Games</span>
          </button>
        </div>
      </div>
    </div>
  );
};
