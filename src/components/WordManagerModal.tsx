import React, { useState } from 'react';
import { BookMarked, Plus, RotateCcw, Save, Trash2, Volume2, X } from 'lucide-react';
import { SavedWordList } from '../types';
import { cleanAndParseWords, DEFAULT_WORDS, PRESET_LISTS } from '../utils/storageUtils';
import { speakWord } from '../utils/speechUtils';

interface WordManagerModalProps {
  isOpen: boolean;
  words: string[];
  savedLists: SavedWordList[];
  onClose: () => void;
  onUpdateWords: (nextWords: string[]) => void;
  onSaveNamedList: (name: string, words: string[]) => void;
  onDeleteSavedList: (id: string) => void;
}

export const WordManagerModal: React.FC<WordManagerModalProps> = ({
  isOpen,
  words,
  savedLists,
  onClose,
  onUpdateWords,
  onSaveNamedList,
  onDeleteSavedList,
}) => {
  const [singleWord, setSingleWord] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [replaceOnPaste, setReplaceOnPaste] = useState(false);
  const [listNameInput, setListNameInput] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const showNotice = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = cleanAndParseWords(singleWord);
    if (!cleaned.length) {
      showNotice('Type a word with at least 2 letters.');
      return;
    }
    const merged = Array.from(new Set([...words, ...cleaned]));
    onUpdateWords(merged);
    setSingleWord('');
    showNotice(`Added "${cleaned.join(', ')}" to your list!`);
  };

  const handlePasteImport = () => {
    const parsed = cleanAndParseWords(pasteText);
    if (!parsed.length) {
      showNotice('No valid words found. Paste words separated by commas, spaces, or lines.');
      return;
    }

    if (replaceOnPaste) {
      onUpdateWords(parsed);
      showNotice(`Loaded ${parsed.length} cleaned words!`);
    } else {
      const merged = Array.from(new Set([...words, ...parsed]));
      const addedCount = merged.length - words.length;
      onUpdateWords(merged);
      showNotice(
        addedCount > 0
          ? `Added ${addedCount} new ${addedCount === 1 ? 'word' : 'words'}!`
          : 'All those words are already in your list.'
      );
    }
    setPasteText('');
  };

  const handleRemoveWord = (target: string) => {
    onUpdateWords(words.filter((w) => w !== target));
  };

  const handleResetSample = () => {
    onUpdateWords([...DEFAULT_WORDS]);
    showNotice('Reset to the 10 sample 3rd/4th-grade words!');
  };

  const handleClearAll = () => {
    onUpdateWords([]);
    showNotice('Cleared word list. Add at least 1 word to play.');
  };

  const handleSaveList = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = listNameInput.trim();
    if (!trimmed || words.length === 0) return;
    onSaveNamedList(trimmed, words);
    setListNameInput('');
    showNotice(`Saved "${trimmed}"!`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="word-manager-title"
    >
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-3xl border-2 border-sky-100 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-sky-50 border-b-2 border-sky-100">
          <div>
            <h2 id="word-manager-title" className="font-display text-xl sm:text-2xl font-bold text-slate-900">
              My Spelling Word List
            </h2>
            <p className="text-sm text-slate-600 font-medium">
              Add single words, paste a weekly newsletter list, or pick a topic pack.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close word manager"
            className="w-10 h-10 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border-2 border-slate-200 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {feedback && (
            <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border-2 border-emerald-200 text-emerald-900 text-sm font-bold">
              {feedback}
            </div>
          )}

          {/* Active Words Chips */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="font-display text-lg font-bold text-slate-900">
                Active Words ({words.length})
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetSample}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-900 font-bold text-xs cursor-pointer transition-colors whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Sample Words</span>
                </button>
                {words.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs cursor-pointer transition-colors whitespace-nowrap"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>
            </div>

            {words.length === 0 ? (
              <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-200 text-amber-900 text-sm font-bold text-center">
                Your spelling list is empty! Add at least 1 word below or click &ldquo;Reset to Sample Words&rdquo;.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 p-4 rounded-2xl bg-slate-50 border-2 border-slate-200">
                {words.map((word) => (
                  <span
                    key={word}
                    className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full bg-white border-2 border-sky-200 text-slate-900 font-bold text-sm tracking-wide shadow-2xs"
                  >
                    <button
                      type="button"
                      onClick={() => speakWord(word)}
                      aria-label={`Hear ${word}`}
                      title={`Hear "${word}"`}
                      className="text-sky-600 hover:text-sky-800 cursor-pointer p-0.5 rounded-full"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <span>{word}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveWord(word)}
                      aria-label={`Remove ${word}`}
                      className="w-6 h-6 rounded-full hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Add Single Word + Smart Paste */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Single Word */}
            <form onSubmit={handleAddSingle} className="space-y-2.5">
              <label htmlFor="single-word-input" className="block font-display text-base font-bold text-slate-900">
                Add One Word
              </label>
              <div className="flex gap-2">
                <input
                  id="single-word-input"
                  type="text"
                  value={singleWord}
                  onChange={(e) => setSingleWord(e.target.value)}
                  placeholder="Type a spelling word..."
                  className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-white border-2 border-slate-300 focus:border-sky-500 focus:outline-none text-slate-900 font-bold text-base"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm border-b-4 border-emerald-700 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Tip: Click the speaker icon on any word chip to hear how it sounds!
              </p>
            </form>

            {/* Smart Paste */}
            <div className="space-y-2.5">
              <label htmlFor="smart-paste-area" className="block font-display text-base font-bold text-slate-900">
                Smart Paste &amp; Cleanup
              </label>
              <textarea
                id="smart-paste-area"
                rows={3}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={'Paste from a newsletter:\n1. galaxy\n2) volcano, 3. telescope'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-slate-300 focus:border-sky-500 focus:outline-none text-slate-900 font-semibold text-sm resize-none"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceOnPaste}
                    onChange={(e) => setReplaceOnPaste(e.target.checked)}
                    className="w-4 h-4 rounded accent-orange-500"
                  />
                  <span>Replace current list</span>
                </label>
                <button
                  type="button"
                  onClick={handlePasteImport}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm border-b-4 border-orange-700 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer whitespace-nowrap"
                >
                  <span>Clean &amp; Import Words</span>
                </button>
              </div>
            </div>
          </div>

          {/* Topic Packs & Saved Lists */}
          <div className="pt-4 border-t-2 border-slate-100 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-sky-600" />
                <span>Quick Topic Lists &amp; Saved Lists</span>
              </h3>

              {/* Save Current List */}
              <form onSubmit={handleSaveList} className="flex items-center gap-2">
                <input
                  type="text"
                  value={listNameInput}
                  onChange={(e) => setListNameInput(e.target.value)}
                  placeholder="Name this list (e.g. Week 5)"
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-sky-500 focus:outline-none text-sm font-bold text-slate-900 w-44 sm:w-52"
                />
                <button
                  type="submit"
                  disabled={!listNameInput.trim() || words.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold text-xs cursor-pointer transition-colors whitespace-nowrap"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save List</span>
                </button>
              </form>
            </div>

            <div className="flex flex-wrap gap-2">
              {PRESET_LISTS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    onUpdateWords([...preset.words]);
                    showNotice(`Loaded "${preset.name}"!`);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 border-2 border-sky-200 text-sky-900 font-bold text-xs sm:text-sm cursor-pointer transition-colors"
                >
                  {preset.name} ({preset.words.length})
                </button>
              ))}

              {savedLists.map((list) => (
                <div
                  key={list.id}
                  className="inline-flex items-center rounded-xl bg-amber-50 border-2 border-amber-200 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateWords([...list.words]);
                      showNotice(`Loaded "${list.name}"!`);
                    }}
                    className="px-3 py-2 hover:bg-amber-100 text-amber-950 font-bold text-xs sm:text-sm cursor-pointer transition-colors"
                  >
                    {list.name} ({list.words.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteSavedList(list.id)}
                    aria-label={`Delete saved list ${list.name}`}
                    className="px-2 py-2 hover:bg-rose-100 text-amber-800 hover:text-rose-700 cursor-pointer transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t-2 border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm border-b-4 border-sky-800 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer"
          >
            Done — Ready to Play!
          </button>
        </div>
      </div>
    </div>
  );
};
