import React from 'react';
import { ChevronDown, ChevronUp, CornerDownLeft, Delete, Keyboard } from 'lucide-react';

interface OnScreenKeyboardProps {
  isOpen: boolean;
  onToggle: () => void;
  onKey: (letter: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  disabled?: boolean;
}

const ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

export const OnScreenKeyboard: React.FC<OnScreenKeyboardProps> = ({
  isOpen,
  onToggle,
  onKey,
  onBackspace,
  onSubmit,
  submitLabel = 'Check',
  disabled = false,
}) => {
  return (
    <div className="w-full max-w-2xl mx-auto mt-3">
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm border-2 border-slate-200 cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        >
          <Keyboard className="w-4 h-4 text-sky-600" />
          <span>{isOpen ? 'Hide Touch Keyboard' : 'Show Touch Keyboard'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div
          className="mt-2.5 p-2.5 sm:p-3 bg-slate-100 border-2 border-slate-200 rounded-2xl select-none"
          onMouseDown={(e) => {
            // Prevent stealing focus from physical text inputs when tapping keys
            e.preventDefault();
          }}
        >
          <div className="flex flex-col gap-1.5">
            {ROWS.map((row, rowIndex) => (
              <div key={rowIndex} className="flex justify-center gap-1 sm:gap-1.5">
                {row.map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    disabled={disabled}
                    onClick={() => onKey(letter)}
                    className="min-w-[30px] sm:min-w-[44px] h-11 sm:h-12 flex-1 max-w-[48px] rounded-xl bg-white hover:bg-sky-50 active:bg-sky-100 text-slate-900 font-display font-bold text-base sm:text-lg uppercase border-2 border-slate-200 border-b-4 border-b-slate-300 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {letter}
                  </button>
                ))}

                {rowIndex === 2 && (
                  <>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={onBackspace}
                      aria-label="Backspace"
                      className="px-2.5 sm:px-3.5 h-11 sm:h-12 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-sm border-2 border-amber-200 border-b-4 border-b-amber-300 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
                    >
                      <Delete className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={onSubmit}
                      className="px-3 sm:px-4 h-11 sm:h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs sm:text-sm border-b-4 border-emerald-700 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                    >
                      <CornerDownLeft className="w-4 h-4" />
                      <span>{submitLabel}</span>
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
