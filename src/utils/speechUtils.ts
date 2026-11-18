// Browser speech synthesis helper tuned for 3rd and 4th grade learners

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function selectKidFriendlyVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  // Prefer clear US English voices when available
  const preferredNames = [
    'Google US English',
    'Samantha',
    'Victoria',
    'Karen',
    'Alex',
    'Microsoft Aria',
    'Microsoft Jenny',
  ];

  for (const name of preferredNames) {
    const match = voices.find((v) => v.name.includes(name) && v.lang.startsWith('en'));
    if (match) return match;
  }

  return voices.find((v) => v.lang === 'en-US') || voices.find((v) => v.lang.startsWith('en')) || null;
}

export function stopSpeech(): void {
  if (!isSpeechSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Ignore speech synthesis errors
  }
}

export function speakWord(
  word: string,
  options?: {
    slow?: boolean;
    onStart?: () => void;
    onEnd?: () => void;
  }
): void {
  if (!isSpeechSupported() || !word.trim()) {
    options?.onEnd?.();
    return;
  }

  try {
    // Always cancel queued utterances so words never overlap or cut off awkwardly
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word.trim());
    utterance.lang = 'en-US';
    utterance.rate = options?.slow ? 0.65 : 0.85;
    utterance.pitch = 1.05;

    const voice = selectKidFriendlyVoice();
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => options?.onStart?.();
    utterance.onend = () => options?.onEnd?.();
    utterance.onerror = () => options?.onEnd?.();

    window.speechSynthesis.speak(utterance);
  } catch {
    options?.onEnd?.();
  }
}
