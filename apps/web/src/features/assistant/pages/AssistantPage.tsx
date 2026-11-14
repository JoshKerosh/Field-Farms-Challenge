import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Square, Volume2 } from 'lucide-react';
import { copy } from '../../../i18n';
import { canReadAloud, readAloud } from '../../../platform/speech/read-aloud';
import { PageHeader } from '../../../shared/ui';

export function AssistantPage() {
  const c = copy.assistant;
  const [selected, setSelected] = useState(0);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState(false);
  const cancel = useRef<(() => void) | undefined>(undefined);
  useEffect(() => () => cancel.current?.(), []);
  const stop = () => {
    cancel.current?.();
    cancel.current = undefined;
    setReading(false);
  };
  const speak = () => {
    if (reading) {
      stop();
      return;
    }
    setError(false);
    setReading(true);
    try {
      cancel.current = readAloud(
        c.questions[selected].answer,
        () => setReading(false),
        () => {
          setReading(false);
          setError(true);
        },
      );
    } catch {
      setReading(false);
      setError(true);
    }
  };
  return (
    <>
      <PageHeader title={c.title} intro={c.intro} />
      <p className="muted">{c.note}</p>
      <div className="assistant-layout">
        <div className="question-list">
          {c.questions.map((item, index) => (
            <button
              key={item.question}
              className="question-button"
              aria-pressed={selected === index}
              onClick={() => {
                stop();
                setError(false);
                setSelected(index);
              }}
            >
              <MessageCircle size={19} aria-hidden="true" />
              {item.question}
            </button>
          ))}
        </div>
        <section className="answer-panel" aria-live="polite">
          <h2>{c.questions[selected].question}</h2>
          <p>{c.questions[selected].answer}</p>
          {canReadAloud() ? (
            <button className="button button-secondary" onClick={speak}>
              {reading ? (
                <Square size={18} aria-hidden="true" />
              ) : (
                <Volume2 size={18} aria-hidden="true" />
              )}
              {reading ? c.stop : c.read}
            </button>
          ) : (
            <p className="source-note">{c.unavailable}</p>
          )}
          {error && <p role="status">{c.unavailable}</p>}
          <p className="source-note">{c.voiceNote}</p>
        </section>
      </div>
    </>
  );
}
