import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Flag, Flame, Gauge, Play, Send, Sparkles, Volume2 } from 'lucide-react';
import { RacePace, RacerChoice, RoundSummaryData, WordResult } from '../types';
import { shuffleArray } from '../utils/storageUtils';
import { speakWord, stopSpeech } from '../utils/speechUtils';
import { playTryAgainTone, playTurboWhoosh } from '../utils/soundUtils';
import { ConfettiBurst } from './ConfettiBurst';
import { OnScreenKeyboard } from './OnScreenKeyboard';

interface GameSpellingRaceProps {
  words: string[];
  soundEnabled: boolean;
  onWordCorrect: (points: number) => void;
  onWordWrong: () => void;
  onRoundComplete: (summary: Omit<RoundSummaryData, 'newlyUnlockedBadges'>) => void;
}

const RACER_META: Record<RacerChoice, { label: string; emoji: string; accent: string }> = {
  car: { label: 'Race Car', emoji: '🏎️', accent: 'bg-rose-50 border-rose-300 text-rose-900' },
  rocket: { label: 'Rocket', emoji: '🚀', accent: 'bg-sky-50 border-sky-300 text-sky-900' },
  cheetah: { label: 'Cheetah', emoji: '🐆', accent: 'bg-amber-50 border-amber-300 text-amber-900' },
};

export const GameSpellingRace: React.FC<GameSpellingRaceProps> = ({
  words,
  soundEnabled,
  onWordCorrect,
  onWordWrong,
  onRoundComplete,
}) => {
  const [phase, setPhase] = useState<'setup' | 'racing'>('setup');
  const [racer, setRacer] = useState<RacerChoice>('car');
  const [pace, setPace] = useState<RacePace>('cruising');

  const [roundWords, setRoundWords] = useState<string[]>([]);
  const [wordIndex, setWordIndex] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [attemptsOnCurrent, setAttemptsOnCurrent] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'boost' | 'retry' | 'reveal'; message: string } | null>(null);
  const [turboActive, setTurboActive] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const [confettiLabel, setConfettiLabel] = useState<string | undefined>(undefined);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Track progress 0 -> 100
  const [playerPos, setPlayerPos] = useState(0);
  const [bot1Pos, setBot1Pos] = useState(0);
  const [bot2Pos, setBot2Pos] = useState(0);

  const resultsRef = useRef<WordResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const paceRef = useRef<RacePace>(pace);
  paceRef.current = pace;

  const currentWord = roundWords[wordIndex] || '';

  // Gentle bot animation loop while racing
  useEffect(() => {
    if (phase !== 'racing') return;

    let lastTime = performance.now();
    let rafId = 0;

    // Scale gently with word list length so longer lists still feel fair
    const lengthFactor = Math.max(0.55, Math.min(1.15, 10 / Math.max(1, roundWords.length)));

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      const baseSpeed = paceRef.current === 'turbo' ? 2.1 : 1.05;
      setBot1Pos((prev) => Math.min(100, prev + baseSpeed * lengthFactor * dt));
      setBot2Pos((prev) => Math.min(100, prev + baseSpeed * 0.88 * lengthFactor * dt));

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [phase, roundWords.length]);

  const pronounceCurrent = useCallback((wordToSay: string, slow = false) => {
    if (!wordToSay) return;
    speakWord(wordToSay, {
      slow,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
  }, []);

  // Speak word automatically when wordIndex changes during racing
  useEffect(() => {
    if (phase === 'racing' && currentWord) {
      pronounceCurrent(currentWord);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [phase, wordIndex, currentWord, pronounceCurrent]);

  // Tab shortcut to replay word
  useEffect(() => {
    if (phase !== 'racing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        pronounceCurrent(currentWord);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, currentWord, pronounceCurrent]);

  useEffect(() => {
    return () => stopSpeech();
  }, []);

  const startRace = () => {
    const shuffled = shuffleArray(words);
    resultsRef.current = [];
    setRoundWords(shuffled);
    setWordIndex(0);
    setPlayerPos(0);
    setBot1Pos(0);
    setBot2Pos(0);
    setInputVal('');
    setAttemptsOnCurrent(0);
    setFeedback(null);
    setPhase('racing');
  };

  const finishRace = (finalResults: WordResult[], finalPlayerPos: number) => {
    stopSpeech();
    const wonPodium = finalPlayerPos >= 99.9 && bot1Pos < 100 && bot2Pos < 100;
    const podiumBonus = wonPodium ? 10 : 0;
    if (podiumBonus > 0) {
      onWordCorrect(podiumBonus);
    }
    const wordStars = finalResults.reduce((acc, r) => acc + r.starsEarned, 0);
    const trickyWords = finalResults.filter((r) => !r.correct || r.attempts > 1).map((r) => r.word);

    onRoundComplete({
      gameId: 'race',
      gameTitle: 'Turbo Spelling Race',
      totalStarsEarned: wordStars + podiumBonus,
      bonusStars: podiumBonus,
      results: finalResults,
      trickyWords,
      podiumWon: wonPodium,
    });
  };

  const advanceToNextWord = (updatedResults: WordResult[], nextPlayerPos: number) => {
    if (wordIndex + 1 >= roundWords.length) {
      finishRace(updatedResults, nextPlayerPos);
    } else {
      setWordIndex((prev) => prev + 1);
      setInputVal('');
      setAttemptsOnCurrent(0);
      setFeedback(null);
      setTurboActive(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!currentWord || feedback?.type === 'boost' || feedback?.type === 'reveal') return;

    const cleaned = inputVal.trim().toLowerCase();
    if (!cleaned) {
      pronounceCurrent(currentWord);
      inputRef.current?.focus();
      return;
    }

    const nextAttempts = attemptsOnCurrent + 1;
    setAttemptsOnCurrent(nextAttempts);

    if (cleaned === currentWord.toLowerCase()) {
      const earned = 15;
      onWordCorrect(earned);
      playTurboWhoosh(soundEnabled);

      const step = 100 / Math.max(1, roundWords.length);
      const nextPos = Math.min(100, playerPos + step);
      setPlayerPos(nextPos);
      setTurboActive(true);
      setConfettiKey((k) => k + 1);
      setConfettiLabel('+15 Stars! TURBO BOOST!');
      setFeedback({
        type: 'boost',
        message: `Turbo Boost! "${currentWord}" is spot on!`,
      });

      const entry: WordResult = {
        word: currentWord,
        correct: true,
        attempts: nextAttempts,
        starsEarned: earned,
      };
      const updatedResults = [...resultsRef.current, entry];
      resultsRef.current = updatedResults;

      setTimeout(() => {
        advanceToNextWord(updatedResults, nextPos);
      }, 900);
    } else {
      onWordWrong();
      playTryAgainTone(soundEnabled);

      if (nextAttempts >= 2) {
        // Reveal after 2 wrong tries so student keeps moving forward
        setFeedback({
          type: 'reveal',
          message: `The spelling is "${currentWord}". Moving to next word!`,
        });
        const step = (100 / Math.max(1, roundWords.length)) * 0.5;
        const nextPos = Math.min(100, playerPos + step);
        setPlayerPos(nextPos);

        const entry: WordResult = {
          word: currentWord,
          correct: false,
          attempts: nextAttempts,
          starsEarned: 0,
        };
        const updatedResults = [...resultsRef.current, entry];
        resultsRef.current = updatedResults;

        setTimeout(() => {
          advanceToNextWord(updatedResults, nextPos);
        }, 1600);
      } else {
        setFeedback({
          type: 'retry',
          message: `Almost! "${currentWord}" has ${currentWord.length} letters. Try once more!`,
        });
        inputRef.current?.focus();
      }
    }
  };

  const trackProgressLabel = useMemo(() => {
    if (!roundWords.length) return '';
    return `Word ${wordIndex + 1} of ${roundWords.length}`;
  }, [wordIndex, roundWords.length]);

  if (phase === 'setup') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-3xl border-2 border-sky-200 shadow-sm p-6 sm:p-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-100 text-rose-900 font-bold text-sm mb-3">
            <Flag className="w-4 h-4" />
            <span>Turbo Spelling Race</span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">
            Pick Your Racer!
          </h1>
          <p className="mt-1.5 text-base font-semibold text-slate-600">
            Spell each word to fire your Turbo Boost and beat the friendly bots to the finish line.
          </p>

          {/* Racer Picker */}
          <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4 max-w-xl mx-auto">
            {(Object.keys(RACER_META) as RacerChoice[]).map((key) => {
              const item = RACER_META[key];
              const selected = racer === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRacer(key)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center gap-2 ${
                    selected
                      ? 'bg-amber-50 border-amber-400 ring-4 ring-amber-200/70 -translate-y-0.5'
                      : 'bg-slate-50 border-slate-200 hover:border-sky-300'
                  }`}
                >
                  <span className="text-4xl sm:text-5xl leading-none">{item.emoji}</span>
                  <span className="font-display font-bold text-base text-slate-900">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Bot Speed Toggle */}
          <div className="mt-6 flex flex-col items-center gap-2">
            <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-sky-600" />
              <span>Robot Opponent Pace</span>
            </span>
            <div className="inline-flex p-1.5 rounded-2xl bg-slate-100 border-2 border-slate-200 gap-1">
              <button
                type="button"
                onClick={() => setPace('cruising')}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                  pace === 'cruising'
                    ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🐢 Cruising (Relaxed)
              </button>
              <button
                type="button"
                onClick={() => setPace('turbo')}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                  pace === 'turbo'
                    ? 'bg-white text-orange-700 shadow-xs border border-orange-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ⚡ Turbo (Faster)
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={startRace}
            className="mt-7 inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white font-display font-bold text-xl border-b-4 border-orange-700 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer"
          >
            <Play className="w-6 h-6 fill-white" />
            <span>Start Race ({words.length} Words)</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
      {/* 3-Lane Race Track */}
      <div className="bg-slate-900 rounded-3xl border-4 border-slate-800 p-4 sm:p-5 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-amber-400" />
            <span className="font-display font-bold text-sm sm:text-base text-white">
              Turbo Spelling Track
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-xs sm:text-sm font-bold text-sky-300 tabular-nums">
              {trackProgressLabel}
            </span>
          </div>

          {/* Live Pace Switch */}
          <button
            type="button"
            onClick={() => setPace((p) => (p === 'cruising' ? 'turbo' : 'cruising'))}
            className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 cursor-pointer transition-colors"
          >
            Bots: {pace === 'cruising' ? '🐢 Cruising' : '⚡ Turbo'} (Switch)
          </button>
        </div>

        {/* Lanes */}
        <div className="relative space-y-2.5">
          {/* Finish Line Strip */}
          <div
            aria-hidden="true"
            className="absolute right-3 top-0 bottom-0 w-3 rounded-sm opacity-80"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, #fff 0px, #fff 6px, #0f172a 6px, #0f172a 12px)',
            }}
          />

          {/* Player Lane */}
          <div className="relative h-12 rounded-2xl bg-slate-800 border-2 border-amber-400/70 flex items-center px-3 overflow-hidden">
            <span className="text-xs font-bold text-amber-300 w-20 shrink-0 z-10">YOU</span>
            <div className="relative flex-1 h-full flex items-center mr-5">
              <div
                className="absolute top-1/2 -translate-y-1/2 transition-all duration-500 ease-out flex items-center gap-1"
                style={{ left: `calc(${Math.min(92, playerPos)}% - 8px)` }}
              >
                {turboActive && (
                  <span className="inline-flex items-center text-orange-400 animate-pulse" aria-hidden="true">
                    <Flame className="w-5 h-5 fill-orange-500" />
                    <Sparkles className="w-4 h-4 text-amber-300 -ml-1" />
                  </span>
                )}
                <span className="text-2xl sm:text-3xl leading-none inline-block -scale-x-100">
                  {RACER_META[racer].emoji}
                </span>
              </div>
            </div>
          </div>

          {/* Bot 1 Lane */}
          <div className="relative h-10 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center px-3 overflow-hidden">
            <span className="text-xs font-bold text-sky-300 w-20 shrink-0 z-10">Bolt-Bot</span>
            <div className="relative flex-1 h-full flex items-center mr-5">
              <div
                className="absolute top-1/2 -translate-y-1/2 flex items-center"
                style={{ left: `calc(${Math.min(92, bot1Pos)}% - 6px)` }}
              >
                <span className="text-xl sm:text-2xl leading-none">🤖</span>
              </div>
            </div>
          </div>

          {/* Bot 2 Lane */}
          <div className="relative h-10 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center px-3 overflow-hidden">
            <span className="text-xs font-bold text-emerald-300 w-20 shrink-0 z-10">Zippy-Bot</span>
            <div className="relative flex-1 h-full flex items-center mr-5">
              <div
                className="absolute top-1/2 -translate-y-1/2 flex items-center"
                style={{ left: `calc(${Math.min(92, bot2Pos)}% - 6px)` }}
              >
                <span className="text-xl sm:text-2xl leading-none">👾</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Typing Console Card */}
      <div className="relative bg-white rounded-3xl border-2 border-sky-200 shadow-sm p-5 sm:p-6">
        <ConfettiBurst triggerKey={confettiKey} pointsLabel={confettiLabel} />

        <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => pronounceCurrent(currentWord)}
            className={`inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-display font-bold text-lg border-b-4 border-sky-700 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer ${
              isSpeaking ? 'ring-4 ring-sky-200' : ''
            }`}
          >
            <Volume2 className="w-6 h-6" />
            <span>Hear Word</span>
          </button>

          <button
            type="button"
            onClick={() => pronounceCurrent(currentWord, true)}
            className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-900 font-bold text-sm border-2 border-sky-200 cursor-pointer transition-colors"
          >
            <span>🐢 Slower</span>
          </button>

          <span className="text-xs font-bold text-slate-500">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300">Tab</kbd> anytime to replay
          </span>
        </div>

        <form onSubmit={handleSubmit} className="max-w-lg mx-auto flex flex-col sm:flex-row gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Type the spelling word..."
            className="flex-1 px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-slate-300 focus:border-orange-500 focus:bg-white focus:outline-none font-display text-2xl font-bold text-center tracking-widest text-slate-900"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-display font-bold text-lg border-b-4 border-emerald-700 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer whitespace-nowrap"
          >
            <Send className="w-5 h-5" />
            <span>Boost!</span>
          </button>
        </form>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`mt-4 max-w-lg mx-auto px-4 py-2.5 rounded-2xl border-2 text-center font-bold text-sm sm:text-base ${
              feedback.type === 'boost'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : feedback.type === 'retry'
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-sky-50 border-sky-300 text-sky-900'
            }`}
          >
            {feedback.message}
          </div>
        )}

        <OnScreenKeyboard
          isOpen={keyboardOpen}
          onToggle={() => setKeyboardOpen((o) => !o)}
          onKey={(ch) => setInputVal((v) => v + ch)}
          onBackspace={() => setInputVal((v) => v.slice(0, -1))}
          onSubmit={() => handleSubmit()}
          submitLabel="Boost!"
        />
      </div>
    </div>
  );
};
