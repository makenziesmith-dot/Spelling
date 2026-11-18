import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, HelpCircle, Sparkles, Volume2 } from 'lucide-react';
import { RoundSummaryData, WordResult } from '../types';
import { shuffleArray } from '../utils/storageUtils';
import { speakWord, stopSpeech } from '../utils/speechUtils';
import { playCorrectChime, playTryAgainTone } from '../utils/soundUtils';
import { ConfettiBurst } from './ConfettiBurst';
import { OnScreenKeyboard } from './OnScreenKeyboard';

interface GameListenSpellProps {
  words: string[];
  soundEnabled: boolean;
  onWordCorrect: (points: number) => void;
  onWordWrong: () => void;
  onRoundComplete: (summary: Omit<RoundSummaryData, 'newlyUnlockedBadges'>) => void;
}

type SlotStatus = 'neutral' | 'match' | 'mismatch' | 'revealed';

export const GameListenSpell: React.FC<GameListenSpellProps> = ({
  words,
  soundEnabled,
  onWordCorrect,
  onWordWrong,
  onRoundComplete,
}) => {
  const [roundWords] = useState<string[]>(() => shuffleArray(words));
  const [wordIndex, setWordIndex] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);
  const [slotStatuses, setSlotStatuses] = useState<SlotStatus[] | null>(null);
  const [lastAttemptChars, setLastAttemptChars] = useState<string[]>([]);
  const [statusState, setStatusState] = useState<'typing' | 'retry' | 'correct' | 'revealed'>('typing');
  const [feedbackText, setFeedbackText] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const [confettiLabel, setConfettiLabel] = useState<string | undefined>(undefined);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const resultsRef = useRef<WordResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentWord = roundWords[wordIndex] || '';

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
        gameId: 'listen',
        gameTitle: 'Listen & Spell',
        totalStarsEarned: totalStars + bonusStars,
        bonusStars,
        results: updatedResults,
        trickyWords,
      });
    } else {
      setWordIndex((i) => i + 1);
      setInputVal('');
      setAttemptCount(0);
      setSlotStatuses(null);
      setLastAttemptChars([]);
      setStatusState('typing');
      setFeedbackText(null);
    }
  };

  const handleInputChange = (next: string) => {
    // Allow letters only, up to a reasonable length
    const sanitized = next.replace(/[^a-zA-Z]/g, '').slice(0, currentWord.length + 4);
    setInputVal(sanitized);
    if (statusState === 'retry') {
      // Clear previous check markers as student edits their 2nd attempt
      setSlotStatuses(null);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!currentWord) return;

    if (statusState === 'revealed') {
      finishOrNext(resultsRef.current);
      return;
    }
    if (statusState === 'correct') return;

    const cleaned = inputVal.trim().toLowerCase();
    if (!cleaned) {
      pronounce(currentWord);
      inputRef.current?.focus();
      return;
    }

    const nextAttempts = attemptCount + 1;
    setAttemptCount(nextAttempts);

    if (cleaned === currentWord.toLowerCase()) {
      const earned = nextAttempts === 1 ? 15 : 10;
      onWordCorrect(earned);
      playCorrectChime(soundEnabled);

      setStatusState('correct');
      setSlotStatuses(currentWord.split('').map(() => 'match'));
      setConfettiKey((k) => k + 1);
      setConfettiLabel(nextAttempts === 1 ? '+15 Stars! First Try!' : '+10 Stars! Great Fix!');
      setFeedbackText(
        nextAttempts === 1
          ? `Awesome! "${currentWord}" is 100% right!`
          : `Nice work! You fixed "${currentWord}"!`
      );

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

      const targetChars = currentWord.toLowerCase().split('');
      const typedChars = cleaned.split('');

      const evaluated: SlotStatus[] = targetChars.map((ch, idx) =>
        typedChars[idx] === ch ? 'match' : 'mismatch'
      );

      if (nextAttempts === 1) {
        // 2-try scaffolding: show matched green & mismatched amber
        setStatusState('retry');
        setSlotStatuses(evaluated);
        setLastAttemptChars(typedChars);
        setFeedbackText('Almost! Check the highlighted letters and try once more.');
        inputRef.current?.focus();
      } else {
        // 2nd attempt wrong: reveal correct spelling cleanly
        setStatusState('revealed');
        setSlotStatuses(targetChars.map(() => 'revealed'));
        setInputVal(currentWord);
        setFeedbackText(`Good try! Look closely at the spelling of "${currentWord}", then continue.`);

        const entry: WordResult = {
          word: currentWord,
          correct: false,
          attempts: nextAttempts,
          starsEarned: 0,
        };
        resultsRef.current = [...resultsRef.current, entry];
      }
    }
  };

  const targetLetters = currentWord.split('');

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 sm:py-6">
      <div className="relative bg-white rounded-3xl border-2 border-sky-200 shadow-sm p-5 sm:p-8 text-center">
        <ConfettiBurst triggerKey={confettiKey} pointsLabel={confettiLabel} />

        {/* Progress Header */}
        <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-600 mb-4">
          <span>Listen &amp; Spell</span>
          <span className="tabular-nums">
            Word {wordIndex + 1} of {roundWords.length}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-sky-500 rounded-full transition-all duration-300"
            style={{ width: `${((wordIndex + 1) / Math.max(1, roundWords.length)) * 100}%` }}
          />
        </div>

        {/* Big Hear Word Button */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => pronounce(currentWord)}
            className={`inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-display font-bold text-xl border-b-4 border-sky-700 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer ${
              isSpeaking ? 'scale-105 ring-4 ring-sky-200' : 'animate-pulse'
            }`}
          >
            <Volume2 className="w-7 h-7" />
            <span>Hear Word</span>
          </button>

          <button
            type="button"
            onClick={() => pronounce(currentWord, true)}
            className="inline-flex items-center gap-1.5 px-4 py-3.5 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-900 font-bold text-sm border-2 border-sky-200 cursor-pointer transition-colors"
          >
            <span>🐢 Hear Slowly</span>
          </button>
        </div>

        {/* Visual Letter Slots (click anywhere on slots to focus single input) */}
        <div
          onClick={() => inputRef.current?.focus()}
          className="flex flex-wrap justify-center gap-2 sm:gap-2.5 mb-5 cursor-text"
        >
          {targetLetters.map((targetChar, idx) => {
            const slotStatus = slotStatuses?.[idx];
            const typedChar =
              statusState === 'revealed'
                ? targetChar
                : slotStatuses && statusState === 'retry'
                ? lastAttemptChars[idx] || ''
                : inputVal[idx] || '';

            let boxClasses = 'bg-slate-50 border-slate-300 text-slate-900';
            if (slotStatus === 'match') {
              boxClasses = 'bg-emerald-50 border-emerald-500 text-emerald-900';
            } else if (slotStatus === 'mismatch') {
              boxClasses = 'bg-amber-50 border-amber-400 text-amber-900';
            } else if (slotStatus === 'revealed') {
              boxClasses = 'bg-sky-50 border-sky-400 text-sky-900';
            } else if (idx === inputVal.length && statusState !== 'revealed' && statusState !== 'correct') {
              boxClasses = 'bg-white border-sky-500 ring-2 ring-sky-200 text-slate-900';
            } else if (typedChar) {
              boxClasses = 'bg-white border-sky-300 text-slate-900';
            }

            return (
              <div
                key={idx}
                className={`relative w-11 h-14 sm:w-13 sm:h-16 rounded-2xl border-2 border-b-4 flex items-center justify-center font-display text-2xl sm:text-3xl font-bold uppercase transition-colors ${boxClasses}`}
              >
                <span>{typedChar || (slotStatus === 'mismatch' ? '?' : '')}</span>
                {slotStatus === 'match' && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 absolute top-1 right-1" />
                )}
                {slotStatus === 'mismatch' && (
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600 absolute top-1 right-1" />
                )}
              </div>
            );
          })}
        </div>

        {/* Single Smooth Input + Submit */}
        <form onSubmit={handleSubmit} className="max-w-md mx-auto flex flex-col sm:flex-row gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            disabled={statusState === 'revealed' || statusState === 'correct'}
            onChange={(e) => handleInputChange(e.target.value)}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-label="Type your spelling word"
            placeholder={`Type ${currentWord.length} letters...`}
            className="flex-1 px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-slate-300 focus:border-sky-500 focus:bg-white focus:outline-none font-display text-xl sm:text-2xl font-bold text-center tracking-widest text-slate-900 disabled:opacity-70"
          />

          {statusState === 'revealed' ? (
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-display font-bold text-lg border-b-4 border-sky-700 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer whitespace-nowrap"
            >
              <span>Next Word</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={statusState === 'correct'}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-display font-bold text-lg border-b-4 border-emerald-700 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              <Sparkles className="w-5 h-5" />
              <span>Check</span>
            </button>
          )}
        </form>

        {/* Scaffolding Feedback */}
        {feedbackText && (
          <div
            className={`mt-4 max-w-lg mx-auto px-4 py-3 rounded-2xl border-2 font-bold text-sm sm:text-base ${
              statusState === 'correct'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : statusState === 'retry'
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-sky-50 border-sky-300 text-sky-900'
            }`}
          >
            {feedbackText}
          </div>
        )}

        <OnScreenKeyboard
          isOpen={keyboardOpen}
          onToggle={() => setKeyboardOpen((o) => !o)}
          onKey={(ch) => handleInputChange(inputVal + ch)}
          onBackspace={() => handleInputChange(inputVal.slice(0, -1))}
          onSubmit={() => handleSubmit()}
          submitLabel={statusState === 'revealed' ? 'Next' : 'Check'}
          disabled={statusState === 'correct'}
        />
      </div>
    </div>
  );
};
