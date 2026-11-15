import { RotateCcw, Send, Volume2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { QUICK_QUESTIONS, matchQuestion } from '../../../data/engine/assistant';
import { PageHeader } from '../../../shared/ui';
import { useField } from '../../../app/context/FieldContext';

export function AssistantPage() {
  const { ctx, journey, chatTurns, askAssistant, clearAssistant } = useField();
  const [questionText, setQuestionText] = useState('');

  if (!ctx || !journey) return null;

  const lastAnswer =
    chatTurns.length > 0
      ? chatTurns[chatTurns.length - 1].answer
      : 'Hola. Soy tu asistente del agua. Toca una pregunta rápida o escríbela con tus palabras.';

  const speakLast = () => {
    try {
      const ss = window.speechSynthesis;
      if (!ss) return;
      ss.cancel();
      const u = new window.SpeechSynthesisUtterance(lastAnswer);
      u.lang = 'es-CR';
      u.rate = 0.92;
      ss.speak(u);
    } catch {
      // Síntesis de voz no soportada en este navegador
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = questionText.trim();
    if (!cleaned) return;
    const matched = matchQuestion(cleaned);
    askAssistant(matched, cleaned);
    setQuestionText('');
  };

  return (
    <div className="v10-stack">
      <PageHeader
        title="Asistente del agua"
        intro={`Respuestas armadas con los datos reales de tu ubicación (${ctx.sub.n}, ${ctx.canton.n} · ASADA ${journey.op}).`}
      />

      <section className="v10-card" aria-label="Conversación con el asistente">
        <div className="v10-map-toolbar">
          <span className="v10-small">
            Contexto activo: {ctx.sub.n} · fuente {journey.src} ({journey.dist})
          </span>
          <div className="v10-pill-row">
            <button type="button" className="v10-pill-btn" onClick={speakLast}>
              <Volume2 size={16} aria-hidden="true" /> Escuchar última respuesta
            </button>
            {chatTurns.length > 0 && (
              <button type="button" className="v10-pill-btn" onClick={clearAssistant}>
                <RotateCcw size={16} aria-hidden="true" /> Limpiar chat
              </button>
            )}
          </div>
        </div>

        <div className="v10-stack" style={{ gap: 10 }}>
          <div
            className="v10-alert-box v10-alert-box--info"
            style={{ maxWidth: '85%', justifySelf: 'start' }}
          >
            <span>
              Hola 👋 Soy tu asistente del agua. Toca una pregunta rápida abajo o escríbela con tus palabras.
            </span>
          </div>

          {chatTurns.map((turn, idx) => (
            <div key={idx} className="v10-stack" style={{ gap: 8 }}>
              <div
                style={{
                  maxWidth: '82%',
                  justifySelf: 'end',
                  background: '#17617C',
                  color: '#FFFFFF',
                  padding: '12px 16px',
                  borderRadius: '16px 16px 4px 16px',
                }}
              >
                {turn.question}
              </div>
              <div
                style={{
                  maxWidth: '86%',
                  justifySelf: 'start',
                  background: '#FFFFFF',
                  border: '1px solid var(--color-line)',
                  color: '#16231C',
                  padding: '12px 16px',
                  borderRadius: '16px 16px 16px 4px',
                }}
              >
                {turn.answer}
              </div>
            </div>
          ))}
        </div>

        <div className="v10-pill-row" role="group" aria-label="Preguntas frecuentes">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q.id}
              type="button"
              className="v10-pill-btn"
              onClick={() => askAssistant(q.id, q.label)}
            >
              {q.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label htmlFor="assistant-input" className="small-label" style={{ width: '100%' }}>
            Escribe tu pregunta
          </label>
          <input
            id="assistant-input"
            type="text"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Ej. ¿Dónde siembro árboles? o ¿Mi finca se inunda?"
            style={{
              flex: '1 1 260px',
              minHeight: 44,
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid #9AB0A2',
            }}
          />
          <button type="submit" className="v10-pill-btn v10-pill-btn--primary">
            <Send size={16} aria-hidden="true" /> Preguntar
          </button>
        </form>
      </section>
    </div>
  );
}
