import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Search, Sparkles, Volume2 } from 'lucide-react';
import { RoundSummaryData, WordResult } from '../types';
import { shuffleArray } from '../utils/storageUtils';
import { speakWord, stopSpeech } from '../utils/speechUtils';
import { playCorrectChime, playTryAgainTone } from '../utils/soundUtils';
import { ConfettiBurst } from './ConfettiBurst';
import { OnScreenKeyboard } from './OnScreenKeyboard';

interface GameMissingLettersProps {
  words: string[];
  soundEnabled: boolean;
  onWordCorrect: (points: number) => void;
  onWordWrong: () => void;
  onRoundComplete: (summary: Omit<RoundSummaryData, 'newlyUnlockedBadges'>) => void;
}

/**
 * Picks 30-40% of indices in a word to hide as detective blanks.
 * Always keeps at least 1 letter hidden and at least 1 letter revealed.
 */
function pickHiddenIndices(word: string): Set<number> {
  const len = word.length;
  if (len <= 2) return new Set([len - 1]);

  const targetHiddenCount = Math.max(1, Math.min(len - 1, Math.round(len * 0.36)));
  // Prefer hiding interior/vowel or alternating spots deterministically shuffled
  const indices = shuffleArray(Array.from({ length: len }, (_, i) => i));
  return new Set(indices.slice(0, targetHiddenCount));
}

export const GameMissingLetters: React.FC<GameMissingLettersProps> = ({
  words,
  soundEnabled,
  onWordCorrect,
  onWordWrong,
  onRoundComplete,
}) => {
  const [roundWords] = useState<string[]>(() => shuffleArray(words));
  const [wordIndex, setWordIndex] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [status, setStatus] = useState<'solving' | 'retry' | 'solved' | 'revealed'>('solving');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const [confettiLabel, setConfettiLabel] = useState<string | undefined>(undefined);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const resultsRef = useRef<WordResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentWord = roundWords[wordIndex] || '';

  const hiddenIndices = useMemo(() => {
    return pickHiddenIndices(currentWord);
  }, [currentWord, wordIndex]);

  const pronounce = useCallback((wordToSay: string, slow = false) => {
    if (!wordToSay) return;
    speakWord(wordToSay, {
      slow,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
  }, []);

  useEffect(() => {
    if (currentWord) {
      pronounce(currentWord);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [wordIndex, currentWord, pronounce]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        pronounce(currentWord);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentWord, pronounce]);

  useEffect(() => {
    return () => stopSpeech();
  }, []);

  const finishOrNext = (updatedResults: WordResult[]) => {
    if (wordIndex + 1 >= roundWords.length) {
      stopSpeech();
      const totalStars = updatedResults.reduce((acc, r) => acc + r.starsEarned, 0);
      const perfectCount = updatedResults.filter((r) => r.correct && r.attempts === 1).length;
      const bonusStars = perfectCount === roundWords.length ? 10 : 0;
      if (bonusStars > 0) {
        onWordCorrect(bonusStars);
      }
      const trickyWords = updatedResults.filter((r) => !r.correct || r.attempts > 1).map((r) => r.word);

      onRoundComplete({
        gameId: 'missing',
        gameTitle: 'Missing Letters Detective',
        totalStarsEarned: totalStars + bonusStars,
        bonusStars,
        results: updatedResults,
        trickyWords,
      });
    } else {
      setWordIndex((i) => i + 1);
      setInputVal('');
      setAttempts(0);
      setStatus('solving');
      setFeedback(null);
    }
  };

  const handleInputChange = (next: string) => {
    const sanitized = next.replace(/[^a-zA-Z]/g, '').slice(0, currentWord.length + 4);
    setInputVal(sanitized);
    if (status === 'retry') {
      setStatus('solving');
      setFeedback(null);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!currentWord) return;

    if (status === 'revealed') {
      finishOrNext(resultsRef.current);
      return;
    }
    if (status === 'solved') return;

    const cleaned = inputVal.trim().toLowerCase();
    if (!cleaned) {
      pronounce(currentWord);
      inputRef.current?.focus();
      return;
    }

    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    if (cleaned === currentWord.toLowerCase()) {
      const earned = nextAttempts === 1 ? 15 : 12;
      onWordCorrect(earned);
      playCorrectChime(soundEnabled);

      setStatus('solved');
      setConfettiKey((k) => k + 1);
      setConfettiLabel(`+${earned} Stars! Case Solved!`);
      setFeedback(`Mystery solved! Every letter of "${currentWord}" snapped into place!`);

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
      }, 1150);
    } else {
      onWordWrong();
      playTryAgainTone(soundEnabled);

      if (nextAttempts >= 2) {
        setStatus('revealed');
        setInputVal(currentWord);
        setFeedback(`Case file revealed: the full spelling is "${currentWord}".`);

        const entry: WordResult = {
          word: currentWord,
          correct: false,
          attempts: nextAttempts,
          starsEarned: 0,
        };
        resultsRef.current = [...resultsRef.current, entry];
      } else {
        setStatus('retry');
        setFeedback('Almost! Look closely at the clue letters and try once more.');
        inputRef.current?.focus();
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 sm:py-6">
      <div className="relative bg-white rounded-3xl border-2 border-indigo-200 shadow-sm p-5 sm:p-8 text-center">
        <ConfettiBurst triggerKey={confettiKey} pointsLabel={confettiLabel} />

        {/* Header */}
        <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-600 mb-4">
          <span className="inline-flex items-center gap-1.5 text-indigo-900">
            <Search className="w-4 h-4 text-indigo-600" />
            <span>Missing Letters Detective</span>
          </span>
          <span className="tabular-nums">
            Clue {wordIndex + 1} of {roundWords.length}
          </span>
        </div>

        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${((wordIndex + 1) / Math.max(1, roundWords.length)) * 100}%` }}
          />
        </div>

        {/* Audio Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => pronounce(currentWord)}
            className={`inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-display font-bold text-lg border-b-4 border-indigo-700 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer ${
              isSpeaking ? 'ring-4 ring-indigo-200' : ''
            }`}
          >
            <Volume2 className="w-6 h-6" />
            <span>Hear Word</span>
          </button>

          <button
            type="button"
            onClick={() => pronounce(currentWord, true)}
            className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold text-sm border-2 border-indigo-200 cursor-pointer transition-colors"
          >
            <span>🐢 Hear Slowly</span>
          </button>
        </div>

        {/* Mystery Clue Tiles */}
        <div
          onClick={() => inputRef.current?.focus()}
          className="flex flex-wrap justify-center gap-2 sm:gap-2.5 mb-5 cursor-text"
        >
          {currentWord.split('').map((targetChar, idx) => {
            const isHidden = hiddenIndices.has(idx);
            const typedChar = inputVal[idx] || '';

            if (status === 'solved' || status === 'revealed') {
              return (
                <div
                  key={idx}
                  className={`w-11 h-14 sm:w-13 sm:h-16 rounded-2xl border-2 border-b-4 flex items-center justify-center font-display text-2xl sm:text-3xl font-bold uppercase ${
                    status === 'solved' && isHidden
                      ? 'bg-amber-100 border-amber-400 text-amber-950 animate-pop-in'
                      : status === 'solved'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                      : 'bg-sky-50 border-sky-400 text-sky-950'
                  }`}
                >
                  {targetChar}
                </div>
              );
            }

            if (!isHidden) {
              // Revealed clue letter
              return (
                <div
                  key={idx}
                  className="w-11 h-14 sm:w-13 sm:h-16 rounded-2xl bg-indigo-50 border-2 border-indigo-200 border-b-4 text-indigo-950 font-display text-2xl sm:text-3xl font-bold uppercase flex items-center justify-center"
                >
                  {targetChar}
                </div>
              );
            }

            // Mystery blank slot (shows typed letter live if student typed up to this index)
            return (
              <div
                key={idx}
                className={`w-11 h-14 sm:w-13 sm:h-16 rounded-2xl border-2 border-b-4 font-display text-2xl sm:text-3xl font-bold uppercase flex items-center justify-center transition-colors ${
                  typedChar
                    ? 'bg-amber-50 border-amber-400 text-slate-900'
                    : 'bg-white border-dashed border-amber-400 text-amber-500'
                }`}
              >
                {typedChar || '_'}
              </div>
            );
          })}
        </div>

        <p className="text-xs sm:text-sm font-bold text-slate-500 mb-3">
          Type the full word in the box below to fill in the missing letters!
        </p>

        {/* Full Word Input */}
        <form onSubmit={handleSubmit} className="max-w-md mx-auto flex flex-col sm:flex-row gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            disabled={status === 'solved' || status === 'revealed'}
            onChange={(e) => handleInputChange(e.target.value)}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-label="Type the complete word"
            placeholder="Type the complete word..."
            className="flex-1 px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-none font-display text-xl sm:text-2xl font-bold text-center tracking-widest text-slate-900 disabled:opacity-70"
          />

          {status === 'revealed' ? (
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-display font-bold text-lg border-b-4 border-sky-700 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer whitespace-nowrap"
            >
              <span>Next Clue</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={status === 'solved'}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-display font-bold text-lg border-b-4 border-emerald-700 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              <Sparkles className="w-5 h-5" />
              <span>Solve!</span>
            </button>
          )}
        </form>

        {/* Feedback */}
        {feedback && (
          <div
            className={`mt-4 max-w-lg mx-auto px-4 py-2.5 rounded-2xl border-2 font-bold text-sm sm:text-base ${
              status === 'solved'
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
          onKey={(ch) => handleInputChange(inputVal + ch)}
          onBackspace={() => handleInputChange(inputVal.slice(0, -1))}
          onSubmit={() => handleSubmit()}
          submitLabel={status === 'revealed' ? 'Next' : 'Solve!'}
          disabled={status === 'solved'}
        />
      </div>
    </div>
  );
};
