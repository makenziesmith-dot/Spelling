import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Eraser, Shuffle, Sparkles, Star, Volume2 } from 'lucide-react';
import { RoundSummaryData, WordResult } from '../types';
import { shuffleArray } from '../utils/storageUtils';
import { speakWord, stopSpeech } from '../utils/speechUtils';
import { playCorrectChime, playTileClick, playTryAgainTone } from '../utils/soundUtils';
import { ConfettiBurst } from './ConfettiBurst';
import { OnScreenKeyboard } from './OnScreenKeyboard';

interface GameScrambleProps {
  words: string[];
  soundEnabled: boolean;
  onWordCorrect: (points: number) => void;
  onWordWrong: () => void;
  onRoundComplete: (summary: Omit<RoundSummaryData, 'newlyUnlockedBadges'>) => void;
}

interface LetterTile {
  id: string;
  char: string;
  colorClass: string;
}

const TILE_COLORS = [
  'bg-amber-100 border-amber-300 text-amber-950 hover:bg-amber-200',
  'bg-sky-100 border-sky-300 text-sky-950 hover:bg-sky-200',
  'bg-emerald-100 border-emerald-300 text-emerald-950 hover:bg-emerald-200',
  'bg-orange-100 border-orange-300 text-orange-950 hover:bg-orange-200',
  'bg-indigo-100 border-indigo-300 text-indigo-950 hover:bg-indigo-200',
];

function createScrambledTiles(word: string, seedIndex: number): LetterTile[] {
  const chars = word.toLowerCase().split('');
  const tiles: LetterTile[] = chars.map((char, idx) => ({
    id: `${seedIndex}-${idx}-${char}`,
    char,
    colorClass: TILE_COLORS[idx % TILE_COLORS.length],
  }));

  if (chars.length <= 1) return tiles;

  let scrambled = shuffleArray(tiles);
  let tries = 0;
  while (scrambled.map((t) => t.char).join('') === word.toLowerCase() && tries < 8) {
    scrambled = shuffleArray(tiles);
    tries++;
  }
  return scrambled;
}

export const GameScramble: React.FC<GameScrambleProps> = ({
  words,
  soundEnabled,
  onWordCorrect,
  onWordWrong,
  onRoundComplete,
}) => {
  const [roundWords] = useState<string[]>(() => shuffleArray(words));
  const [wordIndex, setWordIndex] = useState(0);

  const currentWord = roundWords[wordIndex] || '';

  const [tiles, setTiles] = useState<LetterTile[]>(() => createScrambledTiles(currentWord, 0));
  const [placedTileIds, setPlacedTileIds] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [status, setStatus] = useState<'building' | 'retry' | 'correct' | 'revealed'>('building');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const [confettiLabel, setConfettiLabel] = useState<string | undefined>(undefined);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  // Friendly Speed Bonus meter (0 to 100% over 16s, awards up to +5 bonus stars)
  const [speedMeterPct, setSpeedMeterPct] = useState(100);
  const wordStartTimeRef = useRef<number>(Date.now());
  const resultsRef = useRef<WordResult[]>([]);
  const bonusTotalRef = useRef<number>(0);

  const pronounce = useCallback((wordToSay: string) => {
    if (!wordToSay) return;
    speakWord(wordToSay, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
  }, []);

  // Reset tiles and speak when wordIndex changes
  useEffect(() => {
    if (!currentWord) return;
    setTiles(createScrambledTiles(currentWord, wordIndex));
    setPlacedTileIds([]);
    setAttempts(0);
    setStatus('building');
    setFeedback(null);
    setSpeedMeterPct(100);
    wordStartTimeRef.current = Date.now();
    pronounce(currentWord);
  }, [wordIndex, currentWord, pronounce]);

  // Smooth friendly Speed Bonus bar timer
  useEffect(() => {
    if (status === 'correct' || status === 'revealed') return;
    const interval = setInterval(() => {
      const elapsedSec = (Date.now() - wordStartTimeRef.current) / 1000;
      const pct = Math.max(0, Math.round(100 - (elapsedSec / 16) * 100));
      setSpeedMeterPct(pct);
    }, 150);
    return () => clearInterval(interval);
  }, [status, wordIndex]);

  useEffect(() => {
    return () => stopSpeech();
  }, []);

  const placedTiles = useMemo(() => {
    return placedTileIds
      .map((id) => tiles.find((t) => t.id === id))
      .filter((t): t is LetterTile => Boolean(t));
  }, [placedTileIds, tiles]);

  const speedBonusStars = useMemo(() => {
    if (speedMeterPct >= 70) return 5;
    if (speedMeterPct >= 45) return 3;
    if (speedMeterPct >= 20) return 2;
    if (speedMeterPct > 0) return 1;
    return 0;
  }, [speedMeterPct]);

  const handlePlaceTile = useCallback(
    (tileId: string) => {
      if (status === 'correct' || status === 'revealed') return;
      if (placedTileIds.includes(tileId)) return;
      playTileClick(soundEnabled);
      setPlacedTileIds((prev) => [...prev, tileId]);
      if (status === 'retry') {
        setStatus('building');
        setFeedback(null);
      }
    },
    [placedTileIds, soundEnabled, status]
  );

  const handleRemovePlacedTile = useCallback(
    (tileId: string) => {
      if (status === 'correct' || status === 'revealed') return;
      playTileClick(soundEnabled);
      setPlacedTileIds((prev) => prev.filter((id) => id !== tileId));
    },
    [soundEnabled, status]
  );

  const handleTypeChar = useCallback(
    (rawChar: string) => {
      if (status === 'correct' || status === 'revealed') return;
      const ch = rawChar.toLowerCase();
      // Find first available tile matching this letter
      const match = tiles.find((t) => t.char === ch && !placedTileIds.includes(t.id));
      if (match) {
        handlePlaceTile(match.id);
      }
    },
    [handlePlaceTile, placedTileIds, status, tiles]
  );

  const handleBackspace = useCallback(() => {
    if (status === 'correct' || status === 'revealed') return;
    if (placedTileIds.length === 0) return;
    playTileClick(soundEnabled);
    setPlacedTileIds((prev) => prev.slice(0, -1));
  }, [placedTileIds.length, soundEnabled, status]);

  const handleClear = () => {
    if (status === 'correct' || status === 'revealed') return;
    setPlacedTileIds([]);
    setFeedback(null);
  };

  const handleShuffle = () => {
    if (status === 'correct' || status === 'revealed') return;
    setTiles((prev) => shuffleArray(prev));
    playTileClick(soundEnabled);
  };

  const finishOrNext = useCallback(
    (updatedResults: WordResult[]) => {
      if (wordIndex + 1 >= roundWords.length) {
        stopSpeech();
        const totalStars = updatedResults.reduce((acc, r) => acc + r.starsEarned, 0);
        const trickyWords = updatedResults.filter((r) => !r.correct || r.attempts > 1).map((r) => r.word);

        onRoundComplete({
          gameId: 'scramble',
          gameTitle: 'Letter Scramble',
          totalStarsEarned: totalStars,
          bonusStars: bonusTotalRef.current,
          results: updatedResults,
          trickyWords,
        });
      } else {
        setWordIndex((i) => i + 1);
      }
    },
    [onRoundComplete, roundWords.length, wordIndex]
  );

  const handleCheck = useCallback(() => {
    if (!currentWord) return;
    if (status === 'revealed') {
      finishOrNext(resultsRef.current);
      return;
    }
    if (status === 'correct') return;

    if (placedTiles.length < currentWord.length) {
      setFeedback(`Place all ${currentWord.length} letter tiles to check your word!`);
      return;
    }

    const builtWord = placedTiles.map((t) => t.char).join('');
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    if (builtWord.toLowerCase() === currentWord.toLowerCase()) {
      const baseStars = 10;
      const bonus = nextAttempts === 1 ? speedBonusStars : 0;
      const earned = baseStars + bonus;
      bonusTotalRef.current += bonus;

      onWordCorrect(earned);
      playCorrectChime(soundEnabled);

      setStatus('correct');
      setConfettiKey((k) => k + 1);
      setConfettiLabel(bonus > 0 ? `+${earned} Stars! (+${bonus} Speed Bonus)` : `+${earned} Stars!`);
      setFeedback(`Awesome! You unscrambled "${currentWord}"!`);

      const entry: WordResult = {
        word: currentWord,
        correct: true,
        attempts: nextAttempts,
        starsEarned: earned,
      };
      const updated = [...resultsRef.current, entry];
      resultsRef.current = updated;

      setTimeout(() => {
        finishOrNext(updated);
      }, 1050);
    } else {
      onWordWrong();
      playTryAgainTone(soundEnabled);

      if (nextAttempts >= 2) {
        setStatus('revealed');
        setFeedback(`Good try! The correct order is "${currentWord}".`);
        const entry: WordResult = {
          word: currentWord,
          correct: false,
          attempts: nextAttempts,
          starsEarned: 0,
        };
        resultsRef.current = [...resultsRef.current, entry];
      } else {
        setStatus('retry');
        setFeedback('Not quite! Click tiles to swap them or press Clear to try again.');
      }
    }
  }, [
    attempts,
    currentWord,
    finishOrNext,
    onWordCorrect,
    onWordWrong,
    placedTiles,
    soundEnabled,
    speedBonusStars,
    status,
  ]);

  // Physical keyboard support for Letter Scramble
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Tab') {
        e.preventDefault();
        pronounce(currentWord);
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCheck();
        return;
      }
      if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        handleTypeChar(e.key);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentWord, handleBackspace, handleCheck, handleTypeChar, pronounce]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 sm:py-6">
      <div className="relative bg-white rounded-3xl border-2 border-sky-200 shadow-sm p-5 sm:p-8 text-center">
        <ConfettiBurst triggerKey={confettiKey} pointsLabel={confettiLabel} />

        {/* Header Row + Friendly Speed Bonus Meter */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="text-left">
            <span className="font-display font-bold text-base text-slate-900">Letter Scramble</span>
            <span className="mx-2 text-slate-300">·</span>
            <span className="text-xs sm:text-sm font-bold text-slate-600 tabular-nums">
              Word {wordIndex + 1} of {roundWords.length}
            </span>
          </div>

          <div className="flex items-center gap-2.5 bg-amber-50 border-2 border-amber-200 rounded-xl px-3 py-1.5 min-w-[200px]">
            <Star className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
            <div className="flex-1 text-left">
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
                <span>Speed Bonus</span>
                <span className="tabular-nums">+{speedBonusStars}</span>
              </div>
              <div className="mt-0.5 h-2 w-full bg-amber-200/70 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-150"
                  style={{ width: `${speedMeterPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Hear Word Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-5">
          <button
            type="button"
            onClick={() => pronounce(currentWord)}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-display font-bold text-base border-b-4 border-sky-700 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer ${
              isSpeaking ? 'ring-4 ring-sky-200' : ''
            }`}
          >
            <Volume2 className="w-5 h-5" />
            <span>Hear Word</span>
          </button>
          <span className="text-xs font-bold text-slate-500">
            Type letters on your keyboard or tap the colorful tiles below!
          </span>
        </div>

        {/* Answer Slots */}
        <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 mb-5">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5 min-h-[60px] items-center">
            {currentWord.split('').map((targetChar, idx) => {
              const placed = placedTiles[idx];

              if (status === 'revealed') {
                return (
                  <div
                    key={idx}
                    className="w-11 h-13 sm:w-13 sm:h-15 rounded-2xl bg-sky-100 border-2 border-sky-400 border-b-4 text-sky-950 font-display text-2xl sm:text-3xl font-bold uppercase flex items-center justify-center"
                  >
                    {targetChar}
                  </div>
                );
              }

              if (placed) {
                return (
                  <button
                    key={placed.id}
                    type="button"
                    onClick={() => handleRemovePlacedTile(placed.id)}
                    title="Click to return tile"
                    className={`w-11 h-13 sm:w-13 sm:h-15 rounded-2xl border-2 border-b-4 font-display text-2xl sm:text-3xl font-bold uppercase flex items-center justify-center cursor-pointer transition-transform active:translate-y-0.5 ${
                      status === 'correct'
                        ? 'bg-emerald-100 border-emerald-500 text-emerald-950'
                        : 'bg-white border-sky-400 text-slate-900 hover:bg-rose-50'
                    }`}
                  >
                    {placed.char}
                  </button>
                );
              }

              return (
                <div
                  key={idx}
                  className="w-11 h-13 sm:w-13 sm:h-15 rounded-2xl border-2 border-dashed border-slate-300 bg-white/70 flex items-center justify-center"
                />
              );
            })}
          </div>
        </div>

        {/* Scrambled Letter Tiles Tray */}
        <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3 mb-5 min-h-[64px] items-center">
          {tiles.map((tile) => {
            const isUsed = placedTileIds.includes(tile.id);
            return (
              <button
                key={tile.id}
                type="button"
                disabled={isUsed || status === 'correct' || status === 'revealed'}
                onClick={() => handlePlaceTile(tile.id)}
                className={`w-12 h-14 sm:w-14 sm:h-16 rounded-2xl border-2 border-b-4 font-display text-2xl sm:text-3xl font-bold uppercase flex items-center justify-center transition-all ${
                  isUsed
                    ? 'opacity-20 scale-90 bg-slate-100 border-slate-200 text-slate-400 cursor-default'
                    : `${tile.colorClass} cursor-pointer active:border-b-2 active:translate-y-0.5 shadow-xs`
                }`}
              >
                {tile.char}
              </button>
            );
          })}
        </div>

        {/* Utility & Submit Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleClear}
            disabled={placedTileIds.length === 0 || status === 'correct' || status === 'revealed'}
            className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 font-bold text-sm border-b-4 border-slate-300 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer"
          >
            <Eraser className="w-4 h-4" />
            <span>Clear</span>
          </button>

          <button
            type="button"
            onClick={handleShuffle}
            disabled={status === 'correct' || status === 'revealed'}
            className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 font-bold text-sm border-b-4 border-slate-300 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer"
          >
            <Shuffle className="w-4 h-4" />
            <span>Shuffle</span>
          </button>

          {status === 'revealed' ? (
            <button
              type="button"
              onClick={() => finishOrNext(resultsRef.current)}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-display font-bold text-lg border-b-4 border-sky-700 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer"
            >
              <span>Next Word</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCheck}
              disabled={status === 'correct'}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-display font-bold text-lg border-b-4 border-emerald-700 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-60"
            >
              <Sparkles className="w-5 h-5" />
              <span>Check Word</span>
            </button>
          )}
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={`mt-4 max-w-lg mx-auto px-4 py-2.5 rounded-2xl border-2 font-bold text-sm sm:text-base ${
              status === 'correct'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : status === 'retry'
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-sky-50 border-sky-300 text-sky-900'
            }`}
          >
            {feedback}
          </div>
        )}

        <OnScreenKeyboard
          isOpen={keyboardOpen}
          onToggle={() => setKeyboardOpen((o) => !o)}
          onKey={handleTypeChar}
          onBackspace={handleBackspace}
          onSubmit={handleCheck}
          submitLabel={status === 'revealed' ? 'Next' : 'Check'}
          disabled={status === 'correct'}
        />
      </div>
    </div>
  );
};
