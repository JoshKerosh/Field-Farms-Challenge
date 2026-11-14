export function canReadAloud(): boolean {
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

export function readAloud(text: string, onEnd: () => void, onError: () => void): () => void {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-CR';
  utterance.rate = 0.92;
  utterance.onend = onEnd;
  utterance.onerror = onError;
  window.speechSynthesis.speak(utterance);
  return () => {
    utterance.onend = null;
    utterance.onerror = null;
    window.speechSynthesis.cancel();
  };
}
